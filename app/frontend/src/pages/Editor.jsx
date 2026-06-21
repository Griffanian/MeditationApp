import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { fetchMeta, saveMeta, fetchInstructions, saveInstructions, checkInstructionsPdf, uploadInstructionsPdf, deleteInstructionsPdf, extractInstructions, generateStageScript, BASE } from '../api';
import { useAuth, canEdit as canEditItem } from '../AuthContext';
import { useLocalState } from '../utils';
import MarkdownField from '../components/MarkdownField';
import StageEditor from '../components/StageEditor';
import ExtractModal from '../components/ExtractModal';
import TimelineGuide from '../components/TimelineGuide';
import '../styles.scss';

function StageKebab({ onAddAbove, onAddBelow, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="kebab-wrapper" ref={ref}>
      <button className="kebab-btn" onClick={e => { e.stopPropagation(); setOpen(!open); }}>⋮</button>
      {open && (
        <div className="kebab-dropdown">
          <div className="kebab-item" onClick={e => { e.stopPropagation(); onAddAbove(); setOpen(false); }}>Add stage above</div>
          <div className="kebab-divider" />
          <div className="kebab-item" onClick={e => { e.stopPropagation(); onAddBelow(); setOpen(false); }}>Add stage below</div>
          <div className="kebab-divider" />
          <div className="kebab-item kebab-delete" onClick={e => { e.stopPropagation(); onDelete(); setOpen(false); }}>Delete stage</div>
        </div>
      )}
    </div>
  );
}

export default function Editor() {
  const auth = useAuth();
  const { name } = useParams();
  const [meta, setMeta] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const targetStage = searchParams.get('stage');
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [instructions, setInstructions] = useState({ description: '', stages: [] });
  const [hasPdf, setHasPdf] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractModal, setExtractModal] = useState(null); // null or { youtubeUrl } or {}
  const [instructionsCollapsed, setInstructionsCollapsed] = useLocalState(`collapse:${name}:instructions`, false);
  const [timelinesCollapsed, setTimelinesCollapsed] = useLocalState(`collapse:${name}:timelines`, false);
  const [collapsedStages, setCollapsedStages] = useLocalState(`collapse:${name}:stages`, {});
  const [collapsedInstrStages, setCollapsedInstrStages] = useLocalState(`collapse:${name}:instrStages`, {});
  const [generatingStage, setGeneratingStage] = useState(null);
  const [guideStep, setGuideStep] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useLocalState(`banner:${name}:dismissed`, false);
  const scrolledRef = useRef(false);
  const isAdmin = meta ? canEditItem(auth, meta) : false;

  useEffect(() => {
    Promise.all([
      fetchMeta(name).then(m => { setMeta(m); setDisplayName(m.display_name || name); }),
      fetchInstructions(name).then(loaded => {
        setInstructions(loaded);
        if (targetStage && loaded.stages) {
          const collapsed = {};
          for (const s of loaded.stages) {
            collapsed[s.id] = s.id !== targetStage;
          }
          setCollapsedStages(collapsed);
        }
      }),
      checkInstructionsPdf(name).then(r => setHasPdf(r.exists)),
    ]).finally(() => setLoading(false));
  }, [name]);

  function updateInstructions(updated) {
    if (extracting) return; // Don't overwrite instructions during extraction
    setInstructions(updated);
    saveInstructions(name, updated);
  }

  async function handleExtract({ include, context }) {
    const sourceOpts = extractModal || {};
    setExtracting(true);
    try {
      const needsExtraction = include.explanation || include.stages;
      let updated = { ...instructions };

      if (needsExtraction) {
        const result = await extractInstructions(name, { ...sourceOpts, context });
        if (include.explanation) {
          updated.description = result.description || updated.description;
        }
        if (include.stages) {
          const stages = (result.stages || []).map((s, i) => ({
            id: `stage-${Date.now()}-${i}`,
            name: s.name || `Stage ${i + 1}`,
            description: s.description || '',
            directions: s.directions || '',
            progression: s.progression || '',
            contraindications: s.contraindications || '',
          }));
          if (stages.length > 0) updated.stages = stages;
        }
        setInstructions(updated);
        await saveInstructions(name, updated);
      }

      // Auto-generate timelines for each stage
      if (include.timeline && updated.stages.length > 0) {
        for (const stage of updated.stages) {
          setGeneratingStage(stage.id);
          try {
            await generateStageScript(name, stage.id);
          } catch (err) {
            console.warn(`Script generation failed for ${stage.name}:`, err);
          }
        }
        // Force StageEditors to reload by collapsing/expanding
        setCollapsedStages({});
        const allOpen = {};
        for (const s of updated.stages) allOpen[s.id] = true;
        setTimeout(() => setCollapsedStages(allOpen), 50);
      }
    } catch (err) {
      alert(`Extraction failed: ${err.message}`);
    } finally {
      setExtracting(false);
      setGeneratingStage(null);
      setExtractModal(null);
    }
  }

  // Re-fetch data when the AI assistant makes changes
  useEffect(() => {
    const handler = () => {
      fetchInstructions(name).then(loaded => {
        setInstructions(loaded);
      });
    };
    window.addEventListener('assistant-data-changed', handler);
    return () => window.removeEventListener('assistant-data-changed', handler);
  }, [name]);

  // Scroll to target stage once the timeline renders
  useEffect(() => {
    if (!targetStage || scrolledRef.current) return;
    const el = document.getElementById(`stage-${targetStage}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      scrolledRef.current = true;
      // Clear the query param so refreshing doesn't re-scroll
      setSearchParams({}, { replace: true });
    }
  }, [targetStage, instructions]);

  function toggleStageCollapsed(stageId) {
    setCollapsedStages(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  }

  function addStage() {
    const id = `stage-${Date.now()}`;
    updateInstructions({
      ...instructions,
      stages: [...instructions.stages, { id, name: 'New Stage', description: '', directions: '', progression: '' }]
    });
    setCollapsedInstrStages(prev => ({ ...prev, [id]: true }));
    setCollapsedStages(prev => ({ ...prev, [id]: true }));
    localStorage.setItem(`collapse:${name}:${id}:vars`, 'false');
  }

  if (loading) return <div className="loading-page"><div className="loading-spinner" />Loading exercise...</div>;

  return (
    <div>
      <nav className="breadcrumb">
        <Link to="/exercises" className="breadcrumb-link">Exercise Bank</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{displayName}</span>
      </nav>
      <h1>
        {isAdmin && editingTitle ? (
          <input
            className="title-input"
            value={displayName}
            autoFocus
            onChange={e => setDisplayName(e.target.value)}
            onBlur={() => { setEditingTitle(false); saveMeta(name, { display_name: displayName }); }}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
          />
        ) : (
          <span className="title-display">
            {displayName}
            {isAdmin && <span className="title-edit-btn" onClick={() => setEditingTitle(true)}>✎</span>}
          </span>
        )}
      </h1>
      <div style={{ height: 16 }} />

      {isAdmin && !bannerDismissed && (
        <div className="welcome-banner">
          <span>Welcome to the exercise builder. <span className="empty-hint-link" onClick={() => setGuideStep(0)}>Click here to get started</span>.</span>
          <button className="welcome-banner-close" onClick={() => setBannerDismissed(true)}>✕</button>
        </div>
      )}

      {/* Instructions */}
      <div className="editor-section">
        <div className="instr-header-row">
          <div className="editor-section-label collapsible" onClick={() => setInstructionsCollapsed(!instructionsCollapsed)}>
            <span className={`chevron ${instructionsCollapsed ? 'collapsed' : ''}`}>▼</span> Instructions
          </div>
          {isAdmin && !instructionsCollapsed && (
            <button className="btn-clear" onClick={() => {
              if (!confirm('Clear all instructions?')) return;
              updateInstructions({ description: '', stages: [] });
            }}>Clear</button>
          )}
        </div>
        {!instructionsCollapsed && (
          <div className="instructions-structured">
            {isAdmin && <div className="instr-pdf">
              <label className="instr-label">Instructions PDF</label>
              {hasPdf && (
                <div className="instr-pdf-row">
                  <button className="btn-pdf" onClick={() => window.open(`${BASE}/pdf/meditation/${name}/instructions.pdf`, '_blank')}>View PDF</button>
                  <label className="btn-pdf btn-pdf-replace">
                    Replace
                    <input type="file" accept=".pdf" hidden onChange={async e => {
                      const file = e.target.files[0];
                      if (!file) return;
                      await uploadInstructionsPdf(name, file);
                      setHasPdf(true);
                      e.target.value = '';
                    }} />
                  </label>
                  <button className="btn-pdf btn-pdf-delete" onClick={async () => {
                    if (!confirm('Remove the instructions PDF?')) return;
                    await deleteInstructionsPdf(name);
                    setHasPdf(false);
                  }}>Remove</button>
                  <button className="btn-pdf btn-pdf-extract" disabled={extracting} onClick={() => setExtractModal({})}>{extracting ? 'Extracting...' : 'Extract with AI'}</button>
                </div>
              )}
            </div>}
            {isAdmin && !hasPdf && (
              <div className="pdf-upload-block">
                <label className="btn-pdf btn-pdf-upload">
                  Upload PDF
                  <input type="file" accept=".pdf" hidden onChange={async e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    await uploadInstructionsPdf(name, file);
                    setHasPdf(true);
                    e.target.value = '';
                  }} />
                </label>
                <span className="pdf-upload-hint">Upload a PDF for reference or to use in AI drafting</span>
              </div>
            )}
            {!isAdmin && hasPdf && (
              <div className="instr-pdf">
                <label className="instr-label">Instructions PDF</label>
                <div className="instr-pdf-row">
                  <button className="btn-pdf" onClick={() => window.open(`${BASE}/pdf/meditation/${name}/instructions.pdf`, '_blank')}>View PDF</button>
                </div>
              </div>
            )}

            {isAdmin && <div className="instr-youtube">
              <label className="instr-label">YouTube Video</label>
              <div className="instr-youtube-row">
                <input
                  className="instr-youtube-input"
                  type="url"
                  placeholder="Paste YouTube URL here"
                  value={youtubeUrl}
                  onChange={e => setYoutubeUrl(e.target.value)}
                />
                <button
                  className="btn-pdf btn-pdf-extract"
                  disabled={extracting || !youtubeUrl.trim()}
                  onClick={() => setExtractModal({ youtubeUrl })}
                >{extracting ? 'Extracting...' : 'Extract with AI'}</button>
              </div>
              <span className="pdf-upload-hint">Paste a link to a YouTube video for reference or to use in AI drafting</span>
            </div>}

            <label className="instr-label">Explanation</label>
            <div className="instr-stage">
              <MarkdownField
                value={instructions.description || ''}
                onChange={v => updateInstructions({ ...instructions, description: v })}
                placeholder="Include a general explanation of what this practice is on an overview level..."
                readOnly={!isAdmin}
              />
            </div>

            <div className="instr-stages">
              <div className="instr-stages-header">
                <label className="instr-label">Stages</label>
                {isAdmin && <button className="btn-add" onClick={addStage}>+ Add Stage</button>}
              </div>
              {instructions.stages.length === 0 && (
                <span className="pdf-upload-hint">Stages are hierarchical levels of a practice, each building towards the next. Each stage gets its own timeline which is the structured script that plays for the user. <span className="empty-hint-link" onClick={() => setGuideStep(0)}>Learn more</span>.</span>
              )}

              {instructions.stages.map((stage, si) => (
                <div key={stage.id || si} className="instr-stage">
                  <div className="instr-stage-header">
                    <span
                      className={`chevron ${!collapsedInstrStages[stage.id] ? 'collapsed' : ''}`}
                      onClick={() => setCollapsedInstrStages(prev => ({ ...prev, [stage.id]: !prev[stage.id] }))}
                    >▼</span>
                    {isAdmin ? (
                      <input
                        className="instr-stage-name"
                        value={stage.name}
                        onChange={e => {
                          const stages = [...instructions.stages];
                          stages[si] = { ...stage, name: e.target.value };
                          updateInstructions({ ...instructions, stages });
                        }}
                      />
                    ) : (
                      <span className="instr-stage-name" style={{ cursor: 'default' }}>{stage.name}</span>
                    )}
                    {isAdmin && <StageKebab
                      onAddAbove={() => {
                        const id = `stage-${Date.now()}`;
                        const stages = [...instructions.stages];
                        stages.splice(si, 0, { id, name: 'New Stage', description: '', directions: '', progression: '' });
                        updateInstructions({ ...instructions, stages });
                        setCollapsedInstrStages(prev => ({ ...prev, [id]: true }));
                        setCollapsedStages(prev => ({ ...prev, [id]: true }));
                        localStorage.setItem(`collapse:${name}:${id}:vars`, 'false');
                      }}
                      onAddBelow={() => {
                        const id = `stage-${Date.now()}`;
                        const stages = [...instructions.stages];
                        stages.splice(si + 1, 0, { id, name: 'New Stage', description: '', directions: '', progression: '' });
                        updateInstructions({ ...instructions, stages });
                        setCollapsedInstrStages(prev => ({ ...prev, [id]: true }));
                        setCollapsedStages(prev => ({ ...prev, [id]: true }));
                        localStorage.setItem(`collapse:${name}:${id}:vars`, 'false');
                      }}
                      onDelete={() => {
                        if (!confirm(`Delete stage "${stage.name}"?`)) return;
                        const stages = instructions.stages.filter((_, i) => i !== si);
                        updateInstructions({ ...instructions, stages });
                      }}
                    />}
                  </div>

                  {collapsedInstrStages[stage.id] && <>
                    <label className="instr-sublabel">Description</label>
                    <MarkdownField
                      value={stage.description || ''}
                      onChange={v => {
                        const stages = [...instructions.stages];
                        stages[si] = { ...stage, description: v };
                        updateInstructions({ ...instructions, stages });
                      }}
                      placeholder={"Describe this stage of the practice in general terms.\n\nE.g. In this practice we will breath in the following way..."}
                      readOnly={!isAdmin}
                    />

                    <label className="instr-sublabel">Directions</label>
                    <MarkdownField
                      value={stage.directions || ''}
                      onChange={v => {
                        const stages = [...instructions.stages];
                        stages[si] = { ...stage, directions: v };
                        updateInstructions({ ...instructions, stages });
                      }}
                      placeholder={"Describewith detailed instructions each step of the practice. E.g:\n\n1.Sit up straight.\n2.breath out hard through the nose"}
                      readOnly={!isAdmin}
                    />

                    <label className="instr-sublabel">Progression</label>
                    <MarkdownField
                      value={stage.progression || ''}
                      onChange={v => {
                        const stages = [...instructions.stages];
                        stages[si] = { ...stage, progression: v };
                        updateInstructions({ ...instructions, stages });
                      }}
                      placeholder={"Describe the progression a user will work towards during this stage.\n\nE.g. start with 2 mins and add 1 min a day until you get to 5 mins, at which point you should be ready for the next stage."}
                      readOnly={!isAdmin}
                    />

                    <label className="instr-sublabel">Contraindications</label>
                    <MarkdownField
                      value={stage.contraindications || ''}
                      onChange={v => {
                        const stages = [...instructions.stages];
                        stages[si] = { ...stage, contraindications: v };
                        updateInstructions({ ...instructions, stages });
                      }}
                      placeholder={"Prove a detailed list of any contraindications. \n\nE.g. Do not perform this practice if you have eaten in the last hour."}
                      readOnly={!isAdmin}
                    />
                  </>}
                </div>
              ))}
            </div>

          </div>
        )}
      </div>

      {/* Timelines — one per stage */}
      <div className="editor-section">
        <div className="editor-section-label collapsible" onClick={() => setTimelinesCollapsed(!timelinesCollapsed)}>
          <span className={`chevron ${timelinesCollapsed ? 'collapsed' : ''}`}>▼</span> Timelines
        </div>
        {!timelinesCollapsed && (
          <div className="timelines-list">
            {instructions.stages.length === 0 && (
              <span className="pdf-upload-hint">Each stage has its own timeline. {isAdmin && <><span className="empty-hint-link" onClick={addStage}>Create a stage</span> in Instructions first.</>}{!isAdmin && 'Create a stage in Instructions first.'} <span className="empty-hint-link" onClick={() => setGuideStep(1)}>Learn more</span>.</span>
            )}
            {instructions.stages.map((stage, si) => (
              <div key={stage.id} id={`stage-${stage.id}`} className="stage-section">
                <div className="stage-section-header-row">
                  <div className="stage-section-header collapsible" onClick={() => toggleStageCollapsed(stage.id)}>
                    <span className={`chevron ${!collapsedStages[stage.id] ? 'collapsed' : ''}`}>▼</span>
                    {isAdmin ? (
                      <input
                        className="instr-stage-name stage-name-inline"
                        value={stage.name}
                        size={stage.name.length || 1}
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          const stages = [...instructions.stages];
                          stages[si] = { ...stage, name: e.target.value };
                          updateInstructions({ ...instructions, stages });
                        }}
                      />
                    ) : (
                      <span>{stage.name}</span>
                    )}
                  </div>
                  <span className="guide-link-inline" onClick={() => setGuideStep(0)}>?</span>
                  {isAdmin && <button className="btn-pdf btn-pdf-extract" disabled={generatingStage === stage.id} onClick={async (e) => {
                    e.stopPropagation();
                    setGeneratingStage(stage.id);
                    try {
                      await generateStageScript(name, stage.id);
                      setCollapsedStages(prev => ({ ...prev, [stage.id]: false }));
                      setTimeout(() => setCollapsedStages(prev => ({ ...prev, [stage.id]: true })), 50);
                    } catch (err) {
                      alert(`Generation failed: ${err.message}`);
                    } finally {
                      setGeneratingStage(null);
                    }
                  }}>{generatingStage === stage.id ? 'Generating...' : 'Extract with AI'}</button>}
                  {isAdmin && <StageKebab
                    onAddAbove={() => {
                      const id = `stage-${Date.now()}`;
                      const stages = [...instructions.stages];
                      stages.splice(si, 0, { id, name: 'New Stage', description: '', directions: '', progression: '' });
                      updateInstructions({ ...instructions, stages });
                      setCollapsedInstrStages(prev => ({ ...prev, [id]: true }));
                      setCollapsedStages(prev => ({ ...prev, [id]: true }));
                      localStorage.setItem(`collapse:${name}:${id}:vars`, 'false');
                    }}
                    onAddBelow={() => {
                      const id = `stage-${Date.now()}`;
                      const stages = [...instructions.stages];
                      stages.splice(si + 1, 0, { id, name: 'New Stage', description: '', directions: '', progression: '' });
                      updateInstructions({ ...instructions, stages });
                      setCollapsedInstrStages(prev => ({ ...prev, [id]: true }));
                      setCollapsedStages(prev => ({ ...prev, [id]: true }));
                      localStorage.setItem(`collapse:${name}:${id}:vars`, 'false');
                    }}
                    onDelete={() => {
                      if (!confirm(`Delete stage "${stage.name}"?`)) return;
                      const stages = instructions.stages.filter((_, i) => i !== si);
                      updateInstructions({ ...instructions, stages });
                    }}
                  />}
                </div>
                {collapsedStages[stage.id] && (
                  <StageEditor
                    stageName={stage.name}
                    stageId={stage.id}
                    meditationName={name}
                    readOnly={!isAdmin}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isAdmin && extractModal && (
        <ExtractModal
          extracting={extracting}
          onExtract={handleExtract}
          onClose={() => setExtractModal(null)}
        />
      )}
      {guideStep != null && (
        <TimelineGuide startStep={guideStep} onClose={() => setGuideStep(null)} />
      )}
    </div>
  );
}
