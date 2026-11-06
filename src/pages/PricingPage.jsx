import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ShieldAlert, Sparkles, TimerReset, WalletCards } from 'lucide-react';

export default function PricingPage() {
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    fetch('/api/public/plans').then((r) => r.json()).then(setCfg).catch(() => setCfg(null));
  }, []);

  const plans = cfg?.plans || [];
  const comparisonFeatures = plans[0]?.features || [];

  return (
    <div className="g-page">
      <div className="g-page-head">
        <p className="g-eyebrow">Transparent pricing</p>
        <h1>Start free for <span>{cfg?.trialDays || 7} days</span></h1>
        <p>
          No card required. After the trial, choose Monthly, Yearly, or 3-Year —
          every plan includes the full BilliFi feature set. Pay securely with Razorpay.
        </p>
      </div>

      <div className="g-price-grid g-price-grid-3">
        {plans.map((plan) => (
          <article key={plan.id} className={`g-price-card ${plan.badge ? 'featured' : ''}`}>
            {plan.badge && <div className="g-badge">{plan.badge}</div>}
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{plan.name}</h3>
            <div className="g-price-amt">
              {plan.label}
              <span className="g-price-period">{plan.periodLabel || ''}</span>
            </div>
            {plan.perMonthInr ? (
              <p className="g-price-equiv">≈ ₹{plan.perMonthInr}/month</p>
            ) : null}
            {plan.savingsInr ? (
              <p className="g-price-equiv" style={{ color: '#0f766e' }}>
                Save ₹{plan.savingsInr.toLocaleString('en-IN')} vs monthly
              </p>
            ) : (
              <p className="g-price-equiv">Billed monthly · cancel anytime</p>
            )}
            <p style={{ color: 'var(--g-muted)', margin: '8px 0 0', fontSize: 14 }}>{plan.description}</p>
            <ul>
              <li><Check size={16} /> All features included</li>
              <li><Check size={16} /> Unlimited GST invoices</li>
              <li><Check size={16} /> Reports & multi-business profiles</li>
              <li><Check size={16} /> Priority support</li>
            </ul>
            <Link to="/register" className="g-btn g-btn-primary" style={{ width: '100%' }}>
              Start trial <ArrowRight size={16} />
            </Link>
          </article>
        ))}
      </div>
      <p className="g-price-note">Prices in INR. All three plans unlock the same complete product — only the billing period changes.</p>

      {comparisonFeatures.length > 0 && (
        <div className="bill-compare" style={{ marginTop: 28, marginBottom: 28 }}>
          <div className="bill-compare-head">
            <h2>Feature comparison</h2>
            <p>Same workspace on every plan. Pick the duration that fits your business.</p>
          </div>
          <div className="bill-compare-wrap">
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
        </div>
      )}

      <div className="g-info-grid">
        {[
          [Sparkles, 'How signup works', 'Create a workspace with email & password. Trial starts immediately.'],
          [TimerReset, 'During the trial', 'Full product access with a countdown banner before day 7 ends.'],
          [WalletCards, 'Choosing a plan', 'Pay Monthly (₹199), Yearly (₹1,999), or 3-Year (₹3,999) via Razorpay.'],
          [ShieldAlert, "If you don’t pay", `App locks after trial. ${cfg?.graceDays || 3}-day grace after a paid period lapses. Data retained.`],
        ].map(([Icon, title, body]) => (
          <article key={title} className="g-svc-card">
            <div className="g-svc-ico" style={{ background: '#008b9b' }}><Icon size={20} /></div>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
