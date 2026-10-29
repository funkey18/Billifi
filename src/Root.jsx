import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import App from './App.jsx';
import AppLockGate from './components/AppLock.jsx';
import SubscriptionGate from './components/SubscriptionGate.jsx';
import { clearSession, fetchMe, getStoredUser } from './auth';
import PublicLayout from './pages/PublicLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import FeaturesPage from './pages/FeaturesPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import PricingPage from './pages/PricingPage.jsx';
import BillingPage from './pages/BillingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';

function RequireAuth({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((u) => {
      if (cancelled) return;
      setUser(u);
      setChecking(false);
      if (!u) navigate('/login', { replace: true });
    });
    return () => { cancelled = true; };
  }, [navigate]);

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'system-ui' }}>
        Checking secure session…
      </div>
    );
  }
  if (!user) return null;
  return children;
}

function AppShell() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', alignItems: 'center',
        padding: '0.4rem 0.9rem',
        background: 'rgba(0, 31, 63, 0.96)', color: '#e8f7f9',
        fontSize: '0.8rem',
        fontFamily: "'Poppins', system-ui, sans-serif",
        borderBottom: '1px solid rgba(0, 139, 155, 0.35)',
      }}>
        <span>
          {user?.tenant?.name || 'Workspace'} · {user?.email}
        </span>
        <button
          type="button"
          onClick={() => navigate('/billing')}
          style={{
            border: '1px solid #008b9b', background: '#008b9b', color: '#fff',
            borderRadius: 6, padding: '0.25rem 0.65rem', cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 600,
          }}
        >
          Billing
        </button>
        <button
          type="button"
          onClick={logout}
          style={{
            border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', color: '#fff',
            borderRadius: 6, padding: '0.25rem 0.65rem', cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Sign out
        </button>
      </div>
      <SubscriptionGate>
        <AppLockGate>
          <App />
        </AppLockGate>
      </SubscriptionGate>
    </div>
  );
}

export default function Root() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="features" element={<FeaturesPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>
        <Route
          path="/billing"
          element={(
            <RequireAuth>
              <BillingPage />
            </RequireAuth>
          )}
        />
        <Route
          path="/app/*"
          element={(
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
