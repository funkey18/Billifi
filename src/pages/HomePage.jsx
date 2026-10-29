import { Link } from 'react-router-dom';
import {
  ArrowRight, CalendarDays, CheckCircle2, Cloud, FileText, Package, Receipt,
  Rocket, ShieldCheck, Star, Users, Wallet,
} from 'lucide-react';

/**
 * Structure mirrors the reference landing page:
 * Hero (text left / illustration right) → Stats bar → Why choose + 3×2 cards → CTA band → Footer (in layout)
 */

const SERVICES = [
  { title: 'Web Invoicing', body: 'Create Tax Invoice, Credit Note, Bill of Supply and Delivery Challan in minutes.', icon: FileText, color: '#008b9b' },
  { title: 'GST Returns', body: 'GSTR-1 / GSTR-3B summaries and GSTR-2B reconciliation exports for filing.', icon: Receipt, color: '#22c55e' },
  { title: 'Inventory', body: 'Products, HSN/SAC, stock alerts and purchase bills for day-to-day operations.', icon: Package, color: '#a855f7' },
  { title: 'Cloud Tenancy', body: 'Each organisation is isolated in the database with secure login sessions.', icon: Cloud, color: '#eab308' },
  { title: 'Payments', body: 'Receipts, partial payments, recurring invoices and outstanding reports.', icon: Wallet, color: '#ec4899' },
  { title: 'Trial & Plans', body: '7-day free trial, then Monthly / Silver / Gold / Platinum with Razorpay checkout.', icon: ShieldCheck, color: '#008b9b' },
];

const HERO_PILLARS = [
  { title: 'Build', text: 'Set up your business profile, clients, products and GSTIN once.' },
  { title: 'Bill', text: 'Raise GST invoices, track dues and share PDFs with customers.' },
  { title: 'Grow', text: 'Export return data, monitor cashflow and scale with secure tenancy.' },
];

const HERO_CHECKS = [
  '7-day free trial — no card required to start',
  'CGST / SGST / IGST auto-calculation on every bill',
  'GSTR-1, GSTR-3B & GSTR-2B helpers for filing',
  'Multi-tenant cloud — each company stays isolated',
];

export default function HomePage() {
  return (
    <>
      {/* 2) HERO — left copy, right illustration */}
      <div className="g-hero-wrap">
        <section className="g-hero">
          <div className="g-hero-left">
            <h1>
              Your Business
              <span>Our Technology</span>
            </h1>
            <p className="g-hero-chain">Ideas → Invoices → Impact</p>
            <p className="g-hero-lead">
              BilliFi is a secure, multi-tenant invoicing platform for Indian shops,
              freelancers and traders. Create tax invoices, manage stock and payments, prepare
              GST returns — then continue on Monthly, Silver, Gold, or Platinum after your free trial.
            </p>

            <div className="g-hero-pillars">
              {HERO_PILLARS.map(({ title, text }) => (
                <div key={title} className="g-hero-pillar">
                  <div className="g-hero-pillar-ico"><Rocket size={16} /></div>
                  <div>
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </div>
                </div>
              ))}
            </div>

            <ul className="g-hero-checks">
              {HERO_CHECKS.map((item) => (
                <li key={item}>
                  <CheckCircle2 size={18} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="g-hero-actions">
              <Link to="/features" className="g-btn g-btn-primary">
                Explore Our Features <ArrowRight size={16} />
              </Link>
              <Link to="/register" className="g-btn g-btn-outline">
                Start 7-day free trial
              </Link>
            </div>
            <p className="g-hero-note">
              Trusted workflow for MSMEs · Razorpay-ready billing · Cancel anytime after trial
            </p>
          </div>

          <div className="g-hero-right">
            <img
              className="g-hero-img"
              src="/gst-hero-illustration.jpg"
              alt="GST billing software illustration"
              width={520}
              height={520}
            />
          </div>
        </section>
      </div>

      {/* 3) STATS — overlapping white bar */}
      <div className="g-stats-wrap">
        <div className="g-stats">
          <div className="g-stat">
            <div className="g-stat-ico"><Users size={22} /></div>
            <div>
              <strong>250+</strong>
              <em>Happy Clients</em>
            </div>
          </div>
          <div className="g-stat">
            <div className="g-stat-ico"><FileText size={22} /></div>
            <div>
              <strong>10k+</strong>
              <em>Invoices Created</em>
            </div>
          </div>
          <div className="g-stat">
            <div className="g-stat-ico"><CalendarDays size={22} /></div>
            <div>
              <strong>5+</strong>
              <em>Years Building</em>
            </div>
          </div>
          <div className="g-stat">
            <div className="g-stat-ico"><Star size={22} /></div>
            <div>
              <strong>98%</strong>
              <em>Client Satisfaction</em>
            </div>
          </div>
        </div>
      </div>

      {/* 4) SERVICES — eyebrow + dual headline + 3×2 cards */}
      <section className="g-services">
        <p className="g-eyebrow">Why Choose BilliFi?</p>
        <h2>
          We Build More Than Just Invoices
          <span>We Build Your Compliance</span>
        </h2>
        <p className="g-services-sub">
          A complete GST workspace for Indian businesses — invoices, stock, returns helpers,
          and secure multi-tenant hosting with a clear free trial.
        </p>

        <div className="g-svc-grid">
          {SERVICES.map(({ title, body, icon: Icon, color }) => (
            <article key={title} className="g-svc-card">
              <div className="g-svc-ico" style={{ background: color }}>
                <Icon size={22} />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
              <span className="g-svc-arrow" aria-hidden>
                <ArrowRight size={14} />
              </span>
            </article>
          ))}
        </div>
      </section>

      {/* 5) CTA — laptop left, text + pill link right */}
      <div className="g-cta-wrap">
        <section className="g-cta">
          <img
            className="g-cta-img"
            src="/gst-cta-laptop.jpg"
            alt="GST dashboard on laptop"
            width={360}
            height={270}
          />
          <div>
            <h3>Let&apos;s Build Something Great Together!</h3>
            <p>
              Start your 7-day free trial today. Create invoices, manage clients and stock,
              and upgrade to Monthly or Yearly when you&apos;re ready — your data stays yours.
            </p>
            <Link to="/register" className="g-cta-link">
              Start free trial <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
