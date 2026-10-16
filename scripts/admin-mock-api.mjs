// Local mock of the Fluxgo admin API for visual previews of /admin-portal.
// All data is made up. It uses no real members, credentials, or database.
// Run: npm run dev:admin-mock  (API on http://localhost:4010, sign in with preview@fluxgo.in / preview-password)
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.ADMIN_MOCK_PORT || 4010);
const ORIGIN = process.env.ADMIN_MOCK_ORIGIN || 'http://localhost:3000';
const COOKIE = 'fluxgo_admin_session';
const LOGIN = { email: 'preview@fluxgo.in', password: 'preview-password' };

let seed = 42;
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = (list) => list[Math.floor(rand() * list.length)];
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
const now = Date.now();
const minutes = (value) => value * 60_000;
const iso = (offsetMs) => new Date(now + offsetMs).toISOString();
const ref = (prefix) => `${prefix}${Array.from({ length: 10 }, () => pick('ABCDEFGHJKMNPQRSTUVWXYZ23456789'.split(''))).join('')}`;

const FIRST = ['Aarav', 'Diya', 'Rohan', 'Ananya', 'Vikram', 'Sneha', 'Karthik', 'Priya', 'Arjun', 'Meera', 'Rahul', 'Kavya', 'Siddharth', 'Neha', 'Aditya', 'Pooja', 'Varun', 'Ishita', 'Nikhil', 'Lakshmi', 'Harsha', 'Divya', 'Manoj', 'Swathi'];
const LAST = ['Reddy', 'Sharma', 'Iyer', 'Rao', 'Nair', 'Gupta', 'Patel', 'Menon', 'Kumar', 'Varma', 'Naidu', 'Das', 'Joshi', 'Pillai'];
const PLACES = [
  ['Gachibowli', 'Hyderabad'], ['HITEC City', 'Hyderabad'], ['Kondapur', 'Hyderabad'], ['Madhapur', 'Hyderabad'],
  ['Whitefield', 'Bengaluru'], ['Electronic City', 'Bengaluru'], ['Koramangala', 'Bengaluru'], ['Manyata Tech Park', 'Bengaluru'],
  ['Vijayawada Bus Stand', 'Vijayawada'], ['Guntur', 'Guntur'], ['Tirupati', 'Tirupati'], ['Warangal', 'Warangal'],
];
const VEHICLES = [['Maruti Suzuki', 'Swift'], ['Hyundai', 'Creta'], ['Tata', 'Nexon'], ['Honda', 'City'], ['Mahindra', 'XUV700'], ['Kia', 'Seltos'], ['Toyota', 'Innova Crysta']];
const ISSUES = ['NO_SHOW', 'LATE_ARRIVAL', 'RASH_DRIVING', 'PRIVACY_CONCERN', 'DISRESPECTFUL_OR_ABUSIVE_BEHAVIOUR', 'DIFFERENT_DROP_LOCATION', 'VEHICLE_OR_SEAT_NOT_AS_PROMISED', 'UNSAFE_VEHICLE_CONDITION', 'DID_NOT_PICK_UP_CALL', 'POOR_DRIVING_SKILLS'];
const SAFETY = new Set(['RASH_DRIVING', 'POOR_DRIVING_SKILLS', 'UNSAFE_VEHICLE_CONDITION', 'DISRESPECTFUL_OR_ABUSIVE_BEHAVIOUR', 'PRIVACY_CONCERN', 'POST_RIDE_MEETUP_CONTACT', 'LATE_NIGHT_DIFFICULTY', 'ASKED_TO_GET_DOWN_LOW_BOOKING']);

const admins = [
  { id: randomUUID(), username: 'preview@fluxgo.in', email: 'preview@fluxgo.in', role: 'SUPER_ADMIN', status: 'ACTIVE', passwordChangedAt: iso(-minutes(60 * 24 * 20)), createdAt: iso(-minutes(60 * 24 * 90)), updatedAt: iso(-minutes(600)) },
  { id: randomUUID(), username: 'ops@fluxgo.in', email: 'ops@fluxgo.in', role: 'SUPER_ADMIN', status: 'ACTIVE', passwordChangedAt: iso(-minutes(60 * 24 * 5)), createdAt: iso(-minutes(60 * 24 * 40)), updatedAt: iso(-minutes(900)) },
  { id: randomUUID(), username: 'admin', email: null, role: 'SUPER_ADMIN', status: 'ACTIVE', passwordChangedAt: iso(-minutes(60 * 24 * 120)), createdAt: iso(-minutes(60 * 24 * 120)), updatedAt: iso(-minutes(60 * 24 * 120)) },
];

const members = Array.from({ length: 64 }, (_, index) => {
  const first = pick(FIRST);
  const last = pick(LAST);
  const created = -minutes(int(20, 60 * 24 * 60));
  return {
    id: randomUUID(), name: `${first} ${last}`, firstName: first, lastName: last,
    mobile: `+91 ${int(70000, 99999)} ${int(10000, 99999)}`,
    personalEmail: rand() > 0.25 ? `${first.toLowerCase()}.${last.toLowerCase()}${index}@gmail.com` : null,
    status: index === 7 ? 'SUSPENDED' : index === 13 ? 'DELETED' : 'ACTIVE',
    createdAt: iso(created), updatedAt: iso(created / 3),
    workEmailStatus: rand() > 0.3 ? pick(['VERIFIED', 'VERIFIED', 'VERIFIED', 'PENDING']) : null,
    personalEmailStatus: rand() > 0.4 ? 'VERIFIED' : null,
    vehicleCount: 0, tripCount: 0,
    authProvider: 'MSG91', onboardingIntent: rand() > 0.6 ? 'PUBLISH_RIDE' : 'TAKE_RIDE', gender: pick(['MALE', 'FEMALE']), dob: `199${int(0, 9)}-0${int(1, 9)}-1${int(0, 9)}`,
    vehicles: [],
    isInternal: index === 2 || index === 5,
    onboardingStep: index % 9 === 4 ? pick(['SOURCE', 'PROFILE', 'WORK_EMAIL', 'EMERGENCY_CONTACT', 'VEHICLE']) : 'COMPLETE',
  };
});
members.forEach((member) => { member.onboardingCompleted = member.onboardingStep === 'COMPLETE'; });
// Most members who finished onboarding added a trusted contact. The detail sends only the last 4 digits.
members.forEach((member, index) => {
  member.trustedContactFull = member.onboardingStep === 'COMPLETE' && index % 6 !== 1
    ? { name: `${pick(FIRST)} ${member.lastName}`, relationship: pick(['PARENT', 'PARTNER', 'SIBLING', 'FRIEND', 'OTHER']), phone: `+91 ${int(70000, 99999)} ${int(10000, 99999)}`, updatedAt: member.createdAt }
    : null;
});
// About 1 in 3 members have a profile photo. The mock serves them itself. Member 3 has a broken URL to test the initials fallback.
members.forEach((member, index) => {
  member.profilePhotoUrl = index === 3 ? `http://localhost:${PORT}/mock-photos/missing-${index}.svg` : index % 3 === 0 ? `http://localhost:${PORT}/mock-photos/${index}.svg` : null;
});
const PHOTO_COLORS = [['#0f766e', '#99f6e4'], ['#7c3aed', '#ddd6fe'], ['#b45309', '#fde68a'], ['#be123c', '#fecdd3'], ['#1d4ed8', '#bfdbfe'], ['#15803d', '#bbf7d0']];
function mockPhoto(n) {
  const [dark, light] = PHOTO_COLORS[Math.floor(n / 3) % PHOTO_COLORS.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="${light}"/><circle cx="48" cy="38" r="18" fill="${dark}"/><path d="M14 96c4-22 18-32 34-32s30 10 34 32z" fill="${dark}"/></svg>`;
}
const internalIds = () => new Set(members.filter((member) => member.isInternal).map((member) => member.id));
/** Apply the internal scope: exclude (default), include, or only. */
function scoped(list, params, involved) {
  const scope = params.get('internal') || 'exclude';
  if (scope === 'include') return list;
  const ids = internalIds();
  return list.filter((item) => (scope === 'only') === involved(item, ids));
}
const tripInternal = (trip, ids) => ids.has(trip.driverUserId);
const bookingInternal = (booking, ids) => ids.has(booking.bookedByUserId) || ids.has(booking.driverUserId);
const drivers = members.filter((member) => member.onboardingIntent === 'PUBLISH_RIDE' && member.status === 'ACTIVE');
drivers.forEach((driver) => {
  const [make, model] = pick(VEHICLES);
  driver.vehicles.push({ id: randomUUID(), registrationNumber: `TS0${int(1, 9)}${pick(['EA', 'FB', 'GK'])}${int(1000, 9999)}`, make, model, shortName: null, color: pick(['White', 'Grey', 'Red', 'Blue', 'Black']), vehicleType: 'CAR', fuelType: pick(['PETROL', 'DIESEL', 'CNG']), seatsTotal: 4, status: 'ACTIVE', verificationStatus: rand() > 0.15 ? 'VERIFIED' : 'PENDING', isCommercial: false, rcStatus: 'ACTIVE', checkedAt: driver.createdAt, verificationProvider: rand() > 0.2 ? 'surepass' : 'manual' });
  driver.vehicleCount = 1;
});

const trips = Array.from({ length: 46 }, (_, index) => {
  const driver = drivers[index % drivers.length];
  let from = pick(PLACES); let to = pick(PLACES);
  while (to === from) to = pick(PLACES);
  const departure = index < 3 ? minutes(int(15, 110)) : index < 6 ? -minutes(int(20, 90)) : minutes(int(-60 * 24 * 10, 60 * 24 * 6));
  const status = index < 3 ? 'PUBLISHED' : index < 6 ? 'IN_PROGRESS' : departure < 0 ? (rand() > 0.15 ? 'COMPLETED' : 'CANCELLED') : 'PUBLISHED';
  const seatsTotal = 4;
  driver.tripCount += 1;
  return {
    id: randomUUID(), publicId: ref('TR'), driverUserId: driver.id, driverName: driver.name,
    origin: from[0], destination: to[0], originLabel: from[0], originCity: from[1], destinationLabel: to[0], destinationCity: to[1],
    departureAt: iso(departure), departureDate: iso(departure).slice(0, 10), status, seatsTotal, seatsAvailable: seatsTotal,
    bookingMode: rand() > 0.5 ? 'INSTANT' : 'REQUEST', pricePerSeat: pick([180, 220, 250, 320, 450, 650, 850]), bookingCount: 0,
    createdAt: iso(departure - minutes(60 * 24 * int(1, 4))), updatedAt: iso(departure - minutes(600)),
    vehicleId: driver.vehicles[0]?.id, vehicle: driver.vehicles[0] ? { registrationNumber: driver.vehicles[0].registrationNumber, make: driver.vehicles[0].make, model: driver.vehicles[0].model, status: 'ACTIVE', verificationStatus: driver.vehicles[0].verificationStatus } : null,
    cancellationReason: status === 'CANCELLED' ? 'DRIVER_PLAN_CHANGED' : null, completedAt: status === 'COMPLETED' ? iso(departure + minutes(180)) : null,
  };
});

const bookings = [];
trips.forEach((trip) => {
  const count = int(0, 3);
  for (let index = 0; index < count; index += 1) {
    const booker = pick(members.filter((member) => member.id !== trip.driverUserId && member.status === 'ACTIVE'));
    const passengerCount = int(1, 2);
    if (trip.seatsAvailable < passengerCount) break;
    const status = trip.status === 'COMPLETED' ? 'COMPLETED' : trip.status === 'CANCELLED' ? 'CANCELLED_BY_DRIVER' : trip.status === 'IN_PROGRESS' ? 'IN_RIDE' : trip.bookingMode === 'REQUEST' && rand() > 0.5 ? 'REQUESTED' : 'CONFIRMED';
    if (status !== 'REQUESTED') trip.seatsAvailable -= passengerCount;
    trip.bookingCount += 1;
    const created = Math.min(Date.parse(trip.departureAt) - now - minutes(60), -minutes(int(10, 60 * 24 * 3)));
    bookings.push({
      id: randomUUID(), publicId: ref('BK'), tripId: trip.id, tripPublicId: trip.publicId, route: `${trip.originCity} to ${trip.destinationCity}`,
      bookedByUserId: booker.id, bookedByName: booker.name, passengerCount, status, totalPrice: trip.pricePerSeat * passengerCount, paymentStatus: 'NOT_REQUIRED',
      tripDepartureAt: trip.departureAt, driverUserId: trip.driverUserId, createdAt: iso(created), updatedAt: iso(created / 2),
      bookerTravels: true, seatPreference: 'ANY', pickup: { label: trip.originLabel, city: trip.originCity, address: `${trip.originLabel} main road` }, drop: { label: trip.destinationLabel, city: trip.destinationCity, address: null },
      luggageCount: int(0, 2), luggageSize: 'SMALL', noteToDriver: rand() > 0.7 ? 'I will wait near the metro gate.' : null, pricePerSeat: trip.pricePerSeat, currency: 'INR',
      passengers: [{ id: randomUUID(), userId: booker.id, name: booker.name, ageBucket: 'ADULT', gender: booker.gender }],
      events: [{ id: randomUUID(), fromStatus: null, toStatus: 'REQUESTED', actorUserId: booker.id, actorRole: 'PASSENGER', occurredAt: iso(created) }, ...(status !== 'REQUESTED' ? [{ id: randomUUID(), fromStatus: 'REQUESTED', toStatus: status === 'IN_RIDE' || status === 'COMPLETED' ? 'CONFIRMED' : status, actorUserId: trip.driverUserId, actorRole: 'DRIVER', occurredAt: iso(created + minutes(12)) }] : [])],
    });
  }
});

// Audience fields for notification filters. A separate random sequence keeps the other mock data the same.
let audienceSeed = 7;
const arand = () => { audienceSeed = (audienceSeed * 16807) % 2147483647; return (audienceSeed - 1) / 2147483646; };
const apick = (list) => list[Math.floor(arand() * list.length)];
const SOURCES = ['FRIEND_FAMILY', 'FRIEND_FAMILY', 'COLLEAGUE', 'COLLEAGUE', 'INSTAGRAM', 'WHATSAPP', 'YOUTUBE', 'LINKEDIN', 'GOOGLE_SEARCH', 'APP_STORE', 'OTHER', 'SKIPPED', null];
const DAY_MS = minutes(60 * 24);
members.forEach((member) => {
  const roll = arand();
  member.audienceGender = roll < 0.06 ? null : roll < 0.1 ? 'NON_BINARY' : member.gender === 'FEMALE' ? 'WOMAN' : 'MAN';
  member.acquisitionSource = member.onboardingStep === 'SOURCE' ? null : apick(SOURCES);
  const activity = arand();
  const age = now - Date.parse(member.createdAt);
  member.lastActiveAt = activity < 0.08 ? null : iso(-Math.min(age, Math.floor((activity < 0.55 ? arand() * 6 : activity < 0.8 ? 7 + arand() * 25 : 30 + arand() * 70) * DAY_MS)));
  const since = now - 90 * DAY_MS;
  const driven = trips.filter((trip) => trip.driverUserId === member.id);
  const booked = bookings.filter((booking) => booking.bookedByUserId === member.id);
  member.driverRidesCompleted = driven.filter((trip) => trip.status === 'COMPLETED').length;
  member.passengerRidesCompleted = booked.filter((booking) => booking.status === 'COMPLETED').length;
  const cities = new Set();
  driven.filter((trip) => Date.parse(trip.departureAt) >= since && trip.status !== 'CANCELLED').forEach((trip) => { cities.add(trip.originCity); cities.add(trip.destinationCity); });
  booked.filter((booking) => Date.parse(booking.tripDepartureAt) >= since && !booking.status.startsWith('CANCELLED')).forEach((booking) => { cities.add(booking.pickup.city); cities.add(booking.drop.city); });
  member.rideCities = [...cities];
});

/** Check one member against the members list filters. Returns an error text for a bad combination. */
function audienceError(params) {
  if (params.get('lastActiveWithinDays') && params.get('inactiveForDays')) return 'Use lastActiveWithinDays or inactiveForDays, not both.';
  for (const key of ['lastActiveWithinDays', 'inactiveForDays']) {
    const value = params.get(key);
    if (value && !(Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 365)) return `${key} must be 1 to 365.`;
  }
  return null;
}
function memberMatches(member, params) {
  const get = (key) => params.get(key);
  if (!text(get('query'), member.name, member.mobile, member.personalEmail, member.id)) return false;
  if (get('status') === 'NOT_DELETED' ? member.status === 'DELETED' : get('status') && member.status !== get('status')) return false;
  if (get('onboardingStep') && member.onboardingStep !== get('onboardingStep')) return false;
  if (get('onboardingCompleted') && member.onboardingCompleted !== (get('onboardingCompleted') === 'true')) return false;
  if (get('workEmailStatus') && (get('workEmailStatus') === 'NONE' ? member.workEmailStatus : member.workEmailStatus !== get('workEmailStatus'))) return false;
  if (get('hasVehicle') && (member.vehicleCount > 0) !== (get('hasVehicle') === 'true')) return false;
  if (get('intent') && member.onboardingIntent !== get('intent')) return false;
  if (!within(member.createdAt, get('createdFrom'), get('createdTo'))) return false;
  if (get('gender') && (get('gender') === 'NONE' ? member.audienceGender : member.audienceGender !== get('gender'))) return false;
  if (get('acquisitionSource') && (get('acquisitionSource') === 'NONE' ? member.acquisitionSource : member.acquisitionSource !== get('acquisitionSource'))) return false;
  if (get('hasPhoto') && Boolean(member.profilePhotoUrl) !== (get('hasPhoto') === 'true')) return false;
  const lastActive = member.lastActiveAt ? Date.parse(member.lastActiveAt) : null;
  if (get('lastActiveWithinDays') && !(lastActive && lastActive >= now - Number(get('lastActiveWithinDays')) * DAY_MS)) return false;
  if (get('inactiveForDays') && lastActive && lastActive >= now - Number(get('inactiveForDays')) * DAY_MS) return false;
  if (get('driverRides') && (member.driverRidesCompleted > 0) !== (get('driverRides') === 'ANY')) return false;
  if (get('passengerRides') && (member.passengerRidesCompleted > 0) !== (get('passengerRides') === 'ANY')) return false;
  if (get('city') && !member.rideCities.some((city) => city.toLowerCase().includes(get('city').toLowerCase()))) return false;
  return true;
}

const SUBJECTS = ['Driver did not arrive at pickup', 'Refund for cancelled ride', 'Cannot verify my work email', 'Change pickup point', 'App shows wrong departure time', 'Driver asked for extra money', 'Vehicle number does not match', 'How do I publish a ride?', 'Booking request not accepted', 'Report a passenger'];
const tickets = Array.from({ length: 16 }, (_, index) => {
  const requester = members[(index * 5 + 3) % members.length];
  const status = index < 10 ? 'OPEN' : 'CLOSED';
  const created = -minutes(int(30, 60 * 24 * 4));
  const messages = [{ id: randomUUID(), senderUserId: null, senderAdminUserId: null, senderRole: 'SUPPORT', text: 'Thanks for contacting Fluxgo support. A team member will reply here soon.', createdAt: iso(created) },
    { id: randomUUID(), senderUserId: requester.id, senderAdminUserId: null, senderRole: 'REQUESTER', text: `Hi, ${SUBJECTS[index % SUBJECTS.length].toLowerCase()}. Can you please help? Booking ${pick(bookings).publicId}.`, createdAt: iso(created + minutes(1)) }];
  if (index % 3 === 0 || status === 'CLOSED') messages.push({ id: randomUUID(), senderUserId: null, senderAdminUserId: admins[1].id, senderRole: 'SUPPORT', text: `Hi ${requester.firstName}, I am checking this with the driver now.`, createdAt: iso(created + minutes(25)) });
  if (index % 3 === 0 && index < 10 && index !== 0) messages.push({ id: randomUUID(), senderUserId: requester.id, senderAdminUserId: null, senderRole: 'REQUESTER', text: 'Thank you. Any update?', createdAt: iso(-minutes(int(15, 200))) });
  const last = messages[messages.length - 1];
  return { assignedAdminUserId: index % 4 === 1 ? admins[1].id : null, assignedAdminName: index % 4 === 1 ? admins[1].email : null, notes: index === 2 ? [{ id: randomUUID(), adminUserId: admins[1].id, adminName: admins[1].email, text: 'Called the driver. He will refund the extra amount by Friday.', createdAt: iso(-minutes(90)) }] : [], id: randomUUID(), publicId: ref('SP'), requesterUserId: requester.id, requesterName: requester.name, requesterPhotoUrl: requester.profilePhotoUrl, requesterEmail: requester.personalEmail, requesterMobile: requester.mobile, assignedAgentUserId: null, subject: SUBJECTS[index % SUBJECTS.length], category: pick(['RIDE', 'BOOKING', 'ACCOUNT', 'GENERAL']), status, createdAt: iso(created), updatedAt: last.createdAt, closedAt: status === 'CLOSED' ? last.createdAt : null, messages };
});

const reviews = bookings.filter((booking) => booking.status === 'COMPLETED').slice(0, 30).map((booking, index) => {
  const trip = trips.find((item) => item.id === booking.tripId);
  const passengerReview = index % 2 === 0;
  const issueCount = index % 3 === 0 ? int(1, 3) : index % 5 === 0 ? 1 : 0;
  const issueCodes = Array.from(new Set(Array.from({ length: issueCount }, () => pick(ISSUES))));
  const submitted = Date.parse(trip.completedAt) - now + minutes(int(30, 600));
  const rating = issueCodes.length ? int(1, 3) : int(4, 5);
  return {
    id: randomUUID(), bookingId: booking.id, bookingPublicId: booking.publicId, tripId: trip.id, tripPublicId: trip.publicId,
    direction: passengerReview ? 'PASSENGER_TO_DRIVER' : 'DRIVER_TO_PASSENGER', rating, comment: issueCodes.length ? pick(['The driver was on the phone the whole ride and drove too fast.', 'Waited 25 minutes at the pickup point.', 'Asked me to get down before my drop.', 'Rude when I asked to close the window.']) : rand() > 0.5 ? 'Smooth ride, on time.' : null,
    issueCodes, highlightCodes: issueCodes.length ? [] : ['PUNCTUAL'], hasSafetyIssue: issueCodes.some((code) => SAFETY.has(code)),
    reviewerUserId: passengerReview ? booking.bookedByUserId : trip.driverUserId, reviewerName: passengerReview ? booking.bookedByName : trip.driverName,
    revieweeUserId: passengerReview ? trip.driverUserId : booking.bookedByUserId, revieweeName: passengerReview ? trip.driverName : booking.bookedByName,
    submittedAt: iso(submitted), visibleAt: iso(submitted + minutes(60 * 24 * int(1, 9))), isVisible: false,
  };
}).map((review) => ({ ...review, isVisible: Date.parse(review.visibleAt) <= now }));

const manualVehicles = drivers.filter((driver) => driver.vehicles[0]?.verificationProvider === 'manual').map((driver) => ({
  manualVerificationId: randomUUID(), memberId: driver.id, memberName: driver.name, registrationNumber: driver.vehicles[0].registrationNumber, make: driver.vehicles[0].make, model: driver.vehicles[0].model, color: driver.vehicles[0].color, vehicleType: 'CAR', fuelType: driver.vehicles[0].fuelType, seats: 4,
  enteredAt: driver.createdAt, lastRecheckAt: iso(-minutes(int(30, 360))), lastRecheckResult: pick(['RECHECK_NOT_FOUND', 'RECHECK_PROVIDER_TIMEOUT', null]), vehicleId: driver.vehicles[0].id, state: rand() > 0.3 ? 'AWAITING_RECHECK' : 'CONFIRMED', currentProvider: 'manual',
}));

const audit = [];
const addAudit = (adminUser, action, resourceType, resourceId, offset, extra = {}) => audit.push({ id: randomUUID(), adminUserId: adminUser.id, adminUsername: adminUser.email || adminUser.username, action, resourceType, resourceId, reason: extra.reason || null, metadata: extra.metadata || {}, ipAddress: '203.0.113.24', userAgent: 'Mozilla/5.0 (Macintosh) Preview', createdAt: iso(offset) });
for (let index = 0; index < 34; index += 1) {
  const who = pick(admins.slice(0, 2));
  const kind = pick(['ADMIN_LOGIN', 'SUPPORT_TICKET_REPLIED', 'SUPPORT_TICKET_REPLIED', 'SUPPORT_TICKET_CLOSED', 'NOTIFICATION_PUBLISHED']);
  const ticket = pick(tickets);
  if (kind === 'ADMIN_LOGIN') addAudit(who, kind, 'admin_user', who.id, -minutes(int(5, 60 * 24 * 6)));
  else if (kind === 'NOTIFICATION_PUBLISHED') addAudit(who, kind, 'notification_event', `portal-${index}`, -minutes(int(60, 60 * 24 * 6)), { metadata: { category: 'UPDATES', kind: pick(['ANNOUNCEMENT', 'OFFER']), recipientCount: int(1, 64), push: rand() > 0.3 } });
  else addAudit(who, kind, 'support_ticket', ticket.id, -minutes(int(5, 60 * 24 * 6)), { reason: kind === 'SUPPORT_TICKET_CLOSED' ? 'Resolved on a call' : null });
}
audit.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

// Notification sends and their recipients.
const sends = [];
const FAIL_REASONS = ['Device token is not registered', 'APNs: BadDeviceToken', 'FCM: sender ID mismatch', 'Push provider timed out'];
function recordSend({ eventKey, category, kind, title, body, data, push, expiresAt, audience, filters, adminUser, createdAt, recipientIds, fresh = false }) {
  const age = now - Date.parse(createdAt);
  const send = {
    id: randomUUID(), eventKey, category, kind, title, body, data: data || {}, push: push !== false, expiresAt: expiresAt || null, audience, filters: filters || null,
    adminUserId: adminUser.id, adminUsername: adminUser.email || adminUser.username, createdAt,
    recipients: recipientIds.map((userId) => {
      const roll = arand();
      let delivery = 'IN_APP_ONLY';
      let deliveryError = null;
      if (push !== false) {
        if (fresh) delivery = roll < 0.12 ? 'QUEUED' : roll < 0.18 ? 'SENDING' : roll < 0.24 ? 'FAILED' : roll < 0.3 ? 'SUPPRESSED' : 'SENT';
        else delivery = roll < 0.1 ? 'FAILED' : roll < 0.14 ? 'RETRYABLE' : roll < 0.2 ? 'SUPPRESSED' : 'SENT';
        if (delivery === 'FAILED' || delivery === 'RETRYABLE') deliveryError = apick(FAIL_REASONS);
      }
      const readAt = !fresh && arand() < 0.45 ? new Date(Date.parse(createdAt) + Math.floor(arand() * Math.min(age, 2 * DAY_MS))).toISOString() : null;
      return { userId, notificationId: randomUUID(), delivery, deliveryError, readAt, createdAt };
    }),
  };
  sends.unshift(send);
  sends.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return send;
}
function sendRow(send) {
  const { recipients, data, ...row } = send;
  const count = (states) => recipients.filter((recipient) => states.includes(recipient.delivery)).length;
  return {
    ...row,
    recipientCount: recipients.length,
    stats: { total: recipients.length, sent: count(['SENT']), failed: count(['FAILED']), pending: count(['QUEUED', 'SENDING', 'RETRYABLE']), inAppOnly: count(['IN_APP_ONLY']), read: recipients.filter((recipient) => recipient.readAt).length },
  };
}
{
  const active = members.filter((member) => member.status === 'ACTIVE');
  const byFilter = (filters) => {
    const params = new URLSearchParams(Object.entries({ internal: 'include', ...filters }).map(([key, value]) => [key, String(value)]));
    params.set('status', 'ACTIVE');
    return scoped(members, params, (member, set) => set.has(member.id)).filter((member) => memberMatches(member, params)).map((member) => member.id);
  };
  const seeds = [
    { title: 'New routes from Gachibowli', body: 'Morning rides to Vijayawada now leave every day at 6:30 am. Book a seat in the app.', kind: 'ANNOUNCEMENT', push: true, filters: { city: 'Hyderabad', internal: 'include' }, days: 0.2, admin: 0 },
    { title: 'Weekend offer: 20% off your next ride', body: 'Book any ride this Saturday or Sunday and save 20%. The offer ends on Sunday at midnight.', kind: 'OFFER', push: true, filters: { gender: 'WOMAN', passengerRides: 'NONE', internal: 'exclude' }, days: 1.5, admin: 1 },
    { title: 'Finish your profile', body: 'Add your work email to get the verified badge. It takes one minute.', kind: 'ANNOUNCEMENT', push: true, filters: { onboardingCompleted: false, internal: 'include' }, days: 3, admin: 0 },
    { title: 'App update 2.4', body: 'Ride chat now shows when the driver reads your message.', kind: 'ANNOUNCEMENT', push: false, ids: active.slice(0, 4).map((member) => member.id), days: 5, admin: 1 },
    { title: 'We miss you', body: 'Your colleagues share rides every day. Open Fluxgo to see rides on your route.', kind: 'OFFER', push: true, filters: { inactiveForDays: 30, internal: 'include' }, days: 6, admin: 0 },
  ];
  seeds.forEach((item, index) => {
    const ids = item.ids || byFilter(item.filters);
    const createdAt = iso(-Math.floor(item.days * DAY_MS));
    const send = recordSend({ eventKey: `portal-seed-${index}`, category: item.kind === 'OFFER' ? 'OFFERS' : 'UPDATES', kind: item.kind, title: item.title, body: item.body, push: item.push, audience: item.ids ? 'members' : 'filters', filters: item.filters || null, adminUser: admins[item.admin], createdAt, recipientIds: ids });
    addAudit(admins[item.admin], 'NOTIFICATION_PUBLISHED', 'notification_event', send.eventKey, Date.parse(createdAt) - now, { metadata: { category: send.category, kind: send.kind, recipientCount: ids.length, push: send.push, audience: send.audience } });
  });
  audit.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

const sessions = new Set();
const pushDevices = new Map();

function trend() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now - (6 - index) * 86_400_000);
    return { day: date.toISOString().slice(0, 10), newMembers: int(1, 9), ridesPublished: int(2, 11), bookings: int(3, 18), ridesCompleted: int(1, 8) };
  });
}
const trends = trend();

// Set ADMIN_MOCK_LEGACY=1 to act like an API from before the date filter: no period, and from/to give 400.
const LEGACY = process.env.ADMIN_MOCK_LEGACY === '1';
const kolkataDay = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const shiftDay = (key, count) => { const date = new Date(`${key}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + count); return date.toISOString().slice(0, 10); };
/** Stable made-up counts for one day, so a range shows the same numbers on every load. */
function dayCounts(day) {
  let hash = 0;
  for (const char of day) hash = (hash * 31 + char.charCodeAt(0)) % 2147483647;
  const value = (max, salt) => { const x = Math.sin(hash * 0.001 + salt * 12.9898) * 43758.5453; return Math.floor((x - Math.floor(x)) * (max + 1)); };
  const partial = day === kolkataDay() ? 0.5 : 1;
  return {
    day,
    newMembers: Math.round(value(9, 1) * partial), ridesPublished: Math.round((2 + value(9, 2)) * partial),
    bookings: Math.round((3 + value(15, 3)) * partial), ridesCompleted: Math.round(value(8, 4) * partial),
    ticketsOpened: Math.round(value(3, 5) * partial), issueReports: Math.round(value(4, 6) * partial), safetyReports: Math.round(value(2, 8) * partial),
  };
}
/** Build the period block, or return an error the way the API does. */
/** Made-up Analytics data. Set ADMIN_MOCK_ANALYTICS_HISTORY=not_configured to preview partial days before tracking. */
const ANALYTICS_HISTORY = process.env.ADMIN_MOCK_ANALYTICS_HISTORY || 'posthog';
const ANALYTICS_GROUPS = ['active', 'growth', 'supply', 'demand', 'quality'];
function analyticsFor(params) {
  const today = kolkataDay();
  const to = params.get('to') || today;
  const from = params.get('from') || shiftDay(to, -29);
  const bad = (message) => [400, { error: { code: 'INVALID_REQUEST', message } }];
  if (Boolean(params.get('from')) !== Boolean(params.get('to'))) return bad('from and to must be sent together');
  if (![from, to].every((key) => /^\d{4}-\d{2}-\d{2}$/.test(key))) return bad('Use YYYY-MM-DD dates');
  if (to > today) return bad('to must not be after today in India time');
  if (from > to) return bad('from must not be after to');
  const count = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
  if (count > 366) return bad('The period must be at most 366 days');
  const groups = (params.get('groups') || ANALYTICS_GROUPS.join(',')).split(',');
  if (groups.some((group) => !ANALYTICS_GROUPS.includes(group))) return bad('Unknown group');
  const internal = params.get('internal') || 'exclude';
  // Internal members are about 1 in 12 of the activity.
  const scale = internal === 'only' ? 0.08 : internal === 'include' ? 1.08 : 1;
  const days = Array.from({ length: count }, (_, index) => shiftDay(from, index));
  const noise = (day, salt, max) => {
    let hash = 7;
    for (const char of day) hash = (hash * 31 + char.charCodeAt(0)) % 2147483647;
    const x = Math.sin(hash * 0.001 + salt * 12.9898) * 43758.5453;
    return (x - Math.floor(x)) * max;
  };
  const age = (day) => Math.max(0, (Date.parse(day) - Date.parse(shiftDay(today, -400))) / 86_400_000);
  const n = (value) => Math.max(0, Math.round(value * scale));
  const tracking = shiftDay(today, -18);
  const payload = { generatedAt: iso(0), period: { from, to, days: count }, internal };
  if (groups.includes('active')) {
    const dau = (day) => 40 + age(day) * 0.35 + noise(day, 1, 25) + (new Date(`${day}T00:00:00Z`).getUTCDay() % 6 === 0 ? 12 : 0);
    const partial = ANALYTICS_HISTORY !== 'posthog';
    payload.active = {
      trackingStartedOn: tracking,
      history: ANALYTICS_HISTORY,
      truncated: false,
      daily: days.map((day) => {
        const low = partial && shiftDay(day, -29) <= tracking ? 0.55 : 1;
        return { day, dau: n(dau(day) * low), wau: n(dau(day) * 2.9 * low), mau: n(dau(day) * 6.2 * low), partial: low < 1 };
      }),
    };
  }
  if (groups.includes('growth')) payload.growth = { daily: days.map((day) => { const signups = n(4 + noise(day, 2, 9)); return { day, signups, onboarded: Math.round(signups * (0.55 + noise(day, 3, 0.35))) }; }) };
  if (groups.includes('supply')) payload.supply = { daily: days.map((day) => {
    const ridesPublished = n(3 + noise(day, 4, 8));
    const ridesCompleted = n(2 + noise(day, 5, 6));
    const seatsOnCompleted = ridesCompleted * 3;
    const seatsFilledOnCompleted = Math.round(seatsOnCompleted * (0.4 + noise(day, 6, 0.45)));
    return { day, ridesPublished, seatsOffered: ridesPublished * 3, ridesWithBooking: Math.round(ridesPublished * (0.45 + noise(day, 7, 0.4))), ridesCancelled: Math.round(noise(day, 8, 2)),
      ridesCompleted, seatsOnCompleted, seatsFilledOnCompleted, completedValue: seatsFilledOnCompleted * (350 + Math.round(noise(day, 9, 250))) };
  }) };
  if (groups.includes('demand')) payload.demand = { daily: days.map((day) => {
    const bookings = n(5 + noise(day, 10, 14));
    const cancelledByPassenger = Math.round(bookings * noise(day, 11, 0.12));
    const cancelledByDriver = Math.round(bookings * noise(day, 12, 0.06));
    const rejected = Math.round(bookings * noise(day, 13, 0.08));
    const pending = day === today ? Math.round(bookings * 0.3) : 0;
    return { day, bookings, seatsBooked: Math.round(bookings * 1.4), confirmed: Math.max(0, bookings - cancelledByPassenger - cancelledByDriver - rejected - pending), pending, rejected, cancelledByPassenger, cancelledByDriver };
  }) };
  if (groups.includes('quality')) payload.quality = { daily: days.map((day) => {
    const reviews = n(2 + noise(day, 14, 7));
    return { day, reviews, ratingTotal: Math.round(reviews * (4.1 + noise(day, 15, 0.8))), lowRatings: Math.round(noise(day, 16, 1.4)), issueReports: Math.round(noise(day, 17, 2)), safetyReports: Math.round(noise(day, 18, 1.2)), ticketsOpened: n(noise(day, 19, 4)) };
  }) };
  return [200, payload];
}

function periodFor(params) {
  const from = params.get('from');
  const to = params.get('to');
  const bad = (message) => ({ error: [400, { error: { code: 'INVALID_REQUEST', message } }] });
  if (Boolean(from) !== Boolean(to)) return bad('Send both from and to, or neither');
  const today = kolkataDay();
  const start = from || today;
  const end = to || today;
  if (![start, end].every((key) => /^\d{4}-\d{2}-\d{2}$/.test(key))) return bad('Use YYYY-MM-DD dates');
  if (end > today) return bad('to must not be after today');
  if (start > end) return bad('from must be on or before to');
  const days = Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
  if (days > 92) return bad('The range must be 92 days or fewer');
  const daily = Array.from({ length: days }, (_, index) => dayCounts(shiftDay(start, index)));
  const totals = {};
  for (const key of ['newMembers', 'ridesPublished', 'bookings', 'ridesCompleted', 'ticketsOpened', 'issueReports', 'safetyReports']) totals[key] = daily.reduce((total, row) => total + row[key], 0);
  return { period: { from: start, to: end, days, totals, daily: daily.map(({ day, newMembers, ridesPublished, bookings, ridesCompleted }) => ({ day, newMembers, ridesPublished, bookings, ridesCompleted })) } };
}

function lastMessage(ticket) { return ticket.messages[ticket.messages.length - 1]; }
function supportRow(ticket) {
  const last = lastMessage(ticket);
  const { messages, notes, requesterMobile, closedAt, ...row } = ticket;
  return { ...row, lastMessageAt: last.createdAt, awaitingReply: ticket.status === 'OPEN' && last.senderRole === 'REQUESTER', isInternal: internalIds().has(ticket.requesterUserId) };
}
function memberRow(member) {
  const { vehicles, authProvider, onboardingIntent, gender, dob, audienceGender, acquisitionSource, driverRidesCompleted, passengerRidesCompleted, rideCities, trustedContactFull, ...row } = member;
  return row;
}
function tripRow(trip) {
  const { vehicleId, vehicle, cancellationReason, completedAt, originLabel, destinationLabel, originCity, destinationCity, ...row } = trip;
  return { ...row, isInternal: internalIds().has(trip.driverUserId) };
}

function compare(sort, order) {
  const direction = order === 'asc' ? 1 : -1;
  return (left, right) => {
    const a = left[sort]; const b = right[sort];
    if (a === b) return 0;
    if (a === null || a === undefined) return 1;
    if (b === null || b === undefined) return -1;
    return (a > b ? 1 : -1) * direction;
  };
}
function within(value, from, to) {
  const time = Date.parse(value);
  return (!from || time >= Date.parse(from)) && (!to || time < Date.parse(to));
}
function text(query, ...values) {
  if (!query) return true;
  const needle = query.toLowerCase();
  return values.some((value) => String(value || '').toLowerCase().includes(needle));
}
function page(items, params, fallbackSort) {
  const sort = params.get('sort') || fallbackSort;
  const sorted = sort ? [...items].sort(compare(sort, params.get('order') || 'desc')) : items;
  const limit = Math.min(100, Number(params.get('limit') || 25));
  const offset = Number(params.get('offset') || 0);
  return { items: sorted.slice(offset, offset + limit), total: sorted.length, limit, offset, hasMore: offset + limit < sorted.length };
}

function route(method, path, params, body, authed, admin) {
  if (path === '/v1/admin/auth/login' && method === 'POST') {
    if (String(body?.email || '').trim().toLowerCase() !== LOGIN.email || body?.password !== LOGIN.password) return [401, { error: { code: 'ADMIN_INVALID_CREDENTIALS', message: 'The email or password is not correct' } }];
    const token = randomUUID();
    sessions.add(token);
    return [200, { admin: admins[0], expiresAt: iso(minutes(600)) }, { 'set-cookie': `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax` }];
  }
  if (path === '/v1/admin/auth/logout') return [204, null, { 'set-cookie': `${COOKIE}=; Path=/; Max-Age=0` }];
  if (path === '/v1/admin/auth/request-password-reset') return [202, { message: 'If the admin account exists, a password reset code was sent to its email address.' }];
  if (path === '/v1/admin/auth/reset-password') return [400, { error: { code: 'ADMIN_RESET_TOKEN_INVALID', message: 'The preview does not reset passwords' } }];
  if (!authed) return [401, { error: { code: 'UNAUTHENTICATED', message: 'Sign in again' } }];

  if (path === '/v1/admin/me') return [200, { admin }];
  if (path === '/v1/admin/users' && method === 'GET') return [200, { users: admins }];
  if (path === '/v1/admin/users' && method === 'POST') {
    const created = { id: randomUUID(), username: body.username || body.email, email: body.email, role: 'SUPER_ADMIN', status: 'ACTIVE', passwordChangedAt: iso(0), createdAt: iso(0), updatedAt: iso(0) };
    admins.push(created);
    return [201, { admin: created }];
  }
  let match = path.match(/^\/v1\/admin\/users\/([^/]+)$/);
  if (match && method === 'PATCH') { const row = admins.find((item) => item.id === match[1]); row.status = body.status; return [200, { admin: row }]; }

  if (path === '/v1/admin/dashboard/summary') {
    const count = (list, field, value) => list.filter((item) => item[field] === value).length;
    const members = scoped(membersAll, params, (member, ids) => ids.has(member.id));
    const trips = scoped(tripsAll, params, tripInternal);
    const bookings = scoped(bookingsAll, params, bookingInternal);
    const tickets = scoped(ticketsAll, params, (ticket, ids) => ids.has(ticket.requesterUserId));
    return [200, {
      members: { active: count(members, 'status', 'ACTIVE'), suspended: count(members, 'status', 'SUSPENDED'), deleted: count(members, 'status', 'DELETED'), total: members.length },
      trips: { draft: 0, published: count(trips, 'status', 'PUBLISHED'), inProgress: count(trips, 'status', 'IN_PROGRESS'), completed: count(trips, 'status', 'COMPLETED'), cancelled: count(trips, 'status', 'CANCELLED'), total: trips.length },
      bookings: { requested: count(bookings, 'status', 'REQUESTED'), confirmed: count(bookings, 'status', 'CONFIRMED'), inRide: count(bookings, 'status', 'IN_RIDE'), completed: count(bookings, 'status', 'COMPLETED'), cancelled: 0, total: bookings.length },
      support: { open: count(tickets, 'status', 'OPEN'), closed: count(tickets, 'status', 'CLOSED'), total: tickets.length },
      admins: { active: admins.length, disabled: 0, total: admins.length },
    }];
  }
  if (path === '/v1/admin/push/config') return [200, { enabled: true, publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U', categories: { support: true, safety: true, bookings: true, adminActions: true } }];
  if (path === '/v1/admin/push/subscription' && method === 'GET') return [200, { subscribed: pushDevices.has(params.get('endpoint')), preferences: pushDevices.get(params.get('endpoint')) || { support: true, safety: true, bookings: true, adminActions: true } }];
  if (path === '/v1/admin/push/subscription' && method === 'POST') { const prefs = { support: true, safety: true, bookings: true, adminActions: true, ...(body.preferences || {}) }; pushDevices.set(body.endpoint, prefs); return [201, { subscribed: true, preferences: prefs }]; }
  if (path === '/v1/admin/push/subscription/preferences') { const prefs = { ...(pushDevices.get(body.endpoint) || {}), ...(body.preferences || {}) }; pushDevices.set(body.endpoint, prefs); return [200, { subscribed: true, preferences: prefs }]; }
  if (path === '/v1/admin/push/subscription/remove') { pushDevices.delete(body.endpoint); return [200, { subscribed: false }]; }
  if (path === '/v1/admin/push/test') return pushDevices.has(body.endpoint) ? [200, { sent: true }] : [404, { error: { code: 'NOT_FOUND', message: 'This device is not subscribed' } }];
  if (path === '/v1/admin/dashboard/pulse') {
    const newest = (values) => values.filter(Boolean).sort().pop() || null;
    return [200, { generatedAt: new Date().toISOString(), changes: {
      support: newest(tickets.flatMap((ticket) => [ticket.updatedAt, lastMessage(ticket).createdAt])),
      trips: newest(trips.map((trip) => trip.updatedAt)),
      bookings: newest(bookings.map((booking) => booking.updatedAt)),
      members: newest(members.map((member) => member.updatedAt)),
      reviews: newest(reviews.map((review) => review.submittedAt)),
      vehicles: newest(manualVehicles.map((vehicle) => vehicle.lastRecheckAt)),
      audit: newest(audit.map((row) => row.createdAt)),
    } }];
  }
  if (path === '/v1/admin/analytics') return analyticsFor(params);
  if (path === '/v1/admin/dashboard/attention') {
    if (LEGACY && (params.has('from') || params.has('to'))) return [400, { error: { code: 'VALIDATION_FAILED', message: 'property from should not exist' } }];
    const range = LEGACY ? {} : periodFor(params);
    if (range.error) return range.error;
    const trips = scoped(tripsAll, params, tripInternal);
    const bookings = scoped(bookingsAll, params, bookingInternal);
    const tickets = scoped(ticketsAll, params, (ticket, ids) => ids.has(ticket.requesterUserId));
    const waiting = tickets.filter((ticket) => supportRow(ticket).awaitingReply).sort((a, b) => lastMessage(a).createdAt.localeCompare(lastMessage(b).createdAt));
    const soon = trips.filter((trip) => trip.status === 'PUBLISHED' && Date.parse(trip.departureAt) >= now && Date.parse(trip.departureAt) < now + minutes(120)).sort((a, b) => a.departureAt.localeCompare(b.departureAt));
    const live = trips.filter((trip) => trip.status === 'IN_PROGRESS');
    const requested = bookings.filter((booking) => booking.status === 'REQUESTED').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const recent = reviews.filter((review) => Date.parse(review.submittedAt) >= now - 7 * 86_400_000);
    const lite = (trip) => ({ id: trip.id, publicId: trip.publicId, origin: trip.origin, destination: trip.destination, driverUserId: trip.driverUserId, driverName: trip.driverName, departureAt: trip.departureAt, seatsTotal: trip.seatsTotal, seatsAvailable: trip.seatsAvailable, status: trip.status });
    return [200, {
      generatedAt: iso(0),
      support: { awaitingReply: waiting.length, items: waiting.slice(0, 8).map((ticket) => ({ id: ticket.id, publicId: ticket.publicId, subject: ticket.subject, category: ticket.category, requesterName: ticket.requesterName, requesterPhotoUrl: ticket.requesterPhotoUrl, waitingSince: lastMessage(ticket).createdAt })) },
      trips: { departingSoon: soon.length, inProgress: live.length, departingSoonItems: soon.slice(0, 8).map(lite), inProgressItems: live.slice(0, 8).map(lite) },
      bookings: { awaitingDriver: requested.length, items: requested.slice(0, 8).map((booking) => ({ id: booking.id, publicId: booking.publicId, tripId: booking.tripId, tripPublicId: booking.tripPublicId, bookedByName: booking.bookedByName, passengerCount: booking.passengerCount, createdAt: booking.createdAt, departureAt: booking.tripDepartureAt })) },
      vehicles: { awaitingRecheck: manualVehicles.filter((vehicle) => vehicle.state === 'AWAITING_RECHECK').length },
      reviews: { issueReportsLast7Days: recent.filter((review) => review.issueCodes.length).length, safetyReportsLast7Days: recent.filter((review) => review.hasSafetyIssue).length || reviews.filter((review) => review.hasSafetyIssue).length },
      trends,
      ...(range.period ? { period: range.period } : {}),
    }];
  }
  if (path === '/v1/admin/members') {
    const invalid = audienceError(params);
    if (invalid) return [400, { error: { code: 'INVALID_REQUEST', message: invalid } }];
    const list = scoped(members, params, (member, ids) => ids.has(member.id)).filter((member) => memberMatches(member, params));
    return [200, page(list.map(memberRow), params, 'createdAt')];
  }
  match = path.match(/^\/v1\/admin\/members\/([^/]+)\/internal$/);
  if (match && method === 'PATCH') {
    const member = members.find((item) => item.id === match[1]);
    if (!member) return [404, { error: { code: 'NOT_FOUND', message: 'Member not found' } }];
    if (typeof body.isInternal !== 'boolean') return [400, { error: { code: 'INVALID_REQUEST', message: 'isInternal must be a boolean value' } }];
    if (member.isInternal !== body.isInternal) {
      member.isInternal = body.isInternal;
      member.updatedAt = new Date().toISOString();
      addAudit(admin, body.isInternal ? 'MEMBER_MARKED_INTERNAL' : 'MEMBER_MARKED_EXTERNAL', 'user', member.id, Date.now() - now, { reason: body.reason });
      audit.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    }
    return [200, { member: memberRow(member) }];
  }
  match = path.match(/^\/v1\/admin\/members\/([^/]+)\/trusted-contact$/);
  if (match) {
    const member = members.find((item) => item.id === match[1]);
    if (!member) return [404, { error: { code: 'NOT_FOUND', message: 'Member not found' } }];
    if (member.trustedContactFull) {
      addAudit(admin, 'MEMBER_TRUSTED_CONTACT_VIEWED', 'user', member.id, Date.now() - now);
      audit.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    }
    return [200, { trustedContact: member.trustedContactFull }];
  }
  match = path.match(/^\/v1\/admin\/members\/([^/]+)\/status$/);
  if (match && method === 'PATCH') {
    const member = members.find((item) => item.id === match[1]);
    if (!member) return [404, { error: { code: 'NOT_FOUND', message: 'Member not found' } }];
    if (body.status === 'SUSPENDED' && !String(body.reason || '').trim()) return [400, { error: { code: 'INVALID_REQUEST', message: 'Enter a reason for the suspension' } }];
    let ridesCancelled = 0;
    if (body.status === 'SUSPENDED' && body.cancelUpcomingRides) {
      trips.filter((trip) => trip.driverUserId === member.id && trip.status === 'PUBLISHED' && Date.parse(trip.departureAt) > Date.now()).forEach((trip) => { trip.status = 'CANCELLED'; trip.updatedAt = new Date().toISOString(); ridesCancelled += 1; });
    }
    member.status = body.status;
    member.updatedAt = new Date().toISOString();
    addAudit(admin, body.status === 'SUSPENDED' ? 'MEMBER_SUSPENDED' : 'MEMBER_REACTIVATED', 'user', member.id, Date.now() - now, { reason: body.reason });
    return [200, { member: memberRow(member), sessionsEnded: body.status === 'SUSPENDED' ? 2 : 0, ridesCancelled, bookingsCancelled: 0 }];
  }
  match = path.match(/^\/v1\/admin\/trips\/([^/]+)\/cancel$/);
  if (match && method === 'POST') {
    const trip = trips.find((item) => item.id === match[1]);
    if (!trip) return [404, { error: { code: 'NOT_FOUND', message: 'Trip not found' } }];
    if (trip.status === 'CANCELLED') return [201, { tripId: trip.id, status: 'CANCELLED', affectedBookings: 0, alreadyCancelled: true }];
    if (trip.status !== 'PUBLISHED') return [409, { error: { code: 'TRIP_NOT_CANCELLABLE', message: 'Only a published ride that has not started can be cancelled' } }];
    const affected = bookings.filter((booking) => booking.tripId === trip.id && ['REQUESTED', 'CONFIRMED'].includes(booking.status));
    affected.forEach((booking) => { booking.status = 'CANCELLED_BY_DRIVER'; booking.updatedAt = new Date().toISOString(); });
    trip.status = 'CANCELLED';
    trip.cancellationReason = 'OTHER';
    trip.updatedAt = new Date().toISOString();
    addAudit(admin, 'TRIP_CANCELLED_BY_ADMIN', 'trip', trip.id, Date.now() - now, { reason: body.reason, metadata: { affectedBookings: affected.length } });
    return [201, { tripId: trip.id, status: 'CANCELLED', affectedBookings: affected.length, alreadyCancelled: false }];
  }
  match = path.match(/^\/v1\/admin\/members\/([^/]+)$/);
  if (match) {
    const member = members.find((item) => item.id === match[1]);
    if (!member) return [404, { error: { code: 'NOT_FOUND', message: 'Member not found' } }];
    const newest = (left, right) => right.submittedAt.localeCompare(left.submittedAt);
    const received = reviews.filter((review) => review.revieweeUserId === member.id).sort(newest);
    const given = reviews.filter((review) => review.reviewerUserId === member.id).sort(newest);
    const average = (list) => (list.length ? Math.round((list.reduce((sum, review) => sum + review.rating, 0) / list.length) * 100) / 100 : null);
    const memberBookings = bookings.filter((booking) => booking.bookedByUserId === member.id);
    const { trustedContactFull: contact, ...detail } = member;
    return [200, { member: {
      ...detail,
      ridesCompleted: { asDriver: member.driverRidesCompleted ?? 0, asPassenger: member.passengerRidesCompleted ?? 0 },
      trustedContact: contact ? { name: contact.name, relationship: contact.relationship, phoneLast4: contact.phone.replace(/\D/g, '').slice(-4), updatedAt: contact.updatedAt } : null,
      reviewsGiven: { count: given.length, averageRating: average(given), recent: given.slice(0, 5) },
      bookingCount: memberBookings.length,
      recentTrips: trips.filter((trip) => trip.driverUserId === member.id).sort((a, b) => b.departureAt.localeCompare(a.departureAt)).slice(0, 10).map((trip) => ({ id: trip.id, publicId: trip.publicId, origin: trip.origin, destination: trip.destination, departureAt: trip.departureAt, status: trip.status, seatsTotal: trip.seatsTotal, seatsAvailable: trip.seatsAvailable })),
      recentBookings: memberBookings.slice(0, 10).map((booking) => ({ id: booking.id, publicId: booking.publicId, tripId: booking.tripId, tripPublicId: booking.tripPublicId, route: booking.route, status: booking.status, passengerCount: booking.passengerCount, totalPrice: booking.totalPrice, createdAt: booking.createdAt, departureAt: booking.tripDepartureAt })),
      supportTickets: tickets.filter((ticket) => ticket.requesterUserId === member.id).map((ticket) => ({ id: ticket.id, publicId: ticket.publicId, subject: ticket.subject, status: ticket.status, updatedAt: ticket.updatedAt })),
      reviewsReceived: { count: received.length, averageRating: average(received), issueReports: received.filter((review) => review.issueCodes.length).length, safetyReports: received.filter((review) => review.hasSafetyIssue).length, recent: received.slice(0, 5) },
      blocks: { blockedByOthers: member.status === 'SUSPENDED' ? 2 : 0, blockingOthers: 0 },
    } }];
  }
  if (path === '/v1/admin/trips') {
    let list = scoped(trips, params, tripInternal).filter((trip) => text(params.get('query'), trip.publicId, trip.originCity, trip.destinationCity, trip.driverName, trip.origin, trip.destination));
    if (params.get('status')) list = list.filter((trip) => trip.status === params.get('status'));
    if (params.get('driverUserId')) list = list.filter((trip) => trip.driverUserId === params.get('driverUserId'));
    if (params.get('bookingMode')) list = list.filter((trip) => trip.bookingMode === params.get('bookingMode'));
    if (params.get('originCity')) list = list.filter((trip) => text(params.get('originCity'), trip.originCity, trip.origin));
    if (params.get('destinationCity')) list = list.filter((trip) => text(params.get('destinationCity'), trip.destinationCity, trip.destination));
    if (params.get('hasBookings')) list = list.filter((trip) => (trip.bookingCount > 0) === (params.get('hasBookings') === 'true'));
    list = list.filter((trip) => within(trip.departureAt, params.get('departureFrom'), params.get('departureTo')));
    return [200, page(list.map(tripRow), params, 'departureAt')];
  }
  match = path.match(/^\/v1\/admin\/trips\/([^/]+)$/);
  if (match) {
    const trip = trips.find((item) => item.id === match[1] || item.publicId === match[1]);
    if (!trip) return [404, { error: { code: 'NOT_FOUND', message: 'Trip not found' } }];
    return [200, { trip: { ...trip, bookings: bookings.filter((booking) => booking.tripId === trip.id).map((booking) => ({ id: booking.id, publicId: booking.publicId, bookedByUserId: booking.bookedByUserId, bookedByName: booking.bookedByName, passengerCount: booking.passengerCount, status: booking.status, totalPrice: booking.totalPrice, createdAt: booking.createdAt })) } }];
  }
  if (path === '/v1/admin/bookings') {
    let list = scoped(bookings, params, bookingInternal).filter((booking) => text(params.get('query'), booking.publicId, booking.tripPublicId, booking.bookedByName));
    if (params.get('status')) list = list.filter((booking) => booking.status === params.get('status'));
    if (params.get('memberId')) list = list.filter((booking) => booking.bookedByUserId === params.get('memberId'));
    if (params.get('tripId')) list = list.filter((booking) => booking.tripId === params.get('tripId'));
    list = list.filter((booking) => within(booking.createdAt, params.get('createdFrom'), params.get('createdTo')) && within(booking.tripDepartureAt, params.get('departureFrom'), params.get('departureTo')));
    const ids = internalIds();
    const rows = list.map(({ pickup, drop, passengers, events, ...row }) => ({ ...row, isInternal: bookingInternal(row, ids) }));
    return [200, page(params.get('sort') === 'departureAt' ? rows.map((row) => ({ ...row, departureAt: row.tripDepartureAt })) : rows, params, 'createdAt')];
  }
  match = path.match(/^\/v1\/admin\/bookings\/([^/]+)$/);
  if (match) {
    const booking = bookings.find((item) => item.id === match[1]);
    return booking ? [200, { booking }] : [404, { error: { code: 'NOT_FOUND', message: 'Booking not found' } }];
  }
  if (path === '/v1/admin/support/tickets') {
    let list = scoped(tickets, params, (ticket, ids) => ids.has(ticket.requesterUserId)).filter((ticket) => text(params.get('query'), ticket.publicId, ticket.subject, ticket.requesterName, ticket.requesterMobile));
    if (params.get('status')) list = list.filter((ticket) => ticket.status === params.get('status'));
    if (params.get('awaitingReply') === 'true') list = list.filter((ticket) => supportRow(ticket).awaitingReply);
    if (params.get('assignedAdminUserId')) list = list.filter((ticket) => ticket.assignedAdminUserId === params.get('assignedAdminUserId'));
    if (params.get('unassigned') === 'true') list = list.filter((ticket) => !ticket.assignedAdminUserId);
    return [200, page(list.map(supportRow), params, 'updatedAt')];
  }
  match = path.match(/^\/v1\/admin\/support\/tickets\/([^/]+)(\/messages|\/assignee|\/notes)?$/);
  if (match) {
    const ticket = tickets.find((item) => item.id === match[1] || item.publicId === match[1]);
    if (!ticket) return [404, { error: { code: 'NOT_FOUND', message: 'Support ticket not found' } }];
    const detail = () => ({ ...supportRow(ticket), requesterMobile: ticket.requesterMobile, closedAt: ticket.closedAt, messages: ticket.messages, notes: ticket.notes });
    if (path.endsWith('/assignee') && method === 'PATCH') {
      const owner = admins.find((item) => item.id === body.adminUserId) || null;
      ticket.assignedAdminUserId = owner?.id || null;
      ticket.assignedAdminName = owner?.email || null;
      addAudit(admin, owner ? 'SUPPORT_TICKET_ASSIGNED' : 'SUPPORT_TICKET_UNASSIGNED', 'support_ticket', ticket.id, Date.now() - now);
      return [200, { ticket: detail() }];
    }
    if (path.endsWith('/notes') && method === 'POST') {
      ticket.notes.push({ id: randomUUID(), adminUserId: admin.id, adminName: admin.email, text: body.text, createdAt: new Date().toISOString() });
      addAudit(admin, 'SUPPORT_TICKET_NOTE_ADDED', 'support_ticket', ticket.id, Date.now() - now);
      return [201, { ticket: detail() }];
    }
    if (match[2] === '/messages' && method === 'POST') {
      if (ticket.status !== 'OPEN') return [409, { error: { code: 'SUPPORT_TICKET_CLOSED', message: 'Reopen the support ticket before replying' } }];
      ticket.messages.push({ id: randomUUID(), senderUserId: null, senderAdminUserId: admin.id, senderRole: 'SUPPORT', text: body.text, createdAt: iso(Date.now() - now) });
      ticket.updatedAt = lastMessage(ticket).createdAt;
      addAudit(admin, 'SUPPORT_TICKET_REPLIED', 'support_ticket', ticket.id, Date.now() - now);
      audit.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      return [201, { ticket: { ticket: detail() } }];
    }
    if (method === 'PATCH') {
      ticket.status = body.status;
      ticket.closedAt = body.status === 'CLOSED' ? iso(Date.now() - now) : null;
      addAudit(admin, body.status === 'OPEN' ? 'SUPPORT_TICKET_REOPENED' : 'SUPPORT_TICKET_CLOSED', 'support_ticket', ticket.id, Date.now() - now, { reason: body.reason });
      audit.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      return [200, { ticket: { ticket: detail() } }];
    }
    return [200, { ticket: detail() }];
  }
  if (path === '/v1/admin/reviews') {
    const reviewInternal = (review, ids) => ids.has(review.reviewerUserId) || ids.has(review.revieweeUserId);
    const ids = internalIds();
    let list = scoped(reviews, params, reviewInternal).map((review) => ({ ...review, isInternal: reviewInternal(review, ids) }));
    if (params.get('issues') === 'ANY') list = list.filter((review) => review.issueCodes.length);
    if (params.get('issues') === 'SAFETY') list = list.filter((review) => review.hasSafetyIssue);
    if (params.get('issueCode')) list = list.filter((review) => review.issueCodes.includes(params.get('issueCode')));
    if (params.get('memberId')) list = list.filter((review) => review.reviewerUserId === params.get('memberId') || review.revieweeUserId === params.get('memberId'));
    if (params.get('reviewerId')) list = list.filter((review) => review.reviewerUserId === params.get('reviewerId'));
    if (params.get('revieweeId')) list = list.filter((review) => review.revieweeUserId === params.get('revieweeId'));
    if (params.get('maxRating')) list = list.filter((review) => review.rating <= Number(params.get('maxRating')));
    if (params.get('direction')) list = list.filter((review) => review.direction === params.get('direction'));
    list = list.filter((review) => within(review.submittedAt, params.get('submittedFrom'), params.get('submittedTo')));
    return [200, page(list, params, 'submittedAt')];
  }
  if (path === '/v1/admin/vehicles') {
    let list = members.flatMap((member) => member.vehicles.map((vehicle) => ({
      id: vehicle.id, memberId: member.id, memberName: member.name, registrationNumber: vehicle.registrationNumber, make: vehicle.make, model: vehicle.model, color: vehicle.color,
      vehicleType: vehicle.vehicleType, fuelType: vehicle.fuelType, seatsTotal: vehicle.seatsTotal, status: vehicle.status, verificationStatus: vehicle.verificationStatus,
      isCommercial: vehicle.isCommercial, provider: vehicle.verificationProvider, isManual: vehicle.verificationProvider === 'manual', rcStatus: vehicle.rcStatus,
      checkedAt: vehicle.checkedAt, rideCount: trips.filter((trip) => trip.vehicleId === vehicle.id).length, createdAt: member.createdAt, isInternal: member.isInternal,
    })));
    list = scoped(list, params, (row, ids) => ids.has(row.memberId));
    list = list.filter((row) => text(params.get('query'), row.registrationNumber, row.make, row.model, row.memberName));
    if (params.get('source')) list = list.filter((row) => (params.get('source') === 'manual') === row.isManual);
    if (params.get('verificationStatus')) list = list.filter((row) => row.verificationStatus === params.get('verificationStatus'));
    if (params.get('status')) list = list.filter((row) => row.status === params.get('status'));
    list = list.filter((row) => within(row.createdAt, params.get('createdFrom'), params.get('createdTo')));
    return [200, page(list, params, 'createdAt')];
  }
  if (path === '/v1/admin/vehicles/manual') {
    const list = params.get('state') ? manualVehicles.filter((vehicle) => vehicle.state === params.get('state')) : manualVehicles;
    return [200, page(list, params)];
  }
  if (path === '/v1/admin/notifications' && method === 'POST') {
    const hasIds = Array.isArray(body?.recipientUserIds) && body.recipientUserIds.length > 0;
    const hasAudience = Boolean(body?.audience && typeof body.audience.filters === 'object' && body.audience.filters);
    if (hasIds === hasAudience) return [400, { error: { code: 'INVALID_REQUEST', message: 'Send exactly one of recipientUserIds or audience.' } }];
    if (hasIds && body.recipientUserIds.length > 500) return [400, { error: { code: 'INVALID_REQUEST', message: 'Send at most 500 recipientUserIds.' } }];
    let ids = body.recipientUserIds;
    let filters = null;
    if (hasAudience) {
      filters = body.audience.filters;
      if ('query' in filters || 'status' in filters) return [400, { error: { code: 'INVALID_REQUEST', message: 'audience.filters does not take query or status.' } }];
      const params = new URLSearchParams(Object.entries({ internal: 'include', ...filters }).map(([key, value]) => [key, String(value)]));
      params.set('status', 'ACTIVE');
      const invalid = audienceError(params);
      if (invalid) return [400, { error: { code: 'INVALID_REQUEST', message: invalid } }];
      ids = scoped(members, params, (member, set) => set.has(member.id)).filter((member) => memberMatches(member, params)).map((member) => member.id);
      if (ids.length > 50000) return [400, { error: { code: 'INVALID_REQUEST', message: 'The audience is larger than 50,000 members.' } }];
    }
    const send = recordSend({ ...body, audience: hasAudience ? 'filters' : 'members', filters, adminUser: admin, createdAt: new Date().toISOString(), recipientIds: ids, fresh: true });
    addAudit(admin, 'NOTIFICATION_PUBLISHED', 'notification_event', body.eventKey, Date.now() - now, { metadata: { category: body.category, kind: body.kind, recipientCount: ids.length, push: body.push !== false, audience: send.audience, ...(filters ? { filters } : {}) } });
    audit.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    return [201, { status: 'ENQUEUED', count: ids.length }];
  }
  if (path === '/v1/admin/notifications/sends') {
    return [200, page(sends.map(sendRow), params, 'createdAt')];
  }
  match = path.match(/^\/v1\/admin\/notifications\/sends\/([^/]+)\/recipients$/);
  if (match) {
    const send = sends.find((item) => item.id === match[1]);
    if (!send) return [404, { error: { code: 'NOT_FOUND', message: 'Send not found.' } }];
    let list = send.recipients.map((recipient) => {
      const member = members.find((item) => item.id === recipient.userId);
      return { userId: recipient.userId, name: member?.name || null, mobile: member?.mobile || null, profilePhotoUrl: member?.profilePhotoUrl || null, isInternal: Boolean(member?.isInternal), notificationId: recipient.notificationId, delivery: recipient.delivery, deliveryError: recipient.deliveryError, readAt: recipient.readAt, createdAt: recipient.createdAt };
    });
    list = list.filter((row) => text(params.get('query'), row.name, row.mobile));
    if (params.get('delivery')) list = list.filter((row) => row.delivery === params.get('delivery'));
    if (params.get('read')) list = list.filter((row) => Boolean(row.readAt) === (params.get('read') === 'true'));
    list.sort((left, right) => String(left.name).localeCompare(String(right.name)));
    return [200, page(list, params)];
  }
  match = path.match(/^\/v1\/admin\/notifications\/sends\/([^/]+)$/);
  if (match) {
    const send = sends.find((item) => item.id === match[1]);
    if (!send) return [404, { error: { code: 'NOT_FOUND', message: 'Send not found.' } }];
    const row = sendRow(send);
    return [200, { send: { ...row, data: send.data || {} }, stats: row.stats }];
  }
  if (path === '/v1/admin/audit') {
    let list = audit;
    ['action', 'resourceType', 'resourceId', 'adminUserId'].forEach((key) => { if (params.get(key)) list = list.filter((row) => row[key] === params.get(key)); });
    list = list.filter((row) => within(row.createdAt, params.get('createdFrom'), params.get('createdTo')));
    return [200, page(list, params, 'createdAt')];
  }
  return [404, { error: { code: 'NOT_FOUND', message: `No mock route for ${method} ${path}` } }];
}

// Simulate one new member message every 2 minutes, so the change check has something to find.
setInterval(() => {
  const ticket = tickets.find((item) => item.status === 'OPEN');
  if (!ticket) return;
  ticket.messages.push({ id: randomUUID(), senderUserId: ticket.requesterUserId, senderAdminUserId: null, senderRole: 'REQUESTER', text: 'Any update on this?', createdAt: new Date().toISOString() });
  ticket.updatedAt = new Date().toISOString();
}, Number(process.env.ADMIN_MOCK_MESSAGE_MS || 120_000));

/**
 * Add the verified flags that the API sends: a member is verified when the work email is VERIFIED.
 * The API reads them from work_email_verifications; the mock reads the member's workEmailStatus.
 */
const ID_FLAGS = [['driverUserId', 'driverVerified'], ['bookedByUserId', 'bookedByVerified'], ['reviewerUserId', 'reviewerVerified'], ['revieweeUserId', 'revieweeVerified'], ['memberId', 'memberVerified'], ['requesterUserId', 'requesterVerified']];
function withVerified(value) {
  if (Array.isArray(value)) return value.map(withVerified);
  if (!value || typeof value !== 'object') return value;
  const verified = (id) => members.find((member) => member.id === id)?.workEmailStatus === 'VERIFIED';
  const next = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, withVerified(item)]));
  for (const [idKey, flag] of ID_FLAGS) if (typeof value[idKey] === 'string') next[flag] = verified(value[idKey]);
  if (typeof value.mobile === 'string' && typeof value.id === 'string' && 'workEmailStatus' in value) next.isVerified = verified(value.id);
  if (typeof value.userId === 'string' && 'delivery' in value) next.isVerified = verified(value.userId);
  return next;
}

createServer((request, response) => {
  const url = new URL(request.url, `http://localhost:${PORT}`);
  const headers = {
    'access-control-allow-origin': request.headers.origin || ORIGIN,
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
    vary: 'origin',
  };
  if (request.method === 'OPTIONS') { response.writeHead(204, headers); response.end(); return; }
  const photo = url.pathname.match(/^\/mock-photos\/(\d+)\.svg$/);
  if (photo && request.method === 'GET') {
    response.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'max-age=3600' });
    response.end(mockPhoto(Number(photo[1])));
    return;
  }
  if (url.pathname.startsWith('/mock-photos/')) { response.writeHead(404); response.end(); return; }
  let raw = '';
  request.on('data', (chunk) => { raw += chunk; });
  request.on('end', () => {
    const cookie = (request.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`));
    const authed = Boolean(cookie && sessions.has(cookie.split('=')[1]));
    let body = null;
    try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
    const [status, payload, extra] = route(request.method, url.pathname, url.searchParams, body, authed, admins[0]);
    setTimeout(() => {
      response.writeHead(status, { ...headers, ...(payload ? { 'content-type': 'application/json' } : {}), ...(extra || {}) });
      response.end(payload ? JSON.stringify(withVerified(payload)) : undefined);
    }, 120 + Math.floor(Math.random() * 180));
  });
}).listen(PORT, () => {
  console.log(`Fluxgo admin mock API on http://localhost:${PORT}`);
  console.log(`Sign in with ${LOGIN.email} / ${LOGIN.password}`);
});// The dashboard routes shadow these names with scoped lists.
const membersAll = members;
const tripsAll = trips;
const bookingsAll = bookings;
const ticketsAll = tickets;

