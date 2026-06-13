import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchMeta, saveMeta, fetchInstructions, saveInstructions, checkInstructionsPdf, uploadInstructionsPdf, deleteInstructionsPdf } from '../api';
import MarkdownField from '../components/MarkdownField';
import StageEditor from '../components/StageEditor';
import '../styles.css';

export default function Editor() {
  const { name } = useParams();
  const [displayName, setDisplayName] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [instructions, setInstructions] = useState({ description: '', stages: [] });
  const [hasPdf, setHasPdf] = useState(false);
  const [instructionsCollapsed, setInstructionsCollapsed] = useState(false);
  const [timelinesCollapsed, setTimelinesCollapsed] = useState(false);
  const [collapsedStages, setCollapsedStages] = useState({});

  useEffect(() => {
    fetchMeta(name).then(meta => setDisplayName(meta.display_name || name));
    fetchInstructions(name).then(setInstructions);
    checkInstructionsPdf(name).then(r => setHasPdf(r.exists));
  }, [name]);

  function updateInstructions(updated) {
    setInstructions(updated);
    saveInstructions(name, updated);
  }

  function toggleStageCollapsed(stageId) {
    setCollapsedStages(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  }

  return (
    <div>
      <h2 className="page-title">Practice Editor</h2>
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
        <div className="editor-section-label collapsible" onClick={() => setInstructionsCollapsed(!instructionsCollapsed)}>
          <span className={`chevron ${instructionsCollapsed ? 'collapsed' : ''}`}>▼</span> Instructions
        </div>
        {!instructionsCollapsed && (
          <div className="instructions-structured">
            <label className="instr-label">Explanation</label>
            <div className="instr-stage">
              <MarkdownField
                value={instructions.description || ''}
                onChange={v => updateInstructions({ ...instructions, description: v })}
                placeholder="Explain the practice..."
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
                </div>
              ))}
            </div>

            <div className="instr-pdf">
              <label className="instr-label">Instructions PDF</label>
              {hasPdf ? (
                <div className="instr-pdf-row">
                  <a href={`/pdf/meditation/${name}/instructions.pdf`} target="_blank" rel="noreferrer" className="btn-pdf">View PDF</a>
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
                </div>
              ) : (
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
              <div key={stage.id} className="stage-section">
                <div className="stage-section-header collapsible" onClick={() => toggleStageCollapsed(stage.id)}>
                  <span className={`chevron ${collapsedStages[stage.id] ? 'collapsed' : ''}`}>▼</span>
                  <span>{stage.name}</span>
                </div>
                {!collapsedStages[stage.id] && (
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
    </div>
  );
}
