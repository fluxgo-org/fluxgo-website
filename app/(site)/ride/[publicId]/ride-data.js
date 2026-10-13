import { normalizeRideId } from '../../../../lib/app-links';

const API_BASE_URL = (process.env.FLUXGO_API_URL || process.env.NEXT_PUBLIC_FLUXGO_API_URL || 'https://api.fluxgo.in').replace(/\/+$/, '');
const INDIA = 'Asia/Kolkata';

/**
 * Load the public ride view. Returns `{ trip }`, `{ notFound: true }`, or
 * `{ unavailable: true }` when the API cannot answer now.
 */
export async function loadRide(rawId) {
  const id = normalizeRideId(rawId);
  if (!id) return { notFound: true };
  try {
    const response = await fetch(`${API_BASE_URL}/v1/public/trips/${id}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 }
    });
    if (response.status === 404) return { notFound: true };
    if (!response.ok) return { unavailable: true, id };
    const body = await response.json();
    return body?.trip ? { trip: body.trip } : { unavailable: true, id };
  } catch {
    return { unavailable: true, id };
  }
}

export function rupees(value) {
  return `₹${Number(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function rideDate(iso) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: INDIA, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso));
}

export function rideTime(iso) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: INDIA, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(new Date(iso))
    .replace(/\s?(am|pm)$/i, (match) => ` ${match.trim().toUpperCase()}`);
}

export function duration(seconds) {
  if (!seconds) return null;
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function titleCase(value) {
  return String(value ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const TYPE_LABELS = { HATCHBACK: 'Hatchback', SEDAN: 'Sedan', SUV: 'SUV', MPV: 'MPV', CAR: 'Car', OTHER: 'Car' };
const FUEL_LABELS = { PETROL: 'Petrol', DIESEL: 'Diesel', CNG: 'CNG', ELECTRIC: 'Electric', HYBRID: 'Hybrid' };
const LUGGAGE_LABELS = { NONE: 'No bags', SMALL: 'Small bag', MEDIUM: 'Medium bag', LARGE: 'Large bag' };

export function vehicleName(vehicle) {
  return vehicle?.shortName?.trim() || [vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || 'Car';
}

/** "White Maruti Swift Dzire" when the color is known. */
export function vehicleLine(vehicle) {
  if (!vehicle) return null;
  const color = vehicle.color && !vehicle.color.startsWith('#') ? titleCase(vehicle.color) : '';
  return [color, vehicleName(vehicle)].filter(Boolean).join(' ');
}

export function vehicleMeta(vehicle) {
  if (!vehicle) return null;
  return [TYPE_LABELS[vehicle.vehicleType], FUEL_LABELS[vehicle.fuelType]].filter(Boolean).join(' · ');
}

export function luggageLabel(trip) {
  if (!trip.luggageAllowed) return 'No bags';
  return `Up to ${(LUGGAGE_LABELS[trip.maxLuggageSize] ?? 'Small bag').toLowerCase()}`;
}

const SWATCHES = {
  black: '#202124', grey: '#77786F', gray: '#77786F', silver: '#A7ADB4', white: '#F4F4EF', pearl: '#F3F0E5',
  beige: '#D4BE9A', red: '#C9362F', maroon: '#7A2026', blue: '#2867B2', navy: '#1E3B67', green: '#378447',
  yellow: '#D7A817', gold: '#C28B1A', orange: '#D9761F', brown: '#774B32', purple: '#7050A3', bronze: '#9C6B3C'
};

/** Safe fill for the car drawing. Unknown names use a neutral grey. */
export function vehicleSwatch(color) {
  const value = String(color ?? '').trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(value)) return value;
  const match = Object.keys(SWATCHES).find((name) => value.includes(name));
  return match ? SWATCHES[match] : '#77786F';
}

export const STATE_COPY = {
  OPEN: null,
  FULL: { title: 'This ride is full', body: 'All seats are booked. Look for another ride on this route.' },
  DEPARTED: { title: 'This ride has left', body: 'The departure time has passed. Look for another ride on this route.' },
  STARTED: { title: 'This ride has started', body: 'The ride is on the road now. Look for another ride on this route.' },
  COMPLETED: { title: 'This ride is complete', body: 'This ride has reached its destination.' },
  CANCELLED: { title: 'This ride was cancelled', body: 'The host cancelled this ride. Look for another ride on this route.' }
};

export function rideTitle(trip) {
  return `${trip.origin.city} → ${trip.destination.city}`;
}

/** One-line summary for link previews. */
export function rideSummary(trip) {
  const when = `${rideDate(trip.departureAt)}, ${rideTime(trip.departureAt)}`;
  if (trip.state !== 'OPEN') return `${when}. ${STATE_COPY[trip.state]?.title ?? 'Not taking bookings'}.`;
  const seats = `${trip.seatsAvailable} ${trip.seatsAvailable === 1 ? 'seat' : 'seats'} left`;
  const car = vehicleLine(trip.vehicle);
  return [when, `${rupees(trip.pricePerSeat)} per seat`, seats, car].filter(Boolean).join(' · ');
}

function placeLabel(place) {
  const label = place?.label?.trim() || place?.city || '';
  return place?.city && !label.toLowerCase().includes(place.city.toLowerCase()) ? `${label}, ${place.city}` : label;
}

function hostShareLine(host) {
  const rating = host.rating > 0
    ? `★ ${host.rating.toFixed(1)} (${host.reviewCount} ${host.reviewCount === 1 ? 'review' : 'reviews'})`
    : 'New host';
  return `Host: ${host.displayName} · ${rating}${host.workEmailVerified ? ' · Work email verified' : ''}`;
}

/**
 * Text for the share sheet. Uses the same layout as the app's "Share ride"
 * message (fluxgo-frontend `src/lib/rideShare.ts`), so both shares look the same.
 */
export function rideShareMessage(trip, url) {
  const open = trip.state === 'OPEN';
  const availability = open
    ? `${trip.seatsAvailable} ${trip.seatsAvailable === 1 ? 'seat' : 'seats'} left · ${rupees(trip.pricePerSeat)} per seat`
    : STATE_COPY[trip.state]?.title.replace(/^This ride /, 'Ride ') ?? 'Not taking bookings';
  const details = [
    trip.vehicle ? `Car: ${vehicleLine(trip.vehicle)}` : null,
    trip.host ? hostShareLine(trip.host) : null,
    `Pickup: ${placeLabel(trip.origin)}`,
    `Drop: ${placeLabel(trip.destination)}`
  ].filter(Boolean);
  // The link goes last, after its label. ShareRideButton joins text and url
  // into one string, the same message the app shares.
  return {
    text: [
      [`Fluxgo ride · ${rideTitle(trip)}`, `${rideDate(trip.departureAt)} · ${rideTime(trip.departureAt)}`, availability].join('\n'),
      details.join('\n'),
      `${open && trip.seatsAvailable > 0 ? 'Book a seat' : 'Ride details'}:`
    ].join('\n\n'),
    url
  };
}
