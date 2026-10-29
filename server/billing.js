import crypto from 'crypto';
import Razorpay from 'razorpay';
import { getDb } from './db.js';
import { GRACE_DAYS, TRIAL_DAYS, getPlan, listPlans } from './plans.js';

const db = getDb();

db.exec(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    plan_id TEXT,
    trial_ends_at TEXT,
    current_period_start TEXT,
    current_period_end TEXT,
    grace_ends_at TEXT,
    cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
    razorpay_customer_id TEXT,
    razorpay_subscription_id TEXT,
    last_payment_id TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL,
    amount_paise INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    raw_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(razorpay_order_id);
`);

const stmts = {
  getSub: db.prepare('SELECT * FROM subscriptions WHERE tenant_id = ?'),
  upsertSub: db.prepare(`
    INSERT INTO subscriptions (
      tenant_id, status, plan_id, trial_ends_at, current_period_start, current_period_end,
      grace_ends_at, cancel_at_period_end, razorpay_customer_id, razorpay_subscription_id,
      last_payment_id, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(tenant_id) DO UPDATE SET
      status = excluded.status,
      plan_id = excluded.plan_id,
      trial_ends_at = excluded.trial_ends_at,
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      grace_ends_at = excluded.grace_ends_at,
      cancel_at_period_end = excluded.cancel_at_period_end,
      razorpay_customer_id = excluded.razorpay_customer_id,
      razorpay_subscription_id = excluded.razorpay_subscription_id,
      last_payment_id = excluded.last_payment_id,
      updated_at = excluded.updated_at
  `),
  insertPayment: db.prepare(`
    INSERT INTO payments (
      id, tenant_id, plan_id, amount_paise, currency, status,
      razorpay_order_id, razorpay_payment_id, razorpay_signature, raw_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updatePayment: db.prepare(`
    UPDATE payments SET status = ?, razorpay_payment_id = ?, razorpay_signature = ?, raw_json = ?, updated_at = ?
    WHERE id = ?
  `),
  getPayment: db.prepare('SELECT * FROM payments WHERE id = ?'),
  getPaymentByOrder: db.prepare('SELECT * FROM payments WHERE razorpay_order_id = ?'),
  listPayments: db.prepare('SELECT * FROM payments WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50'),
};

function nowIso() {
  return new Date().toISOString();
}

function addDays(isoOrDate, days) {
  const d = new Date(isoOrDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function addMonths(isoOrDate, months) {
  const d = new Date(isoOrDate);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString();
}

function addYears(isoOrDate, years) {
  const d = new Date(isoOrDate);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString();
}

function periodEndFrom(startIso, planId) {
  const plan = getPlan(planId);
  if (!plan) return addMonths(startIso, 1);
  if (plan.interval === 'year') return addYears(startIso, plan.intervalCount);
  return addMonths(startIso, plan.intervalCount);
}

export function paymentMode() {
  const key = process.env.RAZORPAY_KEY_ID || '';
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  if (process.env.PAYMENT_MODE === 'mock') return 'mock';
  if (key && secret) return 'razorpay';
  return 'mock';
}

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

function saveSubscription(row) {
  stmts.upsertSub.run(
    row.tenant_id,
    row.status,
    row.plan_id || null,
    row.trial_ends_at || null,
    row.current_period_start || null,
    row.current_period_end || null,
    row.grace_ends_at || null,
    row.cancel_at_period_end ? 1 : 0,
    row.razorpay_customer_id || null,
    row.razorpay_subscription_id || null,
    row.last_payment_id || null,
    nowIso(),
  );
  return stmts.getSub.get(row.tenant_id);
}

export function startTrialForTenant(tenantId) {
  const existing = stmts.getSub.get(tenantId);
  if (existing) return refreshSubscriptionStatus(tenantId);
  const start = nowIso();
  return saveSubscription({
    tenant_id: tenantId,
    status: 'trialing',
    plan_id: null,
    trial_ends_at: addDays(start, TRIAL_DAYS),
    current_period_start: start,
    current_period_end: addDays(start, TRIAL_DAYS),
    grace_ends_at: null,
    cancel_at_period_end: 0,
  });
}

export function ensureSubscription(tenantId) {
  const row = stmts.getSub.get(tenantId);
  if (!row) return startTrialForTenant(tenantId);
  return refreshSubscriptionStatus(tenantId);
}

/**
 * Recompute status from dates (trial end, period end, grace).
 * Industry pattern: trialing → expired | active → past_due (grace) → expired.
 */
export function refreshSubscriptionStatus(tenantId) {
  const row = stmts.getSub.get(tenantId);
  if (!row) return startTrialForTenant(tenantId);

  const now = Date.now();
  let next = { ...row, cancel_at_period_end: !!row.cancel_at_period_end };

  if (row.status === 'trialing') {
    const trialEnd = row.trial_ends_at ? Date.parse(row.trial_ends_at) : 0;
    if (trialEnd && now > trialEnd) {
      next.status = 'expired';
      next.grace_ends_at = null;
    }
  } else if (row.status === 'active' || row.status === 'cancelled') {
    const periodEnd = row.current_period_end ? Date.parse(row.current_period_end) : 0;
    if (periodEnd && now > periodEnd) {
      if (row.cancel_at_period_end || row.status === 'cancelled') {
        next.status = 'expired';
        next.grace_ends_at = null;
      } else {
        // Missed renewal → short grace window, then lock.
        const graceEnd = row.grace_ends_at || addDays(row.current_period_end, GRACE_DAYS);
        next.grace_ends_at = graceEnd;
        if (now > Date.parse(graceEnd)) {
          next.status = 'expired';
        } else {
          next.status = 'past_due';
        }
      }
    }
  } else if (row.status === 'past_due') {
    const graceEnd = row.grace_ends_at ? Date.parse(row.grace_ends_at) : 0;
    if (graceEnd && now > graceEnd) {
      next.status = 'expired';
    }
  }

  if (next.status !== row.status || next.grace_ends_at !== row.grace_ends_at) {
    return saveSubscription(next);
  }
  return next;
}

export function getEntitlement(tenantId) {
  const sub = ensureSubscription(tenantId);
  const now = Date.now();
  const trialEndsAt = sub.trial_ends_at;
  const periodEnd = sub.current_period_end;
  const graceEndsAt = sub.grace_ends_at;

  let access = false;
  let reason = 'unknown';
  let daysLeft = 0;

  if (sub.status === 'trialing') {
    access = true;
    reason = 'trial';
    daysLeft = Math.max(0, Math.ceil((Date.parse(trialEndsAt) - now) / 86400000));
  } else if (sub.status === 'active') {
    access = true;
    reason = 'active';
    daysLeft = Math.max(0, Math.ceil((Date.parse(periodEnd) - now) / 86400000));
  } else if (sub.status === 'past_due') {
    access = true; // grace: keep working but force paywall banners
    reason = 'past_due';
    daysLeft = Math.max(0, Math.ceil((Date.parse(graceEndsAt) - now) / 86400000));
  } else if (sub.status === 'cancelled') {
    // Cancelled but still inside paid period
    if (periodEnd && now <= Date.parse(periodEnd)) {
      access = true;
      reason = 'cancelled_until_period_end';
      daysLeft = Math.max(0, Math.ceil((Date.parse(periodEnd) - now) / 86400000));
    } else {
      access = false;
      reason = 'cancelled';
    }
  } else {
    access = false;
    reason = sub.status === 'expired' ? 'expired' : 'blocked';
  }

  const plan = sub.plan_id ? getPlan(sub.plan_id) : null;

  return {
    access,
    reason,
    daysLeft,
    status: sub.status,
    planId: sub.plan_id,
    planName: plan?.name || null,
    trialEndsAt: sub.trial_ends_at,
    currentPeriodEnd: sub.current_period_end,
    graceEndsAt: sub.grace_ends_at,
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    paymentMode: paymentMode(),
    trialDays: TRIAL_DAYS,
    graceDays: GRACE_DAYS,
  };
}

export function activatePaidPlan(tenantId, planId, paymentId) {
  const plan = getPlan(planId);
  if (!plan) throw Object.assign(new Error('Unknown plan'), { status: 400 });
  const start = nowIso();
  const end = periodEndFrom(start, planId);
  return saveSubscription({
    tenant_id: tenantId,
    status: 'active',
    plan_id: planId,
    trial_ends_at: stmts.getSub.get(tenantId)?.trial_ends_at || null,
    current_period_start: start,
    current_period_end: end,
    grace_ends_at: null,
    cancel_at_period_end: 0,
    last_payment_id: paymentId || null,
  });
}

export async function createCheckoutOrder(tenantId, planId, user) {
  const plan = getPlan(planId);
  if (!plan) throw Object.assign(new Error('Unknown plan'), { status: 400 });

  const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
  const created = nowIso();
  const mode = paymentMode();

  if (mode === 'mock') {
    const mockOrderId = `order_mock_${crypto.randomBytes(6).toString('hex')}`;
    stmts.insertPayment.run(
      paymentId, tenantId, planId, plan.amountPaise, 'INR', 'created',
      mockOrderId, null, null, JSON.stringify({ mode: 'mock' }), created, created,
    );
    return {
      mode: 'mock',
      paymentId,
      orderId: mockOrderId,
      amount: plan.amountPaise,
      currency: 'INR',
      plan,
      keyId: null,
      prefill: { name: user?.name || '', email: user?.email || '' },
    };
  }

  const rzp = getRazorpay();
  const order = await rzp.orders.create({
    amount: plan.amountPaise,
    currency: 'INR',
    receipt: paymentId,
    notes: { tenant_id: tenantId, plan_id: planId, payment_id: paymentId },
  });

  stmts.insertPayment.run(
    paymentId, tenantId, planId, plan.amountPaise, 'INR', 'created',
    order.id, null, null, JSON.stringify(order), created, created,
  );

  return {
    mode: 'razorpay',
    paymentId,
    orderId: order.id,
    amount: plan.amountPaise,
    currency: 'INR',
    plan,
    keyId: process.env.RAZORPAY_KEY_ID,
    prefill: { name: user?.name || '', email: user?.email || '' },
  };
}

export function verifyAndActivate({
  tenantId,
  paymentId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  source = 'checkout',
}) {
  const payment = stmts.getPayment.get(paymentId) || stmts.getPaymentByOrder.get(razorpayOrderId);
  if (!payment || payment.tenant_id !== tenantId) {
    throw Object.assign(new Error('Payment not found'), { status: 404 });
  }
  if (payment.status === 'paid') {
    return { already: true, entitlement: getEntitlement(tenantId), payment };
  }

  const mode = paymentMode();
  if (source === 'checkout') {
    if (mode === 'razorpay') {
      const body = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');
      if (expected !== razorpaySignature) {
        throw Object.assign(new Error('Invalid payment signature'), { status: 400 });
      }
    } else if (mode === 'mock') {
      if (!String(razorpayOrderId || '').startsWith('order_mock_')) {
        throw Object.assign(new Error('Invalid mock order'), { status: 400 });
      }
    }
  }

  stmts.updatePayment.run(
    'paid',
    razorpayPaymentId || `mock_pay_${Date.now()}`,
    razorpaySignature || source,
    JSON.stringify({ verifiedAt: nowIso(), source }),
    nowIso(),
    payment.id,
  );
  activatePaidPlan(tenantId, payment.plan_id, payment.id);
  return { already: false, entitlement: getEntitlement(tenantId), payment: stmts.getPayment.get(payment.id) };
}

export function cancelSubscription(tenantId) {
  const sub = ensureSubscription(tenantId);
  if (!['active', 'past_due', 'trialing'].includes(sub.status)) {
    throw Object.assign(new Error('Nothing to cancel'), { status: 400 });
  }
  // Industry default: cancel at period end; access continues until then.
  // Cancelling during trial ends access immediately (no paid period to finish).
  if (sub.status === 'trialing') {
    return saveSubscription({
      tenant_id: tenantId,
      status: 'expired',
      plan_id: sub.plan_id,
      trial_ends_at: sub.trial_ends_at,
      current_period_start: sub.current_period_start,
      current_period_end: nowIso(),
      grace_ends_at: null,
      cancel_at_period_end: 1,
      razorpay_customer_id: sub.razorpay_customer_id,
      razorpay_subscription_id: sub.razorpay_subscription_id,
      last_payment_id: sub.last_payment_id,
    });
  }
  return saveSubscription({
    tenant_id: tenantId,
    status: 'cancelled',
    plan_id: sub.plan_id,
    trial_ends_at: sub.trial_ends_at,
    current_period_start: sub.current_period_start,
    current_period_end: sub.current_period_end,
    grace_ends_at: null,
    cancel_at_period_end: 1,
    razorpay_customer_id: sub.razorpay_customer_id,
    razorpay_subscription_id: sub.razorpay_subscription_id,
    last_payment_id: sub.last_payment_id,
  });
}

export function listTenantPayments(tenantId) {
  return stmts.listPayments.all(tenantId).map((p) => ({
    id: p.id,
    planId: p.plan_id,
    amountPaise: p.amount_paise,
    currency: p.currency,
    status: p.status,
    orderId: p.razorpay_order_id,
    paymentId: p.razorpay_payment_id,
    createdAt: p.created_at,
  }));
}

export function publicBillingConfig() {
  return {
    trialDays: TRIAL_DAYS,
    graceDays: GRACE_DAYS,
    currency: 'INR',
    paymentMode: paymentMode(),
    plans: listPlans().map((p) => ({
      id: p.id,
      name: p.name,
      label: p.label,
      periodLabel: p.periodLabel || '',
      perMonthInr: p.perMonthInr || null,
      priceInr: p.priceInr,
      badge: p.badge,
      description: p.description,
      features: p.features,
      interval: p.interval,
    })),
  };
}

/** Paths that must work even when subscription is expired (paywall / account). */
export function isBillingExemptPath(path) {
  const allow = [
    '/api/health',
    '/api/version',
    '/api/auth/register',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/config',
    '/api/auth/me',
    '/api/public/info',
    '/api/public/plans',
    '/api/billing/status',
    '/api/billing/plans',
    '/api/billing/checkout',
    '/api/billing/verify',
    '/api/billing/cancel',
    '/api/billing/payments',
    '/api/billing/webhook',
  ];
  return allow.includes(path);
}

export function registerBillingRoutes(app) {
  app.get('/api/public/plans', (_req, res) => {
    res.json(publicBillingConfig());
  });

  app.get('/api/billing/plans', (_req, res) => {
    res.json(publicBillingConfig());
  });

  app.get('/api/billing/status', (req, res) => {
    if (!req.tenant) return res.status(401).json({ error: 'Authentication required' });
    res.json(getEntitlement(req.tenant.id));
  });

  app.get('/api/billing/payments', (req, res) => {
    if (!req.tenant) return res.status(401).json({ error: 'Authentication required' });
    res.json({ payments: listTenantPayments(req.tenant.id) });
  });

  app.post('/api/billing/checkout', async (req, res) => {
    try {
      if (!req.tenant || !req.user) return res.status(401).json({ error: 'Authentication required' });
      const planId = req.body?.planId;
      const order = await createCheckoutOrder(req.tenant.id, planId, req.user);
      res.json(order);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || 'Checkout failed' });
    }
  });

  app.post('/api/billing/verify', (req, res) => {
    try {
      if (!req.tenant) return res.status(401).json({ error: 'Authentication required' });
      const result = verifyAndActivate({
        tenantId: req.tenant.id,
        paymentId: req.body?.paymentId,
        razorpayOrderId: req.body?.razorpay_order_id || req.body?.razorpayOrderId,
        razorpayPaymentId: req.body?.razorpay_payment_id || req.body?.razorpayPaymentId,
        razorpaySignature: req.body?.razorpay_signature || req.body?.razorpaySignature,
      });
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || 'Verification failed' });
    }
  });

  app.post('/api/billing/cancel', (req, res) => {
    try {
      if (!req.tenant) return res.status(401).json({ error: 'Authentication required' });
      const sub = cancelSubscription(req.tenant.id);
      res.json({ success: true, entitlement: getEntitlement(req.tenant.id), subscription: sub });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || 'Cancel failed' });
    }
  });

  // Razorpay webhooks (payment.captured) — signature via X-Razorpay-Signature
  app.post('/api/billing/webhook', expressRawJsonFallback, (req, res) => {
    try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (secret) {
        const signature = req.headers['x-razorpay-signature'];
        const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
        if (signature !== expected) return res.status(400).json({ error: 'Invalid webhook signature' });
      }
      const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (event?.event === 'payment.captured') {
        const entity = event.payload?.payment?.entity;
        const orderId = entity?.order_id;
        const paymentRow = orderId ? stmts.getPaymentByOrder.get(orderId) : null;
        if (paymentRow && paymentRow.status !== 'paid') {
          verifyAndActivate({
            tenantId: paymentRow.tenant_id,
            paymentId: paymentRow.id,
            razorpayOrderId: orderId,
            razorpayPaymentId: entity.id,
            razorpaySignature: 'webhook',
            source: 'webhook',
          });
        }
      }
      res.json({ ok: true });
    } catch (err) {
      console.error('[billing.webhook]', err);
      res.status(500).json({ error: 'webhook failed' });
    }
  });
}

function expressRawJsonFallback(req, res, next) {
  // Body already parsed by express.json in most cases.
  next();
}

export function entitlementMiddleware(req, res, next) {
  if (!req.path.startsWith('/api')) return next();
  if (isBillingExemptPath(req.path)) return next();
  if (req.method === 'OPTIONS') return next();
  if (!req.tenant) return next(); // auth middleware will 401

  const ent = getEntitlement(req.tenant.id);
  req.entitlement = ent;
  if (ent.access) return next();

  return res.status(402).json({
    error: 'Subscription required',
    code: 'payment_required',
    entitlement: ent,
    message: ent.reason === 'expired'
      ? 'Your free trial or subscription has ended. Choose a plan to continue.'
      : 'Payment is required to use this workspace.',
  });
}
