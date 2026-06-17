import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { apiFetch, BASE, logoutUser } from '../api';
import { useLocalState } from '../utils';

export default function Account() {
  const auth = useAuth();
  const [username, setUsername] = useState(auth.username);
  const [displayName, setDisplayName] = useState(auth.displayName);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await apiFetch(`${BASE}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          display_name: displayName.trim(),
          current_password: currentPassword || undefined,
          new_password: newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setMessage('Saved');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  const [theme, setTheme] = useLocalState('theme', 'system');

  function pickTheme(value) {
    setTheme(value);
    if (value === 'light' || value === 'dark') {
      document.documentElement.setAttribute('data-theme', value);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  return (
    <div className="user-mgmt-page">
      <h1>Account</h1>
      <section className="user-mgmt-section">
        <h2>Theme</h2>
        <div className="theme-picker">
          {['system', 'light', 'dark'].map(opt => (
            <button
              key={opt}
              className={`theme-option${theme === opt ? ' active' : ''}`}
              onClick={() => pickTheme(opt)}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          ))}
        </div>
      </section>
      <section className="user-mgmt-section">
        <h2>Profile</h2>
        <form className="account-form" onSubmit={handleSaveProfile}>
          <label className="account-label">
            <span>Display Name</span>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="account-input" />
          </label>
          <label className="account-label">
            <span>Username</span>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="account-input" />
          </label>
          <label className="account-label">
            <span>Current Password</span>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="account-input" placeholder="Required to change password" />
          </label>
          <label className="account-label">
            <span>New Password</span>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="account-input" placeholder="Leave blank to keep current" />
          </label>
          <div className="account-actions">
            <button type="submit" disabled={saving} className="account-save-btn">{saving ? 'Saving...' : 'Save'}</button>
            {message && <span className={`account-message ${message === 'Saved' ? 'success' : ''}`}>{message}</span>}
          </div>
        </form>
        <div className="account-info">Role: {auth.role}</div>
      </section>

      <section className="user-mgmt-section">
        <button className="account-signout-btn" onClick={() => { logoutUser(); window.location.href = '/'; }}>Sign out</button>
      </section>
    </div>
  );
}
