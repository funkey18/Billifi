import { Link } from 'react-router-dom';
import { ArrowRight, Goal, HeartHandshake, ShieldCheck } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="g-page">
      <div className="g-page-head">
        <p className="g-eyebrow">About us</p>
        <h1>Built for Indian <span>MSMEs</span></h1>
        <p>
          Free GST Billing helps shops, freelancers and traders create invoices and prepare GST data —
          with secure multi-tenant hosting and fair trial-based subscriptions.
        </p>
      </div>

      <div className="g-svc-grid">
        <article className="g-svc-card">
          <div className="g-svc-ico" style={{ background: '#008b9b' }}><Goal size={22} /></div>
          <h3>Our mission</h3>
          <p>Make GST-compliant billing accessible: fast invoices, clear return helpers, data that never leaks across companies.</p>
          <span className="g-svc-arrow"><ArrowRight size={14} /></span>
        </article>
        <article className="g-svc-card">
          <div className="g-svc-ico" style={{ background: '#22c55e' }}><ShieldCheck size={22} /></div>
          <h3>How tenancy works</h3>
          <p>Each signup creates a private organisation. Bills, clients and settings live only under that tenant ID.</p>
          <span className="g-svc-arrow"><ArrowRight size={14} /></span>
        </article>
        <article className="g-svc-card">
          <div className="g-svc-ico" style={{ background: '#008b9b' }}><HeartHandshake size={22} /></div>
          <h3>Fair commercial model</h3>
          <p>7-day free trial to evaluate fit. Then Monthly, Silver, Gold, or Platinum. If you don’t pay, access pauses — data remains.</p>
          <span className="g-svc-arrow"><ArrowRight size={14} /></span>
        </article>
      </div>

      <div style={{ textAlign: 'center', marginTop: 36 }}>
        <Link to="/register" className="g-btn g-btn-primary">
          Get in Touch <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
