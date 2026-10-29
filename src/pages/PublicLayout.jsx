import { Link, NavLink, Outlet } from 'react-router-dom';
import { Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import './public.css';

export default function PublicLayout() {
  return (
    <div className="pub-shell">
      <header className="g-header">
        <Link to="/" className="g-logo">
          <span className="g-logo-mark">G</span>
          Free GST Billing
        </Link>

        <nav className="g-nav">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/features">Features</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/login">Sign in</NavLink>
        </nav>

        <div className="g-header-right">
          <Link to="/register" className="g-btn g-btn-primary">Get in Touch</Link>
        </div>
      </header>

      <Outlet />

      <footer className="g-footer">
        <div className="g-footer-main">
          <div className="g-footer-brand">
            <div className="g-footer-brand-row">
              <span className="g-logo-mark">G</span>
              <strong>Free GST Billing</strong>
            </div>
            <p>
              Enterprise-ready GST invoicing for Indian MSMEs — tax invoices, inventory,
              returns helpers, and secure multi-tenant cloud workspaces with trial-based plans.
            </p>
            <div className="g-footer-trust">
              <ShieldCheck size={16} />
              <span>JWT auth · Tenant isolation · Razorpay billing</span>
            </div>
          </div>

          <div className="g-footer-col">
            <h4>Product</h4>
            <Link to="/features">Features</Link>
            <Link to="/pricing">Pricing & plans</Link>
            <Link to="/register">Start free trial</Link>
            <Link to="/login">Customer login</Link>
            <Link to="/billing">Billing portal</Link>
          </div>

          <div className="g-footer-col">
            <h4>Solutions</h4>
            <span>Retail & kirana billing</span>
            <span>Freelancer invoicing</span>
            <span>Wholesale / trading</span>
            <span>Service businesses</span>
            <span>Multi-GSTIN companies</span>
          </div>

          <div className="g-footer-col">
            <h4>Company</h4>
            <Link to="/about">About us</Link>
            <Link to="/features">Why Free GST Billing</Link>
            <Link to="/pricing">Compare plans</Link>
            <a href="mailto:support@freegstbill.app">Support</a>
            <a href="mailto:privacy@freegstbill.app">Privacy</a>
          </div>

          <div className="g-footer-col g-footer-contact">
            <h4>Contact</h4>
            <div className="g-footer-contact-row">
              <MapPin size={16} />
              <span>India · Cloud multi-tenant platform</span>
            </div>
            <div className="g-footer-contact-row">
              <Phone size={16} />
              <a href="tel:+919876543210">+91 98765 43210</a>
            </div>
            <div className="g-footer-contact-row">
              <Mail size={16} />
              <a href="mailto:support@freegstbill.app">support@freegstbill.app</a>
            </div>
            <div className="g-footer-contact-row">
              <Mail size={16} />
              <a href="mailto:sales@freegstbill.app">sales@freegstbill.app</a>
            </div>
            <p className="g-footer-hours">Support hours: Mon–Sat, 10:00–19:00 IST</p>
          </div>
        </div>

        <div className="g-footer-bottom">
          <span>© {new Date().getFullYear()} Free GST Billing. All rights reserved.</span>
          <span>Your Business. Our Software. Better Compliance.</span>
          <span>Terms · Privacy · Security</span>
        </div>
      </footer>
    </div>
  );
}
