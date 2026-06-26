/**
 * Capture every page + interactive state of the deployed app as self-contained HTML files.
 *
 * Usage:
 *   npx playwright install chromium   # one-time
 *   node scripts/capture-pages.mjs --user <username> --pass <password> [--url <base-url>]
 *
 * Output: ./captured-pages/*.html  +  *.png
 * Then:  npx serve captured-pages     → point html.to.design at each page
 */

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { parseArgs } from 'util';

// ── CLI args ──────────────────────────────────────────────────────────
const { values: args } = parseArgs({
  options: {
    user: { type: 'string' },
    pass: { type: 'string' },
    url:  { type: 'string', default: 'https://meditationapp-a6eg.onrender.com' },
  },
});

if (!args.user || !args.pass) {
  console.error('Usage: node scripts/capture-pages.mjs --user <username> --pass <password> [--url <base-url>]');
  process.exit(1);
}

const BASE   = args.url.replace(/\/+$/, '');
const OUTDIR = join(process.cwd(), 'captured-pages');

await mkdir(OUTDIR, { recursive: true });

function sanitize(s) {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
}

// ── Launch browser ────────────────────────────────────────────────────
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page    = await context.newPage();

// ── Log in ────────────────────────────────────────────────────────────
console.log('Logging in...');
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });

await page.fill('input[placeholder="Username"]', args.user);
await page.fill('input[placeholder="Password"]', args.pass);
await page.click('button[type="submit"]');

let token = null;
for (let i = 0; i < 30; i++) {
  token = await page.evaluate(() => localStorage.getItem('auth_token'));
  if (token) break;
  await page.waitForTimeout(1000);
}
if (!token) {
  const errorMsg = await page.textContent('.login-error').catch(() => null);
  console.error(`Login failed${errorMsg ? ': ' + errorMsg : ' — no auth_token found'}`);
  await browser.close();
  process.exit(1);
}

await page.waitForTimeout(2000);
console.log('Logged in successfully.');

// ── Scrape dynamic names ──────────────────────────────────────────────
async function scrapeNames(listPath, linkPattern) {
  await page.goto(`${BASE}${listPath}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  return page.evaluate((pattern) => {
    const links = [...document.querySelectorAll('a')];
    const re = new RegExp(pattern);
    return links
      .map(a => {
        const match = new URL(a.href, location.origin).pathname.match(re);
        return match ? decodeURIComponent(match[1]) : null;
      })
      .filter(Boolean);
  }, linkPattern);
}

let exerciseNames = [];
let practiceNames = [];

try {
  exerciseNames = await scrapeNames('/exercises', '^/edit/(.+)$');
} catch (e) {
  console.warn('Could not scrape exercise names:', e.message);
}

try {
  practiceNames = await scrapeNames('/practices', '^/practice/(.+)$');
} catch (e) {
  console.warn('Could not scrape practice names:', e.message);
}

console.log(`Found ${exerciseNames.length} exercises, ${practiceNames.length} practices.`);

// ── Capture helpers ───────────────────────────────────────────────────
let captureCount = 0;

async function saveCapture(filename) {
  const html = await page.evaluate(() => {
    const styleTexts = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) styleTexts.push(rule.cssText);
      } catch {
        if (sheet.href) styleTexts.push(`/* external: ${sheet.href} */`);
      }
    }
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('link[rel="stylesheet"], style').forEach(el => el.remove());
    const styleEl = clone.ownerDocument.createElement('style');
    styleEl.textContent = styleTexts.join('\n');
    const head = clone.querySelector('head') || clone;
    head.insertBefore(styleEl, head.firstChild);
    const base = window.location.origin;
    clone.querySelectorAll('img[src]').forEach(img => {
      if (img.src.startsWith('/')) img.setAttribute('src', base + img.getAttribute('src'));
    });
    clone.querySelectorAll('script').forEach(el => el.remove());
    return `<!DOCTYPE html>\n${clone.outerHTML}`;
  });

  await writeFile(join(OUTDIR, `${filename}.html`), html, 'utf-8');
  await page.screenshot({ path: join(OUTDIR, `${filename}.png`), fullPage: true });
  captureCount++;
}

async function navigateTo(path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
}

// Expand all collapsed sections, dropdowns, and chevrons on the current page
async function expandAll() {
  // Click all collapsed chevrons (▸ means collapsed, ▾ means expanded)
  let expanded = 0;
  // Keep clicking collapsed chevrons until none remain
  for (let round = 0; round < 10; round++) {
    const collapsed = page.locator('.category-collapse-btn, .prog-collapse-icon, .chevron.collapsed, .editor-section-label .chevron');
    const count = await collapsed.count();
    let clickedAny = false;
    for (let i = 0; i < count; i++) {
      const el = collapsed.nth(i);
      const text = await el.textContent().catch(() => '');
      const cls = await el.getAttribute('class').catch(() => '');
      // Click if it looks collapsed (has ▸ or has 'collapsed' class)
      if (text.includes('▸') || cls.includes('collapsed')) {
        await el.click().catch(() => {});
        await page.waitForTimeout(300);
        clickedAny = true;
        expanded++;
      }
    }
    if (!clickedAny) break;
  }

  // Open all kebab menus — actually skip this, they overlap.
  // Instead we'll capture those as separate states.

  // Expand all details/summary elements
  await page.evaluate(() => {
    document.querySelectorAll('details:not([open])').forEach(d => d.setAttribute('open', ''));
  });

  if (expanded > 0) {
    await page.waitForTimeout(800);
    console.log(`    (expanded ${expanded} collapsed sections)`);
  }
}

// Click a tab button by its text content within a selector scope
async function clickTab(text, scope = '.group-tabs') {
  const btn = page.locator(`${scope} button`, { hasText: text }).first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(1000);
    return true;
  }
  return false;
}

// Click first matching element if it exists
async function clickIf(selector) {
  const el = page.locator(selector).first();
  if (await el.isVisible().catch(() => false)) {
    await el.click();
    await page.waitForTimeout(1000);
    return true;
  }
  return false;
}

// ── Capture pages with interactive states ─────────────────────────────

console.log('\nCapturing pages with interactive states...\n');

// ── Login page (unauthenticated) ──────────────────────────────────────
console.log('  Login page');
// Clear token temporarily to show login page
await page.evaluate(() => {
  window.__savedToken = localStorage.getItem('auth_token');
  localStorage.removeItem('auth_token');
});
await navigateTo('/');
await saveCapture('login');
// Restore token
await page.evaluate(() => {
  localStorage.setItem('auth_token', window.__savedToken);
  delete window.__savedToken;
});

// ── Home ──────────────────────────────────────────────────────────────
console.log('  Home');
await navigateTo('/');
await saveCapture('home');

// ── Exercises (Dashboard) ─────────────────────────────────────────────
console.log('  Exercises — default (mine, all expanded)');
await navigateTo('/exercises');
await expandAll();
await saveCapture('exercises--mine');

console.log('  Exercises — public tab');
if (await clickTab('Public')) {
  await expandAll();
  await saveCapture('exercises--public');
}

console.log('  Exercises — all tab');
if (await clickTab('All')) {
  await expandAll();
  await saveCapture('exercises--all');
}

// Kebab menu on first exercise card
console.log('  Exercises — kebab menu open');
await navigateTo('/exercises');
if (await clickIf('.med-kebab-btn')) {
  await saveCapture('exercises--kebab-open');
  await page.click('body');
  await page.waitForTimeout(500);
}

// ── Practices ─────────────────────────────────────────────────────────
console.log('  Practices — default (mine)');
await navigateTo('/practices');
await saveCapture('practices--mine');

console.log('  Practices — public tab');
if (await clickTab('Public')) {
  await saveCapture('practices--public');
}

console.log('  Practices — all tab');
if (await clickTab('All')) {
  await saveCapture('practices--all');
}

// Kebab menu
console.log('  Practices — kebab menu open');
await navigateTo('/practices');
if (await clickIf('.med-kebab-btn')) {
  await saveCapture('practices--kebab-open');
  await page.click('body');
  await page.waitForTimeout(500);
}

// Viewer manager panel
console.log('  Practices — viewer panel');
await navigateTo('/practices');
if (await clickIf('.med-kebab-btn')) {
  const viewersBtn = page.locator('.med-kebab-menu button', { hasText: 'Viewers' }).first();
  if (await viewersBtn.isVisible().catch(() => false)) {
    await viewersBtn.click();
    await page.waitForTimeout(800);
    await saveCapture('practices--viewer-panel');
  }
}

// ── Editor (first exercise) ───────────────────────────────────────────
if (exerciseNames.length > 0) {
  const exName = exerciseNames[0];
  const exSafe = sanitize(exName);

  console.log(`  Editor — all expanded`);
  await navigateTo(`/edit/${encodeURIComponent(exName)}`);
  await expandAll();
  await saveCapture(`edit--${exSafe}--all-expanded`);

  // Also capture with sections collapsed for contrast
  console.log('  Editor — sections collapsed');
  await navigateTo(`/edit/${encodeURIComponent(exName)}`);
  // Collapse both sections
  const instrLabel = page.locator('.editor-section-label', { hasText: 'Instructions' }).first();
  if (await instrLabel.isVisible().catch(() => false)) {
    await instrLabel.click();
    await page.waitForTimeout(500);
  }
  const tlLabel = page.locator('.editor-section-label', { hasText: 'Timeline' }).first();
  if (await tlLabel.isVisible().catch(() => false)) {
    await tlLabel.click();
    await page.waitForTimeout(500);
  }
  await saveCapture(`edit--${exSafe}--collapsed`);
}

// ── Practice Builder (first practice) ─────────────────────────────────
if (practiceNames.length > 0) {
  const prName = practiceNames[0];
  const prSafe = sanitize(prName);

  console.log(`  Practice Builder — all expanded`);
  await navigateTo(`/practice/${encodeURIComponent(prName)}`);
  await expandAll();
  await saveCapture(`practice--${prSafe}--all-expanded`);

  // Also capture collapsed view
  console.log(`  Practice Builder — collapsed`);
  await navigateTo(`/practice/${encodeURIComponent(prName)}`);
  await saveCapture(`practice--${prSafe}--collapsed`);

  // Player page
  console.log(`  Player — default`);
  await navigateTo(`/play/${encodeURIComponent(prName)}`);
  await saveCapture(`play--${prSafe}--default`);
}

// ── History ───────────────────────────────────────────────────────────
console.log('  History — list view');
await navigateTo('/history');
await saveCapture('history--list');

console.log('  History — calendar view');
if (await clickTab('Calendar')) {
  await saveCapture('history--calendar');

  // Click a day cell that has sessions
  console.log('  History — calendar day detail');
  const dayCell = page.locator('.cal-cell.has-sessions, .cal-cell:not(.empty)').first();
  if (await dayCell.isVisible().catch(() => false)) {
    await dayCell.click();
    await page.waitForTimeout(800);
    await saveCapture('history--calendar-day-detail');
  }
}

// ── Clients ───────────────────────────────────────────────────────────
console.log('  Clients');
await navigateTo('/clients');
await saveCapture('clients');

// ── Users ─────────────────────────────────────────────────────────────
console.log('  Users — all');
await navigateTo('/users');
await saveCapture('users--all');

// Role filter tabs
for (const role of ['Admin', 'Editor', 'Builder', 'Viewer']) {
  console.log(`  Users — ${role} filter`);
  if (await clickTab(role)) {
    await saveCapture(`users--${role.toLowerCase()}`);
  }
}

// Status filters
console.log('  Users — inactive filter');
if (await clickTab('Inactive')) {
  await saveCapture('users--inactive');
}

// ── Account ───────────────────────────────────────────────────────────
console.log('  Account — default');
await navigateTo('/account');
await saveCapture('account--default');

// Theme: light
console.log('  Account — light theme');
const lightBtn = page.locator('.theme-slider-option', { hasText: 'Light' }).first();
if (await lightBtn.isVisible().catch(() => false)) {
  await lightBtn.click();
  await page.waitForTimeout(800);
  await saveCapture('account--light-theme');
}

// Theme: dark
console.log('  Account — dark theme');
const darkBtn = page.locator('.theme-slider-option', { hasText: 'Dark' }).first();
if (await darkBtn.isVisible().catch(() => false)) {
  await darkBtn.click();
  await page.waitForTimeout(800);
  await saveCapture('account--dark-theme');
}

// Reset theme to system
const sysBtn = page.locator('.theme-slider-option', { hasText: 'System' }).first();
if (await sysBtn.isVisible().catch(() => false)) {
  await sysBtn.click();
  await page.waitForTimeout(500);
}

// Edit profile mode
console.log('  Account — edit profile');
if (await clickIf('.account-edit-btn')) {
  await saveCapture('account--editing');
}

// Change password modal
console.log('  Account — change password modal');
await navigateTo('/account');
const pwBtn = page.locator('button', { hasText: 'Change password' }).first();
if (await pwBtn.isVisible().catch(() => false)) {
  await pwBtn.click();
  await page.waitForTimeout(800);
  await saveCapture('account--password-modal');
  // Close modal
  await clickIf('.modal-overlay');
}

// ── Also capture key pages in dark theme ──────────────────────────────
console.log('\n  Capturing key pages in dark theme...');
await navigateTo('/account');
if (await darkBtn.isVisible().catch(() => false)) {
  await darkBtn.click();
  await page.waitForTimeout(800);
}

for (const { path, filename } of [
  { path: '/', filename: 'home--dark' },
  { path: '/exercises', filename: 'exercises--dark' },
  { path: '/practices', filename: 'practices--dark' },
  { path: '/history', filename: 'history--dark' },
  { path: '/account', filename: 'account--dark' },
]) {
  console.log(`  ${filename}`);
  await navigateTo(path);
  await expandAll();
  await saveCapture(filename);
}

// Reset to system theme
await navigateTo('/account');
if (await sysBtn.isVisible().catch(() => false)) {
  await sysBtn.click();
  await page.waitForTimeout(500);
}

// ── Done ──────────────────────────────────────────────────────────────
await browser.close();

console.log(`\nDone! ${captureCount} captures saved to: ${OUTDIR}/`);
console.log(`\nNext steps:`);
console.log(`  1. cd captured-pages`);
console.log(`  2. npx serve .`);
console.log(`  3. Open html.to.design in Figma`);
console.log(`  4. Point it at each page (e.g. http://localhost:3000/home.html)`);
