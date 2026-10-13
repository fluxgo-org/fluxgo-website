import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve('app/admin-portal');

async function sources(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.(jsx?|css)$/.test(entry.name) ? [path] : [];
  }));
  return files.flat();
}

const text = (await Promise.all((await sources(root)).map((file) => readFile(file, 'utf8')))).join('\n');

const requiredMarkers = [
  'NEXT_PUBLIC_FLUXGO_API_URL',
  "credentials: 'include'",
  "requestApi('/admin/auth/login'",
  "requestApi('/admin/auth/logout'",
  "requestApi('/admin/me'",
  "requestApi('/admin/auth/request-password-reset'",
  "requestApi('/admin/auth/reset-password'",
  "JSON.stringify({ email: email.trim(), password })",
  "requestApi('/admin/dashboard/summary'",
  "requestApi('/admin/dashboard/attention'",
  "'/admin/members'",
  "'/admin/trips'",
  "'/admin/bookings'",
  "'/admin/support/tickets",
  "'/admin/reviews'",
  "'/admin/vehicles'",
  "'/admin/notifications'",
  "'/admin/audit'",
  "requestApi('/admin/users'",
  'fluxgo-admin-session-expired',
  'Open tickets close automatically after 24 hours without activity.',
  'ax-col-resize',
  'table:${tableId}:order',
  'sidebar:collapsed',
  "requestApi('/admin/push/config')",
  '/admin-sw.js',
  'ax-nav-tip',
  'onSortChange',
  'ax-filter-panel',
  'downloadCsv',
  'ConfirmDialog',
  'useFocusTrap',
  'aria-sort',
  'aria-busy',
  'data-theme="dark"',
  'SAFETY_ISSUE_CODES',
  "requestApi('/admin/dashboard/pulse')",
  'useLiveRefresh',
  'IDLE_AFTER_MS',
  "type: 'toggle', key: 'internal'",
  '/internal`',
  "'NOT_DELETED'",
  'onboardingProgress',
  "requestApi('/admin/dashboard/summary' + queryString({ internal }))",
  "status: 'ACTIVE', internal: 'include'",
];

const missing = requiredMarkers.filter((marker) => !text.includes(marker));
if (missing.length) {
  console.error(`Admin portal check failed. Missing: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('Admin portal source check passed.');
console.log('Route: /admin-portal');
