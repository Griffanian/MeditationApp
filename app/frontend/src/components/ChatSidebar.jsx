import { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import ChatWindow from './ChatWindow';

function useRouteContext() {
  const location = useLocation();
  const path = location.pathname;

  if (path.startsWith('/edit/')) {
    const name = path.slice('/edit/'.length);
    return { context: { page: 'exercise', meditation: name }, storageKey: `exercise:${name}` };
  }
  if (path.startsWith('/play/')) {
    const name = path.slice('/play/'.length).split('/')[0];
    return { context: { page: 'player', practice: name }, storageKey: `player:${name}` };
  }
  if (path.startsWith('/practice/')) {
    const name = path.slice('/practice/'.length);
    return { context: { page: 'practice', practice: name }, storageKey: `practice:${name}` };
  }
  if (path === '/practices') {
    return { context: { page: 'practices' }, storageKey: 'practices' };
  }
  return { context: { page: 'dashboard' }, storageKey: 'dashboard' };
}

export default function ChatSidebar({ onMutations, readOnly }) {
  const { context, storageKey } = useRouteContext();
  const [clearCount, setClearCount] = useState(0);

  function handleClear() {
    try { localStorage.removeItem(`chat:${storageKey}`); } catch {}
    setClearCount(c => c + 1);
  }

  return (
    <div className="editor-sidebar">
      <div className="editor-sidebar-header">
        <span>AI Chat</span>
        <button className="chat-clear-btn" onClick={handleClear} title="Clear chat">Clear</button>
      </div>
      <ChatWindow
        key={`${storageKey}-${clearCount}`}
        context={context}
        storageKey={storageKey}
        onMutations={onMutations}
        readOnly={readOnly}
      />
    </div>
  );
}
