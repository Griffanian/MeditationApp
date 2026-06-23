import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { validateInvite, signupUser, createMeditation } from '../api';
import PasswordChecker from '../components/PasswordChecker';
import PreSignupOnboarding from '../components/PreSignupOnboarding';

export default function Signup({ onSignup }) {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null); // null=loading, false=invalid, {valid,role,name}
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authData, setAuthData] = useState(null);

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

  async function handleSubmit(e, onComplete) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const data = await signupUser(token, password);
      if (isBuilderRole) {
        setAuthData(data);
        onComplete();
      } else {
        onSignup(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDone() {
    if (authData) {
      const displayName = prompt('Exercise name:');
      if (displayName && displayName.trim()) {
        createMeditation(displayName.trim(), 'uncategorised', '').then(data => {
          onSignup(authData);
          setTimeout(() => navigate(`/edit/${data.name}`), 0);
        }).catch(() => onSignup(authData));
      } else {
        onSignup(authData);
      }
    }
  }

  if (invite === null) {
    return <div className="login-page"><div className="loading-spinner" /><span>Validating invite...</span></div>;
  }

  if (!invite) {
    return (
      <div className="login-page">
        <div className="login-form">
          <h1 className="login-title">Meditation Pro</h1>
          <div className="login-error">This invite link is invalid or has expired.</div>
        </div>
      </div>
    );
  }

  const isBuilderRole = invite.role === 'builder';

  // Builders get the full onboarding flow with signup as a card
  if (isBuilderRole) {
    return (
      <PreSignupOnboarding
        onDone={handleDone}
        renderSignup={(onComplete) => (
          <form className="ob-signup-form" onSubmit={e => handleSubmit(e, onComplete)}>
            {invite.name && (
              <p style={{ textAlign: 'center', color: 'var(--text-primary, #e0e0ff)', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                Welcome, {invite.name}
              </p>
            )}
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
            {password && <PasswordChecker password={password} />}
            <button className="ob-next" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        )}
      />
    );
  }

  // Viewers go straight to signup form
  return (
    <div className="login-page">
      <form className="login-form" onSubmit={e => handleSubmit(e, () => {})}>
        <h1 className="login-title">Meditation Pro</h1>
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
        {password && <PasswordChecker password={password} />}
        <button className="login-btn" type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
