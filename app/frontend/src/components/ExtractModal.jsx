import { useState } from 'react';

export default function ExtractModal({ onExtract, onClose, extracting }) {
  const [include, setInclude] = useState({ explanation: true, stages: true, timeline: true });
  const [context, setContext] = useState('');

  function toggle(key) {
    setInclude(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Extract with AI</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <p className="modal-section-label">What to generate</p>
            <div className="extract-checkboxes">
              <label className="extract-checkbox">
                <input type="checkbox" checked={include.explanation} onChange={() => toggle('explanation')} />
                <span>Explanation</span>
              </label>
              <label className="extract-checkbox">
                <input type="checkbox" checked={include.stages} onChange={() => toggle('stages')} />
                <span>Stages</span>
              </label>
              <label className="extract-checkbox">
                <input type="checkbox" checked={include.timeline} onChange={() => toggle('timeline')} />
                <span>Timeline</span>
              </label>
            </div>
          </div>

          <div className="modal-section">
            <p className="modal-section-label">Context (optional)</p>
            <textarea
              className="extract-context"
              placeholder="Guide the AI... e.g. 'This is a single technique, not multiple stages' or 'Focus on the breathing pattern described at the start'"
              value={context}
              onChange={e => setContext(e.target.value)}
              rows={3}
            />
          </div>

          <div className="extract-actions">
            <button className="modal-btn" onClick={onClose} disabled={extracting}>Cancel</button>
            <button
              className="modal-btn modal-btn-primary"
              disabled={extracting || (!include.explanation && !include.stages && !include.timeline)}
              onClick={() => onExtract({ include, context: context.trim() || null })}
            >{extracting ? 'Extracting...' : 'Extract'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
