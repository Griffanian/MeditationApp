import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || '';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';

let initialized = false;

export function initPostHog() {
  if (initialized || !POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    session_recording: {
      recordCrossOriginIframes: true,
    },
  });
  initialized = true;
}

export function identifyUser(user) {
  if (!POSTHOG_KEY) return;
  posthog.identify(String(user.username), {
    display_name: user.displayName || user.display_name || user.username,
    role: user.role,
    is_admin: user.isAdmin || user.is_admin || false,
  });
}

export function resetUser() {
  if (!POSTHOG_KEY) return;
  posthog.reset();
}
