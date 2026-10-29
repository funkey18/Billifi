import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { apiAuth, setSession } from '../auth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    businessName: '', ownerName: '', email: '', password: '', slug: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await apiAuth('/api/auth/register', form);
      setSession(data);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="g-auth">
      <form className="g-card" onSubmit={onSubmit}>
        <p className="g-eyebrow">7-day free trial</p>
        <h1>Create workspace</h1>
        <p className="sub">No card required. Private tenant with isolated data.</p>
        {error && <div className="g-error">{error}</div>}
        <div className="g-field">
          <label>Business name *</label>
          <input value={form.businessName} onChange={set('businessName')} required placeholder="Sharma Electronics Pvt Ltd" />
        </div>
        <div className="g-field">
          <label>Your name</label>
          <input value={form.ownerName} onChange={set('ownerName')} placeholder="Rahul Sharma" />
        </div>
        <div className="g-field">
          <label>Workspace slug (optional)</label>
          <input value={form.slug} onChange={set('slug')} placeholder="sharma-electronics" />
        </div>
        <div className="g-field">
          <label>Work email *</label>
          <input type="email" value={form.email} onChange={set('email')} required autoComplete="username" />
        </div>
        <div className="g-field">
          <label>Password * (min 8)</label>
          <input type="password" value={form.password} onChange={set('password')} required minLength={8} autoComplete="new-password" />
        </div>
        <button className="g-btn g-btn-primary" type="submit" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Creating…' : <>Get in Touch <ArrowRight size={16} /></>}
        </button>
        <p className="g-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
