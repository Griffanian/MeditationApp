import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useExternalStoreRuntime } from '@assistant-ui/react';
import { fetchThreads, fetchThread, deleteThread, updateThread, streamChat } from '../api';

/**
 * Converts a raw backend message (Anthropic content-block format) into
 * assistant-ui's ThreadMessageLike shape.
 *
 * This is passed to useExternalStoreRuntime as `convertMessage` so the
 * runtime can transform our custom message objects into its internal format.
 */
function toThreadMessageLike(msg) {
  const parts = [];

  if (typeof msg.content === 'string') {
    parts.push({ type: 'text', text: msg.content });
  } else if (Array.isArray(msg.content)) {
    for (const block of msg.content) {
      if (block.type === 'text') {
        parts.push({ type: 'text', text: block.text });
      } else if (block.type === 'tool_use') {
        parts.push({
          type: 'tool-call',
          toolCallId: block.id,
          toolName: block.name,
          args: block.input || {},
          result: block._result,
        });
      }
    }
  }

  // Fallback — every message must have at least one content part
  if (parts.length === 0) {
    parts.push({ type: 'text', text: '' });
  }

  return {
    role: msg.role === 'user' ? 'user' : 'assistant',
    id: msg.id,
    content: parts,
    createdAt: msg.created_at ? new Date(msg.created_at) : undefined,
  };
}

/**
 * Filter out tool-result messages (role: user with tool_result content blocks).
 * These are internal to the Anthropic agent loop and shouldn't be shown.
 */
function filterDisplayMessages(messages) {
  return messages.filter(msg => {
    if (msg.role === 'user' && Array.isArray(msg.content)) {
      if (msg.content.some(b => b.type === 'tool_result')) return false;
    }
    return true;
  });
}

/**
 * Merges tool_call_end results back into assistant messages so the
 * converter can attach results to tool-call parts.
 */
function mergeToolResults(messages, toolResults) {
  return messages.map(msg => {
    if (msg.role !== 'assistant' || !Array.isArray(msg.content)) return msg;
    return {
      ...msg,
      content: msg.content.map(block => {
        if (block.type !== 'tool_use') return block;
        const result = toolResults[block.id];
        if (result !== undefined) {
          return { ...block, _result: result };
        }
        return block;
      }),
    };
  });
}


export function useAssistantRuntime(context) {
  const [threads, setThreads] = useState([]);
  const [currentThreadId, setCurrentThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const toolResultsRef = useRef({});

  // Load thread list on mount
  useEffect(() => {
    fetchThreads().then(setThreads);
  }, []);

  // Check for initial greeting from guide
  useEffect(() => {
    function handleGreeting(e) {
      setCurrentThreadId(null);
      setMessages([{
        role: 'assistant',
        id: crypto.randomUUID(),
        content: e.detail,
        created_at: new Date().toISOString(),
      }]);
    }
    window.addEventListener('assistant-greeting', handleGreeting);
    return () => window.removeEventListener('assistant-greeting', handleGreeting);
  }, []);

  // Messages for the runtime — filter out tool-result messages
  const visibleMessages = useMemo(
    () => filterDisplayMessages(messages),
    [messages],
  );

  // Handle new message from the composer
  const onNew = useCallback(async (appendMessage) => {
    const text = appendMessage.content
      .filter(p => p.type === 'text')
      .map(p => p.text)
      .join('');
    if (!text) return;

    // Add user message to local state
    const userMsg = {
      role: 'user',
      id: crypto.randomUUID(),
      content: [{ type: 'text', text }],
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsRunning(true);
    toolResultsRef.current = {};

    // Start streaming assistant response
    const assistantMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      role: 'assistant',
      id: assistantMsgId,
      content: [],
      created_at: new Date().toISOString(),
    }]);

    let newThreadId = currentThreadId;

    await streamChat(currentThreadId, text, context, {
      text_delta: (data) => {
        setMessages(prev => {
          const msgs = [...prev];
          const lastIdx = msgs.length - 1;
          const last = { ...msgs[lastIdx] };
          const content = [...(last.content || [])];
          const lastBlock = content[content.length - 1];
          if (lastBlock?.type === 'text') {
            content[content.length - 1] = { ...lastBlock, text: lastBlock.text + data.text };
          } else {
            content.push({ type: 'text', text: data.text });
          }
          last.content = content;
          msgs[lastIdx] = last;
          return msgs;
        });
      },

      tool_call_start: (data) => {
        setMessages(prev => {
          const msgs = [...prev];
          const lastIdx = msgs.length - 1;
          const last = { ...msgs[lastIdx] };
          last.content = [...(last.content || []), {
            type: 'tool_use',
            id: data.id,
            name: data.name,
            input: {},
          }];
          msgs[lastIdx] = last;
          return msgs;
        });
      },

      tool_call_end: (data) => {
        toolResultsRef.current[data.id] = data.result_preview;
        setMessages(prev => mergeToolResults(prev, toolResultsRef.current));
      },

      message_done: (data) => {
        if (data.thread_id && !newThreadId) {
          newThreadId = data.thread_id;
          setCurrentThreadId(data.thread_id);
        }
        if (data.data_changed) {
          window.dispatchEvent(new CustomEvent('assistant-data-changed'));
        }
        fetchThreads().then(setThreads);
      },

      error: (data) => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          id: crypto.randomUUID(),
          content: [{ type: 'text', text: `Error: ${data.message}` }],
        }]);
      },
    });

    setIsRunning(false);
  }, [currentThreadId, context]);

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages: visibleMessages,
    convertMessage: toThreadMessageLike,
    onNew,
    adapters: {
      threadList: {
        threadId: currentThreadId,
        threads: threads.map(t => ({
          id: t.id,
          status: 'regular',
          title: t.title || 'New conversation',
        })),
        onSwitchToNewThread: async () => {
          setCurrentThreadId(null);
          setMessages([]);
          toolResultsRef.current = {};
        },
        onSwitchToThread: async (threadId) => {
          // Clear messages synchronously before async fetch so the
          // runtime never sees a threadId/messages mismatch.
          setCurrentThreadId(threadId);
          setMessages([]);
          toolResultsRef.current = {};
          try {
            const thread = await fetchThread(threadId);
            setMessages(thread.messages || []);
          } catch {
            setMessages([]);
          }
        },
        onRename: async (threadId, newTitle) => {
          await updateThread(threadId, { title: newTitle });
          fetchThreads().then(setThreads);
        },
        onDelete: async (threadId) => {
          await deleteThread(threadId);
          if (currentThreadId === threadId) {
            setCurrentThreadId(null);
            setMessages([]);
          }
          fetchThreads().then(setThreads);
        },
      },
    },
  });

  return runtime;
}
