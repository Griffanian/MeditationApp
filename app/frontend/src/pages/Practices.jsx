import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchPractices, createPractice, deletePractice, clonePractice, savePractice, fetchPracticeViewers, sharePractice, unsharePractice } from '../api';
import { useAuth, canEdit } from '../AuthContext';
import { useLocalState } from '../utils';
import ViewerManager from '../components/ViewerManager';

function getProgress(pracName, weeks) {
  try {
    const stored = localStorage.getItem(`player:${pracName}:completed`);
    if (!stored) return null;
    const completed = JSON.parse(stored);
    const completedCount = Object.keys(completed).filter(k => completed[k]).length;
    if (completedCount === 0) return null;
    const hasWeeks = weeks.length > 0 && weeks[0]?.days;
    const totalDays = hasWeeks ? weeks.reduce((sum, w) => sum + (w.days?.length || 0), 0) : weeks.length;
    if (totalDays === 0) return null;
    return { done: completedCount, total: totalDays, pct: Math.round((completedCount / totalDays) * 100) };
  } catch { return null; }
}

export default function Practices() {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [practices, setPractices] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const [viewerPanel, setViewerPanel] = useState(null);
  const [ownerFilter, setOwnerFilter] = useLocalState('practices:ownerFilter', auth.canCreate ? 'mine' : null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPractices().then(setPractices).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = () => fetchPractices().then(setPractices);
    window.addEventListener('assistant-data-changed', handler);
    return () => window.removeEventListener('assistant-data-changed', handler);
  }, []);

  useEffect(() => {
    if (!openMenu) return;
    function handleClick() { setOpenMenu(null); }
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [openMenu]);

  async function handleNewPractice() {
    const displayName = prompt('Programme name:');
    if (!displayName || !displayName.trim()) return;
    try {
      const data = await createPractice(displayName.trim());
      navigate(`/practice/${data.name}`);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeletePractice(prac) {
    if (!confirm(`Delete programme "${prac.display_name}"?`)) return;
    await deletePractice(prac.name);
    setPractices(prev => prev.filter(p => p.name !== prac.name));
  }

  async function handleClone(prac) {
    try {
      const data = await clonePractice(prac.name);
      setPractices(prev => [...prev, data]);
      if (auth.canCreate) setOwnerFilter('mine');
    } catch (err) {
      alert(err.message);
    }
  }

  // Viewer: derive builder tabs
  const builderTabs = (() => {
    if (auth.canCreate) return [];
    const seen = new Map();
    for (const p of practices) {
      if (!p.is_public && p.created_by && !seen.has(p.created_by)) {
        seen.set(p.created_by, p.created_by_display || p.created_by);
      }
    }
    return [...seen.entries()].map(([username, display]) => ({ username, display }));
  })();

  // For viewers: validate the filter is still valid, default to first builder tab
  const effectiveFilter = (() => {
    if (auth.canCreate) return ownerFilter || 'mine';
    // viewer: must be a known builder username or 'public'
    const validValues = [...builderTabs.map(b => b.username), ...(auth.showPublic ? ['public'] : [])];
    if (ownerFilter && validValues.includes(ownerFilter)) return ownerFilter;
    return builderTabs.length > 0 ? builderTabs[0].username : 'public';
  })();

  const hasOwn = practices.some(p => p.created_by === auth.username);
  const hasPublic = practices.some(p => p.is_public && p.created_by !== auth.username);

  const filtered = auth.canCreate ? practices.filter(p => {
    if (effectiveFilter === 'all') return true;
    if (effectiveFilter === 'mine') return p.created_by === auth.username;
    if (effectiveFilter === 'public') return p.is_public && p.created_by !== auth.username;
    return true;
  }) : practices.filter(p => {
    if (effectiveFilter === 'public') return p.is_public;
    return p.created_by === effectiveFilter;
  });

  if (loading) return <div className="loading-page"><div className="loading-spinner" />Loading programmes...</div>;

  return (
    <div>
      <h1>Programmes</h1>
      <p className="section-description">Structured courses built from exercises, organised by week and day.</p>

      {/* Ownership tabs */}
      {auth.canCreate ? (
        <div className="group-tabs">
          <button className={`group-tab${effectiveFilter === 'mine' ? ' active' : ''}`} onClick={() => setOwnerFilter('mine')}>My Programmes</button>
          <button className={`group-tab${effectiveFilter === 'public' ? ' active' : ''}`} onClick={() => setOwnerFilter('public')}>Public</button>
          {auth.canManageContent && (
            <button className={`group-tab${effectiveFilter === 'all' ? ' active' : ''}`} onClick={() => setOwnerFilter('all')}>All</button>
          )}
        </div>
      ) : (hasPublic || builderTabs.length > 0) && (
        <div className="group-tabs">
          {builderTabs.map(b => (
            <button key={b.username} className={`group-tab${effectiveFilter === b.username ? ' active' : ''}`} onClick={() => setOwnerFilter(b.username)}>{b.display}&rsquo;s Programmes</button>
          ))}
          {hasPublic && auth.showPublic && (
            <button className={`group-tab${effectiveFilter === 'public' ? ' active' : ''}`} onClick={() => setOwnerFilter('public')}>Public</button>
          )}
        </div>
      )}

      <p className="owner-filter-desc">
        {effectiveFilter === 'mine' && <>Your programmes. Use the <span style={{ fontSize: 15 }}>&#x22EE;</span> menu to share with clients, duplicate, or delete.</>}
        {effectiveFilter === 'public' && <>Publicly available programmes. Use the <span style={{ fontSize: 15 }}>&#x22EE;</span> menu to make your own copy and customise it.</>}
        {effectiveFilter === 'all' && 'All programmes across all users.'}
        {effectiveFilter !== 'mine' && effectiveFilter !== 'public' && effectiveFilter !== 'all' && `Programmes shared with you by ${builderTabs.find(b => b.username === effectiveFilter)?.display || effectiveFilter}.`}
      </p>

      {filtered.length === 0 && !auth.canCreate ? (
        <div className="empty-state">
          <p className="empty-state-text">No programmes available yet.</p>
        </div>
      ) : filtered.length === 0 && effectiveFilter === 'mine' ? (
        <button className="onboarding-create-btn" onClick={handleNewPractice}>
          <strong>Create your first programme</strong>
          <span>Programmes are structured by week and day, using exercises from your Exercise Bank.</span>
        </button>
      ) : null}

      {filtered.length > 0 && <div className="med-grid">
        {filtered.map(prac => {
          const weeks = prac.items || [];
          const hasWeeks = weeks.length > 0 && weeks[0]?.days;
          const totalDays = hasWeeks ? weeks.reduce((sum, w) => sum + (w.days?.length || 0), 0) : 0;
          const editable = canEdit(auth, prac);

          return (
            <div key={prac.name} className="med-card">
              <div className="med-card-top">
                <Link to={editable ? `/practice/${prac.name}` : `/play/${prac.name}`} className="med-card-link">
                  <span className="med-card-name">{prac.display_name}</span>
                </Link>
                {(editable || auth.canCreate) && (
                  <div className="med-kebab-wrapper">
                    <button
                      className="med-kebab-btn"
                      onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === prac.name ? null : prac.name); }}
                    >&#x22EE;</button>
                    {openMenu === prac.name && (
                      <div className="med-kebab-menu" onClick={e => e.stopPropagation()}>
                        {editable && <button onClick={() => { setOpenMenu(null); navigate(`/practice/${prac.name}`); }}>Edit</button>}
                        <button onClick={() => { setOpenMenu(null); navigate(`/play/${prac.name}`); }}>Play</button>
                        {auth.canCreate && (
                          <button onClick={() => { setOpenMenu(null); handleClone(prac); }}>
                            {editable ? 'Duplicate' : 'Make your own copy'}
                          </button>
                        )}
                        {editable && (
                          <button onClick={() => { setOpenMenu(null); setViewerPanel(prac.name); }}>Viewers</button>
                        )}
                        {editable && (
                          <button onClick={async () => {
                            const newVal = !prac.is_public;
                            await savePractice(prac.name, { is_public: newVal });
                            setPractices(prev => prev.map(p => p.name === prac.name ? { ...p, is_public: newVal } : p));
                            setOpenMenu(null);
                          }}>
                            {prac.is_public ? 'Make private' : 'Make public'}
                          </button>
                        )}
                        {editable && (
                          <button className="med-kebab-delete" onClick={() => { setOpenMenu(null); handleDeletePractice(prac); }}>Delete</button>
                        )}
                      </div>
                    )}
                    {viewerPanel === prac.name && (
                      <ViewerManager
                        fetchViewers={() => fetchPracticeViewers(prac.name)}
                        addViewer={(u) => sharePractice(prac.name, u)}
                        removeViewer={(id) => unsharePractice(prac.name, id)}
                        onClose={() => setViewerPanel(null)}
                      />
                    )}
                  </div>
                )}
              </div>
              <div className="prog-card-subtitle">
                {hasWeeks
                  ? `${weeks.length} week${weeks.length !== 1 ? 's' : ''} · ${totalDays} day${totalDays !== 1 ? 's' : ''}`
                  : `${weeks.length} stage${weeks.length !== 1 ? 's' : ''}`
                }
              </div>
              {(() => {
                const progress = getProgress(prac.name, weeks);
                if (!progress) return null;
                return (
                  <div className="prog-card-progress">
                    <div className="prog-card-progress-bar">
                      <div className="prog-card-progress-fill" style={{ width: `${progress.pct}%` }} />
                    </div>
                    <span className="prog-card-progress-label">{progress.done}/{progress.total} days</span>
                  </div>
                );
              })()}
              <div className="prog-card-actions">
                <Link to={`/play/${prac.name}`} className="prog-card-play-btn">&#x25B6; {(() => {
                  const progress = getProgress(prac.name, weeks);
                  return progress ? 'Continue' : 'Start';
                })()}</Link>
                {editable && <Link to={`/practice/${prac.name}`} className="prog-card-edit-btn">Edit</Link>}
              </div>
            </div>
          );
        })}
        {auth.canCreate && effectiveFilter === 'mine' && <button className="med-card med-card-add" onClick={handleNewPractice}>
          <span className="med-card-add-icon">+</span>
          <span className="med-card-add-label">New Programme</span>
        </button>}
      </div>}
    </div>
  );
}
