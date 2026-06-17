import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DndContext, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { fetchGroups, createGroup, updateGroup, deleteGroup, fetchCategories, createCategory, updateCategory, renameCategory, deleteCategory, fetchMeditations, createMeditation, renameMeditation, deleteMeditation, saveMeta, saveStageVariables, assembleStage, BASE } from '../api';
import { useAuth } from '../AuthContext';
import { useLocalState } from '../utils';
import DashCard from '../components/DashCard';
import DashDropZone from '../components/DashDropZone';
import DraggableCategoryHeader from '../components/DraggableCategoryHeader';
import GroupDropZone from '../components/GroupDropZone';

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meditations, setMeditations] = useState([]);
  const [assembling, setAssembling] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCatName, setEditCatName] = useState('');
  const [expandedCats, setExpandedCats] = useLocalState('dashboard:expandedCats', {});
  const [selectedGroup, setSelectedGroup] = useLocalState('dashboard:selectedGroup', null); // null = first group
  const audioRef = useRef(null);
  const navigate = useNavigate();

  function loadData() {
    return Promise.all([
      fetchGroups().then(setGroups),
      fetchCategories().then(setCategories),
      fetchMeditations().then(setMeditations),
    ]);
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  // Re-fetch when AI assistant makes changes
  useEffect(() => {
    const handler = () => loadData();
    window.addEventListener('assistant-data-changed', handler);
    return () => window.removeEventListener('assistant-data-changed', handler);
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

  async function handleNewSection(group = '') {
    const name = prompt('Section name:');
    if (!name || !name.trim()) return;
    try {
      const cat = await createCategory(name.trim(), group);
      setCategories(prev => [...prev, cat]);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSetGroup(cat, newGroupId) {
    await updateCategory(cat.name, { group: newGroupId });
    const grp = groups.find(g => g.name === newGroupId);
    setCategories(cats =>
      cats.map(c => c.name === cat.name ? { ...c, group: newGroupId, group_display: grp?.display_name || '' } : c)
    );
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

  async function handleMoveToCategory(med, newCategory) {
    await saveMeta(med.name, { category: newCategory });
    setMeditations(meds =>
      meds.map(m => m.name === med.name ? { ...m, category: newCategory } : m)
    );
  }

  // --- Drag and drop ---
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [activeDrag, setActiveDrag] = useState(null); // { type: 'med', med } or { type: 'section', cat }

  function handleDragStart(event) {
    const id = String(event.active.id);
    if (id.startsWith('med:')) {
      const med = meditations.find(m => m.name === id.slice(4));
      if (med) setActiveDrag({ type: 'med', med });
    } else if (id.startsWith('section:')) {
      const cat = categories.find(c => c.name === id.slice(8));
      if (cat) setActiveDrag({ type: 'section', cat });
    }
  }

  function handleDragEnd(event) {
    const drag = activeDrag;
    setActiveDrag(null);
    const { over } = event;
    if (!over || !drag) return;
    const overId = String(over.id);

    if (drag.type === 'med' && overId.startsWith('category:')) {
      const targetCat = overId.slice(9);
      if (drag.med.category !== targetCat) {
        handleMoveToCategory(drag.med, targetCat);
      }
    } else if (drag.type === 'section' && overId.startsWith('group:')) {
      const targetGroup = overId.slice(6);
      if ((drag.cat.group || '') !== targetGroup) {
        handleSetGroup(drag.cat, targetGroup);
      }
    }
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

  const allCats = [...categories, ...extraCats.map(k => ({ name: k, display_name: k, group: '' }))];

  // Build group list: ungrouped ('') + all DB groups
  const groupIds = ['', ...groups.map(g => g.name)];
  const groupDisplayMap = {};
  for (const g of groups) groupDisplayMap[g.name] = g.display_name;

  // Also include any group IDs referenced by categories but not in groups list (shouldn't happen but safety)
  const seen = new Set(groupIds);
  for (const cat of allCats) {
    const g = cat.group || '';
    if (!seen.has(g)) { seen.add(g); groupIds.push(g); }
  }

  function renderCategory(cat) {
    const meds = grouped[cat.name] || [];
    const isCollapsed = !expandedCats[cat.name];
    const isMedDrag = activeDrag?.type === 'med';
    const isSectionDrag = activeDrag?.type === 'section';
    const isSelf = isSectionDrag && activeDrag.cat.name === cat.name;

    return (
      <DashDropZone key={cat.name} id={`category:${cat.name}`} isOver={isMedDrag && activeDrag.med.category !== cat.name}>
        <div className={`category-section${isSelf ? ' category-section-dragging' : ''}`}>
          <DraggableCategoryHeader catName={cat.name} disabled={!isAdmin}>
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
          </DraggableCategoryHeader>
          {!isCollapsed && <div className="med-grid">
            {meds.map(med => (
              <DashCard key={med.name} med={med} isAdmin={isAdmin} isDragging={isMedDrag && activeDrag.med.name === med.name}>
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
                        <div className="med-kebab-submenu-wrapper">
                          <button className="med-kebab-submenu-trigger">Move to &rsaquo;</button>
                          <div className="med-kebab-submenu">
                            {allCats.filter(c => c.name !== med.category).map(c => (
                              <button key={c.name} onClick={() => { setOpenMenu(null); handleMoveToCategory(med, c.name); }}>
                                {c.display_name}
                              </button>
                            ))}
                          </div>
                        </div>
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
                                  <span className="dash-var-label">
                                    {(typeof varData === 'object' && varData.displayName) || varName}
                                    {typeof varData === 'object' && varData.unit && (
                                      <span className="dash-var-unit"> ({varData.unit === 'minutes' ? 'mins' : varData.unit === 'seconds' ? 'secs' : varData.unit})</span>
                                    )}
                                  </span>
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
              </DashCard>
            ))}
            {isAdmin && <button className="med-card med-card-add" onClick={() => handleNewExercise(cat.name)}>
              <span className="med-card-add-icon">+</span>
              <span className="med-card-add-label">New Exercise</span>
            </button>}
          </div>}
        </div>
      </DashDropZone>
    );
  }

  const activeId = activeDrag ? (activeDrag.type === 'section' ? `section:${activeDrag.cat.name}` : null) : null;

  // Current page — default to first group
  const activeGroup = selectedGroup != null && groupIds.includes(selectedGroup) ? selectedGroup : (groups.length > 0 ? groups[0].name : '');
  const activeGroupDisplay = groupDisplayMap[activeGroup] || 'Other';
  const visibleCats = allCats.filter(c => (c.group || '') === activeGroup);
  const ungroupedCats = allCats.filter(c => !c.group);

  const categoryContent = visibleCats.map(renderCategory);

  return (
    <div>
      <h1>Exercise Bank</h1>
      <p className="section-description">All available exercises, organised by system and category. Each exercise has progressive stages that build on each other, so you can track your development over time. Stages show adjustable defaults for duration, rounds, or breath counts, and are assembled into programmes.</p>

      {/* Group page tabs */}
      <div className="group-tabs">
        {groups.map(g => (
          <button
            key={g.name}
            className={`group-tab${activeGroup === g.name ? ' active' : ''}`}
            onClick={() => setSelectedGroup(g.name)}
          >{g.display_name}</button>
        ))}
        {ungroupedCats.length > 0 && (
          <button
            className={`group-tab${activeGroup === '' ? ' active' : ''}`}
            onClick={() => setSelectedGroup('')}
          >Other</button>
        )}
        {isAdmin && <button className="group-tab group-tab-add" onClick={async () => {
          const displayName = prompt('Group name:');
          if (!displayName || !displayName.trim()) return;
          try {
            const grp = await createGroup(displayName.trim());
            setGroups(prev => [...prev, grp]);
            setSelectedGroup(grp.name);
          } catch (err) { alert(err.message); }
        }}>+</button>}
      </div>

      {isAdmin ? (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {categoryContent}
          <DragOverlay dropAnimation={null}>
            {activeDrag?.type === 'med' ? (
              <div className="med-card med-card-drag-overlay">
                <span className="med-card-name">{activeDrag.med.display_name}</span>
              </div>
            ) : activeDrag?.type === 'section' ? (
              <div className="category-section category-drag-overlay">
                <span className="category-header">{activeDrag.cat.display_name}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : categoryContent}

      {isAdmin && <div className="new-section-buttons">
        <button className="btn-new-section" onClick={() => handleNewSection(activeGroup)}>+ New Section</button>
      </div>}

    </div>
  );
}
