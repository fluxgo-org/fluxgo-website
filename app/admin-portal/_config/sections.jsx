'use client';

import {
  auditActionLabel,
  AUDIT_ACTION_LABELS,
  dayEndIso,
  dayStartIso,
  display,
  formatDateTime,
  formatMoney,
  formatNumber,
  issueLabel,
  ISSUE_LABELS,
  localDay,
  onboardingProgress,
  ONBOARDING_STEPS,
  relativeTime,
  RESOURCE_LABELS,
  SAFETY_ISSUES,
  statusLabel,
} from '../_lib/format';
import { Avatar, Badge, Icon, Mono, VerifiedMark } from '../_components/ui';
import { filterSummary } from '../_lib/audience';

export const NAV_GROUPS = [
  { label: 'Workspace', items: ['today', 'analytics', 'support', 'safety'] },
  { label: 'Records', items: ['members', 'trips', 'bookings', 'vehicles'] },
  { label: 'Outreach', items: ['notify', 'sends'] },
  { label: 'Administration', items: ['admins', 'audit'] },
];

export const SECTION_META = {
  today: { label: 'Today', icon: 'today', description: 'What needs you now' },
  analytics: { label: 'Analytics', icon: 'analytics', description: 'Active members and key metrics' },
  support: { label: 'Support', icon: 'support', description: 'Member conversations' },
  safety: { label: 'Safety reports', icon: 'shield', description: 'Reviews with issues' },
  members: { label: 'Members', icon: 'members', description: 'Accounts and verification' },
  trips: { label: 'Rides', icon: 'rides', description: 'Published rides' },
  bookings: { label: 'Bookings', icon: 'bookings', description: 'Seat bookings' },
  vehicles: { label: 'Vehicles', icon: 'vehicles', description: 'Every vehicle and its check' },
  notify: { label: 'Send notification', icon: 'bell', description: 'Offers and updates' },
  sends: { label: 'Sent notifications', icon: 'send', description: 'Every send and who got it' },
  admins: { label: 'Admin users', icon: 'admins', description: 'Console access' },
  audit: { label: 'Audit log', icon: 'audit', description: 'Every admin action' },
};

export const SECTION_IDS = Object.keys(SECTION_META);

/** A name that opens a record panel. */
export function RecordLink({ children, onOpen, title }) {
  if (!onOpen) return <span>{children}</span>;
  return <button type="button" className="ax-link" title={title} onClick={(event) => { event.stopPropagation(); onOpen(); }}>{children}</button>;
}

function When({ value, now }) {
  if (!value) return <span className="ax-muted">—</span>;
  return <span className="ax-when" title={formatDateTime(value)}><span>{formatDateTime(value)}</span><small>{relativeTime(value, now)}</small></span>;
}

function Seats({ total, available }) {
  const booked = Math.max(0, Number(total || 0) - Number(available || 0));
  const ratio = total ? booked / total : 0;
  return (
    <span className="ax-seats" title={`${booked} of ${total} seats booked`}>
      <span className="ax-seats-bar" aria-hidden="true"><span style={{ width: `${Math.round(ratio * 100)}%` }} /></span>
      <span>{booked}/{total}</span>
    </span>
  );
}

export function Stars({ rating }) {
  const value = Number(rating) || 0;
  return (
    <span className={`ax-stars${value <= 2 ? ' is-low' : ''}`} aria-label={`${value} out of 5`} title={`${value} out of 5`}>
      <Icon name="star" size={13} /><strong>{value}</strong><span className="ax-muted">/5</span>
    </span>
  );
}

export function IssueChips({ codes = [], limit = 3 }) {
  if (!codes.length) return <span className="ax-muted">None</span>;
  const shown = codes.slice(0, limit);
  return (
    <span className="ax-issue-list">
      {shown.map((code) => <span key={code} className={`ax-issue${SAFETY_ISSUES.has(code) ? ' is-safety' : ''}`}>{SAFETY_ISSUES.has(code) ? <Icon name="alert" size={11} /> : null}{issueLabel(code)}</span>)}
      {codes.length > limit ? <span className="ax-issue is-more">+{codes.length - limit}</span> : null}
    </span>
  );
}

function statusOptions(values) {
  return values.map((value) => ({ value, label: statusLabel(value) }));
}

function dateParams(filters, fromKey, toKey, apiFrom, apiTo) {
  return { [apiFrom]: dayStartIso(filters[fromKey]), [apiTo]: dayEndIso(filters[toKey]) };
}

/**
 * Lists hide rows that involve internal (Fluxgo team or test) members by default.
 * The toggle stays on when presets change. The members table can also show internal members only.
 */
const internalToggle = { type: 'toggle', key: 'internal', label: 'Show internal', value: 'include', primary: true, sticky: true, chipLabel: 'Internal', chipLabels: { include: 'Shown', only: 'Only internal' } };

/** A small tag next to a member name when the row involves an internal member. */
export function InternalTag({ show }) {
  return show ? <span className="ax-internal-tag" title="Fluxgo team or test account">Internal</span> : null;
}

function OnboardingCell({ row }) {
  if (row.status === 'DELETED') return <span className="ax-muted">—</span>;
  const progress = onboardingProgress(row.onboardingStep);
  if (!progress) return <span className="ax-muted">—</span>;
  if (progress.completed) return <Badge tone="success">Completed</Badge>;
  return <span className="ax-onboarding" title={`${progress.doneCount} of 6 steps done`}><span>Done: {progress.done}</span><small>Next: {progress.next}</small></span>;
}

function onboardingCsv(row) {
  const progress = onboardingProgress(row.onboardingStep);
  if (!progress) return '';
  return progress.completed ? 'Completed' : `Done: ${progress.done}; Next: ${progress.next}`;
}

const today = () => localDay(0);
const weekAgo = () => localDay(-6);

/** List sections that use the shared record table. */
export const RECORD_SECTIONS = {
  members: {
    label: 'Members',
    endpoint: '/admin/members',
    liveKeys: ['members', 'trips', 'vehicles'],
    detailKind: 'member',
    searchPlaceholder: 'Name, mobile, email, or member ID',
    defaultSort: { key: 'createdAt', order: 'desc' },
    filters: [
      { type: 'select', key: 'status', label: 'Account', options: [{ value: 'NOT_DELETED', label: 'Not deleted' }, ...statusOptions(['ACTIVE', 'SUSPENDED', 'DELETED'])], primary: true, anyLabel: 'All accounts' },
      internalToggle,
      { type: 'select', key: 'onboarding', label: 'Onboarding', options: [
        { value: 'COMPLETE', label: 'Completed' },
        { value: 'INCOMPLETE', label: 'Not completed' },
        ...ONBOARDING_STEPS.map((step) => ({ value: step.value, label: `Stopped after ${step.done.toLowerCase()}` })),
      ] },
      { type: 'select', key: 'workEmailStatus', label: 'Work email', options: [...statusOptions(['VERIFIED', 'PENDING', 'REVOKED']), { value: 'NONE', label: 'Not added' }] },
      { type: 'boolean', key: 'hasVehicle', label: 'Vehicle', yes: 'Has a vehicle', no: 'No vehicle' },
      { type: 'select', key: 'intent', label: 'Joined to', options: statusOptions(['TAKE_RIDE', 'PUBLISH_RIDE']) },
      { type: 'dateRange', key: 'joined', label: 'Joined', fromKey: 'joinedFrom', toKey: 'joinedTo' },
    ],
    presets: [
      { label: 'Joined this week', filters: { joinedFrom: weekAgo } },
      { label: 'Drivers', filters: { hasVehicle: 'true' } },
      { label: 'Work email verified', filters: { workEmailStatus: 'VERIFIED' } },
      { label: 'No work email', filters: { workEmailStatus: 'NONE' } },
      { label: 'Suspended', filters: { status: 'SUSPENDED' } },
      { label: 'Not deleted', filters: { status: 'NOT_DELETED' } },
      { label: 'Onboarding not completed', filters: { status: 'NOT_DELETED', onboarding: 'INCOMPLETE' } },
      { label: 'Internal only', filters: { internal: 'only' } },
    ],
    toParams: (filters) => ({
      query: filters.query,
      status: filters.status,
      internal: filters.internal,
      onboardingStep: filters.onboarding && filters.onboarding !== 'INCOMPLETE' ? filters.onboarding : undefined,
      onboardingCompleted: filters.onboarding === 'INCOMPLETE' ? 'false' : undefined,
      workEmailStatus: filters.workEmailStatus,
      hasVehicle: filters.hasVehicle,
      intent: filters.intent,
      ...dateParams(filters, 'joinedFrom', 'joinedTo', 'createdFrom', 'createdTo'),
    }),
    columns: ({ now }) => [
      { key: 'name', label: 'Member', width: 230, locked: true, sortKey: 'name', defaultOrder: 'asc', verified: (row) => row.isVerified, render: (row) => <span className="ax-person"><Avatar name={row.name} src={row.profilePhotoUrl} size="sm" /><span><strong>{display(row.name)}</strong><VerifiedMark show={row.isVerified} /><InternalTag show={row.isInternal} /></span></span>, csv: (row) => row.name },
      { key: 'mobile', label: 'Mobile', width: 190, render: (row) => <Mono value={row.mobile} /> },
      { key: 'personalEmail', label: 'Email', width: 210, render: (row) => row.personalEmail ? <span className="ax-truncate" title={row.personalEmail}>{row.personalEmail}</span> : <span className="ax-muted">—</span> },
      { key: 'status', label: 'Account', width: 120, render: (row) => <Badge value={row.status} /> },
      { key: 'onboardingStep', label: 'Onboarding', width: 200, sortKey: 'onboardingStep', render: (row) => <OnboardingCell row={row} />, csv: onboardingCsv },
      { key: 'isInternal', label: 'Internal', width: 100, render: (row) => (row.isInternal ? <Badge tone="neutral">Internal</Badge> : <span className="ax-muted">No</span>), csv: (row) => (row.isInternal ? 'Yes' : 'No') },
      { key: 'workEmailStatus', label: 'Work email', width: 130, render: (row) => row.workEmailStatus ? <Badge value={row.workEmailStatus} /> : <span className="ax-muted">Not added</span> },
      { key: 'vehicleCount', label: 'Vehicles', width: 100, align: 'end', sortKey: 'vehicleCount', render: (row) => formatNumber(row.vehicleCount) },
      { key: 'tripCount', label: 'Rides', width: 90, align: 'end', sortKey: 'tripCount', render: (row) => formatNumber(row.tripCount) },
      { key: 'createdAt', label: 'Joined', width: 170, sortKey: 'createdAt', render: (row) => <When value={row.createdAt} now={now} />, csv: (row) => row.createdAt },
      { key: 'updatedAt', label: 'Updated', width: 170, sortKey: 'updatedAt', defaultHidden: true, render: (row) => <When value={row.updatedAt} now={now} />, csv: (row) => row.updatedAt },
      { key: 'id', label: 'Member ID', width: 300, defaultHidden: true, render: (row) => <Mono value={row.id} /> },
    ],
  },
  trips: {
    label: 'Rides',
    endpoint: '/admin/trips',
    liveKeys: ['trips', 'bookings'],
    detailKind: 'trip',
    searchPlaceholder: 'Reference, city, driver name, or mobile',
    defaultSort: { key: 'departureAt', order: 'desc' },
    filters: [
      { type: 'select', key: 'status', label: 'Status', options: statusOptions(['PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DRAFT']), primary: true, anyLabel: 'All statuses' },
      internalToggle,
      { type: 'dateRange', key: 'departure', label: 'Departure', fromKey: 'departFrom', toKey: 'departTo' },
      { type: 'text', key: 'originCity', label: 'From', placeholder: 'City or place' },
      { type: 'text', key: 'destinationCity', label: 'To', placeholder: 'City or place' },
      { type: 'select', key: 'bookingMode', label: 'Booking mode', options: statusOptions(['INSTANT', 'REQUEST']) },
      { type: 'boolean', key: 'hasBookings', label: 'Bookings', yes: 'Has bookings', no: 'No bookings' },
      { type: 'entity', key: 'driverUserId', label: 'Driver', labelKey: 'driverName' },
    ],
    presets: [
      { label: 'Departing today', filters: { departFrom: today, departTo: today } },
      { label: 'Live now', filters: { status: 'IN_PROGRESS' } },
      { label: 'Upcoming', filters: { status: 'PUBLISHED', departFrom: today } },
      { label: 'Upcoming, no bookings', filters: { status: 'PUBLISHED', departFrom: today, hasBookings: 'false' } },
      { label: 'Cancelled this week', filters: { status: 'CANCELLED', departFrom: weekAgo } },
    ],
    toParams: (filters) => ({
      query: filters.query,
      status: filters.status,
      originCity: filters.originCity,
      destinationCity: filters.destinationCity,
      bookingMode: filters.bookingMode,
      hasBookings: filters.hasBookings,
      driverUserId: filters.driverUserId,
      internal: filters.internal,
      ...dateParams(filters, 'departFrom', 'departTo', 'departureFrom', 'departureTo'),
    }),
    columns: ({ now, open }) => [
      { key: 'publicId', label: 'Reference', width: 150, locked: true, render: (row) => <Mono value={row.publicId} /> },
      { key: 'route', label: 'Route', width: 280, render: (row) => <span className="ax-route" title={`${row.origin} → ${row.destination}`}><span>{row.origin}</span><Icon name="arrowRight" size={12} /><span>{row.destination}</span></span>, csv: (row) => `${row.origin} → ${row.destination}` },
      { key: 'driverName', label: 'Driver', width: 170, verified: (row) => row.driverVerified, render: (row) => <><RecordLink onOpen={() => open('member', row.driverUserId)}>{display(row.driverName)}</RecordLink><VerifiedMark show={row.driverVerified} /><InternalTag show={row.isInternal} /></>, csv: (row) => row.driverName },
      { key: 'departureAt', label: 'Departure', width: 180, sortKey: 'departureAt', render: (row) => <When value={row.departureAt} now={now} />, csv: (row) => row.departureAt },
      { key: 'status', label: 'Status', width: 130, render: (row) => <Badge value={row.status} /> },
      { key: 'seats', label: 'Seats booked', width: 140, sortKey: 'seatsAvailable', defaultOrder: 'asc', render: (row) => <Seats total={row.seatsTotal} available={row.seatsAvailable} />, csv: (row) => `${row.seatsTotal - row.seatsAvailable}/${row.seatsTotal}` },
      { key: 'bookingCount', label: 'Bookings', width: 100, align: 'end', sortKey: 'bookingCount', render: (row) => formatNumber(row.bookingCount) },
      { key: 'pricePerSeat', label: 'Fare / seat', width: 110, align: 'end', sortKey: 'pricePerSeat', render: (row) => formatMoney(row.pricePerSeat), text: (row) => formatMoney(row.pricePerSeat) },
      { key: 'bookingMode', label: 'Mode', width: 110, render: (row) => <Badge value={row.bookingMode} tone="neutral" dot={false} /> },
      { key: 'createdAt', label: 'Published', width: 170, sortKey: 'createdAt', defaultHidden: true, render: (row) => <When value={row.createdAt} now={now} />, csv: (row) => row.createdAt },
    ],
  },
  bookings: {
    label: 'Bookings',
    endpoint: '/admin/bookings',
    liveKeys: ['bookings', 'trips'],
    detailKind: 'booking',
    searchPlaceholder: 'Booking or ride reference, booker name, or mobile',
    defaultSort: { key: 'createdAt', order: 'desc' },
    filters: [
      { type: 'select', key: 'status', label: 'Status', options: statusOptions(['REQUESTED', 'CONFIRMED', 'IN_RIDE', 'COMPLETED', 'REJECTED', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER', 'PAYMENT_PENDING']), primary: true, anyLabel: 'All statuses' },
      internalToggle,
      { type: 'dateRange', key: 'booked', label: 'Booked', fromKey: 'bookedFrom', toKey: 'bookedTo' },
      { type: 'dateRange', key: 'departure', label: 'Ride departure', fromKey: 'departFrom', toKey: 'departTo' },
      { type: 'entity', key: 'memberId', label: 'Booker', labelKey: 'memberName' },
      { type: 'entity', key: 'tripId', label: 'Ride', labelKey: 'tripRef' },
    ],
    presets: [
      { label: 'Waiting for driver', filters: { status: 'REQUESTED' } },
      { label: 'Confirmed, upcoming', filters: { status: 'CONFIRMED', departFrom: today } },
      { label: 'Booked today', filters: { bookedFrom: today, bookedTo: today } },
      { label: 'Cancelled by driver', filters: { status: 'CANCELLED_BY_DRIVER' } },
    ],
    toParams: (filters) => ({
      query: filters.query,
      status: filters.status,
      memberId: filters.memberId,
      tripId: filters.tripId,
      internal: filters.internal,
      ...dateParams(filters, 'bookedFrom', 'bookedTo', 'createdFrom', 'createdTo'),
      ...dateParams(filters, 'departFrom', 'departTo', 'departureFrom', 'departureTo'),
    }),
    columns: ({ now, open }) => [
      { key: 'publicId', label: 'Reference', width: 150, locked: true, render: (row) => <Mono value={row.publicId} /> },
      { key: 'tripPublicId', label: 'Ride', width: 150, render: (row) => <RecordLink onOpen={() => open('trip', row.tripId)} title="Open ride"><span className="ax-mono">{row.tripPublicId}</span></RecordLink> },
      { key: 'route', label: 'Pickup → drop', width: 230, render: (row) => <span className="ax-truncate" title={row.route}>{row.route.replace(' to ', ' → ')}</span> },
      { key: 'bookedByName', label: 'Booker', width: 170, verified: (row) => row.bookedByVerified, render: (row) => <><RecordLink onOpen={() => open('member', row.bookedByUserId)}>{display(row.bookedByName)}</RecordLink><VerifiedMark show={row.bookedByVerified} /><InternalTag show={row.isInternal} /></>, csv: (row) => row.bookedByName },
      { key: 'passengerCount', label: 'Seats', width: 80, align: 'end', sortKey: 'passengerCount', render: (row) => formatNumber(row.passengerCount) },
      { key: 'status', label: 'Status', width: 170, render: (row) => <Badge value={row.status} /> },
      { key: 'totalPrice', label: 'Total', width: 100, align: 'end', sortKey: 'totalPrice', render: (row) => formatMoney(row.totalPrice), text: (row) => formatMoney(row.totalPrice) },
      { key: 'tripDepartureAt', label: 'Departure', width: 180, sortKey: 'departureAt', render: (row) => <When value={row.tripDepartureAt} now={now} />, csv: (row) => row.tripDepartureAt },
      { key: 'createdAt', label: 'Booked', width: 170, sortKey: 'createdAt', render: (row) => <When value={row.createdAt} now={now} />, csv: (row) => row.createdAt },
      { key: 'paymentStatus', label: 'Payment', width: 130, defaultHidden: true, render: (row) => <Badge value={row.paymentStatus} tone="neutral" dot={false} /> },
    ],
  },
  safety: {
    label: 'Safety reports',
    endpoint: '/admin/reviews',
    liveKeys: ['reviews'],
    detailKind: 'review',
    search: false,
    defaultSort: { key: 'submittedAt', order: 'desc' },
    defaultFilters: { issues: 'SAFETY' },
    filters: [
      { type: 'select', key: 'issues', label: 'Show', options: [{ value: 'SAFETY', label: 'Safety issues' }, { value: 'ANY', label: 'Any issue' }], primary: true, anyLabel: 'All reviews' },
      internalToggle,
      { type: 'select', key: 'issueCode', label: 'Issue', options: Object.keys(ISSUE_LABELS).map((code) => ({ value: code, label: issueLabel(code) })) },
      { type: 'select', key: 'maxRating', label: 'Rating', options: [1, 2, 3, 4].map((value) => ({ value: String(value), label: `${value} star${value === 1 ? '' : 's'} or lower` })) },
      { type: 'select', key: 'direction', label: 'Written by', options: [{ value: 'PASSENGER_TO_DRIVER', label: 'Passengers about drivers' }, { value: 'DRIVER_TO_PASSENGER', label: 'Drivers about passengers' }] },
      { type: 'dateRange', key: 'submitted', label: 'Submitted', fromKey: 'submittedFrom', toKey: 'submittedTo' },
      { type: 'entity', key: 'memberId', label: 'Member', labelKey: 'memberName' },
    ],
    presets: [
      { label: 'Safety, this week', filters: { issues: 'SAFETY', submittedFrom: weekAgo } },
      { label: 'Rash driving', filters: { issues: 'SAFETY', issueCode: 'RASH_DRIVING' } },
      { label: 'Abusive behaviour', filters: { issues: 'SAFETY', issueCode: 'DISRESPECTFUL_OR_ABUSIVE_BEHAVIOUR' } },
      { label: 'No-shows', filters: { issues: 'ANY', issueCode: 'NO_SHOW' } },
      { label: '1–2 stars', filters: { maxRating: '2' } },
    ],
    toParams: (filters) => ({
      issues: filters.issues,
      issueCode: filters.issueCode,
      maxRating: filters.maxRating,
      direction: filters.direction,
      memberId: filters.memberId,
      internal: filters.internal,
      ...dateParams(filters, 'submittedFrom', 'submittedTo', 'submittedFrom', 'submittedTo'),
    }),
    columns: ({ now, open }) => [
      { key: 'submittedAt', label: 'Submitted', width: 170, sortKey: 'submittedAt', render: (row) => <When value={row.submittedAt} now={now} />, csv: (row) => row.submittedAt },
      { key: 'rating', label: 'Rating', width: 90, sortKey: 'rating', defaultOrder: 'asc', render: (row) => <Stars rating={row.rating} /> },
      { key: 'issueCodes', label: 'Issues', width: 330, render: (row) => <IssueChips codes={row.issueCodes} />, csv: (row) => row.issueCodes.map(issueLabel).join('; ') },
      { key: 'reviewerName', label: 'From', width: 160, verified: (row) => row.reviewerVerified, render: (row) => <><RecordLink onOpen={() => open('member', row.reviewerUserId)}>{display(row.reviewerName)}</RecordLink><VerifiedMark show={row.reviewerVerified} /><InternalTag show={row.isInternal} /></>, csv: (row) => row.reviewerName },
      { key: 'revieweeName', label: 'About', width: 160, verified: (row) => row.revieweeVerified, render: (row) => <><RecordLink onOpen={() => open('member', row.revieweeUserId)}>{display(row.revieweeName)}</RecordLink><VerifiedMark show={row.revieweeVerified} /></> },
      { key: 'direction', label: 'Direction', width: 170, defaultHidden: true, render: (row) => statusLabel(row.direction) },
      { key: 'comment', label: 'Comment', width: 280, render: (row) => row.comment ? <span className="ax-truncate" title={row.comment}>{row.comment}</span> : <span className="ax-muted">No comment</span> },
      { key: 'tripPublicId', label: 'Ride', width: 150, render: (row) => <RecordLink onOpen={() => open('trip', row.tripId)}><span className="ax-mono">{row.tripPublicId}</span></RecordLink> },
      { key: 'isVisible', label: 'Members see it', width: 150, render: (row) => row.isVisible ? <Badge tone="neutral">Visible</Badge> : <Badge tone="warning" title={`Visible from ${formatDateTime(row.visibleAt)}`}>From {relativeTime(row.visibleAt, now).replace('in ', '')}</Badge>, csv: (row) => (row.isVisible ? 'Visible' : `From ${row.visibleAt}`) },
    ],
  },
  vehicles: {
    label: 'Vehicles',
    endpoint: '/admin/vehicles',
    liveKeys: ['vehicles', 'trips'],
    detailKind: null,
    searchPlaceholder: 'Registration, make, model, owner name, or mobile',
    defaultSort: { key: 'createdAt', order: 'desc' },
    filters: [
      { type: 'select', key: 'source', label: 'Show', options: [{ value: 'manual', label: 'Awaiting recheck (added by hand)' }, { value: 'provider', label: 'Checked by the RC provider' }], primary: true, anyLabel: 'All vehicles' },
      internalToggle,
      { type: 'select', key: 'verificationStatus', label: 'Check result', options: statusOptions(['VERIFIED', 'PENDING', 'REJECTED', 'FAILED', 'EXPIRED']) },
      { type: 'select', key: 'status', label: 'Vehicle', options: [{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Removed by the member' }] },
      { type: 'dateRange', key: 'added', label: 'Added', fromKey: 'addedFrom', toKey: 'addedTo' },
    ],
    presets: [
      { label: 'Awaiting recheck', filters: { source: 'manual', status: 'ACTIVE' } },
      { label: 'Rejected', filters: { verificationStatus: 'REJECTED' } },
      { label: 'Check pending', filters: { verificationStatus: 'PENDING' } },
      { label: 'Added this week', filters: { addedFrom: weekAgo } },
    ],
    toParams: (filters) => ({
      query: filters.query,
      source: filters.source,
      verificationStatus: filters.verificationStatus,
      status: filters.status,
      internal: filters.internal,
      ...dateParams(filters, 'addedFrom', 'addedTo', 'createdFrom', 'createdTo'),
    }),
    columns: ({ now, open }) => [
      { key: 'registrationNumber', label: 'Registration', width: 150, locked: true, sortKey: 'registrationNumber', defaultOrder: 'asc', render: (row) => <Mono value={row.registrationNumber} /> },
      { key: 'vehicle', label: 'Vehicle', width: 230, render: (row) => <span><strong>{row.make} {row.model}</strong>{row.color ? <span className="ax-muted"> · {row.color}</span> : null}</span>, csv: (row) => `${row.make} ${row.model}` },
      { key: 'memberName', label: 'Owner', width: 170, verified: (row) => row.memberVerified, render: (row) => <><RecordLink onOpen={() => open('member', row.memberId)}>{display(row.memberName)}</RecordLink><VerifiedMark show={row.memberVerified} /><InternalTag show={row.isInternal} /></>, csv: (row) => row.memberName },
      { key: 'verificationStatus', label: 'Check', width: 190, render: (row) => <span className="ax-badge-row"><Badge value={row.verificationStatus} />{row.isManual ? <Badge tone="warning" dot={false}>Added by hand</Badge> : null}</span>, csv: (row) => `${row.verificationStatus}${row.isManual ? ' (manual)' : ''}` },
      { key: 'checkedAt', label: 'Last check', width: 170, sortKey: 'checkedAt', render: (row) => <When value={row.checkedAt} now={now} />, csv: (row) => row.checkedAt },
      { key: 'rcStatus', label: 'Check detail', width: 170, defaultHidden: true, render: (row) => row.rcStatus ? <span className="ax-mono ax-small">{row.rcStatus}</span> : <span className="ax-muted">—</span> },
      { key: 'vehicleType', label: 'Type', width: 140, render: (row) => <span className="ax-muted">{statusLabel(row.vehicleType)} · {statusLabel(row.fuelType)}</span> },
      { key: 'seatsTotal', label: 'Seats', width: 80, align: 'end' },
      { key: 'rideCount', label: 'Rides', width: 80, align: 'end', sortKey: 'rideCount', render: (row) => formatNumber(row.rideCount) },
      { key: 'status', label: 'Vehicle', width: 110, render: (row) => row.status === 'ACTIVE' ? <Badge value="ACTIVE" /> : <Badge tone="neutral">Removed</Badge>, csv: (row) => row.status },
      { key: 'isCommercial', label: 'Commercial', width: 110, defaultHidden: true, render: (row) => (row.isCommercial ? 'Yes' : 'No') },
      { key: 'createdAt', label: 'Added', width: 170, sortKey: 'createdAt', render: (row) => <When value={row.createdAt} now={now} />, csv: (row) => row.createdAt },
    ],
  },
  sends: {
    label: 'Sent notifications',
    endpoint: '/admin/notifications/sends',
    liveKeys: ['audit'],
    detailKind: 'send',
    search: false,
    defaultSort: null,
    filters: [],
    presets: [],
    toParams: () => ({}),
    columns: ({ now }) => [
      { key: 'createdAt', label: 'Sent', width: 170, render: (row) => <When value={row.createdAt} now={now} />, csv: (row) => row.createdAt },
      { key: 'title', label: 'Title', width: 260, locked: true, render: (row) => <strong className="ax-truncate" title={row.title}>{display(row.title)}</strong> },
      { key: 'kind', label: 'Type', width: 100, render: (row) => <Badge tone="neutral" dot={false}>{row.kind === 'OFFER' ? 'Offer' : 'Update'}</Badge>, csv: (row) => (row.kind === 'OFFER' ? 'Offer' : 'Update') },
      { key: 'audience', label: 'Audience', width: 240, render: (row) => <SendAudience row={row} />, csv: (row) => (row.audience === 'filters' ? `Filtered: ${filterSummary(row.filters)}` : 'Specific members') },
      { key: 'recipientCount', label: 'Recipients', width: 110, align: 'end', render: (row) => formatNumber(row.recipientCount) },
      { key: 'push', label: 'Delivery', width: 110, render: (row) => (row.push === false ? 'In-app only' : 'Push'), csv: (row) => (row.push === false ? 'In-app only' : 'Push') },
      { key: 'sent', label: 'Push sent', width: 100, align: 'end', render: (row) => (row.push === false ? <span className="ax-muted">—</span> : formatNumber(row.stats?.sent)), csv: (row) => row.stats?.sent },
      { key: 'failed', label: 'Failed', width: 90, align: 'end', render: (row) => (row.stats?.failed ? <span className="ax-text-danger">{formatNumber(row.stats.failed)}</span> : <span className="ax-muted">0</span>), csv: (row) => row.stats?.failed },
      { key: 'read', label: 'Read', width: 110, align: 'end', render: (row) => <ReadRate stats={row.stats} />, csv: (row) => row.stats?.read },
      { key: 'adminUsername', label: 'Sent by', width: 190, render: (row) => <span className="ax-truncate">{display(row.adminUsername)}</span> },
      { key: 'expiresAt', label: 'Expires', width: 150, defaultHidden: true, render: (row) => (row.expiresAt ? formatDateTime(row.expiresAt) : <span className="ax-muted">Never</span>), csv: (row) => row.expiresAt },
    ],
  },
  audit: {
    label: 'Audit log',
    endpoint: '/admin/audit',
    liveKeys: ['audit'],
    detailKind: 'audit',
    search: false,
    defaultSort: { key: 'createdAt', order: 'desc' },
    filters: [
      { type: 'select', key: 'action', label: 'Action', options: Object.keys(AUDIT_ACTION_LABELS).map((value) => ({ value, label: auditActionLabel(value) })), primary: true, anyLabel: 'All actions' },
      { type: 'select', key: 'adminUserId', label: 'Admin', options: [], dynamic: 'admins' },
      { type: 'select', key: 'resourceType', label: 'Record type', options: Object.entries(RESOURCE_LABELS).filter(([key]) => ['admin_user', 'support_ticket', 'notification_event', 'user', 'trip'].includes(key)).map(([value, label]) => ({ value, label })) },
      { type: 'dateRange', key: 'created', label: 'Date', fromKey: 'from', toKey: 'to' },
      { type: 'text', key: 'resourceId', label: 'Record ID', placeholder: 'Exact ID' },
    ],
    presets: [
      { label: 'Today', filters: { from: today, to: today } },
      { label: 'Notifications sent', filters: { action: 'NOTIFICATION_PUBLISHED' } },
      { label: 'Support replies', filters: { action: 'SUPPORT_TICKET_REPLIED' } },
      { label: 'Suspensions', filters: { action: 'MEMBER_SUSPENDED' } },
      { label: 'Cancelled rides', filters: { action: 'TRIP_CANCELLED_BY_ADMIN' } },
      { label: 'Sign-ins', filters: { action: 'ADMIN_LOGIN' } },
    ],
    toParams: (filters, sort) => ({
      action: filters.action,
      adminUserId: filters.adminUserId,
      resourceType: filters.resourceType,
      resourceId: filters.resourceId,
      ...dateParams(filters, 'from', 'to', 'createdFrom', 'createdTo'),
      order: sort?.order,
      sort: undefined,
    }),
    columns: ({ now, open }) => [
      { key: 'createdAt', label: 'Time', width: 170, sortKey: 'createdAt', render: (row) => <When value={row.createdAt} now={now} />, csv: (row) => row.createdAt },
      { key: 'adminUsername', label: 'Admin', width: 200, render: (row) => <span className="ax-truncate">{display(row.adminUsername)}</span> },
      { key: 'action', label: 'Action', width: 210, render: (row) => <strong>{auditActionLabel(row.action)}</strong>, csv: (row) => row.action, text: (row) => auditActionLabel(row.action) },
      { key: 'resource', label: 'Record', width: 220, render: (row) => <AuditResource row={row} open={open} />, csv: (row) => `${row.resourceType}:${row.resourceId || ''}` },
      { key: 'reason', label: 'Reason or details', width: 260, render: (row) => <span className="ax-truncate">{auditDetails(row)}</span>, csv: (row) => auditDetails(row) },
      { key: 'ipAddress', label: 'IP address', width: 140, defaultHidden: true, render: (row) => <span className="ax-mono ax-small">{display(row.ipAddress)}</span> },
    ],
  },
};

export function auditDetails(row) {
  if (row.reason) return row.reason;
  const meta = row.metadata || {};
  if (row.action === 'NOTIFICATION_PUBLISHED') return `${formatNumber(meta.recipientCount)} recipients · ${statusLabel(meta.kind)}${meta.push === false ? ' · in-app only' : ' · push'}${meta.audience ? (meta.audience === 'members' ? ' · specific' : ' · filtered') : ''}`;
  return '—';
}

function AuditResource({ row, open }) {
  const label = RESOURCE_LABELS[row.resourceType] || statusLabel(row.resourceType);
  const kind = { support_ticket: 'support', user: 'member', trip: 'trip' }[row.resourceType];
  const openable = kind && row.resourceId;
  return (
    <span className="ax-resource">
      <span className="ax-muted">{label}</span>
      {row.resourceId ? (openable
        ? <RecordLink onOpen={() => open(kind, row.resourceId)}><span className="ax-mono ax-small">{row.resourceId.slice(0, 8)}…</span></RecordLink>
        : <span className="ax-mono ax-small" title={row.resourceId}>{row.resourceId.length > 18 ? `${row.resourceId.slice(0, 16)}…` : row.resourceId}</span>) : null}
    </span>
  );
}

/** Filtered or specific audience, with the filter summary. */
export function SendAudience({ row }) {
  if (row.audience !== 'filters') return <span className="ax-muted">Specific members</span>;
  const summary = filterSummary(row.filters);
  return <span className="ax-truncate" title={summary}><Badge tone="info" dot={false}>Filtered</Badge> <span className="ax-muted">{summary}</span></span>;
}

function ReadRate({ stats }) {
  if (!stats?.total) return <span className="ax-muted">—</span>;
  return <span title={`${formatNumber(stats.read)} of ${formatNumber(stats.total)} read`}>{formatNumber(stats.read)} <span className="ax-muted">· {Math.round((stats.read / stats.total) * 100)}%</span></span>;
}
