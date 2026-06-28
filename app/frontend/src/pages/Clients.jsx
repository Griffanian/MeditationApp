import { useState, useEffect } from 'react';
import {
  fetchMyViewers, addViewer, removeViewer, fetchViewerContent, fetchViewerHistory,
  fetchInvites, createInvite, deleteInvite,
  fetchMeditations, fetchPractices, shareMeditation, sharePractice,
  unshareMeditation, unsharePractice, assignStage, unassignStage,
  fetchMySignupLink, fetchSentInvitations, cancelSentInvitation, apiFetch, BASE,
} from '../api';
import { useAuth } from '../AuthContext';
import { ListView, CalendarView } from '../components/HistoryViews';

function ClientRow({ v, onTogglePublic, onRemove, onShowHistory, allExercises, allProgrammes }) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState(null);
  const [addingEx, setAddingEx] = useState(false);
  const [addingProg, setAddingProg] = useState(false);
  const [expandedExInPicker, setExpandedExInPicker] = useState(null);

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

  async function handleRemoveExercise(med) {
    if (!confirm(`Stop sharing "${med.display_name}" with ${v.username}?`)) return;
    try {
      await unshareMeditation(med.name, v.id);
      setContent(prev => prev ? { ...prev, exercises: prev.exercises.filter(e => e.name !== med.name) } : prev);
    } catch (err) { alert(err.message); }
  }

  async function handleRemoveProgramme(prac) {
    if (!confirm(`Stop sharing "${prac.display_name}" with ${v.username}?`)) return;
    try {
      await unsharePractice(prac.name, v.id);
      setContent(prev => prev ? { ...prev, programmes: prev.programmes.filter(p => p.name !== prac.name) } : prev);
    } catch (err) { alert(err.message); }
  }

  async function handleAssignStage(med, stage) {
    try {
      await assignStage(v.id, med.name, stage.id);
      setContent(prev => prev ? {
        ...prev,
        stages: [...(prev.stages || []), { meditation: med.name, meditation_display: med.display_name, stage_id: stage.id, stage_name: stage.name }],
      } : prev);
    } catch (err) { alert(err.message); }
  }

  async function handleRemoveStage(s) {
    if (!confirm(`Stop sharing "${s.meditation_display} > ${s.stage_name}" with ${v.username}?`)) return;
    try {
      await unassignStage(v.id, s.meditation, s.stage_id);
      setContent(prev => prev ? {
        ...prev,
        stages: prev.stages.filter(x => !(x.meditation === s.meditation && x.stage_id === s.stage_id)),
      } : prev);
    } catch (err) { alert(err.message); }
  }

  const sharedExNames = new Set(content?.exercises?.map(e => e.name) || []);
  const assignedStageKeys = new Set((content?.stages || []).map(s => `${s.meditation}/${s.stage_id}`));
  const sharedProgNames = new Set(content?.programmes?.map(p => p.name) || []);
  const unsharedExercises = allExercises.filter(e => !sharedExNames.has(e.name));
  const unsharedProgrammes = allProgrammes.filter(p => !sharedProgNames.has(p.name));

  return (
    <div className="client-card">
      <div className="client-card-header">
        <div className="client-card-info" onClick={handleExpand} style={{ cursor: 'pointer' }}>
          <span className="client-expand-icon">{expanded ? '▾' : '▸'}</span>
          <div className="client-avatar">
            {v.profile_photo ? (
              <img src={v.profile_photo} alt="" className="client-avatar-img" />
            ) : (
              <span className="client-avatar-initials">{(v.username || '?')[0].toUpperCase()}</span>
            )}
          </div>
          <span className="client-card-name">{v.username}</span>
          <span className="client-card-date">since {new Date(v.granted_at).toLocaleDateString()}</span>
        </div>
        <div className="client-card-actions">
          <label className="client-card-toggle">
            <input type="checkbox" checked={v.show_public !== false} onChange={e => onTogglePublic(v, e.target.checked)} style={{ accentColor: '#a0c4ff' }} />
            <span>Sees public</span>
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
                {content.exercises.map(m => <span key={m.name} className="client-content-tag client-content-tag-removable" onClick={() => handleRemoveExercise(m)}>{m.display_name}</span>)}
                {(content.stages || []).map(s => <span key={`${s.meditation}/${s.stage_id}`} className="client-content-tag client-content-tag-removable" onClick={() => handleRemoveStage(s)}>{s.meditation_display} &rsaquo; {s.stage_name}</span>)}
                <button className="client-add-btn" onClick={() => { setAddingEx(!addingEx); setAddingProg(false); setExpandedExInPicker(null); }}>+</button>
              </div>
              {addingEx && (
                <div className="client-add-picker">
                  {allExercises.length === 0 ? (
                    <span style={{ color: '#666', fontSize: 12 }}>No exercises available.</span>
                  ) : allExercises.map(ex => {
                    const isFullyShared = sharedExNames.has(ex.name);
                    const stages = ex.stages || [];
                    const isExpanded = expandedExInPicker === ex.name;
                    return (
                      <div key={ex.name} className="client-add-picker-group">
                        <div className="client-add-picker-row">
                          {stages.length > 0 && (
                            <button className="client-add-picker-expand" onClick={() => setExpandedExInPicker(isExpanded ? null : ex.name)}>
                              {isExpanded ? '▾' : '▸'}
                            </button>
                          )}
                          <button
                            className={`client-add-picker-item${isFullyShared ? ' client-add-picker-item-disabled' : ''}`}
                            disabled={isFullyShared}
                            onClick={() => handleAddExercise(ex)}
                          >
                            {ex.display_name}{isFullyShared ? ' (shared)' : ''}
                          </button>
                        </div>
                        {isExpanded && stages.map(stage => {
                          const key = `${ex.name}/${stage.id}`;
                          const alreadyAssigned = assignedStageKeys.has(key) || isFullyShared;
                          return (
                            <button
                              key={stage.id}
                              className={`client-add-picker-item client-add-picker-stage${alreadyAssigned ? ' client-add-picker-item-disabled' : ''}`}
                              disabled={alreadyAssigned}
                              onClick={() => handleAssignStage(ex, stage)}
                            >
                              {stage.name || stage.id}{alreadyAssigned ? ' (assigned)' : ''}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="client-content-divider" />

              <div className="client-content-section">
                <span className="client-content-label">Programmes</span>
                {content.programmes.map(p => <span key={p.name} className="client-content-tag client-content-tag-removable" onClick={() => handleRemoveProgramme(p)}>{p.display_name}</span>)}
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
          <button className={`group-tab history-calendar-toggle${view === 'calendar' ? ' active' : ''}`} onClick={() => setView('calendar')}>Calendar</button>
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
  const [tab, setTab] = useState('active');
  const [viewers, setViewers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [myExercises, setMyExercises] = useState([]);
  const [myProgrammes, setMyProgrammes] = useState([]);
  const [username, setUsername] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [historyModal, setHistoryModal] = useState(null);
  const [signupLink, setSignupLink] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [pendingSent, setPendingSent] = useState([]);

  useEffect(() => {
    fetchMyViewers().then(setViewers);
    fetchInvites().then(setInvites);
    fetchSentInvitations().then(setPendingSent);
    fetchMeditations().then(meds => setMyExercises(meds.filter(m => m.created_by === auth.username)));
    fetchPractices().then(pracs => setMyProgrammes(pracs.filter(p => p.created_by === auth.username)));
    fetchMySignupLink().then(data => setSignupLink(`${window.location.origin}/join/${data.token}`)).catch(() => { });
  }, []);

  async function handleAddViewer(e) {
    e.preventDefault();
    if (!username.trim()) return;
    setError('');
    try {
      await addViewer(username.trim());
      setUsername('');
      fetchSentInvitations().then(setPendingSent);
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

  function shareLink(token) {
    const url = `${window.location.origin}/signup/${token}`;
    if (navigator.share) {
      navigator.share({ title: 'Join Meditation Pro', url }).catch(() => { });
    } else {
      navigator.clipboard.writeText(url);
    }
  }

  const activeInvites = invites.filter(i => !i.used_by && i.is_active);

  return (
    <div className="user-mgmt-page">
      <h1>Clients</h1>

      <div className="group-tabs" style={{ marginBottom: 20 }}>
        <button className={`group-tab${tab === 'active' ? ' active' : ''}`} onClick={() => setTab('active')}>Active Clients</button>
        <button className={`group-tab${tab === 'invite' ? ' active' : ''}`} onClick={() => setTab('invite')}>Invite Clients</button>
      </div>

      {tab === 'active' && (
        <>
          {viewers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No clients yet. Go to the <button className="link-btn" onClick={() => setTab('invite')}>Invite Clients</button> tab to invite someone.</p>
          ) : (
            <div className="client-card-list">
              {viewers.map(v => (
                <ClientRow key={v.id} v={v} onTogglePublic={handleTogglePublic} onRemove={handleRemove} onShowHistory={handleShowHistory} allExercises={myExercises} allProgrammes={myProgrammes} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'invite' && (
        <>
          <h2>Invite Personally</h2>

          <section className="user-mgmt-section">
            <h3 className="user-mgmt-subsection-title">Someone who doesn't have an account</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Create a personalised invite link. These expire after 7 days and can only be used once.</p>
            <div className="user-mgmt-create-row">
              <input type="text" placeholder="Name (e.g. John Smith)" value={inviteName} onChange={e => setInviteName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreateInvite(); }} className="user-mgmt-input" />
              <button onClick={handleCreateInvite} disabled={creating}>{creating ? 'Creating...' : 'Create Invite'}</button>
            </div>
          </section>

          <section className="user-mgmt-section">
            <h3 className="user-mgmt-subsection-title">Someone who already has an account</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Send an invitation to an existing user. They'll see it when they next log in.</p>
            <form onSubmit={handleAddViewer} className="user-mgmt-create-row">
              <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="user-mgmt-input" />
              <button type="submit">Invite</button>
            </form>
            {error && <div style={{ color: '#ff6b6b', fontSize: 12, marginTop: 4 }}>{error}</div>}
          </section>

          {signupLink && (
            <section className="user-mgmt-section">
              <h3 className="user-mgmt-subsection-title">Signup Link</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Share this permanent link. Anyone with it can create an account and be linked to you automatically.</p>
              <div className="signup-link-row">
                <input type="text" readOnly value={signupLink} className="user-mgmt-input signup-link-input" onClick={e => e.target.select()} />
                <button onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: 'Join Meditation Pro', url: signupLink }).catch(() => { });
                  } else {
                    navigator.clipboard.writeText(signupLink);
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                  }
                }}>
                  {linkCopied ? 'Copied!' : 'Share'}
                </button>
              </div>
            </section>
          )}

          {(activeInvites.length > 0 || pendingSent.length > 0) && (
            <section className="user-mgmt-section">
              <h2>Open Invites</h2>
              <table className="user-mgmt-table">
                <thead><tr><th>Name</th><th>Type</th><th>Actions</th></tr></thead>
                <tbody>
                  {activeInvites.map(inv => (
                    <tr key={`link-${inv.id}`}>
                      <td>{inv.name || '(unnamed)'}</td>
                      <td><span className="client-pending-badge" style={{ background: 'var(--overlay-2)', color: 'var(--text-muted)' }}>Invite link</span></td>
                      <td>
                        <button className="btn-small" onClick={() => shareLink(inv.token)}>Share</button>
                        <button className="btn-small btn-danger" onClick={async () => { await deleteInvite(inv.id); setInvites(prev => prev.filter(i => i.id !== inv.id)); }}>Revoke</button>
                      </td>
                    </tr>
                  ))}
                  {pendingSent.map(inv => (
                    <tr key={`user-${inv.id}`}>
                      <td>{inv.username}</td>
                      <td><span className="client-pending-badge">Existing user</span></td>
                      <td>
                        <button className="btn-small btn-danger" onClick={async () => { await cancelSentInvitation(inv.id); setPendingSent(prev => prev.filter(p => p.id !== inv.id)); }}>Cancel</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}

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
