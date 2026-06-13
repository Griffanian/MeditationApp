import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export default function MarkdownField({ value, onChange, placeholder }) {
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      autoResize(textareaRef.current);
    }
  }, [editing]);

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
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
          onChange={e => {
            onChange(e.target.value);
            autoResize(e.target);
          }}
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
