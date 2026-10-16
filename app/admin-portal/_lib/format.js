const STATUS_LABELS = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  DELETED: 'Deleted',
  NOT_DELETED: 'Not deleted',
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REQUESTED: 'Requested',
  PAYMENT_PENDING: 'Payment pending',
  CONFIRMED: 'Confirmed',
  REJECTED: 'Rejected',
  IN_RIDE: 'In ride',
  CANCELLED_BY_PASSENGER: 'Cancelled by passenger',
  CANCELLED_BY_DRIVER: 'Cancelled by driver',
  OPEN: 'Open',
  CLOSED: 'Closed',
  ENABLED: 'Enabled',
  DISABLED: 'Disabled',
  VERIFIED: 'Verified',
  PENDING: 'Pending',
  FAILED: 'Failed',
  REVOKED: 'Revoked',
  EXPIRED: 'Expired',
  INACTIVE: 'Inactive',
  AWAITING_RECHECK: 'Awaiting recheck',
  REMOVED: 'Removed',
  INSTANT: 'Instant',
  REQUEST: 'On request',
  NOT_REQUIRED: 'Not required',
  TAKE_RIDE: 'Takes rides',
  PUBLISH_RIDE: 'Publishes rides',
  PASSENGER_TO_DRIVER: 'Passenger → driver',
  DRIVER_TO_PASSENGER: 'Driver → passenger',
  REQUESTER: 'Member',
  SUPPORT: 'Support',
  SUPER_ADMIN: 'Super admin',
  MSG91: 'Mobile OTP',
};

export function titleCase(value) {
  return String(value).toLowerCase().replace(/_/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());
}

export function statusLabel(value) {
  if (value === null || value === undefined || value === '') return '—';
  return STATUS_LABELS[value] || titleCase(value);
}

export function statusTone(value) {
  const normalized = String(value || '').toUpperCase();
  if (['ACTIVE', 'PUBLISHED', 'COMPLETED', 'CONFIRMED', 'ENABLED', 'VERIFIED'].includes(normalized)) return 'success';
  if (['IN_PROGRESS', 'IN_RIDE', 'OPEN'].includes(normalized)) return 'info';
  if (['PENDING', 'PAYMENT_PENDING', 'REQUESTED', 'DRAFT', 'AWAITING_RECHECK'].includes(normalized)) return 'warning';
  if (['SUSPENDED', 'DELETED', 'CANCELLED', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER', 'REJECTED', 'DISABLED', 'FAILED', 'REVOKED', 'EXPIRED'].includes(normalized)) return 'danger';
  return 'neutral';
}

export const ISSUE_LABELS = {
  NO_SHOW: 'No-show',
  DID_NOT_PICK_UP_CALL: 'Did not pick up call',
  LATE_ARRIVAL: 'Late arrival',
  POST_RIDE_MEETUP_CONTACT: 'Contact after the ride',
  PRIVACY_CONCERN: 'Privacy concern',
  DISRESPECTFUL_OR_ABUSIVE_BEHAVIOUR: 'Disrespectful or abusive',
  DIFFERENT_DROP_LOCATION: 'Different drop location',
  LATE_NIGHT_DIFFICULTY: 'Late-night difficulty',
  ASKED_TO_GET_DOWN_LOW_BOOKING: 'Asked to get down early',
  RASH_DRIVING: 'Rash driving',
  POOR_DRIVING_SKILLS: 'Poor driving skills',
  VEHICLE_OR_SEAT_NOT_AS_PROMISED: 'Vehicle or seat not as promised',
  UNSAFE_VEHICLE_CONDITION: 'Unsafe vehicle condition',
  UNDECLARED_PASSENGER_OR_LUGGAGE: 'Undeclared passenger or luggage',
  VEHICLE_DAMAGE_OR_CLEANLINESS: 'Vehicle damage or cleanliness',
};

/** Same list as SAFETY_ISSUE_CODES in the backend admin console repository. */
export const SAFETY_ISSUES = new Set([
  'RASH_DRIVING',
  'POOR_DRIVING_SKILLS',
  'UNSAFE_VEHICLE_CONDITION',
  'DISRESPECTFUL_OR_ABUSIVE_BEHAVIOUR',
  'PRIVACY_CONCERN',
  'POST_RIDE_MEETUP_CONTACT',
  'LATE_NIGHT_DIFFICULTY',
  'ASKED_TO_GET_DOWN_LOW_BOOKING',
]);

export function issueLabel(code) {
  return ISSUE_LABELS[code] || titleCase(code);
}

export const AUDIT_ACTION_LABELS = {
  ADMIN_LOGIN: 'Signed in',
  ADMIN_PASSWORD_RESET_REQUESTED: 'Requested a password reset',
  ADMIN_PASSWORD_RESET_CONFIRMED: 'Reset the password',
  ADMIN_USER_CREATED: 'Added an admin',
  ADMIN_USER_DISABLED: 'Turned off an admin',
  ADMIN_USER_ENABLED: 'Turned on an admin',
  SUPPORT_TICKET_CLOSED: 'Closed a ticket',
  SUPPORT_TICKET_REOPENED: 'Reopened a ticket',
  SUPPORT_TICKET_REPLIED: 'Replied to a ticket',
  NOTIFICATION_PUBLISHED: 'Sent a notification',
  MEMBER_SUSPENDED: 'Suspended a member',
  MEMBER_REACTIVATED: 'Reactivated a member',
  TRIP_CANCELLED_BY_ADMIN: 'Cancelled a ride',
  SUPPORT_TICKET_ASSIGNED: 'Set a ticket owner',
  SUPPORT_TICKET_UNASSIGNED: 'Removed a ticket owner',
  SUPPORT_TICKET_NOTE_ADDED: 'Added an internal note',
  MEMBER_MARKED_INTERNAL: 'Marked a member as internal',
  MEMBER_MARKED_EXTERNAL: 'Marked a member as external',
  MEMBER_TRUSTED_CONTACT_VIEWED: "Viewed a trusted contact's number",
};

/** The verified badge from the app (assets/fluxgo-work-email-verified-3d.png), 96 px. color is its green, for fallbacks. */
export const VERIFIED_BADGE = { src: '/admin/verified.png', color: '#16C25A' };

export const RELATIONSHIP_LABELS = { PARENT: 'Parent', PARTNER: 'Partner', SIBLING: 'Sibling', FRIEND: 'Friend', OTHER: 'Other' };

/** Public ride page on the website. The app opens it when installed. */
export function rideLink(publicId) {
  return publicId ? `https://www.fluxgo.in/ride/${encodeURIComponent(publicId)}` : null;
}

/** Full years from a YYYY-MM-DD date of birth to today in India. Returns null for a missing or bad date. */
export function ageFromDob(dob, now = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob || '');
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const [todayYear, todayMonth, todayDay] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(now).split('-').map(Number);
  const age = todayYear - year - (todayMonth < month || (todayMonth === month && todayDay < day) ? 1 : 0);
  return age >= 0 && age < 130 ? age : null;
}

/**
 * Onboarding steps in app order. The API returns the next step to finish.
 * Mobile sign-in is always done for an account.
 */
export const ONBOARDING_STEPS = [
  { value: 'SOURCE', done: 'Mobile sign-in', next: 'Signup source' },
  { value: 'PROFILE', done: 'Signup source', next: 'Profile details' },
  { value: 'WORK_EMAIL', done: 'Profile details', next: 'Work email' },
  { value: 'EMERGENCY_CONTACT', done: 'Work email', next: 'Emergency contact' },
  { value: 'VEHICLE', done: 'Emergency contact', next: 'Vehicle' },
];
export const ONBOARDING_STEP_TOTAL = ONBOARDING_STEPS.length + 1;

/** Describe the onboarding progress for a next-step value. */
export function onboardingProgress(step) {
  if (!step) return null;
  if (step === 'COMPLETE') return { completed: true, doneCount: ONBOARDING_STEP_TOTAL, done: 'Vehicle', next: null };
  const index = ONBOARDING_STEPS.findIndex((item) => item.value === step);
  if (index < 0) return null;
  return { completed: false, doneCount: index + 1, done: ONBOARDING_STEPS[index].done, next: ONBOARDING_STEPS[index].next };
}

export function auditActionLabel(action) {
  return AUDIT_ACTION_LABELS[action] || titleCase(action || '');
}

export const RESOURCE_LABELS = {
  admin_user: 'Admin',
  support_ticket: 'Ticket',
  notification_event: 'Notification',
  user: 'Member',
  trip: 'Ride',
  booking: 'Booking',
};

export function display(value) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const numbers = new Intl.NumberFormat('en-IN');

export function formatMoney(value, currency = 'INR') {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  if (currency && currency !== 'INR') return `${numbers.format(amount)} ${currency}`;
  return rupees.format(amount);
}

export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  return Number.isFinite(amount) ? numbers.format(amount) : String(value);
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return value ? String(value) : '—';
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatDate(value) {
  const date = toDate(value);
  if (!date) return value ? String(value) : '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(value) {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

/** Short relative time, for example "in 40 min" or "3 h ago". */
export function relativeTime(value, now = Date.now()) {
  const date = toDate(value);
  if (!date) return '—';
  const diff = date.getTime() - now;
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  let text;
  if (abs < 45_000) return diff >= 0 ? 'now' : 'just now';
  if (abs < hour) text = `${Math.round(abs / minute)} min`;
  else if (abs < day) text = `${Math.round(abs / hour)} h`;
  else if (abs < 30 * day) text = `${Math.round(abs / day)} d`;
  else return formatDate(date);
  return diff >= 0 ? `in ${text}` : `${text} ago`;
}

/** Duration since a time, for example "2 h 10 min". */
export function waitingFor(value, now = Date.now()) {
  const date = toDate(value);
  if (!date) return '—';
  const minutes = Math.max(0, Math.round((now - date.getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${minutes % 60} min`;
  return `${Math.floor(hours / 24)} d ${hours % 24} h`;
}

/** Convert a local yyyy-mm-dd day to the ISO start of that day. */
export function dayStartIso(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return undefined;
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date).toISOString();
}

/** Convert a local yyyy-mm-dd day to the ISO start of the next day (exclusive end). */
export function dayEndIso(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return undefined;
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date + 1).toISOString();
}

export function localDay(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function plural(count, word, pluralWord = `${word}s`) {
  return `${formatNumber(count)} ${Number(count) === 1 ? word : pluralWord}`;
}
