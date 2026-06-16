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

  return (
    <div className="editor-sidebar">
      <div className="editor-sidebar-header">AI Chat</div>
      <ChatWindow
        key={storageKey}
        context={context}
        storageKey={storageKey}
        onMutations={onMutations}
        readOnly={readOnly}
      />
    </div>
  );
}
