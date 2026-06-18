import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { validateInvite, signupUser } from '../api';

export default function Signup({ onSignup }) {
  const { token } = useParams();
  const [invite, setInvite] = useState(null); // null=loading, false=invalid, {valid,role,name}
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    validateInvite(token)
      .then(data => {
        if (data.valid) {
          setInvite(data);
        } else {
          setInvite(false);
        }
      })
      .catch(() => setInvite(false));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const data = await signupUser(token, password);
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
        <div className="login-password-wrapper">
          <input
            className="login-input"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password (8+ characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            autoComplete="new-password"
          />
          <button type="button" className="login-toggle-pw" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        <input
          className="login-input"
          type={showPassword ? 'text' : 'password'}
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
        <button className="login-btn" type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
