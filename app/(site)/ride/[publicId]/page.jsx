import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Wordmark from '../../_components/Wordmark';
import { IconArrow, IconBag, IconCalendar, IconClock, IconSeat, IconShield, IconStar } from '../../_components/Icons';
import { colorizedCarSvg, vehicleColorToHex } from '../../../../lib/vehicle-color';
import {
  ANDROID_PACKAGE,
  APP_STORE_ID,
  APP_STORE_URL,
  OPEN_HOST_URL,
  PLAY_STORE_URL,
  SITE_URL,
  WEB_APP_URL
} from '../../_components/links';
import { deviceKind } from '../../../../lib/app-links';
import {
  STATE_COPY,
  duration,
  loadRide,
  luggageLabel,
  rideDate,
  rideShareMessage,
  rideSummary,
  rideTime,
  rideTitle,
  rupees,
  titleCase,
  vehicleName
} from './ride-data';
import ShareRideButton from './ShareRideButton';

export async function generateMetadata({ params }) {
  const { publicId } = await params;
  const result = await loadRide(publicId);
  const base = { robots: { index: false, follow: false } };
  if (!result.trip) return { ...base, title: 'Ride | Fluxgo' };
  const { trip } = result;
  const title = `${rideTitle(trip)} · Fluxgo ride`;
  const description = rideSummary(trip);
  const url = `${SITE_URL}/ride/${trip.publicId}`;
  return {
    ...base,
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'Fluxgo', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
    // The Safari banner opens this ride in the app, like the page button.
    itunes: { appId: APP_STORE_ID, appArgument: url }
  };
}

function Seats({ available, total }) {
  return (
    <span className="fx-share-seatdots" aria-label={`${available} of ${total} seats left`}>
      {Array.from({ length: Math.max(0, total) }, (_, index) => (
        <i key={index} className={index < available ? 'is-free' : ''} />
      ))}
    </span>
  );
}

const FUEL_LABELS = { PETROL: 'Petrol', DIESEL: 'Diesel', CNG: 'CNG', ELECTRIC: 'Electric', HYBRID: 'Hybrid' };
const TYPE_LABELS = { HATCHBACK: 'Hatchback', SEDAN: 'Sedan', SUV: 'SUV', MPV: 'MPV' };

/** The app's car artwork, painted in the vehicle colour. The markup is built from fixed artwork and a safe hex value. */
function CarArt({ color }) {
  return <span className="fx-share-car-art" dangerouslySetInnerHTML={{ __html: colorizedCarSvg(color) }} />;
}

function WorkEmailBadge({ size = 20 }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="fx-share-workmail" src="/assets/work-email-verified.png" alt="Work email verified" width={size} height={size} />;
}

/** Public links never show the host's photo (decision 2026-10-13). Show the initial only. */
function Avatar({ host }) {
  return <span className="fx-share-avatar" aria-hidden="true">{host.displayName.charAt(0)}</span>;
}

/**
 * One button for every ride state. The phone opens Fluxgo when it is installed.
 * If not, the store opens. A computer has no app, so it goes to the web app.
 */
function appAction(kind, id) {
  if (kind === 'ios') {
    return {
      href: id ? `${OPEN_HOST_URL}/open/ride/${id}` : APP_STORE_URL,
      label: 'Open in the Fluxgo app',
      note: 'Opens Fluxgo if you have it. If not, the App Store opens.'
    };
  }
  if (kind === 'android') {
    return {
      href: id
        ? `intent://trip/${id}#Intent;scheme=fluxgo;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_URL)};end`
        : PLAY_STORE_URL,
      label: 'Open in the Fluxgo app',
      note: 'Opens Fluxgo if you have it. If not, Google Play opens.'
    };
  }
  return {
    href: id ? `${WEB_APP_URL}/trip/${id}` : WEB_APP_URL,
    label: 'Continue on the web',
    note: 'On a phone, open this link to use the Fluxgo app.'
  };
}

function Unavailable({ id, kind }) {
  const action = appAction(kind, id);
  return (
    <main className="fx-share fx-share-empty">
      <header className="fx-share-top"><Link href="/" aria-label="Fluxgo home"><Wordmark /></Link></header>
      <section className="fx-share-sheet">
        <h1>We could not load this ride</h1>
        <p>Try again in a minute, or open it in the Fluxgo app.</p>
        <a className="fx-share-btn" href={action.href}>{action.label}</a>
      </section>
    </main>
  );
}

export default async function RidePage({ params }) {
  const { publicId } = await params;
  const result = await loadRide(publicId);
  if (result.notFound) notFound();
  const kind = deviceKind((await headers()).get('user-agent') ?? '');
  if (!result.trip) return <Unavailable id={result.id} kind={kind} />;

  const { trip } = result;
  const action = appAction(kind, trip.publicId);
  const share = rideShareMessage(trip, `${SITE_URL}/ride/${trip.publicId}`);
  const closed = STATE_COPY[trip.state];
  const routeTime = duration(trip.routeDurationSeconds);
  const stops = [
    { key: 'from', label: trip.origin.label, city: trip.origin.city, time: rideTime(trip.departureAt) },
    ...trip.stops.map((stop, index) => ({ key: `stop-${index}`, label: stop.label, city: stop.city, time: null, middle: true })),
    { key: 'to', label: trip.destination.label, city: trip.destination.city, time: trip.estimatedArrivalAt ? `~${rideTime(trip.estimatedArrivalAt)}` : null }
  ];

  return (
    <main className="fx-share">
      <section className="fx-share-hero">
        <header className="fx-share-top">
          <Link href="/" aria-label="Fluxgo home"><Wordmark /></Link>
          <ShareRideButton text={share.text} url={share.url} />
        </header>
        <div className="fx-share-hero-copy">
          <p className="fx-share-date"><IconCalendar width={20} height={20} /><span>{rideDate(trip.departureAt)}</span><span className="fx-share-date-dot" aria-hidden="true">·</span><span>{rideTime(trip.departureAt)}</span></p>
          <h1 className="fx-share-title">
            <span>{trip.origin.city}</span>
            <IconArrow width={28} height={28} className="fx-share-title-arrow" />
            <span>{trip.destination.city}</span>
          </h1>
          {trip.state === 'OPEN' ? (
            <div className="fx-share-price">
              <strong>{rupees(trip.pricePerSeat)}</strong><span>per seat</span>
              <span className="fx-share-dot" aria-hidden="true" />
              <Seats available={trip.seatsAvailable} total={trip.seatsTotal} />
              <span>{trip.seatsAvailable} {trip.seatsAvailable === 1 ? 'seat' : 'seats'} left</span>
            </div>
          ) : null}
        </div>
      </section>

      <div className="fx-share-body">
        {closed ? (
          <section className="fx-share-card fx-share-closed" role="status">
            <h2>{closed.title}</h2>
            <p>{closed.body}</p>
          </section>
        ) : null}

        <section className="fx-share-card" aria-label="Route">
          <ol className="fx-share-route">
            {stops.map((stop) => (
              <li key={stop.key} className={stop.middle ? 'is-middle' : ''}>
                <span className="fx-share-route-time">{stop.time ?? ''}</span>
                <span className="fx-share-route-rail" aria-hidden="true"><i className="fx-share-route-pin" /></span>
                <span className="fx-share-route-place">
                  <strong>{stop.label}</strong>
                  {stop.city && stop.city !== stop.label ? <small>{stop.city}</small> : null}
                </span>
              </li>
            ))}
          </ol>
          {routeTime ? <p className="fx-share-route-foot"><IconClock width={16} height={16} />About {routeTime} on the road</p> : null}
        </section>

        {trip.vehicle ? (
          <section className="fx-share-card fx-share-vehicle" aria-label="Vehicle details">
            <p className="fx-share-label">Vehicle details</p>
            <div className="fx-share-vehicle-head">
              <CarArt color={trip.vehicle.color} />
              <div>
                <h2>{vehicleName(trip.vehicle)}</h2>
                {trip.vehicle.color ? (
                  <p className="fx-share-vehicle-color">
                    <i style={{ background: vehicleColorToHex(trip.vehicle.color) }} aria-hidden="true" />
                    {titleCase(trip.vehicle.color)}
                  </p>
                ) : null}
              </div>
            </div>
            <dl className="fx-share-vehicle-specs">
              {TYPE_LABELS[trip.vehicle.vehicleType] ? <div><dt>Type</dt><dd>{TYPE_LABELS[trip.vehicle.vehicleType]}</dd></div> : null}
              {FUEL_LABELS[trip.vehicle.fuelType] ? <div><dt>Fuel</dt><dd>{FUEL_LABELS[trip.vehicle.fuelType]}</dd></div> : null}
              {trip.vehicle.seatsTotal > 0 ? <div><dt>Max seats</dt><dd>{trip.vehicle.seatsTotal}</dd></div> : null}
              {trip.host?.vehicleVerified ? <div><dt>Registration</dt><dd className="fx-share-ok"><IconShield width={16} height={16} />Checked</dd></div> : null}
            </dl>
          </section>
        ) : null}

        {trip.host ? (
          <section className="fx-share-card fx-share-host" aria-label="Ride host">
            <div className="fx-share-host-row">
              <Avatar host={trip.host} />
              <div>
                <p className="fx-share-label">Ride host</p>
                <h2 className="fx-share-host-name">{trip.host.displayName}{trip.host.workEmailVerified ? <WorkEmailBadge /> : null}</h2>
                <p className="fx-share-host-stats">
                  <IconStar width={14} height={14} />
                  {trip.host.rating ? trip.host.rating.toFixed(1) : 'New'}
                  {' · '}{trip.host.reviewCount} {trip.host.reviewCount === 1 ? 'review' : 'reviews'}
                  {' · '}{trip.host.completedRides} {trip.host.completedRides === 1 ? 'ride' : 'rides'}
                </p>
              </div>
            </div>
            {trip.host.workEmailVerified ? (
              <p className="fx-share-legend"><WorkEmailBadge size={18} />This badge means the host verified a corporate email with Fluxgo.</p>
            ) : null}
          </section>
        ) : null}

        {trip.state === 'OPEN' ? (
          <section className="fx-share-card" aria-label="Ride details">
            <dl className="fx-share-facts">
              <div><dt><IconSeat width={16} height={16} />Booking</dt><dd>{trip.bookingMode === 'INSTANT' ? 'Instant book' : 'Request to book'}</dd></div>
              <div><dt><IconBag width={16} height={16} />Luggage</dt><dd>{luggageLabel(trip)}</dd></div>
              <div><dt><IconCalendar width={16} height={16} />Plan</dt><dd>{trip.tripCertainty === 'TENTATIVE' ? 'Tentative' : 'Confirmed'}</dd></div>
              <div><dt><IconSeat width={16} height={16} />Seats</dt><dd>{trip.seatsAvailable} of {trip.seatsTotal} left</dd></div>
            </dl>
          </section>
        ) : null}
      </div>

      <footer className="fx-share-bar">
        <div className="fx-share-bar-inner">
          <p className="fx-share-bar-note">{action.note}</p>
          <div className="fx-share-bar-actions is-single">
            <a className="fx-share-btn" href={action.href}>{action.label}</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
