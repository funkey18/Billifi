import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { apiAuth, setSession } from '../auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await apiAuth('/api/auth/login', { email, password });
      setSession(data);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="g-auth">
      <form className="g-card" onSubmit={onSubmit}>
        <p className="g-eyebrow">Welcome back</p>
        <h1>Sign in</h1>
        <p className="sub">Access your organisation&apos;s secure GST workspace.</p>
        {error && <div className="g-error">{error}</div>}
        <div className="g-field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </div>
        <div className="g-field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        <button className="g-btn g-btn-primary" type="submit" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Signing in…' : <>Sign in <ArrowRight size={16} /></>}
        </button>
        <p className="g-switch">New here? <Link to="/register">Start your 7-day trial</Link></p>
      </form>
    </div>
  );
}
