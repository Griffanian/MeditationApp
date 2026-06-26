import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchPractice, savePractice, fetchAvailableStages, fetchGroups, fetchCategories, computeDurations } from '../api';
import { useAuth } from '../AuthContext';
import { useLocalState } from '../utils';

function genId() {
  return 'item-' + Math.random().toString(36).slice(2, 10);
}

function migrateToWeeks(items) {
  let weeks;
  if (!items || items.length === 0) {
    weeks = [{ label: 'Week 1', days: [{ label: 'Day 1', items: [] }] }];
  } else if (items[0] && items[0].days) {
    weeks = items;
  } else {
    weeks = [{ label: 'Week 1', days: [{ label: 'Day 1', items }] }];
  }
  // Pad each week to 7 days
  return weeks.map(w => {
    const days = [...(w.days || [])];
    while (days.length < 7) days.push({ label: `Day ${days.length + 1}`, items: [] });
    return { ...w, days };
  });
}

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function varSummary(variables) {
  if (!variables) return null;
  const entries = Object.entries(variables);
  if (entries.length === 0) return null;
  return entries.map(([k, v]) => {
    const val = typeof v === 'object' ? v.value : v;
    const unit = typeof v === 'object' && v.unit ? ` ${v.unit}` : '';
    const display = typeof v === 'object' && v.displayName ? v.displayName : k;
    return `${display}: ${val}${unit}`;
  }).join(', ');
}

export default function PracticeBuilder() {
  const auth = useAuth();
  const { name } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialWeek = searchParams.get('week');
  const [practice, setPractice] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [groups, setGroups] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  // Calendar state
  const storedViewMode = (() => { try { const v = JSON.parse(localStorage.getItem(`prog:${name}:viewMode`)); return v || 1; } catch { return 1; } })();
  const [weekPage, setWeekPage] = useState(initialWeek != null ? Math.floor(parseInt(initialWeek, 10) / storedViewMode) : 0);
  const [viewMode, setViewMode] = useLocalState(`prog:${name}:viewMode`, 1);
  const [editingDay, setEditingDay] = useState(null); // { wi, di }

  // Picker
  const [pickerTarget, setPickerTarget] = useState(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerOwner, setPickerOwner] = useState('mine');
  const [pickerGroup, setPickerGroup] = useState('all');
  const [pickerCategory, setPickerCategory] = useState('all');

  // Grid drag (cross-day)
  const [gridDrag, setGridDrag] = useState(null); // { wi, di, idx }
  const [gridDropTarget, setGridDropTarget] = useState(null); // { wi, di }

  // Modal drag (within-day reorder)
  const [modalDrag, setModalDrag] = useState(null); // { idx }
  const [modalDragOver, setModalDragOver] = useState(null); // { idx }

  // Context menu
  const [ctxMenu, setCtxMenu] = useState(null); // { x, y, idx }

  // Stage durations
  const [itemDurations, setItemDurations] = useState({});


  useEffect(() => {
    fetchPractice(name).then(p => {
      p.items = migrateToWeeks(p.items);
      setPractice(p);
      setTitleDraft(p.display_name);
    });
    fetchAvailableStages().then(setExercises);
    fetchGroups().then(setGroups);
    fetchCategories().then(setCategories);
  }, [name]);

  useEffect(() => {
    const handler = () => {
      fetchPractice(name).then(p => {
        p.items = migrateToWeeks(p.items);
        setPractice(p);
        setTitleDraft(p.display_name);
      });
    };
    window.addEventListener('assistant-data-changed', handler);
    return () => window.removeEventListener('assistant-data-changed', handler);
  }, [name]);

  const save = useCallback(async (weeks) => {
    await savePractice(name, { items: weeks });
  }, [name]);

  if (!practice) return <div className="loading-page"><div className="loading-spinner" />Loading programme...</div>;

  const weeks = practice.items || [];

  function updateWeeks(newWeeks) {
    setPractice(prev => ({ ...prev, items: newWeeks }));
    save(newWeeks);
  }

  function updateDayItems(wi, di, newItems) {
    const newWeeks = weeks.map((w, i) => {
      if (i !== wi) return w;
      return { ...w, days: w.days.map((d, j) => j === di ? { ...d, items: newItems } : d) };
    });
    updateWeeks(newWeeks);
  }

  // --- Title ---
  async function saveTitle() {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === practice.display_name) return;
    await savePractice(name, { display_name: trimmed });
    setPractice(prev => ({ ...prev, display_name: trimmed }));
  }

  // --- Week management ---
  function addWeek() {
    const newWeeks = [...weeks, {
      label: `Week ${weeks.length + 1}`,
      days: Array.from({ length: 7 }, (_, i) => ({ label: `Day ${i + 1}`, items: [] })),
    }];
    updateWeeks(newWeeks);
    setWeekPage(Math.floor((newWeeks.length - 1) / viewMode));
  }

  function removeWeek(wi) {
    if (weeks.length <= 1) return;
    if (!confirm(`Remove ${weeks[wi].label}?`)) return;
    const newWeeks = weeks.filter((_, i) => i !== wi);
    updateWeeks(newWeeks);
    if (weekPage * viewMode >= newWeeks.length) {
      setWeekPage(Math.max(0, Math.floor((newWeeks.length - 1) / viewMode)));
    }
  }

  function renameWeek(wi, label) {
    updateWeeks(weeks.map((w, i) => i === wi ? { ...w, label } : w));
  }

  function renameDay(wi, di, label) {
    const newWeeks = weeks.map((w, i) => {
      if (i !== wi) return w;
      return { ...w, days: w.days.map((d, j) => j === di ? { ...d, label } : d) };
    });
    updateWeeks(newWeeks);
  }

  // --- Stage management ---
  function addStage(wi, di, exercise, stage) {
    const newItem = {
      id: genId(),
      meditation: exercise.name,
      meditation_display: exercise.display_name,
      stage_id: stage.id,
      stage_name: stage.name,
      variables: JSON.parse(JSON.stringify(stage.variables || {})),
    };
    const dayItems = weeks[wi]?.days?.[di]?.items || [];
    updateDayItems(wi, di, [...dayItems, newItem]);
    setPickerTarget(null);
    setPickerSearch('');
  }

  function removeItem(wi, di, idx) {
    const dayItems = weeks[wi]?.days?.[di]?.items || [];
    updateDayItems(wi, di, dayItems.filter((_, i) => i !== idx));
  }

  function updateVar(wi, di, itemIdx, varName, value) {
    const dayItems = weeks[wi]?.days?.[di]?.items || [];
    const newItems = dayItems.map((item, i) => {
      if (i !== itemIdx) return item;
      return { ...item, variables: { ...item.variables, [varName]: { ...item.variables[varName], value } } };
    });
    updateDayItems(wi, di, newItems);
  }

  function updateVarField(wi, di, itemIdx, varName, field, val) {
    const dayItems = weeks[wi]?.days?.[di]?.items || [];
    const newItems = dayItems.map((item, i) => {
      if (i !== itemIdx) return item;
      return { ...item, variables: { ...item.variables, [varName]: { ...item.variables[varName], [field]: val === '' ? undefined : Number(val) } } };
    });
    updateDayItems(wi, di, newItems);
  }

  function copyDay(wi, di) {
    const source = weeks[wi]?.days?.[di];
    if (!source || source.items.length === 0) return;
    const targetDi = weeks[wi].days.findIndex((d, j) => j > di && d.items.length === 0);
    if (targetDi === -1) return;
    const copiedItems = JSON.parse(JSON.stringify(source.items)).map(it => ({ ...it, id: genId() }));
    updateDayItems(wi, targetDi, copiedItems);
  }

  // --- Grid drag (cross-day) ---
  function handleGridDragStart(e, wi, di, idx) {
    e.stopPropagation();
    setGridDrag({ wi, di, idx });
  }

  function handleGridDragEnd() {
    setGridDrag(null);
    setGridDropTarget(null);
  }

  function handleCellDragOver(e, wi, di) {
    e.preventDefault();
    if (!gridDrag) return;
    if (gridDrag.wi === wi && gridDrag.di === di) {
      setGridDropTarget(null);
    } else {
      setGridDropTarget({ wi, di });
    }
  }

  function handleCellDrop(e, targetWi, targetDi) {
    e.preventDefault();
    if (!gridDrag) return;
    const { wi: srcWi, di: srcDi, idx: srcIdx } = gridDrag;
    if (srcWi === targetWi && srcDi === targetDi) {
      setGridDrag(null);
      setGridDropTarget(null);
      return;
    }
    const newWeeks = JSON.parse(JSON.stringify(weeks));
    const item = newWeeks[srcWi].days[srcDi].items[srcIdx];
    newWeeks[srcWi].days[srcDi].items.splice(srcIdx, 1);
    newWeeks[targetWi].days[targetDi].items.push(item);
    updateWeeks(newWeeks);
    setGridDrag(null);
    setGridDropTarget(null);
  }

  // --- Modal drag (within-day reorder) ---
  function handleModalDragStart(idx) { setModalDrag({ idx }); }

  function handleModalDragOver(e, idx) { e.preventDefault(); setModalDragOver({ idx }); }

  function handleModalDrop(idx) {
    if (!modalDrag || !editingDay) { setModalDrag(null); setModalDragOver(null); return; }
    const { wi, di } = editingDay;
    if (modalDrag.idx === idx) { setModalDrag(null); setModalDragOver(null); return; }
    const dayItems = [...(weeks[wi]?.days?.[di]?.items || [])];
    const [moved] = dayItems.splice(modalDrag.idx, 1);
    dayItems.splice(idx, 0, moved);
    updateDayItems(wi, di, dayItems);
    setModalDrag(null);
    setModalDragOver(null);
  }

  function handleModalDragEnd() { setModalDrag(null); setModalDragOver(null); }

  // --- Day modal ---
  function openDayModal(wi, di) {
    setEditingDay({ wi, di });
    const dayItems = weeks[wi]?.days?.[di]?.items || [];
    if (dayItems.length > 0) {
      computeDurations(dayItems.map(it => ({
        id: it.id, meditation: it.meditation, stage_id: it.stage_id, variables: it.variables,
      }))).then(d => setItemDurations(prev => ({ ...prev, ...d })));
    }
  }

  function closeDayModal() {
    setEditingDay(null);
    setCtxMenu(null);
  }

  // --- Live name lookups ---
  function liveNames(item) {
    const ex = exercises.find(e => e.name === item.meditation);
    if (!ex) return { exercise: item.meditation_display, stage: item.stage_name };
    const stage = ex.stages.find(s => s.id === item.stage_id);
    return { exercise: ex.display_name, stage: stage?.name || item.stage_name };
  }



  // --- View mode ---
  function changeViewMode(mode) {
    setViewMode(mode);
    setWeekPage(0);
  }

  // --- Pagination ---
  const totalWeeks = weeks.length;
  const startIdx = weekPage * viewMode;
  const endIdx = Math.min(startIdx + viewMode, totalWeeks);
  const visibleWeeks = weeks.slice(startIdx, endIdx);

  // --- Picker ---
  const filteredExercises = exercises.filter(ex => {
    if (pickerOwner === 'mine' && ex.created_by !== auth.username) return false;
    if (pickerOwner === 'public' && !ex.is_public) return false;
    if (pickerGroup !== 'all') {
      const cat = categories.find(c => c.name === ex.category);
      if (!cat || (cat.group || '') !== pickerGroup) return false;
    }
    if (pickerCategory !== 'all' && ex.category !== pickerCategory) return false;
    const q = pickerSearch.toLowerCase();
    if (q && !ex.display_name.toLowerCase().includes(q) &&
        !ex.stages.some(s => s.name.toLowerCase().includes(q))) return false;
    return true;
  });

  const pickerExercisesForOwner = exercises.filter(ex =>
    pickerOwner === 'mine' ? ex.created_by === auth.username : pickerOwner === 'public' ? ex.is_public : true
  );
  const pickerCatNames = new Set(pickerExercisesForOwner.map(ex => ex.category));
  const pickerVisibleCats = categories.filter(c => pickerCatNames.has(c.name));
  const pickerGroupNames = new Set(pickerVisibleCats.map(c => c.group || ''));
  const pickerVisibleGroups = groups.filter(g => pickerGroupNames.has(g.name));

  // Editing day data
  const editDayItems = editingDay ? (weeks[editingDay.wi]?.days?.[editingDay.di]?.items || []) : [];
  const editDayLabel = editingDay ? (weeks[editingDay.wi]?.days?.[editingDay.di]?.label || '') : '';

  return (
    <div className="practice-builder">
      <nav className="breadcrumb">
        <Link to="/practices" className="breadcrumb-link">Programmes</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{practice.display_name}</span>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">Edit</span>
      </nav>

      <div className="practice-top-bar">
        {editingTitle ? (
          <input className="title-input" value={titleDraft} autoFocus
            onChange={e => setTitleDraft(e.target.value)} onBlur={saveTitle}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }} />
        ) : (
          <h1 className="practice-title" onClick={() => setEditingTitle(true)}>
            {practice.display_name}<span className="title-edit-btn">✎</span>
          </h1>
        )}
        <Link to={`/play/${name}`} className="prog-view-player-btn">▶ View in Player</Link>
      </div>

      {/* Calendar toolbar */}
      <div className="prog-cal-toolbar">
        <div className="prog-cal-nav">
          <button className="prog-cal-nav-btn" disabled={weekPage === 0}
            onClick={() => setWeekPage(p => p - 1)}>‹</button>
          <span className="prog-cal-nav-label">
            Week {startIdx + 1}{viewMode > 1 && endIdx > startIdx + 1 ? `–${endIdx}` : ''} of {totalWeeks}
          </span>
          <button className="prog-cal-nav-btn" disabled={endIdx >= totalWeeks}
            onClick={() => setWeekPage(p => p + 1)}>›</button>
        </div>
        <button className="prog-cal-add-week" onClick={addWeek}>+ Add Week</button>
        <div className="prog-cal-view-toggle">
          {[1, 2, 4].map(m => (
            <button key={m} className={`prog-cal-view-btn${viewMode === m ? ' active' : ''}`}
              onClick={() => changeViewMode(m)}>{m} Week</button>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="prog-cal-grid">
        <div className="prog-cal-header">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="prog-cal-header-cell">Day {i + 1}</div>
          ))}
        </div>
        <div className="prog-cal-body">
          {visibleWeeks.map((week, relWi) => {
            const absWi = startIdx + relWi;
            return (
              <div key={absWi} className="prog-cal-week-section">
                <div className="prog-cal-week-label">
                  <span>{week.label}</span>
                  {weeks.length > 1 && (
                    <button className="prog-cal-week-remove" onClick={() => removeWeek(absWi)}>Remove</button>
                  )}
                </div>
                <div className="prog-cal-week-row">
                  {week.days.slice(0, 7).map((day, di) => {
                    const dayItems = day.items || [];
                    const isDropTarget = gridDropTarget?.wi === absWi && gridDropTarget?.di === di;
                    const isEmpty = dayItems.length === 0;

                    return (
                      <div key={di}
                        className={`prog-cal-day-cell${isDropTarget ? ' drop-target' : ''}${isEmpty ? ' empty' : ''}`}
                        onDragOver={e => handleCellDragOver(e, absWi, di)}
                        onDrop={e => handleCellDrop(e, absWi, di)}
                        onClick={() => openDayModal(absWi, di)}>

                        <div className="prog-cal-day-cell-header">
                          <span className="prog-cal-day-count">
                            {dayItems.length > 0 ? `${dayItems.length} stage${dayItems.length !== 1 ? 's' : ''}` : ''}
                          </span>
                          {dayItems.length > 0 && (
                            <button className="prog-cal-day-play"
                              onClick={e => { e.stopPropagation(); navigate(`/play/${name}?week=${absWi}&day=${di}`); }}
                              title="Open in Player">▶</button>
                          )}
                        </div>

                        <div className="prog-cal-day-items">
                          {dayItems.map((item, idx) => {
                            const isDragging = gridDrag?.wi === absWi && gridDrag?.di === di && gridDrag?.idx === idx;
                            const vars = varSummary(item.variables);
                            return (
                              <div key={item.id}
                                className={`prog-cal-item${isDragging ? ' dragging' : ''}`}
                                draggable
                                onDragStart={e => handleGridDragStart(e, absWi, di, idx)}
                                onDragEnd={handleGridDragEnd}
                                onClick={() => openDayModal(absWi, di)}>
                                <div className="prog-cal-item-exercise">{liveNames(item).exercise}</div>
                                <div className="prog-cal-item-stage">{liveNames(item).stage}</div>
                                {vars && <div className="prog-cal-item-vars">{vars}</div>}
                                <button className="prog-cal-item-remove"
                                  onClick={e => { e.stopPropagation(); removeItem(absWi, di, idx); }}>×</button>
                              </div>
                            );
                          })}
                        </div>

                        {isEmpty && <div className="prog-cal-day-empty-label">Empty</div>}

                        <button className="prog-cal-day-add"
                          onClick={e => { e.stopPropagation(); setPickerTarget({ wi: absWi, di }); }}>+</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day edit modal */}
      {editingDay && (
        <div className="modal-overlay" onClick={closeDayModal}>
          <div className="modal day-edit-modal" onClick={e => { e.stopPropagation(); setCtxMenu(null); }}>
            <div className="day-edit-modal-header">
              <div className="day-edit-modal-top-row">
                <div className="day-edit-modal-title">
                  <span className="day-edit-modal-programme">{practice.display_name}</span>
                  <span className="day-edit-modal-pos">{weeks[editingDay.wi]?.label}, <input className="day-edit-modal-label" value={editDayLabel}
                    onChange={e => renameDay(editingDay.wi, editingDay.di, e.target.value)} /></span>
                </div>
                <button className="modal-close" onClick={closeDayModal}>×</button>
              </div>
              {editDayItems.length > 0 && (() => {
                const practiseMins = editDayItems.reduce((sum, item) => {
                  for (const v of Object.values(item.variables || {})) {
                    if (typeof v === 'object' && v.unit === 'minutes' && v.value != null) return sum + Number(v.value);
                  }
                  return sum;
                }, 0);
                const totalSecs = editDayItems.reduce((sum, item) => sum + (itemDurations[item.id] || 0), 0);
                const totalMins = Math.round(totalSecs / 60);
                return (
                  <div className="day-edit-modal-summary">
                    <span>{editDayItems.length} stage{editDayItems.length !== 1 ? 's' : ''}</span>
                    {practiseMins > 0 && <><span className="day-edit-modal-summary-sep">·</span><span>{practiseMins} min practice</span></>}
                    {totalSecs > 0 && <><span className="day-edit-modal-summary-sep">·</span><span>{totalMins} min including setup</span></>}
                  </div>
                );
              })()}
              <div className="day-edit-modal-actions">
                <button className="day-edit-modal-play-all"
                  onClick={() => navigate(`/play/${name}?week=${editingDay.wi}&day=${editingDay.di}&autoplay=1`)}
                  disabled={editDayItems.length === 0}>
                  ▶ Play All
                </button>
              </div>
            </div>

            <div className="day-edit-modal-body">
              {editDayItems.length === 0 && (
                <div className="day-edit-modal-empty">No stages yet. Add one below.</div>
              )}
              {editDayItems.map((item, idx) => {
                const vars = Object.entries(item.variables || {});
                const isDragOver = modalDragOver?.idx === idx;
                const isDragging = modalDrag?.idx === idx;

                return (
                  <div key={item.id}
                    className={`practice-item${isDragOver ? ' practice-item-dragover' : ''}`}
                    draggable
                    onDragStart={() => handleModalDragStart(idx)}
                    onDragOver={e => handleModalDragOver(e, idx)}
                    onDrop={() => handleModalDrop(idx)}
                    onDragEnd={handleModalDragEnd}
                    onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, idx }); }}
                    style={isDragging ? { opacity: 0.4 } : undefined}>
                    <div className="practice-item-drag">⠿</div>
                    <div className="practice-item-number">{idx + 1}</div>
                    <div className="practice-item-body">
                      <div className="practice-item-header">
                        <div className="practice-item-info">
                          <Link to={`/edit/${item.meditation}?stage=${item.stage_id}`} className="practice-item-exercise-link">{liveNames(item).exercise}</Link>
                          <span className="practice-item-sep">›</span>
                          <span className="practice-item-stage">{liveNames(item).stage}</span>
                        </div>
                        <div className="practice-item-actions">
                          {itemDurations[item.id] > 0 && (
                            <span className="practice-item-duration">{formatTime(itemDurations[item.id])}</span>
                          )}
                          <button className="practice-item-play"
                            onClick={() => navigate(`/play/${name}?week=${editingDay.wi}&day=${editingDay.di}&stage=${idx}&autoplay=1`)}>
                            ▶
                          </button>
                          <button className="practice-item-remove" onClick={() => removeItem(editingDay.wi, editingDay.di, idx)}>×</button>
                        </div>
                      </div>
                      {vars.length > 0 && (
                        <div className="practice-item-vars">
                          {vars.map(([varName, varData]) => {
                            const currentVal = Number(typeof varData === 'object' ? varData.value : varData) || 1;
                            const unit = typeof varData === 'object' ? varData.unit : undefined;
                            const computedMin = typeof varData === 'object' ? varData.computed_min : undefined;
                            const userMin = typeof varData === 'object' ? varData.min : undefined;
                            const userMax = typeof varData === 'object' ? varData.max : undefined;
                            const floorMin = computedMin ? computedMin.min_value_ceiled : 1;
                            const sliderMin = userMin != null ? Math.max(userMin, floorMin) : floorMin;
                            const sliderMax = userMax != null ? userMax : Math.max(currentVal + 5, sliderMin + 10);
                            const UNIT_MULTS = { seconds: 1, minutes: 60, hours: 3600 };
                            const valueSeconds = currentVal * (UNIT_MULTS[unit] || 1);
                            const isMismatch = computedMin && valueSeconds < computedMin.min_seconds;
                            return (
                            <div key={varName} className="practice-var-slider-group">
                              <div className="practice-var-slider-header">
                                <span className="practice-var-label">
                                  {(typeof varData === 'object' && varData.displayName) || varName}
                                </span>
                                <span className="practice-var-slider-value">{currentVal}</span>
                              </div>
                              <div className="practice-var-slider-row">
                                <input className="practice-var-bound" type="number" value={sliderMin}
                                  min={floorMin}
                                  onChange={e => {
                                    const v = Math.max(Number(e.target.value) || floorMin, floorMin);
                                    updateVarField(editingDay.wi, editingDay.di, idx, varName, 'min', v);
                                    if (currentVal < v) updateVar(editingDay.wi, editingDay.di, idx, varName, v);
                                  }} />
                                <input className={`practice-var-slider${isMismatch ? ' practice-var-mismatch' : ''}`}
                                  type="range" min={sliderMin} max={sliderMax} step="1"
                                  value={Math.max(currentVal, sliderMin)}
                                  onChange={e => updateVar(editingDay.wi, editingDay.di, idx, varName, Number(e.target.value))} />
                                <input className="practice-var-bound" type="number" value={sliderMax}
                                  onChange={e => {
                                    const v = Math.max(Number(e.target.value) || sliderMin, sliderMin);
                                    updateVarField(editingDay.wi, editingDay.di, idx, varName, 'max', v);
                                    if (currentVal > v) updateVar(editingDay.wi, editingDay.di, idx, varName, v);
                                  }} />
                              </div>
                              {isMismatch && (
                                <div className="practice-var-mismatch-msg">Variable mismatch — min is {computedMin.min_value_ceiled}</div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <button className="prog-day-add-stage" onClick={() => setPickerTarget({ wi: editingDay.wi, di: editingDay.di })}>
                + Add Stage
              </button>
            </div>

            {ctxMenu && (
              <div className="context-menu" style={{ position: 'fixed', left: ctxMenu.x, top: ctxMenu.y, zIndex: 1000 }}
                onMouseDown={e => e.stopPropagation()}>
                <div className="kebab-item" onClick={() => {
                  setCtxMenu(null);
                  navigate(`/play/${name}?week=${editingDay.wi}&day=${editingDay.di}&from=${ctxMenu.idx}&autoplay=1`);
                }}>▶ Play from here</div>
                <div className="kebab-divider" />
                <div className="kebab-item" onClick={() => {
                  setCtxMenu(null);
                  navigate(`/play/${name}?week=${editingDay.wi}&day=${editingDay.di}&stage=${ctxMenu.idx}&autoplay=1`);
                }}>▶ Play this stage</div>
                <div className="kebab-divider" />
                <div className="kebab-item kebab-delete" onClick={() => {
                  removeItem(editingDay.wi, editingDay.di, ctxMenu.idx);
                  setCtxMenu(null);
                }}>Delete</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stage picker modal */}
      {pickerTarget && (
        <div className="modal-overlay" onClick={() => { setPickerTarget(null); setPickerSearch(''); }}>
          <div className="modal practice-picker" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Stage</h2>
              <button className="modal-close" onClick={() => { setPickerTarget(null); setPickerSearch(''); }}>×</button>
            </div>
            <div className="picker-filters">
              <div className="picker-filter-row">
                <button className={`picker-filter-btn${pickerOwner === 'mine' ? ' active' : ''}`} onClick={() => { setPickerOwner('mine'); setPickerGroup('all'); setPickerCategory('all'); }}>My Exercises</button>
                <button className={`picker-filter-btn${pickerOwner === 'public' ? ' active' : ''}`} onClick={() => { setPickerOwner('public'); setPickerGroup('all'); setPickerCategory('all'); }}>Public</button>
              </div>
              {pickerVisibleGroups.length > 0 && (
                <div className="picker-filter-row">
                  <button className={`picker-filter-chip${pickerGroup === 'all' ? ' active' : ''}`} onClick={() => { setPickerGroup('all'); setPickerCategory('all'); }}>All groups</button>
                  {pickerVisibleGroups.map(g => (
                    <button key={g.name} className={`picker-filter-chip${pickerGroup === g.name ? ' active' : ''}`} onClick={() => { setPickerGroup(g.name); setPickerCategory('all'); }}>{g.display_name}</button>
                  ))}
                </div>
              )}
              {pickerVisibleCats.filter(c => pickerGroup === 'all' || (c.group || '') === pickerGroup).length > 1 && (
                <div className="picker-filter-row">
                  <button className={`picker-filter-chip${pickerCategory === 'all' ? ' active' : ''}`} onClick={() => setPickerCategory('all')}>All categories</button>
                  {pickerVisibleCats.filter(c => pickerGroup === 'all' || (c.group || '') === pickerGroup).map(c => (
                    <button key={c.name} className={`picker-filter-chip${pickerCategory === c.name ? ' active' : ''}`} onClick={() => setPickerCategory(c.name)}>{c.display_name}</button>
                  ))}
                </div>
              )}
            </div>
            <input className="practice-picker-search" placeholder="Search exercises..."
              value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} autoFocus />
            <div className="practice-picker-list">
              {filteredExercises.length === 0 && (
                <div className="practice-picker-empty">No exercises with stages found.</div>
              )}
              {filteredExercises.map(ex => (
                <div key={ex.name} className="practice-picker-exercise">
                  <div className="practice-picker-exercise-name">{ex.display_name}</div>
                  <div className="practice-picker-stages">
                    {ex.stages.map(stage => (
                      <button key={stage.id} className="practice-picker-stage-btn"
                        onClick={() => addStage(pickerTarget.wi, pickerTarget.di, ex, stage)}>
                        {stage.name}
                        {Object.keys(stage.variables || {}).length > 0 && (
                          <span className="practice-picker-var-count">
                            {Object.keys(stage.variables).length} var{Object.keys(stage.variables).length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
