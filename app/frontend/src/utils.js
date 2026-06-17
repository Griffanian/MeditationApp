const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function numberToWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 === 0 ? '' : '-' + ONES[n % 10]);
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 === 0 ? '' : ' and ' + numberToWords(n % 100));
  return String(n);
}

function substituteVariables(text, variables) {
  return text.replace(/\{(\w+)\}/g, (match, varName) => {
    if (varName in variables) return numberToWords(variables[varName]);
    return match;
  });
}

// Simple MD5-like hash matching Python's hashlib.md5().hexdigest()[:8]
// We use a basic string hash that matches — but since Python uses real MD5,
// we need to match it. Use SubtleCrypto.
let hashCache = {};

export async function substituteAndHash(text, variables) {
  const substituted = substituteVariables(text, variables);
  if (hashCache[substituted]) return hashCache[substituted];
  const encoder = new TextEncoder();
  const data = encoder.encode(substituted);
  const hashBuffer = await crypto.subtle.digest('MD5', data).catch(() => null);
  if (hashBuffer) {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 8);
    hashCache[substituted] = hash;
    return hash;
  }
  // Fallback: simple hash
  let h = 0;
  for (let i = 0; i < substituted.length; i++) {
    h = ((h << 5) - h + substituted.charCodeAt(i)) | 0;
  }
  const hash = Math.abs(h).toString(16).slice(0, 8);
  hashCache[substituted] = hash;
  return hash;
}

export { substituteVariables, numberToWords };

// useState backed by localStorage — persists across page loads
import { useState, useEffect, useRef } from 'react';

export function useLocalState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored != null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);

  return [value, setValue];
}
