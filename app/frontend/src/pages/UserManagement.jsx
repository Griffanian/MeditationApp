import { useState, useEffect } from 'react';
import {
  fetchUsers, updateUserRole, deleteUser,
  fetchInvites, createInvite, deleteInvite,
  apiFetch, BASE,
} from '../api';

function InviteSection() {
  const [invites, setInvites] = useState([]);
  const [role, setRole] = useState('builder');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchInvites().then(setInvites); }, []);

  async function handleCreate() {
    if (!name.trim()) { alert('Enter a name for this invite'); return; }
    setCreating(true);
    try {
      const inv = await createInvite(role, 7, name.trim());
      setInvites(prev => [inv, ...prev]);
      setName('');
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id) {
    await deleteInvite(id);
    setInvites(prev => prev.filter(i => i.id !== id));
  }

  function copyLink(token) {
    const url = `${window.location.origin}/signup/${token}`;
    navigator.clipboard.writeText(url);
  }

  return (
    <section className="user-mgmt-section">
      <h2>Invite Links</h2>
      <div className="user-mgmt-create-row">
        <input
          type="text"
          placeholder="Name (e.g. John Smith)"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
          className="user-mgmt-input"
        />
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="builder">Builder</option>
          <option value="viewer">Viewer</option>
        </select>
        <button onClick={handleCreate} disabled={creating}>
          {creating ? 'Creating...' : 'Create Invite'}
        </button>
      </div>
      <table className="user-mgmt-table">
        <thead>
          <tr><th>Name</th><th>Role</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {invites.filter(inv => !inv.used_by && inv.is_active).map(inv => (
            <tr key={inv.id}>
              <td>{inv.name || '(unnamed)'}</td>
              <td>{inv.role}</td>
              <td>Pending</td>
              <td>
                <button className="btn-small" onClick={() => copyLink(inv.token)}>Copy link</button>
                <button className="btn-small btn-danger" onClick={() => handleDelete(inv.id)}>Revoke</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function UserSection() {
  const [users, setUsers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'inactive' | 'all'

  useEffect(() => { fetchUsers().then(setUsers); }, []);

  async function handleRoleChange(userId, newRole) {
    try {
      await updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeactivate(u) {
    const viewerCount = u.role === 'builder' ? users.filter(v => v.role === 'viewer' && v.builders.includes(u.username)).length : 0;
    const msg = viewerCount > 0
      ? `Deactivate ${u.display_name} and their ${viewerCount} viewer${viewerCount !== 1 ? 's' : ''}?`
      : `Deactivate ${u.display_name}?`;
    if (!confirm(msg)) return;
    try {
      const res = await deleteUser(u.id);
      // Mark all deactivated users
      setUsers(prev => prev.map(x => (x.id === u.id || (res?.deactivated && res.deactivated.includes(x.id))) ? { ...x, is_active: false } : x));
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleReactivate(u) {
    try {
      await apiFetch(`${BASE}/api/users/${u.id}`, { method: 'PATCH' });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: true } : x));
    } catch (err) {
      alert(err.message);
    }
  }

  const filtered = users.filter(u => {
    if (statusFilter === 'active') return u.is_active;
    if (statusFilter === 'inactive') return !u.is_active;
    return true;
  });
  const admins = filtered.filter(u => u.role === 'admin');
  const editors = filtered.filter(u => u.role === 'editor');
  const builders = filtered.filter(u => u.role === 'builder');
  const viewers = filtered.filter(u => u.role === 'viewer');
  const inactiveCount = users.filter(u => !u.is_active).length;

  function renderUserRow(u, indent = false) {
    const inactive = !u.is_active;
    return (
      <tr key={u.id} style={inactive ? { opacity: 0.4 } : {}}>
        <td style={indent ? { paddingLeft: 28 } : {}}>
          {indent && <span style={{ color: '#444', marginRight: 6 }}>└</span>}
          {u.display_name}{u.display_name !== u.username && <span style={{ color: '#666', marginLeft: 6 }}>({u.username})</span>}
        </td>
        <td>
          <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)} disabled={inactive}>
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="builder">Builder</option>
            <option value="viewer">Viewer</option>
          </select>
        </td>
        <td>{new Date(u.date_joined).toLocaleDateString()}</td>
        <td>
          {inactive ? (
            <button className="btn-small" onClick={() => handleReactivate(u)}>Reactivate</button>
          ) : (
            <button className="btn-small btn-danger" onClick={() => handleDeactivate(u)}>Deactivate</button>
          )}
        </td>
      </tr>
    );
  }

  return (
    <section className="user-mgmt-section">
      <h2>Users</h2>
      <div className="group-tabs" style={{ marginBottom: 12 }}>
        <button className={`group-tab${statusFilter === 'active' ? ' active' : ''}`} onClick={() => setStatusFilter('active')}>Active</button>
        <button className={`group-tab${statusFilter === 'inactive' ? ' active' : ''}`} onClick={() => setStatusFilter('inactive')}>Inactive{inactiveCount > 0 ? ` (${inactiveCount})` : ''}</button>
        <button className={`group-tab${statusFilter === 'all' ? ' active' : ''}`} onClick={() => setStatusFilter('all')}>All</button>
      </div>
      <table className="user-mgmt-table">
        <thead>
          <tr><th>Name</th><th>Role</th><th>Joined</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {admins.map(u => renderUserRow(u))}
          {editors.map(u => renderUserRow(u))}
          {builders.map(builder => {
            const buildersViewers = viewers.filter(v => v.builders.includes(builder.username));
            return [
              renderUserRow(builder),
              ...buildersViewers.map(v => renderUserRow(v, true)),
            ];
          })}
          {viewers.filter(v => !v.builders.length).map(v => renderUserRow(v))}
        </tbody>
      </table>
    </section>
  );
}

export default function UserManagement() {
  return (
    <div className="user-mgmt-page">
      <h1>User Management</h1>
      <InviteSection />
      <UserSection />
    </div>
  );
}
