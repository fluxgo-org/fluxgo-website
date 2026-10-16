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
  "export function Avatar({ name, size = 'md', src })",
  'referrerPolicy="no-referrer"',
  'src={row.profilePhotoUrl}',
  'avatarSrc={data ? data.profilePhotoUrl : seed?.profilePhotoUrl}',
  'profilePhotoUrl: member.profilePhotoUrl || null',
  'src={ticket.requesterPhotoUrl}',
  "{ value: 'filters', label: 'Filtered members' }",
  'audience: { filters }',
  'toAudienceFilters',
  'AUDIENCE_PRESETS',
  "'lastActiveWithinDays' : 'inactiveForDays'",
  "['gender', 'acquisitionSource', 'intent', 'workEmailStatus', 'driverRides', 'passengerRides']",
  'filters.hasPhoto',
  'filters.city',
  "status: 'ACTIVE', ...JSON.parse(debouncedKey), limit: PREVIEW_SIZE",
  'useDebounced(key, 300)',
  'ax-aud-match',
  "requestApi('/admin/notifications/sends?limit=6&offset=0')",
  "endpoint: '/admin/notifications/sends'",
  '`/admin/notifications/sends/${encodeURIComponent(id)}`',
  '`/admin/notifications/sends/${encodeURIComponent(id)}/recipients`',
  "if (kind === 'send') return <SendPanel",
  'fluxgo-notification-',
  'requestApi(`/admin/analytics${key}`)',
  "items: ['today', 'analytics', 'support', 'safety']",
  'This chart only',
  'Use the page filters',
  'function bucketize(daily, by)',
  'ax-metric-col${hover === index',
  'EXPORT_FORMATS',
  "format === 'md'",
  '/Filter /DCTDecode',
  "canvasBlob(canvas, 'image/png')",
  'exporter={exporter}',
  'export function VerifiedMark',
  '<VerifiedMark show={row.isVerified} />',
  '<VerifiedMark show={row.driverVerified} />',
  '<VerifiedMark show={row.bookedByVerified} />',
  '<VerifiedMark show={ticket.requesterVerified}',
  "src: '/admin/verified.png'",
  'badgeImage = await loadImage(VERIFIED_BADGE.src)',
  'https://www.fluxgo.in/ride/',
  'export function RideLinkActions',
  '<RideLinkActions publicId={row.publicId} />',
  '<RideLinkActions publicId={row.tripPublicId} />',
  '`/admin/members/${encodeURIComponent(memberId)}/trusted-contact`',
  'function ageFromDob',
  'data.ridesCompleted',
  'reviewsGiven',
  'reviewerId: filters.reviewerId',
  'revieweeId: filters.revieweeId',
  'className="ax-name-cell"',
];

// Removed code: the browser-side loop that collected every active member before a send.
// Old verified mark: an SVG circle. The app badge image replaced it.
const removedMarkers = ['collectAllActive', "value: 'all', label: 'All active members'", "'Export CSV'", 'M4.6 8.2l2.2 2.2 4.6-4.8'];

const missing = requiredMarkers.filter((marker) => !text.includes(marker));
if (missing.length) {
  console.error(`Admin portal check failed. Missing: ${missing.join(', ')}`);
  process.exit(1);
}
const stale = removedMarkers.filter((marker) => text.includes(marker));
if (stale.length) {
  console.error(`Admin portal check failed. Removed code is back: ${stale.join(', ')}`);
  process.exit(1);
}
console.log('Admin portal source check passed.');
console.log('Route: /admin-portal');
