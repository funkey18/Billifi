import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Check, CreditCard, History, Lock, ShieldCheck, Sparkles,
} from 'lucide-react';
import { getToken } from '../auth';
import './public.css';

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function loadHyperLoader(sdkUrl) {
  return new Promise((resolve) => {
    if (window.Hyper) return resolve(true);
    const existing = document.querySelector('script[data-hyperswitch-loader]');
    if (existing) {
      existing.addEventListener('load', () => resolve(!!window.Hyper));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const s = document.createElement('script');
    s.src = sdkUrl || 'https://beta.hyperswitch.io/v1/HyperLoader.js';
    s.async = true;
    s.dataset.hyperswitchLoader = '1';
    s.onload = () => resolve(!!window.Hyper);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function formatInr(paise) {
  return `₹${(Number(paise || 0) / 100).toLocaleString('en-IN')}`;
}

function planDisplayName(planId, plans) {
  const hit = (plans || []).find((p) => p.id === planId);
  if (hit) return hit.name;
  const legacy = { silver: 'Yearly', gold: 'Yearly', platinum: '3-Year', yearly: 'Yearly' };
  return legacy[planId] || planId || '—';
}

function statusTone(status) {
  if (status === 'paid' || status === 'captured') return 'ok';
  if (status === 'failed') return 'bad';
  if (status === 'created' || status === 'pending') return 'pending';
  return 'muted';
}

export default function BillingPage({ forced = false }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cfg, setCfg] = useState(null);
  const [ent, setEnt] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [payments, setPayments] = useState([]);
  const [checkout, setCheckout] = useState(null);
  const [paying, setPaying] = useState(false);
  const [sideTab, setSideTab] = useState('subscription');
  const hyperRef = useRef(null);
  const widgetsRef = useRef(null);

  const refresh = useCallback(async () => {
    const [plansRes, statusRes, payRes] = await Promise.all([
      fetch('/api/billing/plans', { credentials: 'include', headers: authHeaders() }),
      fetch('/api/billing/status', { credentials: 'include', headers: authHeaders() }),
      fetch('/api/billing/payments', { credentials: 'include', headers: authHeaders() }),
    ]);
    if (plansRes.ok) setCfg(await plansRes.json());
    if (statusRes.ok) setEnt(await statusRes.json());
    if (payRes.ok) {
      const data = await payRes.json();
      setPayments(data.payments || []);
    }
  }, []);

  useEffect(() => { refresh().catch(() => {}); }, [refresh]);

  useEffect(() => {
    const paymentFlag = searchParams.get('payment');
    const localPaymentId = searchParams.get('local_payment_id');
    if (paymentFlag !== 'return' || !localPaymentId) return;

    let cancelled = false;
    (async () => {
      setBusy('verify');
      setError('');
      try {
        const verify = await fetch('/api/billing/verify', {
          method: 'POST',
          credentials: 'include',
          headers: authHeaders(),
          body: JSON.stringify({ paymentId: localPaymentId }),
        });
        const result = await verify.json();
        if (!verify.ok) throw new Error(result.error || 'Verification failed');
        if (cancelled) return;
        setEnt(result.entitlement);
        await refresh();
        setSearchParams({}, { replace: true });
        navigate('/app', { replace: true });
      } catch (err) {
        if (!cancelled) setError(err.message || 'Payment verification failed');
      } finally {
        if (!cancelled) setBusy('');
      }
    })();

    return () => { cancelled = true; };
  }, [searchParams, setSearchParams, navigate, refresh]);

  useEffect(() => {
    if (!checkout || checkout.mode !== 'hyperswitch') return undefined;

    let cancelled = false;
    let unifiedCheckout;

    (async () => {
      const ok = await loadHyperLoader(checkout.sdkUrl);
      if (!ok || cancelled) {
        if (!cancelled) setError('Could not load Hyperswitch checkout');
        return;
      }

      const hyperOpts = { customBackendUrl: checkout.baseUrl };
      if (checkout.profileId) hyperOpts.profileId = checkout.profileId;
      const hyper = window.Hyper(checkout.publishableKey, hyperOpts);
      hyperRef.current = hyper;

      const widgets = hyper.widgets({
        appearance: { theme: 'default' },
        clientSecret: checkout.clientSecret,
      });
      widgetsRef.current = widgets;

      unifiedCheckout = widgets.create('payment', {
        layout: 'tabs',
        wallets: { walletReturnUrl: checkout.returnUrl },
      });
      unifiedCheckout.mount('#hyperswitch-unified-checkout');
    })().catch((err) => {
      if (!cancelled) setError(err.message || 'Failed to initialize checkout');
    });

    return () => {
      cancelled = true;
      try { unifiedCheckout?.destroy?.(); } catch { /* ignore */ }
      hyperRef.current = null;
      widgetsRef.current = null;
    };
  }, [checkout]);

  const closeCheckout = () => {
    setCheckout(null);
    setBusy('');
    setPaying(false);
  };

  const startCheckout = async (planId) => {
    setBusy(planId);
    setError('');
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify({ planId }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error || 'Checkout failed');

      if (order.mode === 'mock') {
        const verify = await fetch('/api/billing/verify', {
          method: 'POST',
          credentials: 'include',
          headers: authHeaders(),
          body: JSON.stringify({
            paymentId: order.paymentId,
            orderId: order.orderId,
          }),
        });
        const result = await verify.json();
        if (!verify.ok) throw new Error(result.error || 'Verification failed');
        setEnt(result.entitlement);
        await refresh();
        navigate('/app', { replace: true });
        return;
      }

      if (order.mode === 'razorpay') {
        const ok = await loadRazorpayScript();
        if (!ok) throw new Error('Could not load Razorpay Checkout');

        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'BilliFi',
          description: `${order.plan.name} plan`,
          order_id: order.orderId,
          prefill: order.prefill,
          theme: { color: '#008b9b' },
          handler: async (response) => {
            try {
              const verify = await fetch('/api/billing/verify', {
                method: 'POST',
                credentials: 'include',
                headers: authHeaders(),
                body: JSON.stringify({
                  paymentId: order.paymentId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              const result = await verify.json();
              if (!verify.ok) throw new Error(result.error || 'Verification failed');
              setEnt(result.entitlement);
              await refresh();
              navigate('/app', { replace: true });
            } catch (err) {
              setError(err.message || 'Payment verification failed');
            } finally {
              setBusy('');
            }
          },
          modal: { ondismiss: () => setBusy('') },
        });
        rzp.open();
        return;
      }

      setCheckout(order);
    } catch (err) {
      setError(err.message || 'Payment failed');
      setBusy('');
    }
  };

  const confirmHyperswitch = async (e) => {
    e.preventDefault();
    if (!hyperRef.current || !widgetsRef.current || !checkout) return;
    setPaying(true);
    setError('');
    try {
      const { error: payError, status } = await hyperRef.current.confirmPayment({
        widgets: widgetsRef.current,
        confirmParams: { return_url: checkout.returnUrl },
        redirect: 'if_required',
      });

      if (payError) throw new Error(payError.message || 'Payment failed');

      if (!status || ['succeeded', 'processing', 'partially_captured'].includes(String(status).toLowerCase())) {
        const verify = await fetch('/api/billing/verify', {
          method: 'POST',
          credentials: 'include',
          headers: authHeaders(),
          body: JSON.stringify({
            paymentId: checkout.paymentId,
            orderId: checkout.orderId || checkout.hyperswitchPaymentId,
          }),
        });
        const result = await verify.json();
        if (!verify.ok) throw new Error(result.error || 'Verification failed');
        setEnt(result.entitlement);
        closeCheckout();
        await refresh();
        navigate('/app', { replace: true });
        return;
      }

      throw new Error(`Unexpected payment status: ${status}`);
    } catch (err) {
      setError(err.message || 'Payment verification failed');
    } finally {
      setPaying(false);
      setBusy('');
    }
  };

  const cancelPlan = async () => {
    if (!window.confirm('Cancel at period end? You keep access until the current period finishes.')) return;
    setBusy('cancel');
    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cancel failed');
      setEnt(data.entitlement);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const locked = ent && !ent.access;
  const plans = cfg?.plans || [];
  const comparisonFeatures = plans[0]?.features || [];
  const statusLabel = {
    trialing: 'Free trial',
    active: 'Active subscription',
    past_due: 'Past due — grace period',
    cancelled: 'Cancelled (access until period end)',
    expired: 'Expired — payment required',
  }[ent?.status] || ent?.status;

  return (
    <div className="pub-shell bill-page">
      <div className="bill-layout">
        <main className="bill-main">
          <div className="bill-header">
            <p className="bill-eyebrow">
              <Sparkles size={14} /> Subscription
            </p>
            <h1>{forced || locked ? 'Subscribe to continue' : 'Billing & plans'}</h1>
            <p className="bill-lead">
              {locked
                ? 'Your free trial or subscription has ended. Choose a duration — every plan includes the full BilliFi feature set. Your data stays safe.'
                : 'One product, three billing periods. Monthly, yearly, or 3-year — all features included. Pay securely with Razorpay.'}
            </p>
          </div>

          {ent && (
            <div className={`bill-status bill-status-${ent.status || 'unknown'}`}>
              <div>
                <div className="bill-status-label">Current status</div>
                <strong>{statusLabel}</strong>
                <p>
                  {ent.reason === 'trial' && <>Trial ends {new Date(ent.trialEndsAt).toLocaleDateString()} · <strong>{ent.daysLeft} day(s) left</strong></>}
                  {ent.reason === 'active' && <>{ent.planName} · renews/ends {new Date(ent.currentPeriodEnd).toLocaleDateString()} · {ent.daysLeft} day(s) left</>}
                  {ent.reason === 'past_due' && <>Grace until {new Date(ent.graceEndsAt).toLocaleDateString()}. Pay now to avoid lockout.</>}
                  {(ent.reason === 'expired' || ent.reason === 'blocked') && <>Workspace locked. Subscribe below to restore access instantly.</>}
                  {ent.reason === 'cancelled_until_period_end' && <>Access continues until {new Date(ent.currentPeriodEnd).toLocaleDateString()}.</>}
                </p>
              </div>
              {ent.paymentMode === 'razorpay' && (
                <div className="bill-secure">
                  <ShieldCheck size={16} />
                  Secured by Razorpay
                </div>
              )}
            </div>
          )}

          {error && <div className="pub-error">{error}</div>}

          {checkout?.mode === 'hyperswitch' && (
            <div className="bill-panel" style={{ marginBottom: '1.25rem' }}>
            <div className="bill-checkout-head">
              <h3 style={{ margin: 0 }}>Pay {checkout.plan?.label} — {checkout.plan?.name}</h3>
              <button type="button" className="pub-btn pub-btn-ghost" onClick={closeCheckout} disabled={paying}>
                Cancel
              </button>
            </div>
              <form onSubmit={confirmHyperswitch}>
                <div id="hyperswitch-unified-checkout" style={{ minHeight: 180 }} />
                <button
                  type="submit"
                  className="pub-btn pub-btn-primary"
                  style={{ width: '100%', marginTop: '1rem' }}
                  disabled={paying}
                >
                  {paying ? 'Confirming…' : `Pay ${checkout.plan?.label || ''}`}
                </button>
              </form>
            </div>
          )}

          <div className="bill-plan-grid">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={`bill-plan-card${plan.badge ? ' featured' : ''}`}
              >
                {plan.badge && <div className="bill-plan-badge">{plan.badge}</div>}
                <h2>{plan.name}</h2>
                <div className="bill-plan-price">
                  {plan.label}
                  <span>{plan.periodLabel}</span>
                </div>
                {plan.perMonthInr ? (
                  <p className="bill-plan-equiv">≈ ₹{plan.perMonthInr}/month</p>
                ) : null}
                {plan.savingsInr ? (
                  <p className="bill-plan-save">Save ₹{plan.savingsInr.toLocaleString('en-IN')} vs monthly</p>
                ) : (
                  <p className="bill-plan-save muted">Flexible month-to-month</p>
                )}
                <p className="bill-plan-desc">{plan.description}</p>
                <ul className="bill-plan-highlights">
                  <li><Check size={15} /> All features included</li>
                  <li><Check size={15} /> GST billing & reports</li>
                  <li><Check size={15} /> Multi-business profiles</li>
                  <li><Check size={15} /> Priority support</li>
                </ul>
                <button
                  type="button"
                  className="pub-btn pub-btn-primary bill-plan-cta"
                  disabled={!!busy || !!checkout}
                  onClick={() => startCheckout(plan.id)}
                >
                  {busy === plan.id ? 'Opening Razorpay…' : `Pay ${plan.label}${plan.periodLabel || ''}`}
                </button>
              </article>
            ))}
          </div>

          {comparisonFeatures.length > 0 && (
            <section className="bill-compare">
              <div className="bill-compare-head">
                <h2>Feature comparison</h2>
                <p>Every duration unlocks the complete BilliFi workspace — pick how long you want to pay for.</p>
              </div>
              <div className="bill-compare-wrap bill-compare-desktop">
                <table className="bill-compare-table">
                  <thead>
                    <tr>
                      <th>Feature</th>
                      {plans.map((p) => <th key={p.id}>{p.name}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bill-compare-price-row">
                      <td>Price</td>
                      {plans.map((p) => (
                        <td key={p.id}>
                          <strong>{p.label}</strong>
                          <span className="bill-compare-period">{p.periodLabel}</span>
                        </td>
                      ))}
                    </tr>
                    {comparisonFeatures.map((feature) => (
                      <tr key={feature}>
                        <td>{feature}</td>
                        {plans.map((p) => (
                          <td key={p.id} className="bill-compare-check">
                            <Check size={16} aria-label="Included" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bill-compare-mobile">
                <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--g-muted)' }}>
                  Included in Monthly, Yearly, and 3-Year:
                </p>
                <ul>
                  {comparisonFeatures.map((feature) => (
                    <li key={feature}><Check size={15} /> {feature}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <div className="bill-actions">
            {!locked && (
              <Link to="/app" className="pub-btn pub-btn-ghost">
                <ArrowLeft size={16} /> Back to app
              </Link>
            )}
            {ent?.access && ['active', 'past_due', 'trialing'].includes(ent.status) && (
              <button type="button" className="pub-btn pub-btn-ghost" disabled={busy === 'cancel'} onClick={cancelPlan}>
                {busy === 'cancel' ? 'Cancelling…' : 'Cancel plan'}
              </button>
            )}
          </div>
        </main>

        <aside className="bill-sidebar">
          <div className="bill-side-tabs">
            <button
              type="button"
              className={sideTab === 'subscription' ? 'active' : ''}
              onClick={() => setSideTab('subscription')}
            >
              <CreditCard size={15} /> Subscription
            </button>
            <button
              type="button"
              className={sideTab === 'history' ? 'active' : ''}
              onClick={() => setSideTab('history')}
            >
              <History size={15} /> History
              {payments.length > 0 && <span className="bill-side-count">{payments.length}</span>}
            </button>
          </div>

          {sideTab === 'subscription' ? (
            <div className="bill-side-panel">
              <h3>Subscription tracking</h3>
              <dl className="bill-side-meta">
                <div>
                  <dt>Status</dt>
                  <dd>{statusLabel || '—'}</dd>
                </div>
                <div>
                  <dt>Plan</dt>
                  <dd>{ent?.planName || (ent?.reason === 'trial' ? 'Trial' : 'None')}</dd>
                </div>
                <div>
                  <dt>Days left</dt>
                  <dd>{ent?.daysLeft != null ? ent.daysLeft : '—'}</dd>
                </div>
                <div>
                  <dt>Period end</dt>
                  <dd>
                    {ent?.currentPeriodEnd
                      ? new Date(ent.currentPeriodEnd).toLocaleDateString()
                      : ent?.trialEndsAt
                        ? new Date(ent.trialEndsAt).toLocaleDateString()
                        : '—'}
                  </dd>
                </div>
                <div>
                  <dt>Access</dt>
                  <dd>{ent?.access ? 'Unlocked' : 'Locked'}</dd>
                </div>
              </dl>
              <div className="bill-side-note">
                <Lock size={14} />
                Payments are verified server-side with Razorpay signatures. Card details never touch BilliFi servers.
              </div>
            </div>
          ) : (
            <div className="bill-side-panel">
              <h3>Payment history</h3>
              {payments.length === 0 ? (
                <p className="bill-side-empty">No payments yet. Your invoices and Razorpay receipts will appear here after checkout.</p>
              ) : (
                <ul className="bill-history">
                  {payments.map((p) => (
                    <li key={p.id}>
                      <div className="bill-history-top">
                        <strong>{planDisplayName(p.planId, plans)}</strong>
                        <span className={`bill-pay-pill ${statusTone(p.status)}`}>{p.status}</span>
                      </div>
                      <div className="bill-history-bottom">
                        <span>{formatInr(p.amountPaise)}</span>
                        <span>{new Date(p.createdAt).toLocaleString()}</span>
                      </div>
                      {p.paymentId && (
                        <div className="bill-history-id">RZP {p.paymentId}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
