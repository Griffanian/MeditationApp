import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchPractices, createPractice, deletePractice } from '../api';

export default function Practices() {
  const [loading, setLoading] = useState(true);
  const [practices, setPractices] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPractices().then(setPractices).finally(() => setLoading(false));
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
      <div className="nav-bar">
        <Link to="/" className="nav-link">Exercises</Link>
        <Link to="/practices" className="nav-link nav-link-active">Programmes</Link>
      </div>

      <h1>Programmes</h1>

      {loading ? <div className="loading-page"><div className="loading-spinner" />Loading programmes...</div> : <div className="med-grid">
        {practices.map(prac => {
          const weeks = prac.items || [];
          const hasWeeks = weeks.length > 0 && weeks[0]?.days;
          const totalDays = hasWeeks ? weeks.reduce((sum, w) => sum + (w.days?.length || 0), 0) : 0;

          return (
            <div key={prac.name} className="med-card">
              <div className="med-card-top">
                <Link to={`/practice/${prac.name}`} className="med-card-link">
                  <span className="med-card-name">{prac.display_name}</span>
                </Link>
                <div className="med-kebab-wrapper">
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
                </div>
              </div>
              <div className="prog-card-subtitle">
                {hasWeeks
                  ? `${weeks.length} week${weeks.length !== 1 ? 's' : ''} · ${totalDays} day${totalDays !== 1 ? 's' : ''}`
                  : `${weeks.length} stage${weeks.length !== 1 ? 's' : ''}`
                }
              </div>
              <div className="prog-card-actions">
                <Link to={`/play/${prac.name}`} className="prog-card-play-btn">▶ Play</Link>
                <Link to={`/practice/${prac.name}`} className="prog-card-edit-btn">Edit</Link>
              </div>
            </div>
          );
        })}
        <button className="med-card med-card-add" onClick={handleNewPractice}>
          <span className="med-card-add-icon">+</span>
          <span className="med-card-add-label">New Programme</span>
        </button>
      </div>}
    </div>
  );
}
