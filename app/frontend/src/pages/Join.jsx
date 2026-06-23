import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { validateJoinLink, joinSignup, createMeditation } from '../api';
import PasswordChecker, { passwordIsValid } from '../components/PasswordChecker';
import PreSignupOnboarding from '../components/PreSignupOnboarding';

export default function Join({ onSignup }) {
  const { token } = useParams();
  const navigate = useNavigate();
  const [link, setLink] = useState(null); // null=loading, false=invalid, {valid,role,owner_name}
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authData, setAuthData] = useState(null);

  useEffect(() => {
    validateJoinLink(token)
      .then(data => setLink(data.valid ? data : false))
      .catch(() => setLink(false));
  }, [token]);

  async function handleSubmit(e, onComplete) {
    e.preventDefault();
    setError('');
    if (!passwordIsValid(password)) {
      setError('Password does not meet requirements');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const data = await joinSignup(token, displayName.trim(), password);
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

  if (link === null) {
    return <div className="login-page"><div className="loading-spinner" /><span>Loading...</span></div>;
  }

  if (!link) {
    return (
      <div className="login-page">
        <div className="login-form">
          <h1 className="login-title">Meditation Pro</h1>
          <div className="login-error">This signup link is invalid.</div>
        </div>
      </div>
    );
  }

  const isBuilderRole = link.role === 'builder';

  // Builders get the full onboarding flow with signup as a card
  if (isBuilderRole) {
    return (
      <PreSignupOnboarding
        onDone={handleDone}
        renderSignup={(onComplete) => (
          <form className="ob-signup-form" onSubmit={e => handleSubmit(e, onComplete)}>
            {error && <div className="login-error">{error}</div>}
            <input
              className="login-input"
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              autoFocus
              autoComplete="name"
            />
            <div className="login-password-wrapper">
              <input
                className="login-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
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
            <button className="ob-next" type="submit" disabled={loading || !displayName.trim()}>
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
        <p className="login-subtitle">
          Create your {link.role} account
        </p>
        {error && <div className="login-error">{error}</div>}
        <input
          className="login-input"
          type="text"
          placeholder="Your name"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          autoFocus
          autoComplete="name"
        />
        <div className="login-password-wrapper">
          <input
            className="login-input"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
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
        <button className="login-btn" type="submit" disabled={loading || !displayName.trim()}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
