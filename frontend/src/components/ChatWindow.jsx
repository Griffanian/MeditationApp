import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { sendChatMessage } from '../api';
import { useLocalState } from '../utils';

const SEGMENT_COLORS = {
  speech: '#a0c4ff',
  pause: '#999',
  asset: '#7ecba1',
  split_marker: '#c4a0ff',
  loop: '#a0c4ff',
  section: '#7ecba1',
  stage: '#e0c080',
  week: '#8ab4f8',
  day: '#a0c4ff',
  practice_item: '#e0c080',
};

function ChangeItem({ change }) {
  const isAdded = change.action === 'added';
  const color = SEGMENT_COLORS[change.segment_type] || '#ccc';
  return (
    <div className={`chat-change chat-change-${change.action}`}>
      <span className="chat-change-action" style={{ color: isAdded ? '#66bb6a' : '#ef5350' }}>
        {isAdded ? '+' : '−'}
      </span>
      <span className="chat-change-type" style={{ color }}>{change.segment_type.replace('_', ' ')}</span>
      <span className="chat-change-desc">{change.description}</span>
    </div>
  );
}

function MutationSummary({ changes, errors }) {
  const [open, setOpen] = useState(false);
  const hasChanges = changes && changes.length > 0;
  return (
    <div className="chat-mutations">
      <button className="chat-mutations-toggle" onClick={() => setOpen(!open)}>
        {open ? '▾' : '▸'} Changes applied{hasChanges ? ` (${changes.length})` : ''}
      </button>
      {open && (
        <div className="chat-mutations-detail">
          {hasChanges ? (
            changes.map((c, i) => <ChangeItem key={i} change={c} />)
          ) : (
            <div className="chat-change-desc" style={{ padding: '4px 0', color: '#888' }}>No structural changes detected</div>
          )}
          {errors?.map((err, i) => <div key={`e${i}`} className="chat-mutation-error">⚠️ {err}</div>)}
        </div>
      )}
    </div>
  );
}

export default function ChatWindow({ context, storageKey, onMutations, readOnly }) {
  const [messages, setMessages] = useLocalState(`chat:${storageKey}`, []);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setSending(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      // For the player page, read the current week/day fresh from localStorage
      let sendContext = context;
      if (context.page === 'player' && context.practice) {
        let currentWeek = 0, currentDay = 0;
        try { currentWeek = JSON.parse(localStorage.getItem(`player:${context.practice}:week`)) || 0; } catch {}
        try { currentDay = JSON.parse(localStorage.getItem(`player:${context.practice}:day`)) || 0; } catch {}
        sendContext = { ...context, currentWeek, currentDay };
      }
      const result = await sendChatMessage(text, history, sendContext);
      const assistantMsg = {
        role: 'assistant',
        content: result.reply,
        mutations: result.mutations || null,
        mutation_errors: result.mutation_errors || null,
        changes: result.changes || null,
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (result.mutations && onMutations) {
        try {
          onMutations(result.mutations);
        } catch (e) {
          console.error('Failed to apply mutations in UI:', e);
        }
      }
      // Navigate to newly created programme
      if (result.created_programme) {
        window.location.href = `/practice/${result.created_programme}`;
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setSending(false);
    }
  }

  const placeholders = readOnly ? {
    exercise: 'Ask about this exercise...',
    practice: 'Ask about this programme...',
    player: 'Ask about today\'s practice...',
    dashboard: 'Ask about the exercises...',
    practices: 'Ask about the programmes...',
  } : {
    exercise: 'Ask about this exercise or tell me to change something...',
    practice: 'Ask about this programme or tell me to rearrange stages...',
    player: 'Ask about today\'s practice or the programme...',
    dashboard: 'Ask about your exercises...',
    practices: 'Ask about your programmes...',
  };

  return (
    <div className="chat-window">
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-placeholder">{placeholders[context?.page] || 'Ask me anything...'}</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg chat-msg-${msg.role}`}>
            <div className="chat-msg-bubble">
              {msg.role === 'assistant' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
              {msg.mutations && (
                <MutationSummary changes={msg.changes} errors={msg.mutation_errors} />
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="chat-msg chat-msg-assistant">
            <div className="chat-msg-bubble chat-typing">Thinking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <textarea
          ref={textareaRef}
          className="chat-input"
          placeholder="Type a message..."
          rows={1}
          value={input}
          onChange={e => {
            setInput(e.target.value);
            const ta = e.target;
            ta.style.height = 'auto';
            ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
          }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          disabled={sending}
        />
        <button className="chat-send" onClick={handleSend} disabled={sending || !input.trim()}>Send</button>
      </div>
    </div>
  );
}
