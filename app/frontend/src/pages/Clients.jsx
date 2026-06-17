import { useState, useEffect } from 'react';
import {
  fetchMyViewers, addViewer, removeViewer, fetchViewerContent, fetchViewerHistory,
  fetchInvites, createInvite, deleteInvite,
  fetchMeditations, fetchPractices, shareMeditation, sharePractice,
  apiFetch, BASE,
} from '../api';
import { useAuth } from '../AuthContext';
import { ListView, CalendarView } from '../components/HistoryViews';

function ClientRow({ v, onTogglePublic, onRemove, onShowHistory, allExercises, allProgrammes }) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState(null);
  const [addingEx, setAddingEx] = useState(false);
  const [addingProg, setAddingProg] = useState(false);

  function handleExpand() {
    if (!expanded && !content) {
      fetchViewerContent(v.id).then(setContent);
    }
    setExpanded(!expanded);
  }

  async function handleAddExercise(med) {
    try {
      await shareMeditation(med.name, v.username);
      setContent(prev => prev ? { ...prev, exercises: [...prev.exercises, { name: med.name, display_name: med.display_name }] } : prev);
    } catch (err) { alert(err.message); }
    setAddingEx(false);
  }

  async function handleAddProgramme(prac) {
    try {
      await sharePractice(prac.name, v.username);
      setContent(prev => prev ? { ...prev, programmes: [...prev.programmes, { name: prac.name, display_name: prac.display_name }] } : prev);
    } catch (err) { alert(err.message); }
    setAddingProg(false);
  }

  const sharedExNames = new Set(content?.exercises?.map(e => e.name) || []);
  const sharedProgNames = new Set(content?.programmes?.map(p => p.name) || []);
  const unsharedExercises = allExercises.filter(e => !sharedExNames.has(e.name));
  const unsharedProgrammes = allProgrammes.filter(p => !sharedProgNames.has(p.name));

  return (
    <div className="client-card">
      <div className="client-card-header">
        <div className="client-card-info" onClick={handleExpand} style={{ cursor: 'pointer' }}>
          <span className="client-expand-icon">{expanded ? '▾' : '▸'}</span>
          <span className="client-card-name">{v.username}</span>
          <span className="client-card-date">since {new Date(v.granted_at).toLocaleDateString()}</span>
        </div>
        <div className="client-card-actions">
          <label className="client-card-toggle">
            <input type="checkbox" checked={v.show_public !== false} onChange={e => onTogglePublic(v, e.target.checked)} style={{ accentColor: '#a0c4ff' }} />
            <span>Public</span>
          </label>
          <button className="btn-small btn-danger" onClick={() => onRemove(v.id)}>Remove</button>
        </div>
      </div>

      {expanded && (
        <div className="client-card-body">
          {!content ? (
            <span style={{ color: '#666', fontSize: 12 }}>Loading...</span>
          ) : (
            <>
              {content.groups.length > 0 && (
                <div className="client-content-section">
                  <span className="client-content-label">Groups</span>
                  {content.groups.map(g => <span key={g.name} className="client-content-tag">{g.display_name}</span>)}
                </div>
              )}
              {content.categories.length > 0 && (
                <div className="client-content-section">
                  <span className="client-content-label">Categories</span>
                  {content.categories.map(c => <span key={c.name} className="client-content-tag">{c.display_name}{c.group ? ` (${c.group})` : ''}</span>)}
                </div>
              )}

              <div className="client-content-divider" />

              <div className="client-content-section">
                <span className="client-content-label">Exercises</span>
                {content.exercises.map(m => <span key={m.name} className="client-content-tag">{m.display_name}</span>)}
                <button className="client-add-btn" onClick={() => { setAddingEx(!addingEx); setAddingProg(false); }}>+</button>
              </div>
              {addingEx && (
                <div className="client-add-picker">
                  {unsharedExercises.length === 0 ? (
                    <span style={{ color: '#666', fontSize: 12 }}>All exercises already shared.</span>
                  ) : unsharedExercises.map(ex => (
                    <button key={ex.name} className="client-add-picker-item" onClick={() => handleAddExercise(ex)}>{ex.display_name}</button>
                  ))}
                </div>
              )}

              <div className="client-content-divider" />

              <div className="client-content-section">
                <span className="client-content-label">Programmes</span>
                {content.programmes.map(p => <span key={p.name} className="client-content-tag">{p.display_name}</span>)}
                <button className="client-add-btn" onClick={() => { setAddingProg(!addingProg); setAddingEx(false); }}>+</button>
              </div>
              {addingProg && (
                <div className="client-add-picker">
                  {unsharedProgrammes.length === 0 ? (
                    <span style={{ color: '#666', fontSize: 12 }}>All programmes already shared.</span>
                  ) : unsharedProgrammes.map(p => (
                    <button key={p.name} className="client-add-picker-item" onClick={() => handleAddProgramme(p)}>{p.display_name}</button>
                  ))}
                </div>
              )}

              <div className="client-content-divider" />

              <button className="client-history-btn" onClick={() => onShowHistory(v)}>View History</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ClientHistoryModal({ viewer, sessions, onClose }) {
  const [view, setView] = useState('list');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal client-history-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{viewer.username}'s History</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="group-tabs" style={{ marginBottom: 12 }}>
          <button className={`group-tab${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>List</button>
          <button className={`group-tab${view === 'calendar' ? ' active' : ''}`} onClick={() => setView('calendar')}>Calendar</button>
        </div>
        <div className="client-history-modal-body">
          {!sessions ? (
            <div style={{ color: '#666', padding: 20, textAlign: 'center' }}>Loading...</div>
          ) : sessions.length === 0 ? (
            <div style={{ color: '#666', padding: 20, textAlign: 'center' }}>No sessions yet.</div>
          ) : view === 'list' ? (
            <ListView sessions={sessions} />
          ) : (
            <CalendarView sessions={sessions} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function Clients() {
  const auth = useAuth();
  const [viewers, setViewers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [myExercises, setMyExercises] = useState([]);
  const [myProgrammes, setMyProgrammes] = useState([]);
  const [username, setUsername] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [historyModal, setHistoryModal] = useState(null);

  useEffect(() => {
    fetchMyViewers().then(setViewers);
    fetchInvites().then(setInvites);
    fetchMeditations().then(meds => setMyExercises(meds.filter(m => m.created_by === auth.username)));
    fetchPractices().then(pracs => setMyProgrammes(pracs.filter(p => p.created_by === auth.username)));
  }, []);

  async function handleAddViewer(e) {
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
    if (!confirm('Remove this client?')) return;
    await removeViewer(id);
    setViewers(prev => prev.filter(v => v.id !== id));
  }

  async function handleShowHistory(v) {
    setHistoryModal({ viewer: v, sessions: null });
    const h = await fetchViewerHistory(v.id);
    setHistoryModal({ viewer: v, sessions: Array.isArray(h) ? h : [] });
  }

  async function handleTogglePublic(v, val) {
    setViewers(prev => prev.map(x => x.id === v.id ? { ...x, show_public: val } : x));
    await apiFetch(`${BASE}/api/my-viewers/${v.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_public: val }),
    });
  }

  async function handleCreateInvite() {
    if (!inviteName.trim()) { alert('Enter a name'); return; }
    setCreating(true);
    try {
      const inv = await createInvite('viewer', 7, inviteName.trim());
      setInvites(prev => [inv, ...prev]);
      setInviteName('');
    } catch (err) { alert(err.message); }
    finally { setCreating(false); }
  }

  function copyLink(token) {
    navigator.clipboard.writeText(`${window.location.origin}/signup/${token}`);
  }

  const activeInvites = invites.filter(i => !i.used_by && i.is_active);

  return (
    <div className="user-mgmt-page">
      <h1>Clients</h1>
      <p className="section-description">Share your exercises and programmes with clients, track their progress, and manage what they can access.</p>

      <section className="user-mgmt-section">
        <h2>Active Clients</h2>
        {viewers.length === 0 ? (
          <p style={{ color: '#666', fontSize: 13 }}>No clients yet. Send an invite link below.</p>
        ) : (
          <div className="client-card-list">
            {viewers.map(v => (
              <ClientRow key={v.id} v={v} onTogglePublic={handleTogglePublic} onRemove={handleRemove} onShowHistory={handleShowHistory} allExercises={myExercises} allProgrammes={myProgrammes} />
            ))}
          </div>
        )}
        <form onSubmit={handleAddViewer} className="user-mgmt-create-row" style={{ marginTop: 12 }}>
          <input type="text" placeholder="Add existing user by username" value={username} onChange={e => setUsername(e.target.value)} className="user-mgmt-input" />
          <button type="submit">Add</button>
        </form>
        {error && <div style={{ color: '#ff6b6b', fontSize: 12, marginTop: 4 }}>{error}</div>}
      </section>

      <section className="user-mgmt-section">
        <h2>Invite Links</h2>
        <div className="user-mgmt-create-row">
          <input type="text" placeholder="Name (e.g. John Smith)" value={inviteName} onChange={e => setInviteName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreateInvite(); }} className="user-mgmt-input" />
          <button onClick={handleCreateInvite} disabled={creating}>{creating ? 'Creating...' : 'Create Invite'}</button>
        </div>
        {activeInvites.length > 0 && (
          <table className="user-mgmt-table">
            <thead><tr><th>Name</th><th>Actions</th></tr></thead>
            <tbody>
              {activeInvites.map(inv => (
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

      {historyModal && (
        <ClientHistoryModal
          viewer={historyModal.viewer}
          sessions={historyModal.sessions}
          onClose={() => setHistoryModal(null)}
        />
      )}
    </div>
  );
}
