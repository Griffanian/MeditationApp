import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchPractice, savePractice, fetchAvailableStages, saveStageVariables, assembleStage, BASE } from '../api';
import { useLocalState } from '../utils';

function genId() {
  return 'item-' + Math.random().toString(36).slice(2, 10);
}

function migrateToWeeks(items) {
  if (!items || items.length === 0) return [{ label: 'Week 1', days: [{ label: 'Day 1', items: [] }] }];
  if (items[0] && items[0].days) return items;
  return [{ label: 'Week 1', days: [{ label: 'Day 1', items }] }];
}

export default function PracticeBuilder() {
  const { name } = useParams();
  const [practice, setPractice] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [expandedWeeks, setExpandedWeeks] = useLocalState(`prog:${name}:weeks`, {});
  const [expandedDays, setExpandedDays] = useLocalState(`prog:${name}:days`, {});
  const [pickerTarget, setPickerTarget] = useState(null); // { wi, di }
  const [pickerSearch, setPickerSearch] = useState('');
  const [dragInfo, setDragInfo] = useState(null); // { wi, di, idx }
  const [dragOver, setDragOver] = useState(null); // { wi, di, idx }

  // Playback
  const [playingKey, setPlayingKey] = useState(null); // "wi:di:idx"
  const [assemblingKey, setAssemblingKey] = useState(null);
  const [playingDay, setPlayingDay] = useState(null); // "wi:di"
  const audioRef = useRef(null);
  const stopRef = useRef(false);

  useEffect(() => {
    fetchPractice(name).then(p => {
      p.items = migrateToWeeks(p.items);
      setPractice(p);
      setTitleDraft(p.display_name);
    });
    fetchAvailableStages().then(setExercises);
  }, [name]);

  // Re-fetch data when the AI assistant makes changes
  useEffect(() => {
    const handler = () => {
      fetchPractice(name).then(p => {
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

  // --- Week/Day management ---
  function addWeek() {
    updateWeeks([...weeks, { label: `Week ${weeks.length + 1}`, days: [{ label: 'Day 1', items: [] }] }]);
  }

  function removeWeek(wi) {
    if (weeks.length <= 1) return;
    if (!confirm(`Remove ${weeks[wi].label}?`)) return;
    updateWeeks(weeks.filter((_, i) => i !== wi));
  }

  function addDay(wi) {
    const newWeeks = weeks.map((w, i) => {
      if (i !== wi) return w;
      return { ...w, days: [...w.days, { label: `Day ${w.days.length + 1}`, items: [] }] };
    });
    updateWeeks(newWeeks);
  }

  function removeDay(wi, di) {
    if (weeks[wi].days.length <= 1) return;
    if (!confirm(`Remove ${weeks[wi].days[di].label}?`)) return;
    const newWeeks = weeks.map((w, i) => {
      if (i !== wi) return w;
      return { ...w, days: w.days.filter((_, j) => j !== di) };
    });
    updateWeeks(newWeeks);
  }

  function copyDay(wi, di) {
    const source = weeks[wi]?.days?.[di];
    if (!source) return;
    const copied = {
      label: `${source.label} (copy)`,
      items: JSON.parse(JSON.stringify(source.items)).map(item => ({ ...item, id: genId() })),
    };
    const newWeeks = weeks.map((w, i) => {
      if (i !== wi) return w;
      return { ...w, days: [...w.days, copied] };
    });
    updateWeeks(newWeeks);
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

  // --- Drag and drop within a day ---
  function handleDragStart(wi, di, idx) { setDragInfo({ wi, di, idx }); }
  function handleDragOverItem(e, wi, di, idx) { e.preventDefault(); setDragOver({ wi, di, idx }); }
  function handleDrop(wi, di, idx) {
    if (!dragInfo || (dragInfo.wi === wi && dragInfo.di === di && dragInfo.idx === idx)) {
      setDragInfo(null); setDragOver(null); return;
    }
    if (dragInfo.wi === wi && dragInfo.di === di) {
      // Reorder within same day
      const dayItems = [...(weeks[wi]?.days?.[di]?.items || [])];
      const [moved] = dayItems.splice(dragInfo.idx, 1);
      dayItems.splice(idx, 0, moved);
      updateDayItems(wi, di, dayItems);
    }
    setDragInfo(null); setDragOver(null);
  }
  function handleDragEnd() { setDragInfo(null); setDragOver(null); }

  // --- Playback ---
  function stopPlayback() {
    stopRef.current = true;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlayingKey(null); setAssemblingKey(null); setPlayingDay(null);
  }

  async function playDayItems(wi, di) {
    const dayKey = `${wi}:${di}`;
    if (playingDay === dayKey) { stopPlayback(); return; }
    stopPlayback();
    const dayItems = weeks[wi]?.days?.[di]?.items || [];
    if (dayItems.length === 0) return;
    stopRef.current = false;
    setPlayingDay(dayKey);
    for (let i = 0; i < dayItems.length; i++) {
      if (stopRef.current) break;
      const item = dayItems[i];
      const key = `${wi}:${di}:${i}`;
      if (Object.keys(item.variables || {}).length > 0) {
        await saveStageVariables(item.meditation, item.stage_id, item.variables);
      }
      setAssemblingKey(key);
      let data;
      try { data = await assembleStage(item.meditation, item.stage_id); } catch { continue; }
      if (stopRef.current) break;
      setAssemblingKey(null); setPlayingKey(key);
      await new Promise((resolve) => {
        const audio = new Audio(`${BASE}/audio/meditation/${item.meditation}/stage/${item.stage_id}/output/${data.filename}?t=${Date.now()}`);
        audioRef.current = audio;
        audio.onended = resolve; audio.onerror = resolve; audio.play().catch(resolve);
      });
      audioRef.current = null;
      if (stopRef.current) break;
    }
    setPlayingKey(null); setPlayingDay(null);
  }

  async function playSingle(wi, di, idx) {
    const key = `${wi}:${di}:${idx}`;
    if (playingKey === key) { stopPlayback(); return; }
    stopPlayback();
    const item = weeks[wi]?.days?.[di]?.items?.[idx];
    if (!item) return;
    stopRef.current = false;
    if (Object.keys(item.variables || {}).length > 0) {
      await saveStageVariables(item.meditation, item.stage_id, item.variables);
    }
    setAssemblingKey(key);
    let data;
    try { data = await assembleStage(item.meditation, item.stage_id); } catch { setAssemblingKey(null); return; }
    if (stopRef.current) return;
    setAssemblingKey(null); setPlayingKey(key);
    const audio = new Audio(`${BASE}/audio/meditation/${item.meditation}/stage/${item.stage_id}/output/${data.filename}?t=${Date.now()}`);
    audioRef.current = audio;
    audio.onended = () => { setPlayingKey(null); audioRef.current = null; };
    audio.onerror = () => { setPlayingKey(null); audioRef.current = null; };
    audio.play().catch(() => { setPlayingKey(null); });
  }

  // --- Picker ---
  const filteredExercises = exercises.filter(ex =>
    ex.display_name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    ex.stages.some(s => s.name.toLowerCase().includes(pickerSearch.toLowerCase()))
  );

  function toggleWeek(wi) { setExpandedWeeks(prev => ({ ...prev, [wi]: !prev[wi] })); }
  function toggleDay(wi, di) { setExpandedDays(prev => ({ ...prev, [`${wi}:${di}`]: !prev[`${wi}:${di}`] })); }

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

      {/* Weeks as collapsible sections */}
      {weeks.map((week, wi) => {
        const weekOpen = expandedWeeks[wi];
        return (
          <div key={wi} className="prog-builder-week">
            <div className="prog-builder-week-header">
              <span className="prog-collapse-icon" onClick={() => toggleWeek(wi)}>
                {weekOpen ? '▾' : '▸'}
              </span>
              <input className="prog-builder-week-label" value={week.label}
                onChange={e => renameWeek(wi, e.target.value)} />
              <div className="prog-builder-week-actions">
                {weeks.length > 1 && (
                  <button className="prog-tab-remove" onClick={() => removeWeek(wi)}>×</button>
                )}
              </div>
            </div>

            {weekOpen && (
              <div className="prog-builder-week-body">
                {week.days.map((day, di) => {
                  const dayOpen = expandedDays[`${wi}:${di}`];
                  const dayItems = day.items || [];
                  const dayKey = `${wi}:${di}`;
                  const isDayPlaying = playingDay === dayKey;

                  return (
                    <div key={di} className="prog-builder-day">
                      <div className="prog-builder-day-header">
                        <span className="prog-collapse-icon" onClick={() => toggleDay(wi, di)}>
                          {dayOpen ? '▾' : '▸'}
                        </span>
                        <input className="prog-builder-day-label" value={day.label}
                          onChange={e => renameDay(wi, di, e.target.value)} />
                        <span className="prog-builder-day-meta">
                          {dayItems.length} stage{dayItems.length !== 1 ? 's' : ''}
                        </span>
                        <div className="prog-builder-day-actions">
                          <button className={`prog-day-play ${isDayPlaying ? 'playing' : ''}`}
                            onClick={() => playDayItems(wi, di)} disabled={dayItems.length === 0}>
                            {isDayPlaying ? '■' : '▶'}
                          </button>
                          <button className="prog-tab-copy" title="Duplicate day" onClick={() => copyDay(wi, di)}>⧉</button>
                          {week.days.length > 1 && (
                            <button className="prog-tab-remove" onClick={() => removeDay(wi, di)}>×</button>
                          )}
                        </div>
                      </div>

                      {dayOpen && (
                        <div className="prog-builder-day-body">
                          {dayItems.map((item, idx) => {
                            const key = `${wi}:${di}:${idx}`;
                            const vars = Object.entries(item.variables || {});
                            const isPlaying = playingKey === key;
                            const isAssembling = assemblingKey === key;
                            const isDragOver = dragOver?.wi === wi && dragOver?.di === di && dragOver?.idx === idx;
                            const isDragging = dragInfo?.wi === wi && dragInfo?.di === di && dragInfo?.idx === idx;
                            return (
                              <div key={item.id}
                                className={`practice-item${isPlaying ? ' practice-item-playing' : ''}${isDragOver ? ' practice-item-dragover' : ''}`}
                                draggable onDragStart={() => handleDragStart(wi, di, idx)}
                                onDragOver={e => handleDragOverItem(e, wi, di, idx)}
                                onDrop={() => handleDrop(wi, di, idx)}
                                onDragEnd={handleDragEnd}
                                style={isDragging ? { opacity: 0.4 } : undefined}>
                                <div className="practice-item-drag">⠿</div>
                                <div className="practice-item-number">{idx + 1}</div>
                                <div className="practice-item-body">
                                  <div className="practice-item-header">
                                    <div className="practice-item-info">
                                      <Link to={`/edit/${item.meditation}?stage=${item.stage_id}`} className="practice-item-exercise-link">{item.meditation_display}</Link>
                                      <span className="practice-item-sep">›</span>
                                      <span className="practice-item-stage">{item.stage_name}</span>
                                    </div>
                                    <div className="practice-item-actions">
                                      <button className={`practice-item-play ${isPlaying ? 'playing' : ''}`}
                                        onClick={() => playSingle(wi, di, idx)} disabled={isAssembling}>
                                        {isAssembling ? '...' : isPlaying ? '■' : '▶'}
                                      </button>
                                      <button className="practice-item-remove" onClick={() => removeItem(wi, di, idx)}>×</button>
                                    </div>
                                  </div>
                                  {vars.length > 0 && (
                                    <div className="practice-item-vars">
                                      {vars.map(([varName, varData]) => (
                                        <span key={varName} className="practice-var-group">
                                          <span className="practice-var-label">
                                            {(typeof varData === 'object' && varData.displayName) || varName}
                                          </span>
                                          <input className="practice-var-input" type="number"
                                            value={typeof varData === 'object' ? varData.value : varData} min="1"
                                            onChange={e => updateVar(wi, di, idx, varName, e.target.value)} />
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          <button className="prog-day-add-stage" onClick={() => setPickerTarget({ wi, di })}>
                            + Add Stage
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button className="prog-inline-add" onClick={() => addDay(wi)}>+ Add Day</button>
              </div>
            )}
          </div>
        );
      })}

      <button className="prog-inline-add prog-add-week" onClick={addWeek}>+ Add Week</button>

      {pickerTarget && (
        <div className="modal-overlay" onClick={() => { setPickerTarget(null); setPickerSearch(''); }}>
          <div className="modal practice-picker" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Stage</h2>
              <button className="modal-close" onClick={() => { setPickerTarget(null); setPickerSearch(''); }}>×</button>
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
