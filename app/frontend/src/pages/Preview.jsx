import { useState } from 'react';
import PasswordChecker from '../components/PasswordChecker';
import PreSignupOnboarding from '../components/PreSignupOnboarding';

const ROLES = ['viewer', 'builder'];

function ViewerSignupPreview({ linkType, name, role, onComplete }) {
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const isPersonal = linkType === 'personal';

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={e => { e.preventDefault(); onComplete(); }}>
        <h1 className="login-title">Meditation Pro</h1>
        {isPersonal && (
          <p style={{ textAlign: 'center', color: 'var(--text-primary, #e0e0ff)', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
            Welcome, {name}
          </p>
        )}
        <p style={{ textAlign: 'center', color: 'var(--text-secondary, #888)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {isPersonal ? `Set up your ${role} account` : `Create your ${role} account`}
        </p>
        {!isPersonal && (
          <input
            className="login-input"
            type="text"
            placeholder="Your name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            autoComplete="name"
          />
        )}
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

function BuilderSignupFields({ linkType, name, onComplete }) {
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const isPersonal = linkType === 'personal';

  return (
    <form className="ob-signup-form" onSubmit={e => { e.preventDefault(); onComplete(); }}>
      {isPersonal && (
        <p style={{ textAlign: 'center', color: 'var(--text-primary, #e0e0ff)', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
          Welcome, {name}
        </p>
      )}
      {!isPersonal && (
        <input
          className="login-input"
          type="text"
          placeholder="Your name"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          autoComplete="name"
        />
      )}
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
      <button className="ob-next" type="submit">Create account</button>
    </form>
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

const LINK_TYPES = [
  { id: 'personal', label: 'Personal invite', desc: 'Name and role already known' },
  { id: 'generic', label: 'Generic link', desc: 'User enters their own name' },
];

export default function Preview() {
  const [linkType, setLinkType] = useState(null);
  const [role, setRole] = useState(null);
  const [stage, setStage] = useState('pick');
  const name = 'Test User';
  const isBuilder = role === 'builder';

  function reset() {
    setLinkType(null);
    setRole(null);
    setStage('pick');
  }

  // Label for the toolbar — just show the current stage name
  const stageLabel = stage === 'pick' ? 'Setup'
    : stage === 'flow' ? (isBuilder ? 'Onboarding' : 'Signup')
    : stage === 'home' ? 'Home' : '';

  return (
    <div className="preview-wrapper">
      {/* floating toolbar */}
      <div className="preview-bar">
        <span className="preview-bar-label">UX Preview</span>
        {linkType && <button className="preview-bar-role" onClick={() => { setLinkType(null); setRole(null); setStage('pick'); }}>{linkType}</button>}
        {role && <button className="preview-bar-role" onClick={() => { setRole(null); setStage('pick'); }}>{role}</button>}
        <button className="preview-bar-reset" onClick={reset}>Reset</button>
      </div>

      {/* Setup: pick link type and role */}
      {stage === 'pick' && (
        <div className="login-page">
          <div className="login-form" style={{ gap: 16 }}>
            <h1 className="login-title">UX Preview</h1>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              Preview the signup and onboarding experience.
            </p>

            {!linkType ? (<>
              <p style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: 13, margin: '8px 0 4px' }}>What type of link did they receive?</p>
              <div className="preview-role-grid">
                {LINK_TYPES.map(lt => (
                  <button key={lt.id} className="preview-role-btn" onClick={() => setLinkType(lt.id)}>
                    <span className="preview-role-name">{lt.label}</span>
                    <span className="preview-role-desc">{lt.desc}</span>
                  </button>
                ))}
              </div>
            </>) : (<>
              <p style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: 13, margin: '8px 0 4px' }}>What role?</p>
              <div className="preview-role-grid">
                {ROLES.map(r => (
                  <button key={r} className="preview-role-btn" onClick={() => { setRole(r); setStage('flow'); }}>
                    <span className="preview-role-name">{r}</span>
                    <span className="preview-role-desc">
                      {r === 'viewer' ? 'Can play exercises shared with them'
                        : 'Can create & share exercises'}
                    </span>
                  </button>
                ))}
              </div>
            </>)}
          </div>
        </div>
      )}

      {/* Builder flow: onboarding slides → signup card → your turn — all inside PreSignupOnboarding */}
      {stage === 'flow' && isBuilder && (
        <PreSignupOnboarding
          onDone={reset}
          renderSignup={(onComplete) => (
            <BuilderSignupFields linkType={linkType} name={name} onComplete={onComplete} />
          )}
        />
      )}

      {/* Viewer flow: signup → home */}
      {stage === 'flow' && !isBuilder && (
        <ViewerSignupPreview linkType={linkType} name={name} role={role} onComplete={() => setStage('home')} />
      )}

      {stage === 'home' && <ViewerHomePreview name={name} />}
    </div>
  );
}
