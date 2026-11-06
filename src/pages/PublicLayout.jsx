import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Mail, MapPin, Menu, Phone, X } from 'lucide-react';
import {
  PRODUCT_NAME,
  SUPPORT_EMAIL,
  SALES_EMAIL,
  PRIVACY_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL,
} from '../brand';
import './public.css';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/features', label: 'Features' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
  { to: '/login', label: 'Sign in' },
];

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.body.classList.add('pub-menu-lock');
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('pub-menu-lock');
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="pub-shell">
      <header className="g-header">
        <Link to="/" className="g-logo" onClick={closeMenu}>
          <span className="g-logo-mark">B</span>
          <span className="g-logo-text">{PRODUCT_NAME}</span>
        </Link>

        <nav className="g-nav" aria-label="Primary">
          {NAV_LINKS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>{item.label}</NavLink>
          ))}
        </nav>

        <div className="g-header-right">
          <Link to="/register" className="g-btn g-btn-primary g-header-cta">Get in Touch</Link>
          <button
            type="button"
            className="g-menu-toggle"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="pub-mobile-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="g-menu-backdrop" onClick={closeMenu} aria-hidden="true" />
      )}

      <div
        id="pub-mobile-nav"
        className={`g-mobile-nav${menuOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        hidden={!menuOpen}
      >
        <div className="g-mobile-nav-head">
          <span className="g-logo-mark">B</span>
          <strong>{PRODUCT_NAME}</strong>
          <button type="button" className="g-menu-toggle" aria-label="Close menu" onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <nav className="g-mobile-nav-links" onClick={closeMenu}>
          {NAV_LINKS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>{item.label}</NavLink>
          ))}
          <Link to="/register" className="g-btn g-btn-primary g-mobile-cta">Start free trial</Link>
        </nav>
      </div>

      <Outlet />

      <footer className="g-footer">
        <div className="g-footer-main">
          <div className="g-footer-brand">
            <div className="g-footer-brand-row">
              <span className="g-logo-mark">B</span>
              <strong>{PRODUCT_NAME}</strong>
            </div>
            <p>
              Enterprise-ready GST invoicing for Indian MSMEs — tax invoices, inventory,
              returns helpers, and secure multi-tenant cloud workspaces with trial-based plans.
            </p>
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
            <Link to="/features">Why {PRODUCT_NAME}</Link>
            <Link to="/pricing">Compare plans</Link>
            <a href={`mailto:${SUPPORT_EMAIL}`}>Support</a>
            <a href={`mailto:${PRIVACY_EMAIL}`}>Privacy</a>
          </div>

          <div className="g-footer-col g-footer-contact">
            <h4>Contact</h4>
            <div className="g-footer-contact-row">
              <MapPin size={16} />
              <span>India · Cloud multi-tenant platform</span>
            </div>
            <div className="g-footer-contact-row">
              <Phone size={16} />
              <a href={SUPPORT_PHONE_TEL}>{SUPPORT_PHONE_DISPLAY}</a>
            </div>
            <div className="g-footer-contact-row">
              <Mail size={16} />
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </div>
            <div className="g-footer-contact-row">
              <Mail size={16} />
              <a href={`mailto:${SALES_EMAIL}`}>{SALES_EMAIL}</a>
            </div>
            <p className="g-footer-hours">Support hours: Mon–Sat, 10:00–19:00 IST</p>
          </div>
        </div>

        <div className="g-footer-bottom">
          <span>© {new Date().getFullYear()} {PRODUCT_NAME}. All rights reserved.</span>
          <span>Your Business. Our Software. Better Compliance.</span>
          <span>Terms · Privacy · Security</span>
        </div>
      </footer>
    </div>
  );
}
