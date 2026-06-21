import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { validateJoinLink, joinSignup } from '../api';
import PasswordChecker, { passwordIsValid } from '../components/PasswordChecker';

export default function Join({ onSignup }) {
  const { token } = useParams();
  const [link, setLink] = useState(null); // null=loading, false=invalid, {valid,role,owner_name}
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    validateJoinLink(token)
      .then(data => setLink(data.valid ? data : false))
      .catch(() => setLink(false));
  }, [token]);

  // Auto-derive username from display name
  function handleNameChange(val) {
    setDisplayName(val);
    const derived = val.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9._-]/g, '');
    setUsername(derived);
  }

  async function handleSubmit(e) {
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
      const data = await joinSignup(token, displayName.trim(), username.trim(), password);
      onSignup(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
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
          onChange={e => handleNameChange(e.target.value)}
          autoFocus
          autoComplete="name"
        />
        <input
          className="login-input"
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
          autoComplete="username"
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
        <button className="login-btn" type="submit" disabled={loading || !displayName.trim() || !username.trim()}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
