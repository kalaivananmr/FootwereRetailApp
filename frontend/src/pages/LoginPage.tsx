import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const [phone, setPhone] = useState('9876543210');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login(phone.trim(), password);
      setAuth(data.token, data.user, data.shop);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <svg viewBox="0 0 24 24"><path d="M2 18l2-8h16l2 8H2zm4-10V6a6 6 0 0112 0v2H6zm2 0h8V6a4 4 0 00-8 0v2z"/></svg>
          </div>
          <div className="login-title">SmartFoot Retail</div>
          <div className="login-sub">Sign in to your store</div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
            {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in...</> : 'Sign In'}
          </button>
        </form>

        <div className="login-demo">
          <strong>Demo credentials:</strong><br />
          Phone: <strong>9876543210</strong> &nbsp;|&nbsp; Password: <strong>demo1234</strong>
        </div>
      </div>
    </div>
  );
}
