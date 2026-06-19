import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DndContext, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { fetchGroups, createGroup, updateGroup, deleteGroup, fetchCategories, createCategory, updateCategory, renameCategory, deleteCategory, fetchMeditations, createMeditation, renameMeditation, deleteMeditation, saveMeta, saveStageVariables, assembleStage, cloneMeditation, fetchGroupViewers, shareGroup, unshareGroup, fetchCategoryViewers, shareCategory, unshareCategory, fetchMeditationViewers, shareMeditation, unshareMeditation, fetchPractices, fetchPractice, savePractice, BASE } from '../api';
import { useAuth, canEdit } from '../AuthContext';
import { useLocalState } from '../utils';
import DashCard from '../components/DashCard';
import DashDropZone from '../components/DashDropZone';
import DraggableCategoryHeader from '../components/DraggableCategoryHeader';
import GroupDropZone from '../components/GroupDropZone';
import ViewerManager from '../components/ViewerManager';

export default function Dashboard() {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meditations, setMeditations] = useState([]);
  const [assembling, setAssembling] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [viewerPanel, setViewerPanel] = useState(null); // 'group:name' or 'cat:name'
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCatName, setEditCatName] = useState('');
  const [expandedCats, setExpandedCats] = useLocalState('dashboard:expandedCats', {});
  const [selectedGroup, setSelectedGroup] = useLocalState('dashboard:selectedGroup', null);
  const [ownerFilter, setOwnerFilter] = useLocalState('dashboard:ownerFilter', auth.canCreate ? 'mine' : null);
  const [addToProg, setAddToProg] = useState(null); // { med } — exercise to add to a programme
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

  // Reset to "My Exercises" when clicking the nav Exercises link
  useEffect(() => {
    const handler = () => setOwnerFilter('mine');
    window.addEventListener('nav-exercises', handler);
    return () => window.removeEventListener('nav-exercises', handler);
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
    const name = prompt('Category name:');
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

  // --- Filter meditations by ownership ---
  // For viewers: derive builder tabs from the exercises they can see
  const builderTabs = (() => {
    if (auth.canCreate) return [];
    const seen = new Map(); // username -> display name
    for (const m of meditations) {
      if (!m.is_public && m.created_by && !seen.has(m.created_by)) {
        seen.set(m.created_by, m.created_by_display || m.created_by);
      }
    }
    return [...seen.entries()].map(([username, display]) => ({ username, display }));
  })();

  // Ensure viewer filter defaults to first builder tab
  const effectiveOwnerFilter = (() => {
    if (auth.canCreate) return ownerFilter || 'mine';
    const validValues = [...builderTabs.map(b => b.username), ...(auth.showPublic ? ['public'] : [])];
    if (ownerFilter && validValues.includes(ownerFilter)) return ownerFilter;
    return builderTabs.length > 0 ? builderTabs[0].username : 'public';
  })();

  const filteredMeditations = auth.canCreate ? meditations.filter(med => {
    if (effectiveOwnerFilter === 'all') return true;
    if (effectiveOwnerFilter === 'mine') return med.created_by === auth.username;
    if (effectiveOwnerFilter === 'public') return med.is_public;
    return true;
  }) : meditations.filter(med => {
    if (effectiveOwnerFilter === 'public') return med.is_public;
    // filter is a builder username
    return med.created_by === effectiveOwnerFilter;
  });

  const hasOwn = meditations.some(m => m.created_by === auth.username);
  const hasPublic = meditations.some(m => m.is_public);

  // --- Group meditations by category ---
  const grouped = {};
  for (const med of filteredMeditations) {
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

  function renderMedCard(med) {
    const isMedDrag = activeDrag?.type === 'med';
    return (
      <DashCard key={med.name} med={med} isAdmin={canEdit(auth, med)} isDragging={isMedDrag && activeDrag.med.name === med.name}>
        <div className="med-card-top">
          <Link to={`/edit/${med.name}`} className="med-card-link">
            <span className="med-card-name">{med.display_name}</span>
          </Link>
          {(canEdit(auth, med) || auth.canCreate) && (
            <div className="med-kebab-wrapper">
              <button
                className="med-kebab-btn"
                onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === med.name ? null : med.name); }}
              >&#x22EE;</button>
              {openMenu === med.name && (
                <div className="med-kebab-menu" onClick={e => e.stopPropagation()}>
                  {canEdit(auth, med) && (
                    <button onClick={() => { setOpenMenu(null); handleRename(med); }}>Rename</button>
                  )}
                  {auth.canCreate && (
                    <button onClick={async () => {
                      setOpenMenu(null);
                      try {
                        const data = await cloneMeditation(med.name);
                        setMeditations(prev => [...prev, data]);
                        setOwnerFilter('mine');
                      } catch (err) { alert(err.message); }
                    }}>{canEdit(auth, med) ? 'Duplicate' : 'Make your own copy'}</button>
                  )}
                  {canEdit(auth, med) && (() => {
                    const myCats = allCats.filter(c => c.name !== med.category && visibleCats.some(vc => vc.name === c.name));
                    return myCats.length > 0 && (
                      <div className="med-kebab-submenu-wrapper">
                        <button className="med-kebab-submenu-trigger">Move to &rsaquo;</button>
                        <div className="med-kebab-submenu">
                          {myCats.map(c => (
                            <button key={c.name} onClick={() => { setOpenMenu(null); handleMoveToCategory(med, c.name); }}>
                              {c.display_name}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  {canEdit(auth, med) && med.category !== 'uncategorised' && (
                    <button onClick={() => { setOpenMenu(null); handleMoveToCategory(med, 'uncategorised'); }}>Ungroup</button>
                  )}
                  {auth.canCreate && med.stages && med.stages.length > 0 && (
                    <button onClick={() => { setOpenMenu(null); setAddToProg({ med }); }}>Add to programme</button>
                  )}
                  {canEdit(auth, med) && (
                    <button onClick={() => { setOpenMenu(null); setViewerPanel(`med:${med.name}`); }}>Viewers</button>
                  )}
                  {canEdit(auth, med) && (
                    <button onClick={async () => {
                      const newVal = !med.is_public;
                      await saveMeta(med.name, { is_public: newVal });
                      setMeditations(prev => prev.map(m => m.name === med.name ? { ...m, is_public: newVal } : m));
                      setOpenMenu(null);
                    }}>
                      {med.is_public ? 'Make private' : 'Make public'}
                    </button>
                  )}
                  {canEdit(auth, med) && (
                    <button className="med-kebab-delete" onClick={() => { setOpenMenu(null); handleDelete(med); }}>Delete</button>
                  )}
                </div>
              )}
              {viewerPanel === `med:${med.name}` && (
                <ViewerManager
                  fetchViewers={() => fetchMeditationViewers(med.name)}
                  addViewer={(u) => shareMeditation(med.name, u)}
                  removeViewer={(id) => unshareMeditation(med.name, id)}
                  onClose={() => setViewerPanel(null)}
                />
              )}
            </div>
          )}
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
    );
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
          <DraggableCategoryHeader catName={cat.name} disabled={!canEdit(auth, { created_by: auth.username })}>
            <span
              className="category-collapse-btn"
              onClick={() => setExpandedCats(prev => ({ ...prev, [cat.name]: !prev[cat.name] }))}
            >{isCollapsed ? '▸' : '▾'}</span>
            <h2 className="category-header">
              {editingCategory === cat.name ? (
                <input
                  className="category-name-input"
                  value={editCatName}
                  autoFocus
                  onChange={e => setEditCatName(e.target.value)}
                  onBlur={() => saveEditCategory(cat)}
                  onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                />
              ) : (
                <>{cat.display_name}</>
              )}
            </h2>
            {auth.canCreate && ownerFilter === 'mine' && (
              <div className="med-kebab-wrapper">
                <button
                  className="med-kebab-btn"
                  onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === `cat:${cat.name}` ? null : `cat:${cat.name}`); }}
                >&#x22EE;</button>
                {openMenu === `cat:${cat.name}` && (
                  <div className="med-kebab-menu" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setOpenMenu(null); startEditCategory(cat); }}>Rename</button>
                    <button onClick={() => { setOpenMenu(null); setViewerPanel(`cat:${cat.name}`); }}>Viewers</button>
                    {(() => {
                      const myGroups = groups.filter(g => g.created_by === auth.username && g.name !== (cat.group || ''));
                      return myGroups.length > 0 && (
                        <div className="med-kebab-submenu-wrapper">
                          <button className="med-kebab-submenu-trigger">Move to &rsaquo;</button>
                          <div className="med-kebab-submenu">
                            {myGroups.map(g => (
                              <button key={g.name} onClick={() => { setOpenMenu(null); handleSetGroup(cat, g.name); }}>
                                {g.display_name}
                              </button>
                            ))}
                            {(cat.group || '') !== '' && (
                              <button onClick={() => { setOpenMenu(null); handleSetGroup(cat, ''); }}>Other (ungrouped)</button>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    <button onClick={async () => {
                      const newVal = !cat.is_public;
                      await updateCategory(cat.name, { is_public: newVal });
                      setCategories(prev => prev.map(c => c.name === cat.name ? { ...c, is_public: newVal } : c));
                      setOpenMenu(null);
                    }}>
                      {cat.is_public ? 'Make private' : 'Make public'}
                    </button>
                    <button className="med-kebab-delete" onClick={() => { setOpenMenu(null); handleDeleteCategory(cat); }}>Delete</button>
                  </div>
                )}
                {viewerPanel === `cat:${cat.name}` && (
                  <ViewerManager
                    fetchViewers={() => fetchCategoryViewers(cat.name)}
                    addViewer={(u) => shareCategory(cat.name, u)}
                    removeViewer={(id) => unshareCategory(cat.name, id)}
                    onClose={() => setViewerPanel(null)}
                  />
                )}
              </div>
            )}
          </DraggableCategoryHeader>
          {!isCollapsed && (meds.length > 0 ? (
            <div className="med-grid">
              {meds.map(med => renderMedCard(med))}
              {auth.canCreate && ownerFilter === 'mine' && <button className="med-card med-card-add" onClick={() => handleNewExercise(cat.name)}>
                <span className="med-card-add-icon">+</span>
                <span className="med-card-add-label">New Exercise</span>
              </button>}
            </div>
          ) : auth.canCreate && ownerFilter === 'mine' ? (
            <button className="med-card-add-full" onClick={() => handleNewExercise(cat.name)}>
              <span className="med-card-add-icon">+</span>
              <span>New Exercise</span>
            </button>
          ) : null)}
        </div>
      </DashDropZone>
    );
  }

  const activeId = activeDrag ? (activeDrag.type === 'section' ? `section:${activeDrag.cat.name}` : null) : null;

  // Determine which groups to show based on ownership filter
  const catsWithContent = new Set(Object.keys(grouped));
  const activeCats = allCats.filter(c => catsWithContent.has(c.name));
  const activeGroupIds = new Set(activeCats.map(c => c.group || ''));

  const visibleGroups = (() => {
    if (effectiveOwnerFilter === 'mine') {
      return groups.filter(g => g.created_by === auth.username || activeGroupIds.has(g.name));
    }
    // public, all, or builder username — show groups with matching content
    return groups.filter(g => activeGroupIds.has(g.name));
  })();
  const hasUngrouped = activeGroupIds.has('');

  // Current group — default to first visible group
  const validGroupIds = [...visibleGroups.map(g => g.name), ...(hasUngrouped ? [''] : [])];
  const activeGroup = selectedGroup != null && validGroupIds.includes(selectedGroup) ? selectedGroup : (validGroupIds[0] ?? '');
  const visibleCats = allCats.filter(c => c.name !== 'uncategorised' && (c.group || '') === activeGroup && (catsWithContent.has(c.name) || effectiveOwnerFilter === 'mine'));
  const uncategorisedMeds = grouped['uncategorised'] || [];

  const groupIsEmpty = visibleCats.length === 0 && uncategorisedMeds.length === 0;

  const categoryContent = (
    <>
      {uncategorisedMeds.length > 0 && (
        <div className="med-grid" style={{ marginBottom: 24 }}>
          {uncategorisedMeds.map(med => renderMedCard(med))}
        </div>
      )}
      {visibleCats.map(renderCategory)}
      {auth.canCreate && ownerFilter === 'mine' && (
        <div className="group-empty-actions">
          <button className="group-empty-btn" onClick={() => handleNewSection(activeGroup)}>
            <span className="group-empty-btn-icon">+</span>
            <strong>Add a category</strong>
            <span>Organise exercises into categories like "Beginner" or "Advanced"</span>
          </button>
          <button className="group-empty-btn" onClick={() => handleNewExercise('uncategorised')}>
            <span className="group-empty-btn-icon">+</span>
            <strong>Add an exercise</strong>
            <span>Create an exercise directly in this group</span>
          </button>
        </div>
      )}
    </>
  );

  return (
    <div>
      <h1>Exercise Bank</h1>
      <p className="section-description">All available exercises, organised by system and category. Each exercise has progressive stages that build on each other, so you can track your development over time. Stages show adjustable defaults for duration, rounds, or breath counts, and are assembled into programmes.</p>

      {/* Ownership tabs */}
      {auth.canCreate ? (
        <div className="group-tabs">
          <button className={`group-tab${effectiveOwnerFilter === 'mine' ? ' active' : ''}`} onClick={() => setOwnerFilter('mine')}>My Exercises</button>
          <button className={`group-tab${effectiveOwnerFilter === 'public' ? ' active' : ''}`} onClick={() => setOwnerFilter('public')}>Public</button>
          {auth.canManageContent && (
            <button className={`group-tab${effectiveOwnerFilter === 'all' ? ' active' : ''}`} onClick={() => setOwnerFilter('all')}>All</button>
          )}
        </div>
      ) : (hasPublic || builderTabs.length > 0) && (
        <div className="group-tabs">
          {builderTabs.map(b => (
            <button key={b.username} className={`group-tab${effectiveOwnerFilter === b.username ? ' active' : ''}`} onClick={() => setOwnerFilter(b.username)}>{b.display}&rsquo;s Exercises</button>
          ))}
          {hasPublic && auth.showPublic && (
            <button className={`group-tab${effectiveOwnerFilter === 'public' ? ' active' : ''}`} onClick={() => setOwnerFilter('public')}>Public</button>
          )}
        </div>
      )}

      <p className="owner-filter-desc">
        {effectiveOwnerFilter === 'mine' && <>Your exercises. Use the <span style={{ fontSize: 15 }}>&#x22EE;</span> menu to share with clients, add to programmes, duplicate, or organise into groups and categories.</>}
        {effectiveOwnerFilter === 'public' && <>Publicly available exercises. Use the <span style={{ fontSize: 15 }}>&#x22EE;</span> menu to make your a customisable copy, or add it to a programme as is.</>}
        {effectiveOwnerFilter === 'all' && 'All exercises across all users.'}
        {effectiveOwnerFilter !== 'mine' && effectiveOwnerFilter !== 'public' && effectiveOwnerFilter !== 'all' && `Exercises shared with you by ${builderTabs.find(b => b.username === effectiveOwnerFilter)?.display || effectiveOwnerFilter}.`}
      </p>

      {visibleGroups.length === 0 && !hasUngrouped && auth.canCreate && ownerFilter === 'mine' ? (
        <button className="onboarding-create-btn" onClick={async () => {
          const displayName = prompt('Group name:');
          if (!displayName || !displayName.trim()) return;
          try {
            const grp = await createGroup(displayName.trim());
            setGroups(prev => [...prev, grp]);
            setSelectedGroup(grp.name);
          } catch (err) { alert(err.message); }
        }}>
          <strong>Create your first group of exercises</strong>
          <span>Exercises are organised into groups, then categories within each group. For example, you might have a group called "Breathing Exercises" with categories like "Beginner" and "Advanced" inside it.</span>
        </button>
      ) : (
        <>
          {/* Group tabs — bubble style, filtered to groups with content */}
          <div className="group-bubbles">
            {visibleGroups.map(g => {
              const isOwn = g.created_by === auth.username;
              const showMenu = isOwn && ownerFilter === 'mine';
              return (
                <div key={g.name} className="group-bubble-wrapper">
                  <button
                    className={`group-bubble${activeGroup === g.name ? ' active' : ''}`}
                    onClick={() => setSelectedGroup(g.name)}
                  >
                    {g.display_name}
                    {showMenu && (
                      <span
                        className="group-bubble-dots"
                        onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === `grp:${g.name}` ? null : `grp:${g.name}`); }}
                      >&#x22EE;</span>
                    )}
                  </button>
                  {showMenu && (openMenu === `grp:${g.name}` || viewerPanel === `group:${g.name}`) && (
                    <div className="group-bubble-menu-anchor">
                      {openMenu === `grp:${g.name}` && (
                        <div className="med-kebab-menu" onClick={e => e.stopPropagation()}>
                          <button onClick={() => {
                            setOpenMenu(null);
                            const newName = prompt('Rename group:', g.display_name);
                            if (newName && newName.trim() && newName.trim() !== g.display_name) {
                              updateGroup(g.name, { display_name: newName.trim() });
                              setGroups(prev => prev.map(x => x.name === g.name ? { ...x, display_name: newName.trim() } : x));
                            }
                          }}>Rename</button>
                          <button onClick={() => { setOpenMenu(null); setViewerPanel(`group:${g.name}`); }}>Viewers</button>
                          <button onClick={async () => {
                            const newVal = !g.is_public;
                            await updateGroup(g.name, { is_public: newVal });
                            setGroups(prev => prev.map(x => x.name === g.name ? { ...x, is_public: newVal } : x));
                            setOpenMenu(null);
                          }}>
                            {g.is_public ? 'Make private' : 'Make public'}
                          </button>
                          <button className="med-kebab-delete" onClick={async () => {
                            setOpenMenu(null);
                            if (!confirm(`Delete group "${g.display_name}"?`)) return;
                            await deleteGroup(g.name);
                            setGroups(prev => prev.filter(x => x.name !== g.name));
                          }}>Delete</button>
                        </div>
                      )}
                      {viewerPanel === `group:${g.name}` && (
                        <ViewerManager
                          fetchViewers={() => fetchGroupViewers(g.name)}
                          addViewer={(u) => shareGroup(g.name, u)}
                          removeViewer={(id) => unshareGroup(g.name, id)}
                          onClose={() => setViewerPanel(null)}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {hasUngrouped && (
              <button
                className={`group-bubble${activeGroup === '' ? ' active' : ''}`}
                onClick={() => setSelectedGroup('')}
              >Other</button>
            )}
            {auth.canCreate && ownerFilter === 'mine' && <button className="group-bubble group-bubble-add" onClick={async () => {
              const displayName = prompt('Group name:');
              if (!displayName || !displayName.trim()) return;
              try {
                const grp = await createGroup(displayName.trim());
                setGroups(prev => [...prev, grp]);
                setSelectedGroup(grp.name);
              } catch (err) { alert(err.message); }
            }}>+</button>}
          </div>

          {auth.canManageContent ? (
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

        </>
      )}

      {addToProg && <AddToProgModal med={addToProg.med} auth={auth} onClose={() => setAddToProg(null)} />}
    </div>
  );
}

function AddToProgModal({ med, auth, onClose }) {
  const [practices, setPractices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrac, setSelectedPrac] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedStage, setSelectedStage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPractices().then(pracs => {
      setPractices(pracs.filter(p => p.created_by === auth.username));
      setLoading(false);
    });
  }, []);

  async function handleAdd() {
    if (!selectedPrac || selectedWeek === null || selectedDay === null || !selectedStage) return;
    setSaving(true);
    try {
      const prac = await fetchPractice(selectedPrac.name);
      const weeks = prac.items || [];
      const day = weeks[selectedWeek]?.days?.[selectedDay];
      if (!day) { alert('Invalid day'); setSaving(false); return; }
      const newItem = {
        id: 'item-' + Math.random().toString(36).slice(2, 10),
        meditation: med.name,
        meditation_display: med.display_name,
        stage_id: selectedStage.id,
        stage_name: selectedStage.name,
        variables: selectedStage.variables || {},
      };
      day.items = [...(day.items || []), newItem];
      await savePractice(selectedPrac.name, { items: weeks });
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  const prac = selectedPrac;
  const weeks = prac?.items || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add to Programme</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        {loading ? (
          <div style={{ color: '#666', padding: 20, textAlign: 'center' }}>Loading...</div>
        ) : practices.length === 0 ? (
          <div style={{ color: '#666', padding: 20, textAlign: 'center' }}>No programmes yet. Create one first.</div>
        ) : (
          <div className="add-to-prog-steps">
            <div className="add-to-prog-step add-to-prog-stage">
              <span className="add-to-prog-label">{med.display_name} — Stage</span>
              <div className="add-to-prog-options">
                {med.stages.map(s => (
                  <button key={s.id} className={`add-to-prog-stage-chip${selectedStage?.id === s.id ? ' active' : ''}`}
                    onClick={() => setSelectedStage(s)}>{s.name}</button>
                ))}
              </div>
            </div>

            {selectedStage && <>
              <div className="add-to-prog-step" style={{ borderTop: '1px solid #2a2a4a', paddingTop: 12 }}>
                <span className="add-to-prog-label">Add to Programme</span>
                <div className="add-to-prog-options">
                  {practices.map(p => (
                    <button key={p.name} className={`picker-filter-chip${selectedPrac?.name === p.name ? ' active' : ''}`}
                      onClick={() => { setSelectedPrac(p); setSelectedWeek(null); setSelectedDay(null); }}>{p.display_name}</button>
                  ))}
                </div>
              </div>

              {prac && weeks.length > 0 && (
                <div className="add-to-prog-step">
                  <span className="add-to-prog-label">Week</span>
                  <div className="add-to-prog-options">
                    {weeks.map((w, wi) => (
                      <button key={wi} className={`picker-filter-chip${selectedWeek === wi ? ' active' : ''}`}
                        onClick={() => { setSelectedWeek(wi); setSelectedDay(null); }}>{w.label || `Week ${wi + 1}`}</button>
                    ))}
                  </div>
                </div>
              )}

              {selectedWeek !== null && weeks[selectedWeek]?.days?.length > 0 && (
                <div className="add-to-prog-step">
                  <span className="add-to-prog-label">Day</span>
                  <div className="add-to-prog-options">
                    {weeks[selectedWeek].days.map((d, di) => (
                      <button key={di} className={`picker-filter-chip${selectedDay === di ? ' active' : ''}`}
                        onClick={() => setSelectedDay(di)}>{d.label || `Day ${di + 1}`}</button>
                    ))}
                  </div>
                </div>
              )}

              {selectedDay !== null && (
                <button className="add-to-prog-confirm" onClick={handleAdd} disabled={saving}>
                  {saving ? 'Adding...' : `Add to ${weeks[selectedWeek]?.days?.[selectedDay]?.label || `Day ${selectedDay + 1}`}`}
                </button>
              )}
            </>}
          </div>
        )}
      </div>
    </div>
  );
}
