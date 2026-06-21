import { useState } from 'react';
import PasswordChecker from '../components/PasswordChecker';
import { BuilderOnboarding } from './Home';

const ROLES = ['viewer', 'builder', 'editor', 'admin'];

function SignupPreview({ role, name, onComplete }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={e => { e.preventDefault(); onComplete(); }}>
        <h1 className="login-title">Meditation Pro</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-primary, #e0e0ff)', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
          Welcome, {name}
        </p>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary, #888)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          Set up your {role} account
        </p>
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
        <input
          className="login-input"
          type={showPassword ? 'text' : 'password'}
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
        {password && <PasswordChecker password={password} />}
        <button className="login-btn" type="submit">Create account</button>
      </form>
    </div>
  );
}

function ViewerHomePreview({ name }) {
  return (
    <div className="home-page" style={{ minHeight: '100dvh' }}>
      <div className="home-greeting">
        <h1 className="home-greeting-title">Good morning, {name}</h1>
        <p className="home-greeting-sub">Welcome to Meditation Pro. Start your first session today.</p>
      </div>
      <div className="home-section">
        <div className="home-empty">
          <p>No sessions yet. Browse the exercise bank to get started.</p>
          <button className="home-programme-btn home-programme-btn-primary" onClick={() => {}}>Browse Exercises</button>
        </div>
      </div>
    </div>
  );
}

function BuilderHomePreview({ name }) {
  return (
    <div className="home-page" style={{ minHeight: '100dvh' }}>
      <div className="home-greeting">
        <h1 className="home-greeting-title">Good morning, {name}</h1>
        <p className="home-greeting-sub">Welcome to Meditation Pro. Start your first session today.</p>
      </div>
      <div className="home-stats">
        <div className="home-stat-card"><div className="home-stat-value">0</div><div className="home-stat-label">Sessions</div></div>
        <div className="home-stat-card"><div className="home-stat-value">0</div><div className="home-stat-label">Day Streak</div></div>
        <div className="home-stat-card"><div className="home-stat-value">0m</div><div className="home-stat-label">Total Time</div></div>
      </div>
      <div className="home-section">
        <h2 className="home-section-title">Quick Links</h2>
        <div className="home-quick-links">
          <button className="home-quick-link" onClick={() => {}}>Exercises</button>
          <button className="home-quick-link" onClick={() => {}}>Programmes</button>
          <button className="home-quick-link" onClick={() => {}}>Clients</button>
        </div>
      </div>
    </div>
  );
}

const STAGES = {
  pick: 'Pick a role',
  signup: 'Signup',
  onboarding: 'Onboarding',
  home: 'Home',
};

export default function Preview() {
  const [role, setRole] = useState(null);
  const [stage, setStage] = useState('pick');
  const name = 'Test User';
  const canCreate = role && ['builder', 'editor', 'admin'].includes(role);

  function reset() {
    setRole(null);
    setStage('pick');
  }

  return (
    <div className="preview-wrapper">
      {/* floating toolbar */}
      <div className="preview-bar">
        <span className="preview-bar-label">UX Preview</span>
        {role && <span className="preview-bar-role">{role}</span>}
        <div className="preview-bar-stages">
          {Object.entries(STAGES).map(([key, label]) => (
            <button
              key={key}
              className={`preview-bar-step${stage === key ? ' active' : ''}`}
              onClick={() => { if (key === 'pick') reset(); else if (role) setStage(key); }}
              disabled={!role && key !== 'pick'}
            >
              {label}
            </button>
          ))}
        </div>
        <button className="preview-bar-reset" onClick={reset}>Reset</button>
      </div>

      {/* content */}
      {stage === 'pick' && (
        <div className="login-page">
          <div className="login-form" style={{ gap: 16 }}>
            <h1 className="login-title">UX Preview</h1>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              Preview the signup and onboarding experience for any role.
            </p>
            <div className="preview-role-grid">
              {ROLES.map(r => (
                <button key={r} className="preview-role-btn" onClick={() => { setRole(r); setStage('signup'); }}>
                  <span className="preview-role-name">{r}</span>
                  <span className="preview-role-desc">
                    {r === 'viewer' ? 'Can play exercises shared with them'
                      : r === 'builder' ? 'Can create & share exercises'
                      : r === 'editor' ? 'Can edit any content'
                      : 'Full access + user management'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {stage === 'signup' && (
        <SignupPreview role={role} name={name} onComplete={() => setStage(canCreate ? 'onboarding' : 'home')} />
      )}

      {stage === 'onboarding' && canCreate && <BuilderOnboarding />}
      {stage === 'onboarding' && !canCreate && <ViewerHomePreview name={name} />}

      {stage === 'home' && canCreate && <BuilderHomePreview name={name} />}
      {stage === 'home' && !canCreate && <ViewerHomePreview name={name} />}
    </div>
  );
}
