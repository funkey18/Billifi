import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ShieldAlert, Sparkles, TimerReset, WalletCards } from 'lucide-react';

export default function PricingPage() {
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    fetch('/api/public/plans').then((r) => r.json()).then(setCfg).catch(() => setCfg(null));
  }, []);

  const plans = cfg?.plans || [];

  return (
    <div className="g-page">
      <div className="g-page-head">
        <p className="g-eyebrow">Transparent pricing</p>
        <h1>Start free for <span>{cfg?.trialDays || 7} days</span></h1>
        <p>
          No card required. After the trial, pick Monthly or a yearly Silver / Gold / Platinum plan.
          Prices match desktop-class GST billing market rates. Unpaid workspaces lock — data stays safe.
        </p>
      </div>

      <div className="g-price-grid g-price-grid-4">
        {plans.map((plan) => (
          <article key={plan.id} className={`g-price-card ${plan.id === 'gold' ? 'featured' : ''}`}>
            {plan.badge && <div className="g-badge">{plan.badge}</div>}
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{plan.name}</h3>
            <div className="g-price-amt">
              {plan.label}
              <span className="g-price-period">{plan.periodLabel || ''}</span>
            </div>
            {plan.perMonthInr ? (
              <p className="g-price-equiv">≈ ₹{plan.perMonthInr}/month, billed yearly</p>
            ) : (
              <p className="g-price-equiv">Billed monthly · cancel anytime</p>
            )}
            <p style={{ color: 'var(--g-muted)', margin: '8px 0 0', fontSize: 14 }}>{plan.description}</p>
            <ul>
              {(plan.features || []).map((f) => (
                <li key={f}><Check size={16} /> {f}</li>
              ))}
            </ul>
            <Link to="/register" className="g-btn g-btn-primary" style={{ width: '100%' }}>
              Start trial <ArrowRight size={16} />
            </Link>
          </article>
        ))}
      </div>
      <p className="g-price-note">Prices in INR, exclusive of applicable GST. Yearly plans lock the rate for 12 months.</p>

      <div className="g-info-grid">
        {[
          [Sparkles, 'How signup works', 'Create a workspace with email & password. Trial starts immediately.'],
          [TimerReset, 'During the trial', 'Full product access with a countdown banner before day 7 ends.'],
          [WalletCards, 'Choosing a plan', 'Pay Monthly, Silver, Gold, or Platinum via Razorpay. Access continues on success.'],
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
