import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { apiFetch, BASE, logoutUser, fetchMyViewers, addViewer, removeViewer, fetchInvites, createInvite, deleteInvite } from '../api';

function MyViewersSection() {
  const [viewers, setViewers] = useState([]);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchMyViewers().then(setViewers); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!username.trim()) return;
    setError('');
    try {
      await addViewer(username.trim());
      setUsername('');
      fetchMyViewers().then(setViewers);
    } catch (err) { setError(err.message); }
  }

  async function handleRemove(id) {
    await removeViewer(id);
    setViewers(prev => prev.filter(v => v.id !== id));
  }

  return (
    <section className="user-mgmt-section">
      <h2>My Viewers</h2>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>People who can see content you share with them.</p>
      {viewers.length === 0 ? (
        <p style={{ color: '#666', fontSize: 13 }}>No viewers yet. Send an invite link or add by username.</p>
      ) : (
        <table className="user-mgmt-table">
          <thead><tr><th>Username</th><th>See public</th><th>Since</th><th></th></tr></thead>
          <tbody>
            {viewers.map(v => (
              <tr key={v.id}>
                <td>{v.username}</td>
                <td>
                  <input type="checkbox" checked={v.show_public !== false} onChange={async (e) => {
                    const val = e.target.checked;
                    setViewers(prev => prev.map(x => x.id === v.id ? { ...x, show_public: val } : x));
                    await apiFetch(`${BASE}/api/my-viewers/${v.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ show_public: val }),
                    });
                  }} style={{ accentColor: '#a0c4ff' }} />
                </td>
                <td>{new Date(v.granted_at).toLocaleDateString()}</td>
                <td><button className="btn-small btn-danger" onClick={() => handleRemove(v.id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form onSubmit={handleAdd} className="user-mgmt-create-row" style={{ marginTop: 12 }}>
        <input type="text" placeholder="Add viewer by username" value={username} onChange={e => setUsername(e.target.value)} className="user-mgmt-input" />
        <button type="submit">Add</button>
      </form>
      {error && <div style={{ color: '#ff6b6b', fontSize: 12, marginTop: 4 }}>{error}</div>}
    </section>
  );
}

function MyInvitesSection() {
  const auth = useAuth();
  const [invites, setInvites] = useState([]);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchInvites().then(setInvites); }, []);

  async function handleCreate() {
    if (!name.trim()) { alert('Enter a name'); return; }
    setCreating(true);
    try {
      const inv = await createInvite('viewer', 7, name.trim());
      setInvites(prev => [inv, ...prev]);
      setName('');
    } catch (err) { alert(err.message); }
    finally { setCreating(false); }
  }

  function copyLink(token) {
    navigator.clipboard.writeText(`${window.location.origin}/signup/${token}`);
  }

  return (
    <section className="user-mgmt-section">
      <h2>Invite Links</h2>
      <div className="user-mgmt-create-row">
        <input type="text" placeholder="Name (e.g. John Smith)" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }} className="user-mgmt-input" />
        <button onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create Viewer Invite'}</button>
      </div>
      {invites.filter(i => !i.used_by && i.is_active).length > 0 && (
        <table className="user-mgmt-table">
          <thead><tr><th>Name</th><th>Actions</th></tr></thead>
          <tbody>
            {invites.filter(i => !i.used_by && i.is_active).map(inv => (
              <tr key={inv.id}>
                <td>{inv.name || '(unnamed)'}</td>
                <td>
                  <button className="btn-small" onClick={() => copyLink(inv.token)}>Copy link</button>
                  <button className="btn-small btn-danger" onClick={async () => { await deleteInvite(inv.id); setInvites(prev => prev.filter(i => i.id !== inv.id)); }}>Revoke</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

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

  return (
    <div className="user-mgmt-page">
      <h1>Account</h1>
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

      {auth.canCreate && <>
        <MyViewersSection />
        <MyInvitesSection />
      </>}

      <section className="user-mgmt-section">
        <button className="account-signout-btn" onClick={() => { logoutUser(); window.location.href = '/'; }}>Sign out</button>
      </section>
    </div>
  );
}
