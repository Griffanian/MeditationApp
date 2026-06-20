import { useLocation } from 'react-router-dom';
import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadListPrimitive,
  ThreadListItemPrimitive,
  useMessage,
} from '@assistant-ui/react';
import ReactMarkdown from 'react-markdown';
import { useAssistantRuntime } from '../hooks/useAssistantRuntime';
import { useState } from 'react';

// ---------------------------------------------------------------------------
// Context detection (same logic as old ChatSidebar)
// ---------------------------------------------------------------------------

function useRouteContext() {
  const location = useLocation();
  const path = location.pathname;

  if (path.startsWith('/edit/')) {
    const name = path.slice('/edit/'.length);
    return { page: 'exercise', meditation: name };
  }
  if (path.startsWith('/play/')) {
    const name = path.slice('/play/'.length).split('/')[0];
    const params = new URLSearchParams(location.search);
    const ctx = { page: 'player', practice: name };
    if (params.has('week')) ctx.currentWeek = parseInt(params.get('week'), 10);
    if (params.has('day')) ctx.currentDay = parseInt(params.get('day'), 10);
    return ctx;
  }
  if (path.startsWith('/practice/')) {
    const name = path.slice('/practice/'.length);
    return { page: 'practice', practice: name };
  }
  if (path === '/practices') {
    return { page: 'practices' };
  }
  return { page: 'dashboard' };
}

// ---------------------------------------------------------------------------
// Tool call labels
// ---------------------------------------------------------------------------

const TOOL_LABELS = {
  list_meditations: 'Listing exercises',
  read_meditation: 'Reading exercise',
  update_meditation_instructions: 'Updating instructions',
  update_stage: 'Updating stage',
  list_practices: 'Listing programmes',
  read_practice: 'Reading programme',
  create_practice: 'Creating programme',
  update_practice: 'Updating programme',
  list_categories: 'Listing categories',
  list_assets: 'Listing assets',
};

// ---------------------------------------------------------------------------
// Custom message part renderers
// ---------------------------------------------------------------------------

function ToolCallPart({ part }) {
  const label = TOOL_LABELS[part.toolName] || part.toolName;
  const isDone = part.result !== undefined;
  return (
    <div className="assistant-tool-call">
      <span className="assistant-tool-icon">{isDone ? '\u2713' : '\u21BB'}</span>
      <span className="assistant-tool-label">{label}</span>
    </div>
  );
}

function TextPart({ part }) {
  return <ReactMarkdown>{part.text}</ReactMarkdown>;
}

function MessageContent() {
  const message = useMessage();
  const msg = message?.message ?? message;
  if (!msg) return null;
  return (
    <div>
      {msg.content?.map((part, i) => {
        if (part.type === 'text') return <TextPart key={i} part={part} />;
        if (part.type === 'tool-call') return <ToolCallPart key={i} part={part} />;
        return null;
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thread list
// ---------------------------------------------------------------------------

function ThreadListItem() {
  return (
    <ThreadListItemPrimitive.Root className="assistant-thread-item">
      <ThreadListItemPrimitive.Trigger className="assistant-thread-trigger">
        <ThreadListItemPrimitive.Title fallback="New conversation" />
      </ThreadListItemPrimitive.Trigger>
    </ThreadListItemPrimitive.Root>
  );
}

function ThreadList() {
  const [showThreads, setShowThreads] = useState(false);

  return (
    <div className="assistant-thread-list">
      <div className="assistant-thread-list-header">
        <button
          className="assistant-thread-toggle"
          onClick={() => setShowThreads(!showThreads)}
        >
          {showThreads ? '\u25BE' : '\u25B8'} History
        </button>
        <ThreadListPrimitive.New className="assistant-new-thread-btn">
          + New
        </ThreadListPrimitive.New>
      </div>
      {showThreads && (
        <div className="assistant-thread-items">
          <ThreadListPrimitive.Items
            components={{ ThreadListItem }}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main thread view
// ---------------------------------------------------------------------------

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="assistant-msg assistant-msg-assistant">
      <div className="assistant-msg-bubble">
        <MessageContent />
      </div>
    </MessagePrimitive.Root>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="assistant-msg assistant-msg-user">
      <div className="assistant-msg-bubble">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
}

function Thread() {
  return (
    <ThreadPrimitive.Root className="assistant-thread">
      <ThreadPrimitive.Viewport className="assistant-messages">
        <ThreadPrimitive.Empty>
          <p className="assistant-placeholder">Ask me anything about your exercises and programmes...</p>
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
          }}
        />
      </ThreadPrimitive.Viewport>
      <div className="assistant-composer-wrap">
        <ComposerPrimitive.Root className="assistant-composer">
          <ComposerPrimitive.Input
            className="assistant-input"
            placeholder="Type a message..."
            autoFocus={false}
          />
          <ComposerPrimitive.Send className="assistant-send">
            Send
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
      </div>
    </ThreadPrimitive.Root>
  );
}

// ---------------------------------------------------------------------------
// Sidebar wrapper
// ---------------------------------------------------------------------------

export default function AssistantSidebar() {
  const context = useRouteContext();
  const runtime = useAssistantRuntime(context);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="editor-sidebar">
        <div className="editor-sidebar-header">AI Assistant</div>
        <ThreadList />
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
