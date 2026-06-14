import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchCategories, createCategory, renameCategory, deleteCategory, fetchMeditations, createMeditation, renameMeditation, deleteMeditation, saveStageVariables, assembleStage, BASE } from '../api';
import { useAuth } from '../AuthContext';
import { useLocalState } from '../utils';

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [meditations, setMeditations] = useState([]);
  const [assembling, setAssembling] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCatName, setEditCatName] = useState('');
  const [expandedCats, setExpandedCats] = useLocalState('dashboard:expandedCats', {});
  const audioRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      fetchCategories().then(setCategories),
      fetchMeditations().then(setMeditations),
    ]).finally(() => setLoading(false));
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    if (!openMenu) return;
    function handleClick() { setOpenMenu(null); }
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [openMenu]);

  // --- Category actions ---
  function startEditCategory(cat) {
    setEditingCategory(cat.name);
    setEditCatName(cat.display_name);
  }

  async function saveEditCategory(cat) {
    setEditingCategory(null);
    const trimmed = editCatName.trim();
    if (!trimmed || trimmed === cat.display_name) return;
    await renameCategory(cat.name, trimmed);
    setCategories(cats =>
      cats.map(c => c.name === cat.name ? { ...c, display_name: trimmed } : c)
    );
  }

  async function handleNewSection() {
    const name = prompt('Section name:');
    if (!name || !name.trim()) return;
    try {
      const cat = await createCategory(name.trim());
      setCategories(prev => [...prev, cat]);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteCategory(cat) {
    const meds = meditations.filter(m => m.category === cat.name);
    const msg = meds.length > 0
      ? `Delete "${cat.display_name}"? Its ${meds.length} exercise(s) will be moved to "Other".`
      : `Delete "${cat.display_name}"?`;
    if (!confirm(msg)) return;
    await deleteCategory(cat.name);
    setCategories(cats => cats.filter(c => c.name !== cat.name));
    if (meds.length > 0) {
      setMeditations(prev =>
        prev.map(m => m.category === cat.name ? { ...m, category: 'uncategorised' } : m)
      );
    }
  }

  // --- Meditation actions ---
  async function handleRename(med) {
    const newName = prompt('Rename exercise:', med.display_name);
    if (!newName || !newName.trim() || newName.trim() === med.display_name) return;
    await renameMeditation(med.name, newName.trim());
    setMeditations(meds =>
      meds.map(m => m.name === med.name ? { ...m, display_name: newName.trim() } : m)
    );
  }

  async function handleDelete(med) {
    if (!confirm(`Delete "${med.display_name}"? This cannot be undone.`)) return;
    await deleteMeditation(med.name);
    setMeditations(meds => meds.filter(m => m.name !== med.name));
  }

  async function handleNewExercise(category) {
    const displayName = prompt('Exercise name:');
    if (!displayName || !displayName.trim()) return;
    try {
      const data = await createMeditation(displayName.trim(), category);
      navigate(`/edit/${data.name}`);
    } catch (err) {
      alert(err.message);
    }
  }

  // --- Stage variable editing ---
  function updateStageVar(medName, stageId, varName, newValue) {
    setMeditations(meds =>
      meds.map(m => {
        if (m.name !== medName) return m;
        return {
          ...m,
          stages: m.stages.map(s => {
            if (s.id !== stageId) return s;
            return {
              ...s,
              variables: {
                ...s.variables,
                [varName]: { ...s.variables[varName], value: newValue },
              },
            };
          }),
        };
      })
    );
  }

  // --- Playback ---
  function stageKey(medName, stageId) {
    return `${medName}/${stageId}`;
  }

  async function handlePlayStage(med, stage) {
    const key = stageKey(med.name, stage.id);

    if (playing === key) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlaying(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(null);

    if (Object.keys(stage.variables).length > 0) {
      await saveStageVariables(med.name, stage.id, stage.variables);
    }

    setAssembling(key);
    const data = await assembleStage(med.name, stage.id);
    setAssembling(null);

    const audio = new Audio(`${BASE}/audio/meditation/${med.name}/stage/${stage.id}/output/${data.filename}?t=${Date.now()}`);
    audioRef.current = audio;
    setPlaying(key);
    audio.onended = () => {
      setPlaying(null);
      audioRef.current = null;
    };
    audio.play();
  }

  function stageButtonLabel(medName, stageId) {
    const key = stageKey(medName, stageId);
    if (assembling === key) return 'Assembling...';
    if (playing === key) return '■ Stop';
    return '▶ Play';
  }

  // --- Group meditations by category ---
  const grouped = {};
  for (const med of meditations) {
    const cat = med.category || 'uncategorised';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(med);
  }

  // Show categories in DB order, plus any that meditations reference but aren't in the table
  const catNames = new Set(categories.map(c => c.name));
  const extraCats = Object.keys(grouped).filter(k => !catNames.has(k));

  if (loading) return <div className="loading-page"><div className="loading-spinner" />Loading exercises...</div>;

  return (
    <div>
      <div className="nav-bar">
        <Link to="/" className="nav-link nav-link-active">Exercises</Link>
        <Link to="/practices" className="nav-link">Programmes</Link>
      </div>

      <h1>Exercises</h1>

      {[...categories, ...extraCats.map(k => ({ name: k, display_name: k }))].map(cat => {
        const meds = grouped[cat.name] || [];

        const isCollapsed = !expandedCats[cat.name];

        return (
          <div key={cat.name} className="category-section">
            <div className="category-header-row">
              <span
                className="category-collapse-btn"
                onClick={() => setExpandedCats(prev => ({ ...prev, [cat.name]: !prev[cat.name] }))}
              >{isCollapsed ? '▸' : '▾'}</span>
              <h2 className="category-header">
                {isAdmin && editingCategory === cat.name ? (
                  <input
                    className="category-name-input"
                    value={editCatName}
                    autoFocus
                    onChange={e => setEditCatName(e.target.value)}
                    onBlur={() => saveEditCategory(cat)}
                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                  />
                ) : (
                  <>
                    {cat.display_name}
                    {isAdmin && <span className="title-edit-btn" onClick={() => startEditCategory(cat)}>✎</span>}
                  </>
                )}
              </h2>
              {isAdmin && <button className="category-delete-btn" onClick={() => handleDeleteCategory(cat)}>✕</button>}
            </div>
            {!isCollapsed && <div className="med-grid">
              {meds.map(med => (
                <div key={med.name} className="med-card">
                  <div className="med-card-top">
                    <Link to={`/edit/${med.name}`} className="med-card-link">
                      <span className="med-card-name">{med.display_name}</span>
                    </Link>
                    {isAdmin && <div className="med-kebab-wrapper">
                      <button
                        className="med-kebab-btn"
                        onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === med.name ? null : med.name); }}
                      >&#x22EE;</button>
                      {openMenu === med.name && (
                        <div className="med-kebab-menu" onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setOpenMenu(null); handleRename(med); }}>Rename</button>
                          <button className="med-kebab-delete" onClick={() => { setOpenMenu(null); handleDelete(med); }}>Delete</button>
                        </div>
                      )}
                    </div>}
                  </div>
                  {med.stages && med.stages.length > 0 && (
                    <div className="med-card-stages">
                      {med.stages.map(stage => {
                        const key = stageKey(med.name, stage.id);
                        const vars = Object.entries(stage.variables || {});
                        return (
                          <div key={stage.id} className="dash-stage">
                            <div className="dash-stage-header">
                              <Link
                                to={`/edit/${med.name}?stage=${stage.id}`}
                                className="dash-stage-name"
                              >{stage.name}</Link>
                              <button
                                className={`dash-stage-play ${playing === key ? 'playing' : ''}`}
                                onClick={() => handlePlayStage(med, stage)}
                                disabled={assembling === key}
                              >
                                {stageButtonLabel(med.name, stage.id)}
                              </button>
                            </div>
                            {vars.length > 0 && (
                              <div className="dash-stage-vars">
                                {vars.map(([varName, varData]) => (
                                  <span key={varName} className="dash-var-group">
                                    <span className="dash-var-label">{(typeof varData === 'object' && varData.displayName) || varName}</span>
                                    <input
                                      className="dash-loop-input"
                                      type="number"
                                      value={typeof varData === 'object' ? varData.value : varData}
                                      min="1"
                                      onClick={e => e.stopPropagation()}
                                      onChange={e => {
                                        const val = e.target.value;
                                        updateStageVar(med.name, stage.id, varName, val);
                                      }}
                                      onBlur={() => saveStageVariables(med.name, stage.id, stage.variables)}
                                    />
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              {isAdmin && <button className="med-card med-card-add" onClick={() => handleNewExercise(cat.name)}>
                <span className="med-card-add-icon">+</span>
                <span className="med-card-add-label">New Exercise</span>
              </button>}
            </div>}
          </div>
        );
      })}

      {isAdmin && <button className="btn-new-section" onClick={handleNewSection}>
        + New Section
      </button>}

    </div>
  );
}
