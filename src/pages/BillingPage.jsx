import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getToken } from '../auth';
import './public.css';

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
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

export default function BillingPage({ forced = false }) {
  const navigate = useNavigate();
  const [cfg, setCfg] = useState(null);
  const [ent, setEnt] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [payments, setPayments] = useState([]);

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

  const completeMockOrRazorpay = async (planId) => {
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
            razorpayOrderId: order.orderId,
            razorpayPaymentId: `mock_${Date.now()}`,
            razorpaySignature: 'mock',
          }),
        });
        const result = await verify.json();
        if (!verify.ok) throw new Error(result.error || 'Verification failed');
        setEnt(result.entitlement);
        await refresh();
        navigate('/app', { replace: true });
        return;
      }

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
        theme: { color: '#1f6b4a' },
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
        modal: {
          ondismiss: () => setBusy(''),
        },
      });
      rzp.open();
    } catch (err) {
      setError(err.message || 'Payment failed');
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
  const statusLabel = {
    trialing: 'Free trial',
    active: 'Active subscription',
    past_due: 'Past due — grace period',
    cancelled: 'Cancelled (access until period end)',
    expired: 'Expired — payment required',
  }[ent?.status] || ent?.status;

  return (
    <div className="pub-shell" style={{ minHeight: '100vh' }}>
      <div className="pub-section" style={{ maxWidth: 980, margin: '0 auto' }}>
        <h2>{forced || locked ? 'Subscribe to continue' : 'Billing & plans'}</h2>
        <p>
          {locked
            ? 'Your free trial or subscription has ended. Choose a plan to unlock your workspace. Your data is retained.'
            : 'Manage your trial, upgrade to Monthly / Silver / Gold / Platinum, or review payments.'}
        </p>

        {ent && (
          <div className="pub-svc" style={{ marginBottom: '1.5rem' }}>
            <h3>Current status: {statusLabel}</h3>
            <p>
              {ent.reason === 'trial' && <>Trial ends {new Date(ent.trialEndsAt).toLocaleString()} · <strong>{ent.daysLeft} day(s) left</strong></>}
              {ent.reason === 'active' && <>{ent.planName} plan · renews/ends {new Date(ent.currentPeriodEnd).toLocaleString()} · {ent.daysLeft} day(s) left</>}
              {ent.reason === 'past_due' && <>Grace until {new Date(ent.graceEndsAt).toLocaleString()}. Pay now to avoid lockout.</>}
              {(ent.reason === 'expired' || ent.reason === 'blocked') && <>Workspace locked. Subscribe below to restore access instantly.</>}
              {ent.reason === 'cancelled_until_period_end' && <>Access continues until {new Date(ent.currentPeriodEnd).toLocaleString()}.</>}
            </p>
            {ent.paymentMode === 'mock' && (
              <p style={{ color: '#9a3412', marginTop: '0.5rem' }}>
                Payment gateway is in <strong>mock mode</strong> (no Razorpay keys). Checkout will simulate a successful payment for local testing.
              </p>
            )}
          </div>
        )}

        {error && <div className="pub-error">{error}</div>}

        <div className="pub-price-grid pub-price-grid-4">
          {(cfg?.plans || []).map((plan) => (
            <article key={plan.id} className={`pub-price-card ${plan.id === 'gold' ? 'featured' : ''}`}>
              {plan.badge && <div className="pub-badge">{plan.badge}</div>}
              <h3 style={{ margin: 0 }}>{plan.name}</h3>
              <div className="pub-price-amount" style={{ fontSize: '1.55rem' }}>
                {plan.label}
                <span style={{ fontSize: '0.55em', fontWeight: 600, color: 'var(--g-muted)', marginLeft: 6 }}>
                  {plan.periodLabel || ''}
                </span>
              </div>
              {plan.perMonthInr ? (
                <p style={{ color: 'var(--g-teal)', fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>
                  ≈ ₹{plan.perMonthInr}/month, billed yearly
                </p>
              ) : null}
              <p style={{ color: 'var(--g-muted)' }}>{plan.description}</p>
              <ul>
                {(plan.features || []).slice(0, 6).map((f) => <li key={f}>• {f}</li>)}
              </ul>
              <button
                type="button"
                className="pub-btn pub-btn-primary"
                style={{ width: '100%' }}
                disabled={!!busy}
                onClick={() => completeMockOrRazorpay(plan.id)}
              >
                {busy === plan.id ? 'Processing…' : `Pay ${plan.label}${plan.periodLabel || ''}`}
              </button>
            </article>
          ))}
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {!locked && (
            <Link to="/app" className="pub-btn pub-btn-ghost">Back to app</Link>
          )}
          {ent?.access && ['active', 'past_due', 'trialing'].includes(ent.status) && (
            <button type="button" className="pub-btn pub-btn-ghost" disabled={busy === 'cancel'} onClick={cancelPlan}>
              {busy === 'cancel' ? 'Cancelling…' : 'Cancel plan'}
            </button>
          )}
        </div>

        {payments.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Payment history</h3>
            <div className="pub-svc">
              {payments.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '0.4rem 0', borderBottom: '1px solid var(--gy-line)', fontSize: '0.92rem' }}>
                  <span>{p.planId} · {p.status}</span>
                  <span>₹{(p.amountPaise / 100).toLocaleString('en-IN')} · {new Date(p.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
