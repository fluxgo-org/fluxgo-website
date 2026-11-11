const API_BASE_URL = (process.env.FLUXGO_API_URL || process.env.NEXT_PUBLIC_FLUXGO_API_URL || 'https://api.fluxgo.in').replace(/\/+$/, '');
const INDIA = 'Asia/Kolkata';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Load the public cab ride view. Returns `{ ride }`, `{ notFound: true }`, or `{ unavailable: true }`. */
export async function loadCabRide(rawId) {
  const id = typeof rawId === 'string' && UUID.test(rawId.trim()) ? rawId.trim().toLowerCase() : null;
  if (!id) return { notFound: true };
  try {
    const response = await fetch(`${API_BASE_URL}/v1/public/cabs/rides/${id}`, { headers: { Accept: 'application/json' }, next: { revalidate: 60 } });
    if (response.status === 404 || response.status === 400) return { notFound: true };
    if (!response.ok) return { unavailable: true, id };
    const body = await response.json();
    return body?.ride ? { ride: body.ride } : { unavailable: true, id };
  } catch {
    return { unavailable: true, id };
  }
}

export function rupees(value) {
  return `₹${Number(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function cabDate(iso) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: INDIA, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso));
}

export function cabTime(iso) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: INDIA, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(new Date(iso))
    .replace(/:00/, '')
    .replace(/\s?(am|pm)$/i, (match) => ` ${match.trim().toUpperCase()}`);
}

/** "6–7 AM" for the 1 h start window. */
export function cabWindow(startIso, endIso) {
  const start = cabTime(startIso);
  const end = cabTime(endIso);
  const [startClock, startHalf] = start.split(' ');
  const [endClock, endHalf] = end.split(' ');
  return startHalf === endHalf ? `${startClock}–${endClock} ${endHalf}` : `${start}–${end}`;
}

export const TYPE_LABELS = { HATCHBACK: 'Hatchback', SEDAN: 'Sedan', SUV: 'SUV', MPV: 'MPV' };
export const FUEL_LABELS = { PETROL: 'Petrol', DIESEL: 'Diesel', CNG: 'CNG', ELECTRIC: 'Electric', HYBRID: 'Hybrid', OTHER: 'Other' };

/** Why the ride takes no bookings, or null when it is open. */
export function closedCopy(ride) {
  if (ride.status === 'CANCELLED') return { title: 'This cab was cancelled', body: 'Look for another cab on this route in the Fluxgo app.' };
  if (ride.status === 'NOT_RUNNING') return { title: 'This cab does not run', body: 'Too few seats were booked. Look for another cab on this route.' };
  if (ride.status === 'DONE' || Date.parse(ride.slotStart) < Date.now()) return { title: 'This cab has left', body: 'Look for another cab on this route in the Fluxgo app.' };
  if (ride.seatsLeft === 0) return { title: 'This cab is full', body: 'All seats are booked. Look for another time on this route.' };
  if (!ride.bookable) return { title: 'Booking is closed', body: 'Booking closes 1 h before pickup. Look for another time on this route.' };
  return null;
}

export function cabTitle(ride) {
  return `${ride.from} → ${ride.to}`;
}

export function cabSummary(ride) {
  const first = ride.pickups[0];
  const when = `${cabDate(ride.slotStart)}, ${first ? cabWindow(first.windowStart, first.windowEnd) : cabTime(ride.slotStart)}`;
  const closed = closedCopy(ride);
  if (closed) return `${when}. ${closed.title}.`;
  const car = ride.vehicle ? [ride.vehicle.model, TYPE_LABELS[ride.vehicle.type]].filter(Boolean).join(' · ') : null;
  return [when, `${rupees(ride.price)} a seat`, `${ride.seatsLeft} ${ride.seatsLeft === 1 ? 'seat' : 'seats'} left`, car].filter(Boolean).join(' · ');
}

/** The same layout as the partner app share text (fluxgo-partner src/v5/format.ts rideShareText). */
export function cabShareMessage(ride, url) {
  const closed = closedCopy(ride);
  const lines = [`🚕 *Fluxgo Cab · ${cabTitle(ride)}*`, '', `📅 ${cabDate(ride.slotStart)}`];
  ride.pickups.forEach((point, index) => lines.push(`${index === 0 ? '🟢 Pickup' : '      '} ${cabTime(point.windowStart)} · ${point.name}`));
  lines.push(`🔴 Drop · ${ride.drops.map((point) => point.name).join(', ')}`);
  lines.push(closed ? `ℹ️ ${closed.title}` : `💺 ${ride.seatsLeft} ${ride.seatsLeft === 1 ? 'seat' : 'seats'} left · ${rupees(ride.price)} a seat`);
  if (ride.vehicle?.model) lines.push(`🚗 ${ride.vehicle.model}`);
  lines.push('', '✅ Verified driver · Pay in cash in the cab', '', closed ? 'Cab details:' : 'Book your seat on Fluxgo:');
  return { text: lines.join('\n'), url };
}
