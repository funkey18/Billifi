import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getToken } from '../auth';
import BillingPage from '../pages/BillingPage';

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export default function SubscriptionGate({ children }) {
  const navigate = useNavigate();
  const [ent, setEnt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/billing/status', { credentials: 'include', headers: authHeaders() })
      .then(async (r) => {
        if (r.status === 401) {
          navigate('/login', { replace: true });
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        setEnt(data);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [navigate]);

  if (loading) {
    return (
      <div className="auth-boot">
        <div className="auth-boot-card">
          <div className="auth-boot-mark">B</div>
          <p className="auth-boot-sub">Checking subscription…</p>
        </div>
      </div>
    );
  }

  if (ent && !ent.access) {
    return <BillingPage forced />;
  }

  return (
    <>
      {ent && (ent.reason === 'trial' || ent.reason === 'past_due') && (
        <div style={{
          background: ent.reason === 'past_due' ? '#7f1d1d' : '#001f3f',
          color: '#fff',
          padding: '0.55rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '0.75rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          fontSize: '0.85rem',
          fontFamily: "'Poppins', system-ui, sans-serif",
          borderBottom: ent.reason === 'past_due' ? undefined : '2px solid #008b9b',
        }}>
          <span>
            {ent.reason === 'trial'
              ? `Free trial · ${ent.daysLeft} day(s) left. Subscribe anytime to keep uninterrupted access.`
              : `Payment past due · ${ent.daysLeft} day(s) of grace left, then the workspace locks.`}
          </span>
          <Link to="/billing" style={{
            color: '#fff', fontWeight: 700, background: '#008b9b',
            padding: '0.35rem 0.9rem', borderRadius: 999, textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(0, 139, 155, 0.35)',
          }}>
            {ent.reason === 'trial' ? 'Choose a plan' : 'Pay now'}
          </Link>
        </div>
      )}
      {children}
    </>
  );
}
