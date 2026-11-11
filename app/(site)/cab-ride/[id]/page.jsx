import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Wordmark from '../../_components/Wordmark';
import { IconArrow, IconCalendar, IconCab, IconClock, IconSeat, IconShield, IconStar, IconUsers } from '../../_components/Icons';
import { ANDROID_PACKAGE, APP_STORE_ID, APP_STORE_URL, PARTNER_URL, PLAY_STORE_URL, SITE_URL, WEB_APP_URL } from '../../_components/links';
import { deviceKind } from '../../../../lib/app-links';
import ShareRideButton from '../../ride/[publicId]/ShareRideButton';
import { FUEL_LABELS, TYPE_LABELS, cabDate, cabShareMessage, cabSummary, cabTime, cabTitle, cabWindow, closedCopy, loadCabRide, rupees } from './cab-data';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const result = await loadCabRide(id);
  const base = { robots: { index: false, follow: false } };
  if (!result.ride) return { ...base, title: 'Cab | Fluxgo' };
  const { ride } = result;
  const title = `${cabTitle(ride)} · Fluxgo Cab`;
  const description = cabSummary(ride);
  const url = `${SITE_URL}/cab-ride/${ride.id}`;
  return {
    ...base,
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'Fluxgo', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
    itunes: { appId: APP_STORE_ID, appArgument: `fluxgo:///cab-ride/${ride.id}` }
  };
}

/**
 * The button opens the cab in the app (Cab is in app 1.3.0 and later). There is no universal link for cab rides yet,
 * so the phone uses the fluxgo:// scheme and the page also shows the store link.
 */
function appAction(kind, id) {
  if (kind === 'ios') return { href: `fluxgo:///cab-ride/${id}`, label: 'Book in the Fluxgo app', store: { href: APP_STORE_URL, label: 'Get Fluxgo on the App Store' } };
  if (kind === 'android') {
    return {
      href: `intent://cab-ride/${id}#Intent;scheme=fluxgo;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_URL)};end`,
      label: 'Book in the Fluxgo app',
      store: { href: PLAY_STORE_URL, label: 'Get Fluxgo on Google Play' }
    };
  }
  return { href: `${WEB_APP_URL}/cab-ride/${id}`, label: 'Book on the web', store: null };
}

function SeatDots({ left, total }) {
  return (
    <span className="fx-share-seatdots" aria-label={`${left} of ${total} seats left`}>
      {Array.from({ length: Math.max(0, total) }, (_, index) => <i key={index} className={index < left ? 'is-free' : ''} />)}
    </span>
  );
}

function Unavailable() {
  return (
    <main className="fx-share fx-share-empty">
      <header className="fx-share-top"><Link href="/" aria-label="Fluxgo home"><Wordmark /></Link></header>
      <section className="fx-share-sheet">
        <h1>We could not load this cab</h1>
        <p>Try again in a minute, or open the Cab tab in the Fluxgo app.</p>
        <a className="fx-share-btn" href={WEB_APP_URL}>Open Fluxgo</a>
      </section>
    </main>
  );
}

export default async function CabRidePage({ params }) {
  const { id } = await params;
  const result = await loadCabRide(id);
  if (result.notFound) notFound();
  if (!result.ride) return <Unavailable />;

  const { ride } = result;
  const kind = deviceKind((await headers()).get('user-agent') ?? '');
  const action = appAction(kind, ride.id);
  const share = cabShareMessage(ride, `${SITE_URL}/cab-ride/${ride.id}`);
  const closed = closedCopy(ride);
  const first = ride.pickups[0];
  const vehicleSpecs = ride.vehicle ? [TYPE_LABELS[ride.vehicle.type], FUEL_LABELS[ride.vehicle.fuel], ride.vehicle.colour].filter(Boolean) : [];

  return (
    <main className="fx-share">
      <section className="fx-share-hero">
        <header className="fx-share-top">
          <Link href="/" aria-label="Fluxgo home"><Wordmark /></Link>
          <ShareRideButton text={share.text} url={share.url} />
        </header>
        <div className="fx-share-hero-copy">
          <p className="fx-share-date">
            <IconCab width={20} height={20} /><span>Fluxgo Cab</span><span className="fx-share-date-dot" aria-hidden="true">·</span>
            <IconCalendar width={20} height={20} /><span>{cabDate(ride.slotStart)}</span>
            {first ? <><span className="fx-share-date-dot" aria-hidden="true">·</span><span>{cabWindow(first.windowStart, first.windowEnd)}</span></> : null}
          </p>
          <h1 className="fx-share-title">
            <span>{ride.from}</span>
            <IconArrow width={28} height={28} className="fx-share-title-arrow" />
            <span>{ride.to}</span>
          </h1>
          {!closed ? (
            <div className="fx-share-price">
              <strong>{rupees(ride.price)}</strong><span>a seat</span>
              <span className="fx-share-dot" aria-hidden="true" />
              <SeatDots left={ride.seatsLeft} total={ride.seats - ride.seatsOutside} />
              <span>{ride.seatsLeft} {ride.seatsLeft === 1 ? 'seat' : 'seats'} left</span>
            </div>
          ) : null}
        </div>
      </section>

      <div className="fx-share-body">
        {closed ? (
          <section className="fx-share-card fx-share-closed" role="status"><h2>{closed.title}</h2><p>{closed.body}</p></section>
        ) : (
          <section className="fx-share-card fx-share-cab-status" role="status">
            {ride.minimumMet
              ? <p><IconShield width={18} height={18} /><strong>Confirmed.</strong> This cab goes.</p>
              : <p><IconUsers width={18} height={18} /><strong>Goes when {ride.seatsNeeded} more {ride.seatsNeeded === 1 ? 'seat is' : 'seats are'} booked.</strong> If not, you get a free cancel.</p>}
          </section>
        )}

        <section className="fx-share-card" aria-label="Pickup and drop">
          <ol className="fx-share-route">
            {ride.pickups.map((point) => (
              <li key={point.id}>
                <span className="fx-share-route-time">{cabTime(point.windowStart)}</span>
                <span className="fx-share-route-rail" aria-hidden="true"><i className="fx-share-route-pin" /></span>
                <span className="fx-share-route-place"><strong>{point.name}</strong><small>Pickup{point.landmark ? ` · ${point.landmark}` : ''}</small></span>
              </li>
            ))}
            {ride.drops.map((point) => (
              <li key={point.id}>
                <span className="fx-share-route-time">~{cabTime(point.windowStart)}</span>
                <span className="fx-share-route-rail" aria-hidden="true"><i className="fx-share-route-pin" /></span>
                <span className="fx-share-route-place"><strong>{point.name}</strong><small>Drop{point.landmark ? ` · ${point.landmark}` : ''}</small></span>
              </li>
            ))}
          </ol>
          <p className="fx-share-route-foot"><IconClock width={16} height={16} />The driver waits 10 min at each pickup.</p>
        </section>

        {ride.vehicle ? (
          <section className="fx-share-card fx-share-vehicle" aria-label="Vehicle">
            <p className="fx-share-label">Vehicle</p>
            <h2>{[ride.vehicle.make, ride.vehicle.model].filter(Boolean).join(' ')}</h2>
            {vehicleSpecs.length ? <p className="fx-share-vehicle-color">{vehicleSpecs.join(' · ')}</p> : null}
            <p className="fx-share-legend">You see the number plate after you book.</p>
          </section>
        ) : null}

        {ride.partner ? (
          <section className="fx-share-card fx-share-host" aria-label="Driver">
            <div className="fx-share-host-row">
              <span className="fx-share-avatar" aria-hidden="true">{(ride.partner.firstName || 'F').charAt(0)}</span>
              <div>
                <p className="fx-share-label">Driver</p>
                <h2 className="fx-share-host-name">{ride.partner.firstName || 'Fluxgo partner'}</h2>
                <p className="fx-share-host-stats">
                  <IconStar width={14} height={14} />
                  {ride.partner.rating ? ride.partner.rating.toFixed(1) : 'New'}
                  {' · '}{ride.partner.trips} {ride.partner.trips === 1 ? 'trip' : 'trips'}
                </p>
                <p className="fx-share-host-stats"><IconShield width={14} height={14} />Licence, RC, and insurance checked by Fluxgo</p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="fx-share-card" aria-label="How it works">
          <dl className="fx-share-facts">
            <div><dt><IconSeat width={16} height={16} />Payment</dt><dd>Cash to the driver</dd></div>
            <div><dt><IconClock width={16} height={16} />Cancel</dt><dd>Free until 2 h before pickup</dd></div>
            <div><dt><IconUsers width={16} height={16} />Travellers</dt><dd>{ride.seatsBooked} booked{ride.women ? ` · ${ride.women} ${ride.women === 1 ? 'woman' : 'women'}` : ''}</dd></div>
            <div><dt><IconShield width={16} height={16} />Boarding</dt><dd>Show your 4-digit code</dd></div>
          </dl>
        </section>

        <section className="fx-share-card fx-share-more" aria-label="More from Fluxgo">
          <div className="fx-share-more-row">
            <IconUsers width={20} height={20} />
            <div>
              <h2>Travel between cities with Fluxgo</h2>
              <p>Carpool and cab seats with checked members and drivers.</p>
              <p className="fx-share-more-links">
                <a href={APP_STORE_URL}>App Store</a><span aria-hidden="true">·</span><a href={PLAY_STORE_URL}>Google Play</a><span aria-hidden="true">·</span><a href={WEB_APP_URL}>Web</a>
              </p>
            </div>
          </div>
          <div className="fx-share-more-row">
            <IconCab width={20} height={20} />
            <div>
              <h2>Run a cab? Become a Fluxgo partner</h2>
              <p>Post your rides and fill empty seats. Join at <a href={PARTNER_URL}>{PARTNER_URL.replace('https://', '')}</a></p>
            </div>
          </div>
        </section>
      </div>

      <footer className="fx-share-bar">
        <div className="fx-share-bar-inner">
          <p className="fx-share-bar-note">{action.store ? <>No app yet? <a href={action.store.href}>{action.store.label}</a></> : 'On a phone, open this link to book in the Fluxgo app.'}</p>
          <div className="fx-share-bar-actions is-single">
            <a className="fx-share-btn" href={action.href}>{closed ? 'See other cabs' : action.label}</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
