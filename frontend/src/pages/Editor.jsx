import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { fetchMeta, saveMeta, fetchInstructions, saveInstructions, checkInstructionsPdf, uploadInstructionsPdf, deleteInstructionsPdf, extractInstructions, generateStageScript, BASE } from '../api';
import { useLocalState } from '../utils';
import MarkdownField from '../components/MarkdownField';
import StageEditor from '../components/StageEditor';
import ExtractModal from '../components/ExtractModal';
import '../styles.css';

export default function Editor() {
  const { name } = useParams();
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
  const [instructionsCollapsed, setInstructionsCollapsed] = useLocalState(`collapse:${name}:instructions`, true);
  const [timelinesCollapsed, setTimelinesCollapsed] = useLocalState(`collapse:${name}:timelines`, true);
  const [collapsedStages, setCollapsedStages] = useLocalState(`collapse:${name}:stages`, {});
  const [collapsedInstrStages, setCollapsedInstrStages] = useLocalState(`collapse:${name}:instrStages`, {});
  const [generatingStage, setGeneratingStage] = useState(null);
  const scrolledRef = useRef(false);

  useEffect(() => {
    Promise.all([
      fetchMeta(name).then(meta => setDisplayName(meta.display_name || name)),
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

  // Listen for chat mutations broadcast from the global sidebar
  const handleChatMutations = useCallback((e) => {
    const mutations = e.detail;
    if (mutations.instructions) {
      setInstructions(mutations.instructions);
    }
    if (mutations.stages) {
      setCollapsedStages({});
      const allOpen = {};
      for (const s of (mutations.instructions || instructions).stages || []) allOpen[s.id] = true;
      setTimeout(() => setCollapsedStages(allOpen), 50);
    }
  }, [instructions]);

  useEffect(() => {
    window.addEventListener('chat-mutations', handleChatMutations);
    return () => window.removeEventListener('chat-mutations', handleChatMutations);
  }, [handleChatMutations]);

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

  if (loading) return <div className="loading-page"><div className="loading-spinner" />Loading exercise...</div>;

  return (
    <div>
      <h2 className="page-title">Exercise Editor</h2>
        <h1>
          <Link to="/" className="back-link">← </Link>
          {editingTitle ? (
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
              <span className="title-edit-btn" onClick={() => setEditingTitle(true)}>✎</span>
            </span>
          )}
        </h1>

        {/* Instructions */}
        <div className="editor-section">
          <div className="instr-header-row">
            <div className="editor-section-label collapsible" onClick={() => setInstructionsCollapsed(!instructionsCollapsed)}>
              <span className={`chevron ${instructionsCollapsed ? 'collapsed' : ''}`}>▼</span> Instructions
            </div>
            {!instructionsCollapsed && (
              <button className="btn-clear" onClick={() => {
                if (!confirm('Clear all instructions?')) return;
                updateInstructions({ description: '', stages: [] });
              }}>Clear</button>
            )}
          </div>
          {!instructionsCollapsed && (
            <div className="instructions-structured">
              <div className="instr-pdf">
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
              </div>
              {!hasPdf && (
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
              )}

              <div className="instr-youtube">
                <label className="instr-label">YouTube Video</label>
                <div className="instr-youtube-row">
                  <input
                    className="instr-youtube-input"
                    type="url"
                    placeholder="Paste a YouTube URL..."
                    value={youtubeUrl}
                    onChange={e => setYoutubeUrl(e.target.value)}
                  />
                  <button
                    className="btn-pdf btn-pdf-extract"
                    disabled={extracting || !youtubeUrl.trim()}
                    onClick={() => setExtractModal({ youtubeUrl })}
                  >{extracting ? 'Extracting...' : 'Extract with AI'}</button>
                </div>
              </div>

              <label className="instr-label">Explanation</label>
              <div className="instr-stage">
                <MarkdownField
                  value={instructions.description || ''}
                  onChange={v => updateInstructions({ ...instructions, description: v })}
                  placeholder="Explain the exercise..."
                />
              </div>

              <div className="instr-stages">
                <div className="instr-stages-header">
                  <label className="instr-label">Stages</label>
                  <button className="btn-add" onClick={() => updateInstructions({
                    ...instructions,
                    stages: [...instructions.stages, { id: `stage-${Date.now()}`, name: 'New Stage', description: '', directions: '', progression: '' }]
                  })}>+ Add Stage</button>
                </div>

                {instructions.stages.map((stage, si) => (
                  <div key={stage.id || si} className="instr-stage">
                    <div className="instr-stage-header">
                      <span
                        className={`chevron ${!collapsedInstrStages[stage.id] ? 'collapsed' : ''}`}
                        onClick={() => setCollapsedInstrStages(prev => ({ ...prev, [stage.id]: !prev[stage.id] }))}
                      >▼</span>
                      <input
                        className="instr-stage-name"
                        value={stage.name}
                        onChange={e => {
                          const stages = [...instructions.stages];
                          stages[si] = { ...stage, name: e.target.value };
                          updateInstructions({ ...instructions, stages });
                        }}
                      />
                      <button className="var-delete-btn" onClick={() => {
                        if (!confirm(`Delete stage "${stage.name}"?`)) return;
                        const stages = instructions.stages.filter((_, i) => i !== si);
                        updateInstructions({ ...instructions, stages });
                      }}>✕</button>
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
                      placeholder="Stage description..."
                    />

                    <label className="instr-sublabel">Directions</label>
                    <MarkdownField
                      value={stage.directions || ''}
                      onChange={v => {
                        const stages = [...instructions.stages];
                        stages[si] = { ...stage, directions: v };
                        updateInstructions({ ...instructions, stages });
                      }}
                      placeholder="Step-by-step directions..."
                    />

                    <label className="instr-sublabel">Progression</label>
                    <MarkdownField
                      value={stage.progression || ''}
                      onChange={v => {
                        const stages = [...instructions.stages];
                        stages[si] = { ...stage, progression: v };
                        updateInstructions({ ...instructions, stages });
                      }}
                      placeholder="Progression steps..."
                    />

                    <label className="instr-sublabel">Contraindications</label>
                    <MarkdownField
                      value={stage.contraindications || ''}
                      onChange={v => {
                        const stages = [...instructions.stages];
                        stages[si] = { ...stage, contraindications: v };
                        updateInstructions({ ...instructions, stages });
                      }}
                      placeholder="List any contraindications..."
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
              {instructions.stages.map((stage) => (
                <div key={stage.id} id={`stage-${stage.id}`} className="stage-section">
                  <div className="stage-section-header-row">
                    <div className="stage-section-header collapsible" onClick={() => toggleStageCollapsed(stage.id)}>
                      <span className={`chevron ${!collapsedStages[stage.id] ? 'collapsed' : ''}`}>▼</span>
                      <span>{stage.name}</span>
                    </div>
                    <button className="btn-pdf btn-pdf-extract" disabled={generatingStage === stage.id} onClick={async (e) => {
                      e.stopPropagation();
                      setGeneratingStage(stage.id);
                      try {
                        await generateStageScript(name, stage.id);
                        // Collapse and re-expand to force StageEditor to reload
                        setCollapsedStages(prev => ({ ...prev, [stage.id]: false }));
                        setTimeout(() => setCollapsedStages(prev => ({ ...prev, [stage.id]: true })), 50);
                      } catch (err) {
                        alert(`Generation failed: ${err.message}`);
                      } finally {
                        setGeneratingStage(null);
                      }
                    }}>{generatingStage === stage.id ? 'Generating...' : 'Extract with AI'}</button>
                  </div>
                  {collapsedStages[stage.id] && (
                    <StageEditor
                      stageName={stage.name}
                      stageId={stage.id}
                      meditationName={name}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      {extractModal && (
        <ExtractModal
          extracting={extracting}
          onExtract={handleExtract}
          onClose={() => setExtractModal(null)}
        />
      )}
    </div>
  );
}
