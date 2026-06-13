import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export default function MarkdownField({ value, onChange, placeholder }) {
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef(null);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const lastValue = useRef(value || '');

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      autoResize(textareaRef.current);
    }
  }, [editing]);

  useEffect(() => {
    lastValue.current = value || '';
  }, [value]);

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  function handleChange(e) {
    undoStack.current.push(lastValue.current);
    redoStack.current = [];
    lastValue.current = e.target.value;
    onChange(e.target.value);
    autoResize(e.target);
  }

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      if (undoStack.current.length === 0) return;
      redoStack.current.push(lastValue.current);
      const prev = undoStack.current.pop();
      lastValue.current = prev;
      onChange(prev);
    }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      e.stopPropagation();
      if (redoStack.current.length === 0) return;
      undoStack.current.push(lastValue.current);
      const next = redoStack.current.pop();
      lastValue.current = next;
      onChange(next);
    }
  }

  if (editing) {
    return (
      <div className="md-field">
        <span className="md-field-badge">Markdown</span>
        <textarea
          ref={textareaRef}
          className="md-textarea"
          value={value || ''}
          placeholder={placeholder}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="md-field">
      <span className="md-field-badge">Markdown</span>
      <div className="md-preview" onClick={() => setEditing(true)}>
        {value ? (
          <ReactMarkdown>{value}</ReactMarkdown>
        ) : (
          <p className="md-placeholder">{placeholder || 'Click to edit...'}</p>
        )}
      </div>
    </div>
  );
}
