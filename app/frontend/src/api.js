const BASE = import.meta.env.VITE_API_URL || '';

function getToken() { return localStorage.getItem('auth_token'); }
export function setToken(token) { localStorage.setItem('auth_token', token); }
export function clearToken() { localStorage.removeItem('auth_token'); }

// Wrapper around fetch that adds auth header and kicks to login on 401.
export function apiFetch(url, opts = {}) {
  const token = getToken();
  const headers = { ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Token ${token}`;
  return fetch(url, { ...opts, headers }).then(res => {
    if (res.status === 401) {
      clearToken();
      window.location.href = '/';
    }
    return res;
  });
}

// Safely parse JSON, returning fallback on empty/invalid response.
async function safeJson(res, fallback = null) {
  const text = await res.text();
  if (!text) return fallback;
  try { return JSON.parse(text); } catch { return fallback; }
}

// --- Auth ---

export async function checkAuth() {
  const token = getToken();
  if (!token) return { authenticated: false };
  const res = await fetch(`${BASE}/api/auth/status`, {
    headers: { 'Authorization': `Token ${token}` },
  });
  return res.json();
}

export async function loginUser(username, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  setToken(data.token);
  return data;
}

export function logoutUser() {
  clearToken();
}

export async function fetchGroups() {
  const res = await apiFetch(`${BASE}/api/groups`);
  return safeJson(res, []);
}

export async function createGroup(displayName) {
  const res = await apiFetch(`${BASE}/api/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create group');
  return data;
}

export async function updateGroup(name, updates) {
  const res = await apiFetch(`${BASE}/api/groups/${name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function deleteGroup(name) {
  await apiFetch(`${BASE}/api/groups/${name}`, { method: 'DELETE' });
}

export async function fetchCategories() {
  const res = await apiFetch(`${BASE}/api/categories`);
  return safeJson(res, []);
}

export async function createCategory(displayName, group = '') {
  const res = await apiFetch(`${BASE}/api/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName, group }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create');
  return data;
}

export async function updateCategory(name, updates) {
  await apiFetch(`${BASE}/api/categories/${name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
}

export async function renameCategory(name, displayName) {
  await apiFetch(`${BASE}/api/categories/${name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName }),
  });
}

export async function deleteCategory(name) {
  await apiFetch(`${BASE}/api/categories/${name}`, { method: 'DELETE' });
}

export async function fetchMeditations() {
  const res = await apiFetch(`${BASE}/api/meditations`);
  return safeJson(res, []);
}

export async function createMeditation(displayName, category, group) {
  const body = { display_name: displayName, category };
  if (group !== undefined) body.group = group;
  const res = await apiFetch(`${BASE}/api/meditations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create');
  return data;
}

export async function renameMeditation(name, displayName) {
  await apiFetch(`${BASE}/api/meditations/${name}/meta`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName }),
  });
}

export async function deleteMeditation(name) {
  await apiFetch(`${BASE}/api/meditations/${name}/meta`, { method: 'DELETE' });
}

export async function fetchMeta(name) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/meta`);
  return res.json();
}

export async function saveMeta(name, meta) {
  await apiFetch(`${BASE}/api/meditations/${name}/meta`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  });
}

export async function fetchInstructions(name) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/instructions`);
  return res.json();
}

export async function saveInstructions(name, instructions) {
  await apiFetch(`${BASE}/api/meditations/${name}/instructions`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(instructions),
  });
}

// --- Instructions PDF ---

export async function checkInstructionsPdf(name) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/instructions-pdf`);
  return res.json();
}

export async function uploadInstructionsPdf(name, file) {
  const form = new FormData();
  form.append('file', file);
  await apiFetch(`${BASE}/api/meditations/${name}/instructions-pdf`, {
    method: 'POST',
    body: form,
  });
}

export async function deleteInstructionsPdf(name) {
  await apiFetch(`${BASE}/api/meditations/${name}/instructions-pdf`, { method: 'DELETE' });
}

export async function extractInstructions(name, { youtubeUrl, context } = {}) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/extract-instructions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtube_url: youtubeUrl || null, context: context || null }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to extract instructions');
  return data;
}

// --- Chat ---

export async function sendChatMessage(message, history, context) {
  const res = await apiFetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, context }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Chat failed');
  return data;
}

export async function fetchStageDurations(items) {
  const res = await apiFetch(`${BASE}/api/stage-durations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  return res.json();
}

export async function computeDurations(items) {
  const res = await apiFetch(`${BASE}/api/compute-durations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  return safeJson(res, {});
}

// --- Per-stage APIs ---

export async function fetchStageVariables(name, stageId) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/stages/${stageId}/variables`);
  return safeJson(res, {});
}

export async function saveStageVariables(name, stageId, variables) {
  await apiFetch(`${BASE}/api/meditations/${name}/stages/${stageId}/variables`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(variables),
  });
}

export async function fetchStageScript(name, stageId) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/stages/${stageId}/script`);
  return safeJson(res, []);
}

export async function saveStageScript(name, stageId, script) {
  await apiFetch(`${BASE}/api/meditations/${name}/stages/${stageId}/script`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(script),
  });
}

export async function fetchStageComponents(name, stageId) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/stages/${stageId}/components`);
  return safeJson(res, {});
}

export async function fetchStageTimestamps(name, stageId, segId) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/stages/${stageId}/timestamps/${segId}?t=${Date.now()}`);
  if (!res.ok) return [];
  return res.json();
}

export async function generateStageScript(name, stageId) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/stages/${stageId}/generate-script`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to generate script');
  return data;
}

export async function generateAllAudio(name, stageId) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/stages/${stageId}/generate-all`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to generate audio');
  return data;
}

export async function assembleStage(name, stageId, variables) {
  const opts = { method: 'POST' };
  if (variables) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify({ variables });
  }
  const res = await apiFetch(`${BASE}/api/meditations/${name}/stages/${stageId}/assemble`, opts);
  if (!res.ok) {
    let msg = `Assembly failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function updateLoops(name, loops) {
  await apiFetch(`${BASE}/api/meditations/${name}/loops`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loops),
  });
}

export async function assembleAudio(name) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/assemble`, { method: 'POST' });
  return res.json();
}

export async function assembleDayAudio(practiceName, week, day) {
  const res = await apiFetch(`${BASE}/api/practices/${practiceName}/assemble-day`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ week, day }),
  });
  if (!res.ok) {
    let msg = `Day assembly failed (${res.status})`;
    try { const data = await res.json(); msg = data.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// --- Practices ---

export async function fetchPractices() {
  const res = await apiFetch(`${BASE}/api/practices`);
  return res.json();
}

export async function createPractice(displayName) {
  const res = await apiFetch(`${BASE}/api/practices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create');
  return data;
}

export async function fetchPractice(name) {
  const res = await apiFetch(`${BASE}/api/practices/${name}`);
  return safeJson(res, { name, display_name: name, items: [] });
}

export async function savePractice(name, data) {
  await apiFetch(`${BASE}/api/practices/${name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deletePractice(name) {
  await apiFetch(`${BASE}/api/practices/${name}`, { method: 'DELETE' });
}

export async function fetchAvailableStages() {
  const res = await apiFetch(`${BASE}/api/practices/stages`);
  return res.json();
}

export async function savePracticeProgress(name, data) {
  await apiFetch(`${BASE}/api/practices/${name}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// --- Assistant (agentic chat) ---

export async function fetchThreads() {
  const res = await apiFetch(`${BASE}/api/assistant/threads`);
  return safeJson(res, []);
}

export async function fetchThread(threadId) {
  const res = await apiFetch(`${BASE}/api/assistant/threads/${threadId}`);
  return res.json();
}

export async function deleteThread(threadId) {
  await apiFetch(`${BASE}/api/assistant/threads/${threadId}`, { method: 'DELETE' });
}

export async function updateThread(threadId, data) {
  await apiFetch(`${BASE}/api/assistant/threads/${threadId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/**
 * Stream an agent chat response via SSE.
 * @param {string|null} threadId - existing thread or null for new
 * @param {string} message - user message
 * @param {object} context - page context
 * @param {object} callbacks - { text_delta, tool_call_start, tool_call_end, message_done, error }
 * @returns {Promise<void>}
 */
export async function streamChat(threadId, message, context, callbacks) {
  const res = await apiFetch(`${BASE}/api/assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thread_id: threadId, message, context }),
  });

  if (!res.ok) {
    const data = await safeJson(res, { error: 'Chat failed' });
    callbacks.error?.({ message: data.error || 'Chat failed' });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Parse SSE events from buffer
    const parts = buffer.split('\n\n');
    buffer = parts.pop(); // keep incomplete chunk

    for (const part of parts) {
      if (!part.trim()) continue;
      const lines = part.split('\n');
      let eventType = null;
      let dataStr = null;
      for (const line of lines) {
        if (line.startsWith('event: ')) eventType = line.slice(7);
        else if (line.startsWith('data: ')) dataStr = line.slice(6);
      }
      if (eventType && dataStr) {
        try {
          const data = JSON.parse(dataStr);
          callbacks[eventType]?.(data);
        } catch { /* skip malformed events */ }
      }
    }
  }
}

// --- Signup ---

export async function validateJoinLink(token) {
  const res = await fetch(`${BASE}/api/auth/join/validate/${token}`);
  return res.json();
}

export async function joinSignup(token, displayName, password) {
  const res = await fetch(`${BASE}/api/auth/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, display_name: displayName, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Signup failed');
  setToken(data.token);
  return data;
}

export async function fetchMySignupLink() {
  const res = await apiFetch(`${BASE}/api/auth/signup-link`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data;
}

export async function validateInvite(token) {
  const res = await fetch(`${BASE}/api/invites/validate/${token}`);
  return res.json();
}

export async function signupUser(token, password) {
  const res = await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Signup failed');
  setToken(data.token);
  return data;
}

export async function verifyPassword(password) {
  const res = await apiFetch(`${BASE}/api/auth/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Verification failed');
  return data;
}

export async function changePassword(currentPassword, newPassword) {
  const res = await apiFetch(`${BASE}/api/auth/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to change password');
  return data;
}

export async function uploadProfilePhoto(file) {
  const form = new FormData();
  form.append('photo', file);
  const res = await apiFetch(`${BASE}/api/auth/profile`, {
    method: 'PUT',
    body: form,
  });
  return safeJson(res, {});
}

// --- Invites ---

export async function fetchInvites() {
  const res = await apiFetch(`${BASE}/api/invites`);
  return safeJson(res, []);
}

export async function createInvite(role, expiresDays = 7, name = '') {
  const res = await apiFetch(`${BASE}/api/invites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, expires_days: expiresDays, name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create invite');
  return data;
}

export async function deleteInvite(id) {
  await apiFetch(`${BASE}/api/invites/${id}`, { method: 'DELETE' });
}

// --- Users (admin) ---

export async function fetchUsers() {
  const res = await apiFetch(`${BASE}/api/users`);
  return safeJson(res, []);
}

export async function updateUserRole(userId, role) {
  const res = await apiFetch(`${BASE}/api/users/${userId}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update role');
  return data;
}

export async function deleteUser(userId) {
  const res = await apiFetch(`${BASE}/api/users/${userId}`, { method: 'DELETE' });
  return safeJson(res, {});
}

// --- Viewer management (builder) ---

export async function fetchMyViewers() {
  const res = await apiFetch(`${BASE}/api/my-viewers`);
  return safeJson(res, []);
}

export async function addViewer(username) {
  const res = await apiFetch(`${BASE}/api/my-viewers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to add viewer');
  return data;
}

export async function removeViewer(userId) {
  await apiFetch(`${BASE}/api/my-viewers/${userId}`, { method: 'DELETE' });
}

export async function fetchSentInvitations() {
  const res = await apiFetch(`${BASE}/api/my-viewers/pending`);
  return safeJson(res, []);
}

export async function cancelSentInvitation(invitationId) {
  await apiFetch(`${BASE}/api/my-viewers/pending/${invitationId}`, { method: 'DELETE' });
}

export async function fetchPendingInvitations() {
  const res = await apiFetch(`${BASE}/api/my-invitations`);
  return safeJson(res, []);
}

export async function respondToInvitation(invitationId, action) {
  const res = await apiFetch(`${BASE}/api/my-invitations/${invitationId}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to respond');
  return data;
}

export async function fetchViewerHistory(userId) {
  const res = await apiFetch(`${BASE}/api/my-viewers/${userId}/history`);
  return safeJson(res, []);
}

export async function assignStage(userId, meditation, stageId) {
  const res = await apiFetch(`${BASE}/api/my-viewers/${userId}/stages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meditation, stage_id: stageId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to assign stage');
  return data;
}

export async function unassignStage(userId, meditation, stageId) {
  await apiFetch(`${BASE}/api/my-viewers/${userId}/stages`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meditation, stage_id: stageId }),
  });
}

export async function fetchViewerContent(userId) {
  const res = await apiFetch(`${BASE}/api/my-viewers/${userId}/content`);
  return safeJson(res, { groups: [], categories: [], exercises: [], programmes: [] });
}

// --- Clone ---

export async function cloneMeditation(name) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/clone`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to clone');
  return data;
}

export async function clonePractice(name) {
  const res = await apiFetch(`${BASE}/api/practices/${name}/clone`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to clone');
  return data;
}

// --- Sharing ---

export async function fetchMeditationViewers(name) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/share`);
  return safeJson(res, []);
}

export async function shareMeditation(name, username) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
}

export async function unshareMeditation(name, userId) {
  await apiFetch(`${BASE}/api/meditations/${name}/share`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function fetchPracticeViewers(name) {
  const res = await apiFetch(`${BASE}/api/practices/${name}/share`);
  return safeJson(res, []);
}

export async function sharePractice(name, username) {
  const res = await apiFetch(`${BASE}/api/practices/${name}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
}

export async function unsharePractice(name, userId) {
  await apiFetch(`${BASE}/api/practices/${name}/share`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
}

// --- Group/Category sharing ---

export async function fetchGroupViewers(name) {
  const res = await apiFetch(`${BASE}/api/groups/${name}/share`);
  return safeJson(res, []);
}

export async function shareGroup(name, username) {
  const res = await apiFetch(`${BASE}/api/groups/${name}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
}

export async function unshareGroup(name, userId) {
  await apiFetch(`${BASE}/api/groups/${name}/share`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function fetchCategoryViewers(name) {
  const res = await apiFetch(`${BASE}/api/categories/${name}/share`);
  return safeJson(res, []);
}

export async function shareCategory(name, username) {
  const res = await apiFetch(`${BASE}/api/categories/${name}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
}

export async function unshareCategory(name, userId) {
  await apiFetch(`${BASE}/api/categories/${name}/share`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
}

// --- Feedback ---

export async function submitFeedback(message, page = '', sessionId = '') {
  const res = await apiFetch(`${BASE}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, page, session_id: sessionId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit feedback');
  return data;
}

// --- History ---

export async function fetchHistory() {
  const res = await apiFetch(`${BASE}/api/history`);
  return safeJson(res, []);
}

export async function logSession(data) {
  const res = await apiFetch(`${BASE}/api/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return safeJson(res, {});
}

export { BASE };
