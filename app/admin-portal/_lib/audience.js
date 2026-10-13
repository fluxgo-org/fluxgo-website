import { dayEndIso, dayStartIso, localDay, ONBOARDING_STEPS } from './format';

/**
 * Audience filters for notification sends.
 * The form keeps plain strings. toAudienceFilters() makes the API values:
 * the same names as GET /admin/members and POST /admin/notifications audience.filters.
 */
export const GENDER_OPTIONS = [
  { value: 'WOMAN', label: 'Woman' },
  { value: 'MAN', label: 'Man' },
  { value: 'NON_BINARY', label: 'Non-binary' },
  { value: 'NONE', label: 'Not set' },
];

export const SOURCE_OPTIONS = [
  { value: 'FRIEND_FAMILY', label: 'Friend or family' },
  { value: 'COLLEAGUE', label: 'Colleague' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'GOOGLE_SEARCH', label: 'Google search' },
  { value: 'APP_STORE', label: 'App store' },
  { value: 'OTHER', label: 'Other' },
  { value: 'SKIPPED', label: 'Skipped' },
  { value: 'NONE', label: 'Not set' },
];

export const INTENT_OPTIONS = [
  { value: 'TAKE_RIDE', label: 'Find rides' },
  { value: 'PUBLISH_RIDE', label: 'Offer rides' },
];

export const WORK_EMAIL_OPTIONS = [
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REVOKED', label: 'Revoked' },
  { value: 'NONE', label: 'Not added' },
];

export const ONBOARDING_OPTIONS = [
  { value: 'COMPLETE', label: 'Completed' },
  { value: 'INCOMPLETE', label: 'Not completed' },
  ...ONBOARDING_STEPS.map((step) => ({ value: step.value, label: `Stopped after ${step.done.toLowerCase()}` })),
];

const DAYS = [7, 30, 90];
export const ACTIVITY_GROUPS = [
  { label: 'Active', options: DAYS.map((days) => ({ value: `active:${days}`, label: `Active in last ${days} days` })) },
  { label: 'Inactive', options: DAYS.map((days) => ({ value: `inactive:${days}`, label: `Inactive for ${days}+ days` })) },
];

export const RIDES_OPTIONS = [
  { value: 'NONE', label: 'None' },
  { value: 'ANY', label: '1 or more' },
];

export const INTERNAL_OPTIONS = [
  { value: 'include', label: 'Include' },
  { value: 'exclude', label: 'Exclude' },
  { value: 'only', label: 'Only' },
];

export const AUDIENCE_PRESETS = [
  { label: 'Inactive 30 days', filters: () => ({ activity: 'inactive:30' }) },
  { label: 'Never booked', filters: () => ({ passengerRides: 'NONE' }) },
  { label: 'Drivers with no rides', filters: () => ({ hasVehicle: 'true', driverRides: 'NONE' }) },
  { label: 'New this week', filters: () => ({ joinedFrom: localDay(-6) }) },
  { label: 'Women', filters: () => ({ gender: 'WOMAN' }) },
];

/** Drop empty values and the default internal scope, so two forms compare by their real filters. */
export function cleanForm(form) {
  const next = {};
  Object.entries(form).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (key === 'internal' && value === 'include') return;
    next[key] = value;
  });
  return next;
}

/** Convert the form to API filter values. Internal members are included unless the form says otherwise. */
export function toAudienceFilters(form) {
  const filters = {};
  ['gender', 'acquisitionSource', 'intent', 'workEmailStatus', 'driverRides', 'passengerRides'].forEach((key) => { if (form[key]) filters[key] = form[key]; });
  if (form.city?.trim()) filters.city = form.city.trim();
  const from = dayStartIso(form.joinedFrom);
  const to = dayEndIso(form.joinedTo);
  if (from) filters.createdFrom = from;
  if (to) filters.createdTo = to;
  if (form.hasPhoto) filters.hasPhoto = form.hasPhoto === 'true';
  if (form.hasVehicle) filters.hasVehicle = form.hasVehicle === 'true';
  if (form.onboarding === 'COMPLETE') filters.onboardingCompleted = true;
  else if (form.onboarding === 'INCOMPLETE') filters.onboardingCompleted = false;
  else if (form.onboarding) filters.onboardingStep = form.onboarding;
  if (form.activity) {
    const [mode, days] = form.activity.split(':');
    filters[mode === 'active' ? 'lastActiveWithinDays' : 'inactiveForDays'] = Number(days);
  }
  filters.internal = form.internal || 'include';
  return filters;
}

const labelOf = (options, value) => options.find((option) => option.value === value)?.label || value;
const shortDay = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** Short phrases that describe API filter values, for summaries. */
export function describeFilters(filters) {
  if (!filters) return [];
  const parts = [];
  const gender = { WOMAN: 'Women', MAN: 'Men', NON_BINARY: 'Non-binary', NONE: 'Gender not set' }[filters.gender];
  if (gender) parts.push(gender);
  if (filters.createdFrom || filters.createdTo) {
    const from = filters.createdFrom ? shortDay(filters.createdFrom) : null;
    const to = filters.createdTo ? shortDay(new Date(Date.parse(filters.createdTo) - 1).toISOString()) : null;
    parts.push(from && to ? `Joined ${from}–${to}` : from ? `Joined from ${from}` : `Joined by ${to}`);
  }
  if (filters.intent) parts.push(`Joined to ${labelOf(INTENT_OPTIONS, filters.intent).toLowerCase()}`);
  if (filters.acquisitionSource) parts.push(`Source: ${labelOf(SOURCE_OPTIONS, filters.acquisitionSource)}`);
  if (filters.hasPhoto !== undefined && filters.hasPhoto !== null) parts.push(filters.hasPhoto === true || filters.hasPhoto === 'true' ? 'Has photo' : 'No photo');
  if (filters.workEmailStatus) parts.push(filters.workEmailStatus === 'NONE' ? 'No work email' : `Work email ${labelOf(WORK_EMAIL_OPTIONS, filters.workEmailStatus).toLowerCase()}`);
  if (filters.hasVehicle !== undefined && filters.hasVehicle !== null) parts.push(filters.hasVehicle === true || filters.hasVehicle === 'true' ? 'Has vehicle' : 'No vehicle');
  if (filters.onboardingCompleted !== undefined && filters.onboardingCompleted !== null) parts.push(filters.onboardingCompleted === true || filters.onboardingCompleted === 'true' ? 'Onboarding completed' : 'Onboarding not completed');
  if (filters.onboardingStep) parts.push(labelOf(ONBOARDING_OPTIONS, filters.onboardingStep));
  if (filters.lastActiveWithinDays) parts.push(`Active in last ${filters.lastActiveWithinDays} days`);
  if (filters.inactiveForDays) parts.push(`Inactive ${filters.inactiveForDays}+ days`);
  if (filters.driverRides) parts.push(filters.driverRides === 'NONE' ? 'No rides as driver' : '1+ rides as driver');
  if (filters.passengerRides) parts.push(filters.passengerRides === 'NONE' ? 'No rides as passenger' : '1+ rides as passenger');
  if (filters.city) parts.push(`Ride city: ${filters.city}`);
  if (filters.internal === 'exclude') parts.push('No internal');
  if (filters.internal === 'only') parts.push('Internal only');
  return parts;
}

/** One line for a filter set. No filters means every active member. */
export function filterSummary(filters) {
  const parts = describeFilters(filters);
  return parts.length ? parts.join(' · ') : 'All active members';
}
