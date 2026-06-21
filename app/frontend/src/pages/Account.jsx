import { useState, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { apiFetch, BASE, logoutUser, uploadProfilePhoto } from '../api';
import { useLocalState } from '../utils';
import ChangePasswordModal from '../components/ChangePasswordModal';

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 512 512" fill="currentColor"><path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1 0 32c0 8.8 7.2 16 16 16l32 0zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0z"/></svg>
);

export default function Account() {
  const auth = useAuth();
  const [username, setUsername] = useState(auth.username);
  const [displayName, setDisplayName] = useState(auth.displayName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [photoUrl, setPhotoUrl] = useState(auth.profilePhoto);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setMessage('Saved');
      auth.updateAuth({ username: data.username || username.trim(), displayName: displayName.trim() });
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
      const url = data.profile_photo || URL.createObjectURL(file);
      setPhotoUrl(url);
      auth.updateAuth({ profilePhoto: url });
    } catch { }
    setUploadingPhoto(false);
    e.target.value = '';
  }

  async function handleRemovePhoto() {
    setPhotoUrl('');
  }

  return (
    <div className="account-page">
      <div className="account-card">
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
        {!editingProfile ? (
          <div className="account-row">
            <div className="account-field">
              <span className="account-field-label">Display Name</span>
              <span className="account-field-value">{displayName || '—'}</span>
            </div>
            <div className="account-field">
              <span className="account-field-label">Username</span>
              <span className="account-field-value">{username}</span>
            </div>
            <button className="account-edit-btn" onClick={() => setEditingProfile(true)} title="Edit"><EditIcon /></button>
          </div>
        ) : (
          <form className="account-form" onSubmit={async (e) => { await handleSaveProfile(e); if (!saving) setEditingProfile(false); }}>
            <div className="account-row">
              <label className="account-label">
                <span>Display Name</span>
                <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="account-input" autoFocus />
              </label>
              <label className="account-label">
                <span>Username</span>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="account-input" />
              </label>
            </div>
            <div className="account-actions">
              <button type="submit" disabled={saving} className="account-save-btn">{saving ? 'Saving...' : 'Save'}</button>
              <button type="button" className="account-save-btn" onClick={() => { setEditingProfile(false); setDisplayName(auth.displayName); setUsername(auth.username); setMessage(''); }}>Cancel</button>
              {message && <span className={`account-message ${message === 'Saved' ? 'success' : ''}`}>{message}</span>}
            </div>
          </form>
        )}
      </section>

      <section className="account-section">
        <h2 className="account-section-title">Security</h2>
        <p className="account-section-desc">Update your password</p>
        <div className="account-row">
          <div className="account-field">
            <span className="account-field-label">Password</span>
            <span className="account-field-value">••••••••</span>
          </div>
          <button className="account-save-btn" onClick={() => setShowPasswordModal(true)}>Change password</button>
        </div>
        {showPasswordModal && (
          <ChangePasswordModal
            onClose={() => setShowPasswordModal(false)}
            onSuccess={() => {}}
          />
        )}
      </section>

      <section className="account-section account-section-prefs">
        <div>
          <h2 className="account-section-title">Preferences</h2>
          <p className="account-section-desc">Appearance and display</p>
          <div className="account-info">Role: {auth.role}</div>
        </div>
        <div className="theme-slider">
          {[
            { key: 'system', icon: <svg width="16" height="16" viewBox="0 0 576 512" fill="currentColor"><path d="M64 0C28.7 0 0 28.7 0 64v288c0 35.3 28.7 64 64 64h176l-10.7 32H160c-17.7 0-32 14.3-32 32s14.3 32 32 32h256c17.7 0 32-14.3 32-32s-14.3-32-32-32h-69.3L336 416h176c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64H64zm416 352H96V64h384v288z"/></svg> },
            { key: 'light', icon: <svg width="16" height="16" viewBox="0 0 512 512" fill="currentColor"><path d="M256 0c-8.8 0-16 7.2-16 16v64c0 8.8 7.2 16 16 16s16-7.2 16-16V16c0-8.8-7.2-16-16-16zm0 320a64 64 0 1 0 0-128 64 64 0 1 0 0 128zm0-192a128 128 0 1 1 0 256 128 128 0 1 1 0-256zM0 256c0 8.8 7.2 16 16 16h64c8.8 0 16-7.2 16-16s-7.2-16-16-16H16c-8.8 0-16 7.2-16 16zm432-16c-8.8 0-16 7.2-16 16s7.2 16 16 16h64c8.8 0 16-7.2 16-16s-7.2-16-16-16h-64zM256 416c-8.8 0-16 7.2-16 16v64c0 8.8 7.2 16 16 16s16-7.2 16-16v-64c0-8.8-7.2-16-16-16zM75 75c-6.2 6.2-6.2 16.4 0 22.6l45.3 45.3c6.2 6.2 16.4 6.2 22.6 0s6.2-16.4 0-22.6L97.6 75C91.4 68.7 81.2 68.7 75 75zm294.1 294.1c-6.2 6.2-6.2 16.4 0 22.6L414.4 437c6.2 6.2 16.4 6.2 22.6 0s6.2-16.4 0-22.6l-45.3-45.3c-6.2-6.2-16.4-6.2-22.6 0zM75 437c6.2 6.2 16.4 6.2 22.6 0l45.3-45.3c6.2-6.2 6.2-16.4 0-22.6s-16.4-6.2-22.6 0L75 414.4c-6.2 6.2-6.2 16.4 0 22.6zm339.4-294.1c6.2 6.2 16.4 6.2 22.6 0s6.2-16.4 0-22.6L391.6 75c-6.2-6.2-16.4-6.2-22.6 0s-6.2 16.4 0 22.6l45.3 45.3z"/></svg> },
            { key: 'dark', icon: <svg width="16" height="16" viewBox="0 0 384 512" fill="currentColor"><path d="M223.5 32C100 32 0 132.3 0 256s100 224 223.5 224c60.6 0 115.5-24.2 155.8-63.4 5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6-96.9 0-175.5-78.8-175.5-176 0-65.8 36-123.1 89.3-153.3 6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z"/></svg> },
          ].map(({ key, icon }) => (
            <button
              key={key}
              className={`theme-slider-option${theme === key ? ' active' : ''}`}
              onClick={() => pickTheme(key)}
              title={key.charAt(0).toUpperCase() + key.slice(1)}
            >
              {icon}
            </button>
          ))}
          <div className="theme-slider-track" style={{ transform: `translateX(${['system', 'light', 'dark'].indexOf(theme) * 100}%)` }} />
        </div>
      </section>

      <section className="account-section account-section-buttons">
        <button className="account-signout-btn" onClick={() => { logoutUser(); window.location.href = '/'; }}>Sign out</button>
        <button className="account-delete-btn" onClick={() => {
          if (window.confirm('Are you sure you want to delete your account? This cannot be undone.')) {
            apiFetch(`${BASE}/api/auth/profile`, { method: 'DELETE' }).then(() => {
              logoutUser();
              window.location.href = '/';
            });
          }
        }}>Delete account</button>
      </section>
      </div>
    </div>
  );
}
