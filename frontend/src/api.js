const BASE = import.meta.env.VITE_API_URL || '';

function getToken() { return localStorage.getItem('auth_token'); }
export function setToken(token) { localStorage.setItem('auth_token', token); }
export function clearToken() { localStorage.removeItem('auth_token'); }

// Wrapper around fetch that adds auth header and kicks to login on 403.
export function apiFetch(url, opts = {}) {
  const token = getToken();
  const headers = { ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Token ${token}`;
  return fetch(url, { ...opts, headers }).then(res => {
    if (res.status === 403) {
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

export async function createMeditation(displayName, category) {
  const res = await apiFetch(`${BASE}/api/meditations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName, category }),
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

export async function assembleStage(name, stageId) {
  const res = await apiFetch(`${BASE}/api/meditations/${name}/stages/${stageId}/assemble`, { method: 'POST' });
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

export { BASE };
