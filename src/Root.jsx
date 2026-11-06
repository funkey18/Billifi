import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import App from './App.jsx';
import AppLockGate from './components/AppLock.jsx';
import SubscriptionGate from './components/SubscriptionGate.jsx';
import { fetchMe, getStoredUser } from './auth';
import { PRODUCT_NAME } from './brand.js';
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
      <div className="auth-boot">
        <div className="auth-boot-card">
          <div className="auth-boot-mark">B</div>
          <p className="auth-boot-title">{PRODUCT_NAME}</p>
          <p className="auth-boot-sub">Checking secure session…</p>
        </div>
      </div>
    );
  }
  if (!user) return null;
  return children;
}

function AppShell() {
  return (
    <SubscriptionGate>
      <AppLockGate>
        <App />
      </AppLockGate>
    </SubscriptionGate>
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
