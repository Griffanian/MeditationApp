import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchPractices, createPractice, deletePractice } from '../api';
import { useAuth } from '../AuthContext';

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
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [practices, setPractices] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPractices().then(setPractices).finally(() => setLoading(false));
  }, []);

  // Re-fetch when AI assistant makes changes
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

  return (
    <div>
      <h1>Programmes</h1>
      <p className="section-description">Guided meditation courses structured by week and day. Pick a programme and follow along at your own pace, or build your own using exercises from the <Link to="/exercises" className="section-description-link">Exercise Bank</Link>.</p>

      {loading ? <div className="loading-page"><div className="loading-spinner" />Loading programmes...</div> : practices.length === 0 && !isAdmin ? (
        <div className="empty-state">
          <p className="empty-state-text">No programmes available yet.</p>
        </div>
      ) : <div className="med-grid">
        {practices.map(prac => {
          const weeks = prac.items || [];
          const hasWeeks = weeks.length > 0 && weeks[0]?.days;
          const totalDays = hasWeeks ? weeks.reduce((sum, w) => sum + (w.days?.length || 0), 0) : 0;

          return (
            <div key={prac.name} className="med-card">
              <div className="med-card-top">
                <Link to={isAdmin ? `/practice/${prac.name}` : `/play/${prac.name}`} className="med-card-link">
                  <span className="med-card-name">{prac.display_name}</span>
                </Link>
                {isAdmin && <div className="med-kebab-wrapper">
                  <button
                    className="med-kebab-btn"
                    onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === prac.name ? null : prac.name); }}
                  >&#x22EE;</button>
                  {openMenu === prac.name && (
                    <div className="med-kebab-menu" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setOpenMenu(null); navigate(`/practice/${prac.name}`); }}>Edit</button>
                      <button onClick={() => { setOpenMenu(null); navigate(`/play/${prac.name}`); }}>Play</button>
                      <button className="med-kebab-delete" onClick={() => { setOpenMenu(null); handleDeletePractice(prac); }}>Delete</button>
                    </div>
                  )}
                </div>}
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
                <Link to={`/play/${prac.name}`} className="prog-card-play-btn">▶ {(() => {
                  const progress = getProgress(prac.name, weeks);
                  return progress ? 'Continue' : 'Start';
                })()}</Link>
                {isAdmin && <Link to={`/practice/${prac.name}`} className="prog-card-edit-btn">Edit</Link>}
              </div>
            </div>
          );
        })}
        {isAdmin && <button className="med-card med-card-add" onClick={handleNewPractice}>
          <span className="med-card-add-icon">+</span>
          <span className="med-card-add-label">New Programme</span>
        </button>}
      </div>}
    </div>
  );
}
