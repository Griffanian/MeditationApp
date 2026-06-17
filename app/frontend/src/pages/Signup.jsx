import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { validateInvite, signupUser } from '../api';

export default function Signup({ onSignup }) {
  const { token } = useParams();
  const [invite, setInvite] = useState(null); // null=loading, false=invalid, {valid,role,name}
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    validateInvite(token)
      .then(data => {
        if (data.valid) {
          setInvite(data);
          // Pre-fill username from invite name (lowercase, spaces to hyphens)
          if (data.name) {
            setUsername(data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
          }
        } else {
          setInvite(false);
        }
      })
      .catch(() => setInvite(false));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await signupUser(token, username, password);
      onSignup(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (invite === null) {
    return <div className="login-page"><div className="loading-spinner" /><span>Validating invite...</span></div>;
  }

  if (!invite) {
    return (
      <div className="login-page">
        <div className="login-form">
          <h1 className="login-title">Progress Meditation</h1>
          <div className="login-error">This invite link is invalid or has expired.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1 className="login-title">Progress Meditation</h1>
        {invite.name && (
          <p style={{ textAlign: 'center', color: 'var(--text-primary, #e0e0ff)', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
            Welcome, {invite.name}
          </p>
        )}
        <p style={{ textAlign: 'center', color: 'var(--text-secondary, #888)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          Set up your {invite.role} account
        </p>
        {error && <div className="login-error">{error}</div>}
        <input
          className="login-input"
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoFocus
          autoComplete="username"
        />
        <div className="login-password-wrapper">
          <input
            className="login-input"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password (8+ characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <button type="button" className="login-toggle-pw" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        <button className="login-btn" type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
