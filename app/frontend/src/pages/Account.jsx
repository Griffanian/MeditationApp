import { useState, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { apiFetch, BASE, logoutUser, uploadProfilePhoto } from '../api';
import { useLocalState } from '../utils';

export default function Account() {
  const auth = useAuth();
  const [username, setUsername] = useState(auth.username);
  const [displayName, setDisplayName] = useState(auth.displayName);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [photoUrl, setPhotoUrl] = useState(auth.profilePhoto);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

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

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const data = await uploadProfilePhoto(file);
      if (data.profile_photo) setPhotoUrl(data.profile_photo);
      else setPhotoUrl(URL.createObjectURL(file));
    } catch { }
    setUploadingPhoto(false);
    e.target.value = '';
  }

  async function handleRemovePhoto() {
    setPhotoUrl('');
  }

  return (
    <div className="account-page">
      <h1>Account Settings</h1>
      <p className="account-desc">Manage your preferences, security, and profile all in one place.</p>

      <section className="account-section">
        <h2 className="account-section-title">Personal Information</h2>
        <p className="account-section-desc">Edit your personal information</p>
        <div className="profile-photo-row">
          <div className="profile-photo-avatar">
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" className="profile-photo-img" />
            ) : (
              <span className="profile-photo-initials">{(auth.displayName || auth.username || '?')[0].toUpperCase()}</span>
            )}
          </div>
          <button className="profile-photo-upload-btn" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}>
            {uploadingPhoto ? 'Uploading...' : 'Upload an Image'}
          </button>
          {photoUrl && (
            <button className="profile-photo-remove-btn" onClick={handleRemovePhoto} title="Remove photo">
              <svg width="16" height="16" viewBox="0 0 448 512" fill="currentColor"><path d="M135.2 17.7C140.6 6.8 151.7 0 163.8 0h120.4c12.1 0 23.2 6.8 28.6 17.7L320 32h80c17.7 0 32 14.3 32 32s-14.3 32-32 32H48C30.3 96 16 81.7 16 64s14.3-32 32-32h80l7.2-14.3zM32 128h384v320c0 35.3-28.7 64-64 64H96c-35.3 0-64-28.7-64-64V128zm96 64c-8.8 0-16 7.2-16 16v224c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16v224c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16v224c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16z"/></svg>
            </button>
          )}
          <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={handlePhotoUpload} />
        </div>
        <form className="account-form" onSubmit={handleSaveProfile}>
          <label className="account-label">
            <span>Display Name</span>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="account-input" />
          </label>
          <label className="account-label">
            <span>Username</span>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="account-input" />
          </label>
          <div className="account-actions">
            <button type="submit" disabled={saving} className="account-save-btn">{saving ? 'Saving...' : 'Save'}</button>
            {message && <span className={`account-message ${message === 'Saved' ? 'success' : ''}`}>{message}</span>}
          </div>
        </form>
      </section>

      <section className="account-section">
        <h2 className="account-section-title">Security</h2>
        <p className="account-section-desc">Update your password</p>
        <form className="account-form" onSubmit={handleSaveProfile}>
          <label className="account-label">
            <span>Current Password</span>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="account-input" placeholder="Required to change password" />
          </label>
          <label className="account-label">
            <span>New Password</span>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="account-input" placeholder="Leave blank to keep current" />
          </label>
          <div className="account-actions">
            <button type="submit" disabled={saving} className="account-save-btn">{saving ? 'Saving...' : 'Update Password'}</button>
          </div>
        </form>
      </section>

      <section className="account-section">
        <h2 className="account-section-title">Preferences</h2>
        <p className="account-section-desc">Appearance and display</p>
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
        <div className="account-info">Role: {auth.role}</div>
      </section>

      <section className="account-section">
        <button className="account-signout-btn" onClick={() => { logoutUser(); window.location.href = '/'; }}>Sign out</button>
      </section>
    </div>
  );
}
