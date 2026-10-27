'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { auditDetails, InternalTag, IssueChips, RecordLink, Stars } from '../_config/sections';
import { filterSummary } from '../_lib/audience';
import { errorText, isSessionExpired, queryString, requestApi } from '../_lib/api';
import {
  ageFromDob,
  auditActionLabel,
  bookingActorLabel,
  cancellationReasonLabel,
  HOST_REMOVAL_REASONS,
  PASSENGER_CANCEL_REASONS,
  RIDE_CANCEL_REASONS,
  display,
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  issueLabel,
  ONBOARDING_STEP_TOTAL,
  onboardingProgress,
  plural,
  relativeTime,
  RELATIONSHIP_LABELS,
  rideLink,
  RESOURCE_LABELS,
  SAFETY_ISSUES,
  statusLabel,
} from '../_lib/format';
import { useDebounced, useNow } from '../_lib/hooks';
import { useLiveRefresh } from '../_lib/live';
import { DataTable } from './DataTable';
import { SupportConversation } from './Support';
import { Avatar, Badge, Button, ConfirmDialog, CopyButton, Detail, EmptyState, Field, Icon, IconButton, Mono, RideLinkActions, Section, Skeleton, useToast, VerifiedMark } from './ui';


const KIND_LABELS = { member: 'Member', trip: 'Ride', booking: 'Booking', support: 'Support ticket', review: 'Review', audit: 'Audit entry', send: 'Notification' };

/** Load one record and refresh it while the panel is open. */
function useRecord(path, key, liveKeys) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(path));
  const sequence = useRef(0);
  const load = useCallback(async () => {
    if (!path) return;
    const id = ++sequence.current;
    try {
      const result = await requestApi(path);
      if (id !== sequence.current) return;
      setData(key ? result?.[key] || null : result || null);
      setError('');
    } catch (requestError) {
      if (id !== sequence.current || isSessionExpired(requestError)) return;
      setError(errorText(requestError));
    } finally {
      if (id === sequence.current) setLoading(false);
    }
  }, [path, key]);
  useEffect(() => { setData(null); setLoading(Boolean(path)); void load(); }, [load]);
  useLiveRefresh(liveKeys, () => { void load(); }, Boolean(path));
  return { data, error, loading, reload: load };
}

export function RecordPanel(props) {
  const { kind } = props;
  if (kind === 'member') return <MemberPanel {...props} />;
  if (kind === 'trip') return <TripPanel {...props} />;
  if (kind === 'booking') return <BookingPanel {...props} />;
  if (kind === 'support') return <SupportPanel {...props} />;
  if (kind === 'review') return <ReviewPanel {...props} />;
  if (kind === 'audit') return <AuditPanel {...props} />;
  if (kind === 'send') return <SendPanel {...props} />;
  return null;
}

function PanelHeader({ kind, title, subtitle, badges, onClose, onBack, linkParams, avatar, avatarSrc, actions }) {
  const [copied, setCopied] = useState(false);
  const copyLink = async () => {
    const url = new URL(window.location.href);
    Object.entries(linkParams || {}).forEach(([key, value]) => url.searchParams.set(key, value));
    try { await navigator.clipboard.writeText(url.toString()); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* clipboard blocked */ }
  };
  return (
    <header className="ax-panel-head">
      <div className="ax-panel-head-bar">
        {onBack ? <Button size="sm" variant="ghost" icon="arrowLeft" onClick={onBack}>Back</Button> : <span className="ax-panel-kind">{KIND_LABELS[kind]}</span>}
        <div className="ax-panel-head-actions">
          {actions}
          {linkParams ? <IconButton icon={copied ? 'check' : 'external'} label={copied ? 'Link copied' : 'Copy link to this record'} onClick={copyLink} /> : null}
          <IconButton icon="close" label="Close panel (Esc)" onClick={onClose} />
        </div>
      </div>
      <div className="ax-panel-title">
        {avatar ? <Avatar name={avatar} src={avatarSrc} size="lg" /> : null}
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
          {badges ? <div className="ax-panel-badges">{badges}</div> : null}
        </div>
      </div>
    </header>
  );
}

function PanelState({ loading, error, data, onRetry, children }) {
  if (error && !data) return <div className="ax-panel-body"><EmptyState icon="alert" title="We could not load this record" action={<Button size="sm" onClick={onRetry}>Try again</Button>}>{error}</EmptyState></div>;
  if (loading && !data) {
    return (
      <div className="ax-panel-body" aria-busy="true">
        <div className="ax-panel-loading">{[80, 55, 70, 40, 65, 50].map((width, index) => <Skeleton key={index} width={`${width}%`} height={14} />)}</div>
      </div>
    );
  }
  if (!data) return <div className="ax-panel-body"><EmptyState title="Record not found" /></div>;
  return children;
}

function StatTile({ label, value, tone, onClick, hint }) {
  const content = <><strong>{value}</strong><span>{label}</span>{hint ? <span className="ax-stat-hint">{hint}</span> : null}</>;
  return onClick
    ? <button type="button" className={`ax-stat-tile is-link${tone ? ` is-${tone}` : ''}`} onClick={onClick}>{content}</button>
    : <div className={`ax-stat-tile${tone ? ` is-${tone}` : ''}`}>{content}</div>;
}

function MiniList({ items, empty, render }) {
  if (!items?.length) return <p className="ax-muted ax-mini-empty">{empty}</p>;
  return <ul className="ax-mini-list">{items.map(render)}</ul>;
}

function MemberPanel({ id, seed, onClose, onBack, open, navigate }) {
  const now = useNow();
  const { data, error, loading, reload } = useRecord(`/admin/members/${encodeURIComponent(id)}`, 'member', ['members', 'trips', 'bookings', 'support', 'reviews', 'vehicles']);
  const reviews = data?.reviewsReceived;
  // Lists hide internal members by default. Keep this member's own records visible.
  const internalScope = data?.isInternal ? { internal: 'include' } : {};
  return (
    <>
      <PanelHeader kind="member" title={<>{display(data?.name || seed?.name || 'Member')}<VerifiedMark show={data ? data.isVerified : seed?.isVerified} size={16} /></>} avatar={data?.name || seed?.name} avatarSrc={data ? data.profilePhotoUrl : seed?.profilePhotoUrl}
        subtitle={data ? `Joined ${relativeTime(data.createdAt, now)} · ${statusLabel(data.onboardingIntent)}` : null}
        badges={data ? <><Badge value={data.status} />{data.isInternal ? <Badge tone="neutral" title="Fluxgo team or test account. Lists hide this member by default.">Internal</Badge> : null}{data.workEmailStatus ? <Badge value={data.workEmailStatus}>Work email {statusLabel(data.workEmailStatus).toLowerCase()}</Badge> : <Badge tone="neutral">No work email</Badge>}</> : null}
        onClose={onClose} onBack={onBack} linkParams={{ open: `member:${id}` }} />
      <PanelState loading={loading} error={error} data={data} onRetry={reload}>
        {data ? (
          <div className="ax-panel-body">
            <div className="ax-contact-row">
              {data.mobile ? <a className="ax-contact" href={`tel:${data.mobile}`}><Icon name="phone" size={14} /><span className="ax-mono">{data.mobile}</span></a> : null}
              {data.mobile ? <CopyButton value={data.mobile} label="Copy mobile" /> : null}
              {data.personalEmail ? <a className="ax-contact" href={`mailto:${data.personalEmail}`}><Icon name="mail" size={14} /><span>{data.personalEmail}</span></a> : null}
            </div>
            <div className="ax-stat-grid">
              {/* An older API has no ridesCompleted. Then show the published and booked counts as before. */}
              {data.ridesCompleted ? <>
                <StatTile label="Rides completed as driver" value={formatNumber(data.ridesCompleted.asDriver)} onClick={data.ridesCompleted.asDriver ? () => navigate('trips', { status: 'COMPLETED', driverUserId: data.id, driverName: data.name || 'Member', ...internalScope }) : undefined} />
                <StatTile label="Rides completed as passenger" value={formatNumber(data.ridesCompleted.asPassenger)} onClick={data.ridesCompleted.asPassenger ? () => navigate('bookings', { status: 'COMPLETED', memberId: data.id, memberName: data.name || 'Member', ...internalScope }) : undefined} />
              </> : <>
                <StatTile label="Rides as driver" value={formatNumber(data.tripCount)} onClick={data.tripCount ? () => navigate('trips', { driverUserId: data.id, driverName: data.name || 'Member', ...internalScope }) : undefined} />
                <StatTile label="Bookings" value={formatNumber(data.bookingCount)} onClick={data.bookingCount ? () => navigate('bookings', { memberId: data.id, memberName: data.name || 'Member', ...internalScope }) : undefined} />
              </>}
              <StatTile label={reviews?.count ? `Rating · ${plural(reviews.count, 'review')}` : 'No reviews yet'} value={reviews?.averageRating ? reviews.averageRating.toFixed(1) : '—'} onClick={reviews?.count ? () => navigate('safety', { memberId: data.id, memberName: data.name || 'Member', ...internalScope }) : undefined} />
              <StatTile label="Safety reports" value={formatNumber(reviews?.safetyReports ?? 0)} tone={reviews?.safetyReports ? 'danger' : undefined} onClick={reviews?.safetyReports ? () => navigate('safety', { issues: 'SAFETY', memberId: data.id, memberName: data.name || 'Member', ...internalScope }) : undefined} />
              <StatTile label="Blocked by members" value={formatNumber(data.blocks?.blockedByOthers ?? 0)} tone={data.blocks?.blockedByOthers ? 'warning' : undefined} />
              <StatTile label="Issue reports" value={formatNumber(reviews?.issueReports ?? 0)} />
            </div>
            <Section title="Profile">
              <dl className="ax-detail-grid">
                <Detail label="Member ID"><Mono value={data.id} /></Detail>
                <Detail label="Sign-in">{statusLabel(data.authProvider)}</Detail>
                <Detail label="Gender">{data.gender ? statusLabel(data.gender) : null}</Detail>
                <Detail label="Age">{data.dob ? <AgeDetail dob={data.dob} /> : null}</Detail>
                {/* The address and domain exist from backend migration 0069. An older server or an older verification has none. */}
                <Detail label="Work email">{data.workEmail
                  ? <span className="ax-inline"><a href={`mailto:${data.workEmail}`}>{data.workEmail}</a><CopyButton value={data.workEmail} label="Copy work email" /></span>
                  : data.workEmailStatus === 'VERIFIED' ? <span className="ax-muted">Verified before the address was stored</span>
                  : data.workEmailStatus ? <Badge value={data.workEmailStatus} /> : 'Not added'}</Detail>
                {data.workEmailDomain ? <Detail label="Company domain"><span className="ax-mono">{data.workEmailDomain}</span></Detail> : null}
                <Detail label="Personal email">{data.personalEmailStatus ? <Badge value={data.personalEmailStatus} /> : 'Not added'}</Detail>
                <Detail label="Onboarding"><OnboardingDetail member={data} /></Detail>
                <Detail label="Updated">{formatDateTime(data.updatedAt)}</Detail>
              </dl>
            </Section>
            {data.trustedContact !== undefined ? <TrustedContactSection memberId={data.id} contact={data.trustedContact} /> : null}
            {reviews?.recent ? (
              <Section title="Reviews about this member" count={reviews.count} action={reviews.count > reviews.recent.length ? <Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => navigate('safety', { revieweeId: data.id, revieweeName: data.name || 'Member', ...internalScope })}>All reviews</Button> : null}>
                <ReviewMiniList items={reviews.recent} side="reviewer" empty="No reviews yet." open={open} now={now} />
              </Section>
            ) : null}
            {data.reviewsGiven ? (
              <Section title="Reviews written by this member" count={data.reviewsGiven.count} action={data.reviewsGiven.count > data.reviewsGiven.recent.length ? <Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => navigate('safety', { reviewerId: data.id, reviewerName: data.name || 'Member', ...internalScope })}>All reviews</Button> : null}>
                {data.reviewsGiven.averageRating ? <p className="ax-muted ax-small ax-section-note">Average rating given: {data.reviewsGiven.averageRating.toFixed(1)}</p> : null}
                <ReviewMiniList items={data.reviewsGiven.recent} side="reviewee" empty="No reviews written." open={open} now={now} />
              </Section>
            ) : null}
            <Section title="Vehicles" count={data.vehicles?.length || 0}>
              <MiniList items={data.vehicles} empty="No vehicles." render={(vehicle) => (
                <li key={vehicle.id} className="ax-mini-item is-static">
                  <span className="ax-mini-main"><strong>{vehicle.make} {vehicle.model}</strong><span className="ax-muted">{[vehicle.color, statusLabel(vehicle.vehicleType), `${vehicle.seatsTotal} seats`].filter(Boolean).join(' · ')}</span></span>
                  <span className="ax-mini-side"><span className="ax-mono ax-small">{vehicle.registrationNumber}</span><Badge value={vehicle.verificationStatus} />{vehicle.status !== 'ACTIVE' ? <Badge value={vehicle.status} /> : null}</span>
                </li>
              )} />
            </Section>
            <Section title="Recent rides as driver" count={data.tripCount} action={data.tripCount > (data.recentTrips?.length || 0) ? <Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => navigate('trips', { driverUserId: data.id, driverName: data.name || 'Member', ...internalScope })}>All rides</Button> : null}>
              <MiniList items={data.recentTrips} empty="No rides published." render={(trip) => (
                <li key={trip.id} className="ax-mini-row"><button type="button" className="ax-mini-item" onClick={() => open('trip', trip.id)}>
                  <span className="ax-mini-main"><strong>{trip.origin} → {trip.destination}</strong><span className="ax-muted">{formatDateTime(trip.departureAt)} · {trip.seatsTotal - trip.seatsAvailable}/{trip.seatsTotal} booked</span></span>
                  <span className="ax-mini-side"><Badge value={trip.status} /><Icon name="chevronRight" size={14} /></span>
                </button><RideLinkActions publicId={trip.publicId} /></li>
              )} />
            </Section>
            <Section title="Recent bookings" count={data.bookingCount} action={data.bookingCount > (data.recentBookings?.length || 0) ? <Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => navigate('bookings', { memberId: data.id, memberName: data.name || 'Member', ...internalScope })}>All bookings</Button> : null}>
              <MiniList items={data.recentBookings} empty="No bookings." render={(booking) => (
                <li key={booking.id} className="ax-mini-row"><button type="button" className="ax-mini-item" onClick={() => open('booking', booking.id)}>
                  <span className="ax-mini-main"><strong>{booking.route.replace(' to ', ' → ')}</strong><span className="ax-muted">{formatDateTime(booking.departureAt)} · {plural(booking.passengerCount, 'seat')} · {formatMoney(booking.totalPrice)}</span></span>
                  <span className="ax-mini-side"><Badge value={booking.status} /><Icon name="chevronRight" size={14} /></span>
                </button><RideLinkActions publicId={booking.tripPublicId} /></li>
              )} />
            </Section>
            <Section title="Support tickets" count={data.supportTickets?.length || 0}>
              <MiniList items={data.supportTickets} empty="No support tickets." render={(ticket) => (
                <li key={ticket.id}><button type="button" className="ax-mini-item" onClick={() => open('support', ticket.id)}>
                  <span className="ax-mini-main"><strong>{ticket.subject}</strong><span className="ax-muted">{ticket.publicId} · updated {relativeTime(ticket.updatedAt, now)}</span></span>
                  <span className="ax-mini-side"><Badge value={ticket.status} /><Icon name="chevronRight" size={14} /></span>
                </button></li>
              )} />
            </Section>
            <div className="ax-panel-actions">
              <Button icon="bell" onClick={() => navigate('notify', { to: data.id, toName: data.name || data.mobile })} disabled={data.status !== 'ACTIVE'}>Send a notification</Button>
              <MemberStatusAction member={data} onDone={reload} />
              <MemberInternalAction member={data} onDone={reload} />
            </div>
          </div>
        ) : null}
      </PanelState>
    </>
  );
}

function TripPanel({ id, seed, onClose, onBack, open, navigate }) {
  const now = useNow();
  const { data, error, loading, reload } = useRecord(`/admin/trips/${encodeURIComponent(id)}`, 'trip', ['trips', 'bookings']);
  const head = data || seed;
  const booked = data ? data.seatsTotal - data.seatsAvailable : 0;
  return (
    <>
      <PanelHeader kind="trip" title={head ? `${head.origin} → ${head.destination}` : 'Ride'}
        subtitle={data ? <>{data.publicId} · departs {formatDateTime(data.departureAt)} <span className="ax-muted">({relativeTime(data.departureAt, now)})</span></> : null}
        badges={data ? <><Badge value={data.status} /><Badge value={data.bookingMode} tone="neutral" dot={false} /></> : null}
        actions={<RideLinkActions publicId={head?.publicId} text="Copy ride link" openLink={false} />}
        onClose={onClose} onBack={onBack} linkParams={{ open: `trip:${id}` }} />
      <PanelState loading={loading} error={error} data={data} onRetry={reload}>
        {data ? (
          <div className="ax-panel-body">
            <div className="ax-stat-grid is-four">
              <StatTile label="Seats booked" value={`${booked}/${data.seatsTotal}`} />
              <StatTile label="Fare per seat" value={formatMoney(data.pricePerSeat)} />
              <StatTile label="Bookings" value={formatNumber(data.bookingCount)} onClick={data.bookingCount ? () => navigate('bookings', { tripId: data.id, tripRef: data.publicId }) : undefined} />
              <StatTile label="Views" value={data.viewCount == null ? '–' : formatNumber(data.viewCount)}
                hint={data.viewSources && data.viewCount ? `${formatNumber(data.viewSources.searchCard)} in search · ${formatNumber(data.viewSources.rideDetails)} opened` : null} />
            </div>
            <Section title="Route">
              <ol className="ax-route-steps">
                <li><span className="ax-route-dot" aria-hidden="true" /><div><strong>{data.originLabel}</strong><span className="ax-muted">{data.originCity}</span></div></li>
                <li><span className="ax-route-dot is-end" aria-hidden="true" /><div><strong>{data.destinationLabel}</strong><span className="ax-muted">{data.destinationCity}</span></div></li>
              </ol>
            </Section>
            <Section title="Details">
              <dl className="ax-detail-grid">
                <Detail label="Driver"><RecordLink onOpen={() => open('member', data.driverUserId)}>{display(data.driverName)}</RecordLink><VerifiedMark show={data.driverVerified} /></Detail>
                <Detail label="Vehicle">{data.vehicle ? <span>{data.vehicle.make} {data.vehicle.model} <span className="ax-mono ax-small">{data.vehicle.registrationNumber}</span></span> : null}</Detail>
                <Detail label="Vehicle check">{data.vehicle ? <Badge value={data.vehicle.verificationStatus} /> : null}</Detail>
                <Detail label="Departure">{formatDateTime(data.departureAt)}</Detail>
                <Detail label="Completed">{data.completedAt ? formatDateTime(data.completedAt) : null}</Detail>
                <Detail label="Cancellation reason">{cancellationReasonLabel(data.cancellationReason)}</Detail>
                <Detail label="Ride note" full>{data.rideNote ? <span className="ax-prewrap">{data.rideNote}</span> : null}</Detail>
                <Detail label="Published">{formatDateTime(data.createdAt)}</Detail>
                <Detail label="Ride ID"><Mono value={data.id} /></Detail>
                <Detail label="Public ride page" full><span className="ax-ride-url"><a href={rideLink(data.publicId)} target="_blank" rel="noopener noreferrer">{rideLink(data.publicId)}</a><CopyButton value={rideLink(data.publicId)} label="Copy ride link" icon="link" /></span></Detail>
              </dl>
            </Section>
            <Section title="Bookings" count={data.bookings?.length || 0}>
              <MiniList items={data.bookings} empty="No bookings yet." render={(booking) => (
                <li key={booking.id}><button type="button" className="ax-mini-item" onClick={() => open('booking', booking.id)}>
                  <span className="ax-mini-main"><strong>{display(booking.bookedByName)}<VerifiedMark show={booking.bookedByVerified} /></strong><span className="ax-muted">{booking.publicId} · {plural(booking.passengerCount, 'seat')} · {formatMoney(booking.totalPrice)} · {relativeTime(booking.createdAt, now)}</span>{booking.cancellationReason ? <span className="ax-cancel-line">{cancellationReasonLabel(booking.cancellationReason)}{booking.cancellationNote ? <> · “{booking.cancellationNote}”</> : null}</span> : null}</span>
                  <span className="ax-mini-side"><Badge value={booking.status} /><Icon name="chevronRight" size={14} /></span>
                </button></li>
              )} />
            </Section>
            {data.status === 'PUBLISHED' ? <div className="ax-panel-actions"><TripCancelAction trip={data} onDone={reload} /></div> : null}
            {data.status === 'IN_PROGRESS' ? <div className="ax-panel-actions"><TripCompleteAction trip={data} onDone={reload} /></div> : null}
          </div>
        ) : null}
      </PanelState>
    </>
  );
}

function BookingPanel({ id, seed, onClose, onBack, open }) {
  const now = useNow();
  const { data, error, loading, reload } = useRecord(`/admin/bookings/${encodeURIComponent(id)}`, 'booking', ['bookings', 'trips']);
  return (
    <>
      <PanelHeader kind="booking" title={data ? `${data.pickup?.city || ''} → ${data.drop?.city || ''}`.trim() : 'Booking'}
        subtitle={data ? <>{data.publicId} · booked {relativeTime(data.createdAt, now)} by {display(data.bookedByName)}</> : null}
        badges={data ? <><Badge value={data.status} />{data.paymentStatus && data.paymentStatus !== 'NOT_REQUIRED' ? <Badge value={data.paymentStatus} /> : null}</> : null}
        actions={<RideLinkActions publicId={data?.tripPublicId || seed?.tripPublicId} text="Copy ride link" openLink={false} />}
        onClose={onClose} onBack={onBack} linkParams={{ open: `booking:${id}` }} />
      <PanelState loading={loading} error={error} data={data} onRetry={reload}>
        {data ? (
          <div className="ax-panel-body">
            <BookingOutcome booking={data} />
            <div className="ax-stat-grid is-3">
              <StatTile label="Seats" value={formatNumber(data.passengerCount)} />
              <StatTile label="Total" value={formatMoney(data.totalPrice, data.currency)} />
              <StatTile label="Departure" value={relativeTime(data.tripDepartureAt, now)} />
            </div>
            <Section title="Trip">
              <ol className="ax-route-steps">
                <li><span className="ax-route-dot" aria-hidden="true" /><div><strong>{data.pickup.label}</strong><span className="ax-muted">{data.pickup.address || data.pickup.city}</span></div></li>
                <li><span className="ax-route-dot is-end" aria-hidden="true" /><div><strong>{data.drop.label}</strong><span className="ax-muted">{data.drop.address || data.drop.city}</span></div></li>
              </ol>
              <dl className="ax-detail-grid">
                <Detail label="Ride"><RecordLink onOpen={() => open('trip', data.tripId)}><span className="ax-mono">{data.tripPublicId}</span></RecordLink><RideLinkActions publicId={data.tripPublicId} /></Detail>
                <Detail label="Driver"><RecordLink onOpen={() => open('member', data.driverUserId)}>Open driver</RecordLink></Detail>
                <Detail label="Booker"><RecordLink onOpen={() => open('member', data.bookedByUserId)}>{display(data.bookedByName)}</RecordLink><VerifiedMark show={data.bookedByVerified} /></Detail>
                <Detail label="Booker travels">{data.bookerTravels ? 'Yes' : 'No'}</Detail>
                <Detail label="Seat preference">{statusLabel(data.seatPreference)}</Detail>
                <Detail label="Luggage">{data.luggageCount ? `${data.luggageCount} · ${statusLabel(data.luggageSize)}` : 'None'}</Detail>
                <Detail label="Price per seat">{formatMoney(data.pricePerSeat, data.currency)}</Detail>
                <Detail label="Departure">{formatDateTime(data.tripDepartureAt)}</Detail>
                <Detail label="Note to driver" full>{data.noteToDriver}</Detail>
              </dl>
            </Section>
            <Section title="Travellers" count={data.passengers?.length || 0}>
              <MiniList items={data.passengers} empty="No traveller details." render={(passenger) => (
                <li key={passenger.id} className="ax-mini-item is-static">
                  <span className="ax-mini-main"><strong>{passenger.userId ? <RecordLink onOpen={() => open('member', passenger.userId)}>{passenger.name}</RecordLink> : passenger.name}</strong><span className="ax-muted">{[statusLabel(passenger.ageBucket), passenger.gender ? statusLabel(passenger.gender) : null].filter(Boolean).join(' · ')}</span></span>
                </li>
              )} />
            </Section>
            <Section title="History">
              {data.events?.length ? (
                <ol className="ax-timeline">
                  {data.events.map((event) => (
                    <li key={event.id}>
                      <span className="ax-timeline-dot" aria-hidden="true" />
                      <div><strong>{event.fromStatus ? `${statusLabel(event.fromStatus)} → ${statusLabel(event.toStatus)}` : statusLabel(event.toStatus)}</strong><span className="ax-muted">{[formatDateTime(event.occurredAt), `by ${bookingActorLabel(event).toLowerCase()}`, cancellationReasonLabel(event.cancellationReason)].filter(Boolean).join(' · ')}</span></div>
                    </li>
                  ))}
                </ol>
              ) : <p className="ax-muted ax-mini-empty">No events.</p>}
            </Section>
            <BookingActions booking={data} onDone={reload} />
          </div>
        ) : null}
      </PanelState>
    </>
  );
}

const ACTIVE_BOOKING_STATUSES = new Set(['REQUESTED', 'CONFIRMED']);

/** Age in full years, then the date of birth. */
function AgeDetail({ dob }) {
  const age = ageFromDob(dob);
  return <span>{age === null ? '' : `${age} yrs `}<span className="ax-muted">({formatDate(`${dob.slice(0, 10)}T00:00:00`)})</span></span>;
}

/**
 * The member's trusted contact. The detail has the last 4 digits only.
 * "Show number" reads the full number from a route that writes an audit entry.
 */
function TrustedContactSection({ memberId, contact }) {
  const [phone, setPhone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setPhone(null); setError(''); }, [memberId, contact?.updatedAt]);
  const reveal = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await requestApi(`/admin/members/${encodeURIComponent(memberId)}/trusted-contact`);
      setPhone(result?.trustedContact?.phone || '');
    } catch (requestError) {
      if (!isSessionExpired(requestError)) setError(errorText(requestError));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Section title="Trusted contact">
      {contact ? (
        <dl className="ax-detail-grid">
          <Detail label="Name">{contact.name}</Detail>
          <Detail label="Relationship">{RELATIONSHIP_LABELS[contact.relationship] || statusLabel(contact.relationship)}</Detail>
          <Detail label="Phone" full>
            {phone ? (
              <span className="ax-contact-row">
                <a className="ax-contact" href={`tel:${phone}`}><Icon name="phone" size={14} /><span className="ax-mono">{phone}</span></a>
                <CopyButton value={phone} label="Copy number" />
              </span>
            ) : (
              <span className="ax-contact-row">
                <span className="ax-mono">•••• {contact.phoneLast4}</span>
                <Button size="sm" variant="ghost" icon="eye" busy={busy} onClick={reveal}>Show number</Button>
              </span>
            )}
            {error ? <span className="ax-field-error" role="alert">{error}</span> : null}
          </Detail>
          <Detail label="Updated">{formatDateTime(contact.updatedAt)}</Detail>
        </dl>
      ) : <p className="ax-muted ax-mini-empty">Not added.</p>}
      {contact && !phone ? <p className="ax-muted ax-small ax-section-note">The audit log records who shows the number.</p> : null}
    </Section>
  );
}

/** Recent reviews in the member panel. side is the other member to name: the reviewer or the reviewee. */
function ReviewMiniList({ items, side, empty, open, now }) {
  return (
    <MiniList items={items} empty={empty} render={(review) => {
      const name = side === 'reviewer' ? review.reviewerName : review.revieweeName;
      const verified = side === 'reviewer' ? review.reviewerVerified : review.revieweeVerified;
      return (
        <li key={review.id}><button type="button" className="ax-mini-item" onClick={() => open('review', review.id, review)}>
          <span className="ax-mini-main">
            <strong className="ax-review-line"><Stars rating={review.rating} /><span>{side === 'reviewer' ? 'From' : 'About'} {display(name)}</span><VerifiedMark show={verified} /></strong>
            <span className="ax-muted ax-truncate">{[review.comment ? `“${review.comment}”` : null, review.tripPublicId, relativeTime(review.submittedAt, now)].filter(Boolean).join(' · ')}</span>
            {review.issueCodes.length ? <IssueChips codes={review.issueCodes} limit={2} /> : null}
          </span>
          <span className="ax-mini-side">{review.isVisible ? null : <Badge tone="warning">Hidden</Badge>}<Icon name="chevronRight" size={14} /></span>
        </button></li>
      );
    }} />
  );
}

function OnboardingDetail({ member }) {
  if (member.status === 'DELETED') return null;
  const progress = onboardingProgress(member.onboardingStep);
  if (!progress) return null;
  if (progress.completed) return <Badge tone="success">Completed</Badge>;
  return <span>{progress.doneCount} of {ONBOARDING_STEP_TOTAL} steps done · next: {progress.next.toLowerCase()}</span>;
}

/** Mark a member as internal (team or test account) or external. Lists hide internal members by default. */
function MemberInternalAction({ member, onDone }) {
  const notify = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const marking = !member.isInternal;
  const close = () => { setOpen(false); setReason(''); };
  const submit = async () => {
    setBusy(true);
    try {
      await requestApi(`/admin/members/${encodeURIComponent(member.id)}/internal`, {
        method: 'PATCH',
        body: JSON.stringify({ isInternal: marking, reason: reason.trim() || undefined }),
      });
      notify(marking ? 'Marked as internal. Lists and counts now hide this member by default.' : 'Marked as external. Lists and counts include this member again.');
      close();
      await onDone?.();
    } catch (requestError) {
      if (!isSessionExpired(requestError)) notify(errorText(requestError), 'danger');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>{marking ? 'Mark as internal' : 'Mark as external'}</Button>
      <ConfirmDialog open={open} busy={busy} tone="primary"
        title={marking ? `Mark ${display(member.name)} as internal?` : `Mark ${display(member.name)} as external?`}
        confirmLabel={marking ? 'Mark as internal' : 'Mark as external'} onCancel={close} onConfirm={submit}
        description={marking
          ? 'Use this for Fluxgo team and test accounts. Lists, counts, and dashboards hide this member and their rides, bookings, vehicles, tickets, and reviews unless an admin turns on "Show internal". The app does not change for the member.'
          : 'Lists, counts, and dashboards include this member and their activity again.'}>
        <div className="ax-form-stack">
          <Field label="Note (optional, goes to the audit log)" htmlFor="member-internal-reason">
            <textarea id="member-internal-reason" rows={2} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder={marking ? 'For example: team test account' : ''} data-autofocus />
          </Field>
        </div>
      </ConfirmDialog>
    </>
  );
}

/** Suspend or reactivate a member. Suspension needs a reason. */
function MemberStatusAction({ member, onDone }) {
  const notify = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [cancelRides, setCancelRides] = useState(true);
  const [busy, setBusy] = useState(false);
  if (member.status === 'DELETED') return null;
  const suspending = member.status === 'ACTIVE';
  const upcoming = (member.recentTrips || []).filter((trip) => trip.status === 'PUBLISHED' && new Date(trip.departureAt).getTime() > Date.now()).length;
  const close = () => { setOpen(false); setReason(''); };
  const submit = async () => {
    if (suspending && !reason.trim()) return;
    setBusy(true);
    try {
      const result = await requestApi(`/admin/members/${encodeURIComponent(member.id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: suspending ? 'SUSPENDED' : 'ACTIVE', reason: reason.trim() || undefined, cancelUpcomingRides: suspending ? cancelRides : false }),
      });
      notify(suspending
        ? `Member suspended. ${plural(result?.sessionsEnded ?? 0, 'session')} ended${result?.ridesCancelled ? `, ${plural(result.ridesCancelled, 'ride')} cancelled` : ''}.`
        : 'Member reactivated. They can sign in again.');
      close();
      await onDone?.();
    } catch (requestError) {
      if (!isSessionExpired(requestError)) notify(errorText(requestError), 'danger');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button variant={suspending ? 'ghost' : 'secondary'} className={suspending ? 'is-danger-text' : ''} onClick={() => setOpen(true)}>{suspending ? 'Suspend member' : 'Reactivate member'}</Button>
      <ConfirmDialog open={open} busy={busy} tone={suspending ? 'danger' : 'primary'}
        title={suspending ? `Suspend ${display(member.name)}?` : `Reactivate ${display(member.name)}?`}
        confirmLabel={suspending ? 'Suspend' : 'Reactivate'} onCancel={close} onConfirm={submit}
        description={suspending
          ? 'They are signed out on every device now. They cannot sign in, book, or publish until you reactivate them. Their existing bookings stay.'
          : 'They can sign in and use Fluxgo again.'}>
        <div className="ax-form-stack">
          <Field label={suspending ? 'Reason (required, goes to the audit log)' : 'Note (optional, goes to the audit log)'} htmlFor="member-status-reason">
            <textarea id="member-status-reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder={suspending ? 'For example: three safety reports for rash driving' : ''} data-autofocus />
          </Field>
          {suspending ? (
            <label className="ax-check">
              <input type="checkbox" checked={cancelRides} onChange={(event) => setCancelRides(event.target.checked)} />
              <span>Cancel their upcoming published rides{upcoming ? ` (at least ${upcoming})` : ''}. Passengers get a cancellation notification.</span>
            </label>
          ) : null}
        </div>
      </ConfirmDialog>
    </>
  );
}

/** Cancel a published ride for support. */
function TripCancelAction({ trip, onDone }) {
  const notify = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonCode, setReasonCode] = useState('OTHER');
  const [busy, setBusy] = useState(false);
  const affected = (trip.bookings || []).filter((booking) => ACTIVE_BOOKING_STATUSES.has(booking.status));
  const seats = affected.reduce((sum, booking) => sum + Number(booking.passengerCount || 0), 0);
  const close = () => { setOpen(false); setReason(''); setReasonCode('OTHER'); };
  const submit = async () => {
    if (reason.trim().length < 3) return;
    setBusy(true);
    try {
      const result = await requestApi(`/admin/trips/${encodeURIComponent(trip.id)}/cancel`, { method: 'POST', body: JSON.stringify({ reason: reason.trim(), reasonCode }) });
      notify(result?.alreadyCancelled ? 'This ride was already cancelled.' : `Ride cancelled. ${plural(result?.affectedBookings ?? 0, 'booking')} ended and notified.`);
      close();
      await onDone?.();
    } catch (requestError) {
      if (!isSessionExpired(requestError)) notify(errorText(requestError), 'danger');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button variant="ghost" className="is-danger-text" onClick={() => setOpen(true)}>Cancel this ride</Button>
      <ConfirmDialog open={open} busy={busy} tone="danger" title="Cancel this ride?" confirmLabel="Cancel ride" onCancel={close} onConfirm={submit}
        description={<>{affected.length ? <><strong>{plural(affected.length, 'booking')}</strong> ({plural(seats, 'seat')}) end now. </> : 'No bookings are affected. '}The driver and passengers get a notification that Fluxgo support cancelled the ride. You cannot undo this.</>}>
        <div className="ax-form-stack">
          <Field label="Cancellation reason (stored on the ride and its bookings)" htmlFor="trip-cancel-code">
            <ReasonSelect id="trip-cancel-code" codes={RIDE_CANCEL_REASONS} value={reasonCode} onChange={setReasonCode} />
          </Field>
          <Field label="Note for the audit log (required; members do not see it)" htmlFor="trip-cancel-reason" hint="At least 3 characters.">
            <textarea id="trip-cancel-reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="For example: driver reported an unsafe vehicle" data-autofocus />
          </Field>
        </div>
      </ConfirmDialog>
    </>
  );
}

function ReasonSelect({ id, codes, value, onChange }) {
  return (
    <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
      {codes.map((code) => <option key={code} value={code}>{cancellationReasonLabel(code)}</option>)}
    </select>
  );
}

/** Mark a ride in progress as completed, for the host. */
function TripCompleteAction({ trip, onDone }) {
  const notify = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const close = () => { setOpen(false); setNote(''); };
  const submit = async () => {
    if (note.trim().length < 3) return;
    setBusy(true);
    try {
      const result = await requestApi(`/admin/trips/${encodeURIComponent(trip.id)}/complete`, { method: 'POST', body: JSON.stringify({ note: note.trim() }) });
      notify(result?.alreadyCompleted ? 'This ride was already completed.' : 'Ride marked completed. The host and co-travellers were notified.');
      close();
      await onDone?.();
    } catch (requestError) {
      if (!isSessionExpired(requestError)) notify(errorText(requestError), 'danger');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button onClick={() => setOpen(true)}>Mark completed</Button>
      <ConfirmDialog open={open} busy={busy} tone="primary" title="Mark this ride completed?" confirmLabel="Mark completed" onCancel={close} onConfirm={submit}
        description="Use this when the host forgot to end the ride. Confirmed co-travellers move to completed and can leave reviews. Members get the normal ride completed message.">
        <Field label="Note for the audit log (required)" htmlFor="trip-complete-note" hint="At least 3 characters.">
          <textarea id="trip-complete-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="For example: host called, ride ended at 6:40 pm" data-autofocus />
        </Field>
      </ConfirmDialog>
    </>
  );
}

const CANCELLED_BOOKING_STATUSES = new Set(['CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER', 'REJECTED']);

/** Who cancelled or declined the booking, the reason, and the host's note. */
function BookingOutcome({ booking }) {
  if (!CANCELLED_BOOKING_STATUSES.has(booking.status)) return null;
  const event = [...(booking.events || [])].reverse().find((item) => item.toStatus === booking.status);
  const title = booking.status === 'REJECTED' ? 'Declined' : booking.hostRemovedAt ? 'Removed by the host' : 'Cancelled';
  return (
    <section className="ax-outcome" aria-label="Cancellation">
      <p className="ax-outcome-title"><strong>{title}</strong>{event ? <span className="ax-muted"> · {bookingActorLabel(event)} · {formatDateTime(event.occurredAt)}</span> : null}</p>
      <dl className="ax-detail-grid">
        <Detail label="Reason">{cancellationReasonLabel(booking.cancellationReason || event?.cancellationReason)}</Detail>
        <Detail label="Close to departure">{event ? (event.lateCancellation ? <Badge tone="warning">Late cancellation</Badge> : 'No') : null}</Detail>
        {booking.hostRemovedAt || booking.cancellationNote ? <Detail label="Host note to the co-traveller" full>{booking.cancellationNote ? <span className="ax-prewrap">“{booking.cancellationNote}”</span> : 'No note'}</Detail> : null}
      </dl>
    </section>
  );
}

const BOOKING_ACTION_COPY = {
  ACCEPT: { button: 'Accept for host', title: 'Accept this request for the host?', confirm: 'Accept request', tone: 'primary', text: 'The seats are taken now. The host and the co-traveller each get a message that Fluxgo support confirmed the booking.' },
  REJECT: { button: 'Decline for host', title: 'Decline this request for the host?', confirm: 'Decline request', tone: 'danger', text: 'The host and the co-traveller each get a message that Fluxgo support declined the request.' },
  CANCEL_FOR_PASSENGER: { button: 'Cancel for co-traveller', title: 'Cancel this booking for the co-traveller?', confirm: 'Cancel booking', tone: 'danger', text: 'The booking shows as cancelled by the co-traveller, and the seats open again. Both members get a message that Fluxgo support cancelled it.' },
  REMOVE_FOR_DRIVER: { button: 'Remove for host', title: 'Remove this co-traveller for the host?', confirm: 'Remove co-traveller', tone: 'danger', text: 'The booking shows as cancelled by the host, and the seats open again. The 6-hour limit for hosts does not apply. The co-traveller cannot book this ride again with instant booking. Both members get a message that Fluxgo support cancelled it.' },
};

/** Act on a booking for the host or the co-traveller. */
function BookingActions({ booking, onDone }) {
  const notify = useToast();
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const departed = new Date(booking.tripDepartureAt).getTime() <= Date.now();
  const available = departed ? [] : booking.status === 'REQUESTED'
    ? ['ACCEPT', 'REJECT', 'CANCEL_FOR_PASSENGER']
    : booking.status === 'CONFIRMED' ? ['CANCEL_FOR_PASSENGER', 'REMOVE_FOR_DRIVER'] : [];
  if (!available.length) return null;
  const reasons = action === 'REMOVE_FOR_DRIVER' ? HOST_REMOVAL_REASONS : PASSENGER_CANCEL_REASONS;
  const start = (next) => { setAction(next); setReason(next === 'REMOVE_FOR_DRIVER' ? HOST_REMOVAL_REASONS[0] : PASSENGER_CANCEL_REASONS[0]); setNote(''); };
  const close = () => setAction(null);
  const submit = async () => {
    if (note.trim().length < 3) return;
    setBusy(true);
    try {
      const needsReason = action === 'CANCEL_FOR_PASSENGER' || action === 'REMOVE_FOR_DRIVER';
      const result = await requestApi(`/admin/bookings/${encodeURIComponent(booking.id)}/actions`, {
        method: 'POST',
        body: JSON.stringify({ action, note: note.trim(), ...(needsReason ? { reason } : {}) }),
      });
      notify(result?.changed === false ? 'Nothing changed. The booking was already in that state.' : `Done. The booking is now ${statusLabel(result?.booking?.status).toLowerCase()}, and both members were notified.`);
      close();
      await onDone?.();
    } catch (requestError) {
      if (!isSessionExpired(requestError)) notify(errorText(requestError), 'danger');
    } finally {
      setBusy(false);
    }
  };
  const copy = action ? BOOKING_ACTION_COPY[action] : null;
  return (
    <div className="ax-panel-actions">
      {available.map((item) => (
        <Button key={item} variant={BOOKING_ACTION_COPY[item].tone === 'danger' ? 'ghost' : 'secondary'} className={BOOKING_ACTION_COPY[item].tone === 'danger' ? 'is-danger-text' : ''} onClick={() => start(item)}>{BOOKING_ACTION_COPY[item].button}</Button>
      ))}
      <ConfirmDialog open={Boolean(action)} busy={busy} tone={copy?.tone || 'primary'} title={copy?.title || ''} confirmLabel={copy?.confirm || 'Confirm'} onCancel={close} onConfirm={submit} description={copy?.text}>
        <div className="ax-form-stack">
          {action === 'CANCEL_FOR_PASSENGER' || action === 'REMOVE_FOR_DRIVER' ? (
            <Field label={action === 'REMOVE_FOR_DRIVER' ? 'Host reason (members do not see it)' : 'Co-traveller reason'} htmlFor="booking-action-reason">
              <ReasonSelect id="booking-action-reason" codes={reasons} value={reason} onChange={setReason} />
            </Field>
          ) : null}
          <Field label="Note for the audit log (required; members do not see it)" htmlFor="booking-action-note" hint="At least 3 characters.">
            <textarea id="booking-action-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="For example: co-traveller called support and asked to cancel" data-autofocus />
          </Field>
        </div>
      </ConfirmDialog>
    </div>
  );
}

function SupportPanel({ id, onClose, onBack, open, notify }) {
  return (
    <div className="ax-panel-support">
      <SupportConversation ticketId={id} onClose={onClose} onBack={onBack} openRecord={open} notify={notify} variant="panel" />
    </div>
  );
}

function ReviewPanel({ seed, onClose, onBack, open }) {
  const now = useNow();
  if (!seed) {
    return <><PanelHeader kind="review" title="Review" onClose={onClose} onBack={onBack} /><div className="ax-panel-body"><EmptyState title="Open this review from the Safety reports list" /></div></>;
  }
  const review = seed;
  const safety = review.issueCodes.filter((code) => SAFETY_ISSUES.has(code));
  return (
    <>
      <PanelHeader kind="review" title={`${display(review.reviewerName)} about ${display(review.revieweeName)}`}
        subtitle={`${statusLabel(review.direction)} · submitted ${relativeTime(review.submittedAt, now)}`}
        badges={<><Stars rating={review.rating} />{safety.length ? <Badge tone="danger">Safety issue</Badge> : null}{review.isVisible ? <Badge tone="neutral">Visible to members</Badge> : <Badge tone="warning">Hidden until {formatDateTime(review.visibleAt)}</Badge>}</>}
        onClose={onClose} onBack={onBack} />
      <div className="ax-panel-body">
        {!review.isVisible ? <p className="ax-note"><Icon name="eyeOff" size={14} />Members cannot see this review yet. Do not share its content with either member before {formatDateTime(review.visibleAt)}.</p> : null}
        <Section title="Issues">
          {review.issueCodes.length ? <ul className="ax-issue-stack">{review.issueCodes.map((code) => <li key={code} className={SAFETY_ISSUES.has(code) ? 'is-safety' : ''}>{SAFETY_ISSUES.has(code) ? <Icon name="alert" size={14} /> : <Icon name="check" size={14} />}{issueLabel(code)}</li>)}</ul> : <p className="ax-muted ax-mini-empty">No issues reported.</p>}
        </Section>
        <Section title="Comment"><blockquote className="ax-quote">{review.comment || <span className="ax-muted">No comment.</span>}</blockquote></Section>
        {review.highlightCodes?.length ? <Section title="Highlights"><IssueChips codes={review.highlightCodes} limit={10} /></Section> : null}
        <Section title="People and ride">
          <dl className="ax-detail-grid">
            <Detail label="Written by"><RecordLink onOpen={() => open('member', review.reviewerUserId)}>{display(review.reviewerName)}</RecordLink><VerifiedMark show={review.reviewerVerified} /></Detail>
            <Detail label="About"><RecordLink onOpen={() => open('member', review.revieweeUserId)}>{display(review.revieweeName)}</RecordLink><VerifiedMark show={review.revieweeVerified} /></Detail>
            <Detail label="Ride"><RecordLink onOpen={() => open('trip', review.tripId)}><span className="ax-mono">{review.tripPublicId}</span></RecordLink></Detail>
            <Detail label="Booking"><RecordLink onOpen={() => open('booking', review.bookingId)}><span className="ax-mono">{review.bookingPublicId}</span></RecordLink></Detail>
          </dl>
        </Section>
      </div>
    </>
  );
}

function AuditPanel({ seed, onClose, onBack, open }) {
  if (!seed) return <><PanelHeader kind="audit" title="Audit entry" onClose={onClose} onBack={onBack} /><div className="ax-panel-body"><EmptyState title="Open this entry from the Audit log" /></div></>;
  const row = seed;
  const metadata = row.metadata && Object.keys(row.metadata).length ? row.metadata : null;
  return (
    <>
      <PanelHeader kind="audit" title={auditActionLabel(row.action)} subtitle={`${display(row.adminUsername)} · ${formatDateTime(row.createdAt)}`} onClose={onClose} onBack={onBack} />
      <div className="ax-panel-body">
        <dl className="ax-detail-grid">
          <Detail label="Admin">{display(row.adminUsername)}</Detail>
          <Detail label="Action"><span className="ax-mono ax-small">{row.action}</span></Detail>
          <Detail label="Record type">{RESOURCE_LABELS[row.resourceType] || row.resourceType}</Detail>
          <Detail label="Record ID">{row.resourceId ? ({ support_ticket: 'support', user: 'member', trip: 'trip' }[row.resourceType] ? <RecordLink onOpen={() => open({ support_ticket: 'support', user: 'member', trip: 'trip' }[row.resourceType], row.resourceId)}><span className="ax-mono ax-small">{row.resourceId}</span></RecordLink> : <Mono value={row.resourceId} />) : null}</Detail>
          <Detail label="Details" full>{auditDetails(row)}</Detail>
          <Detail label="IP address">{row.ipAddress}</Detail>
          <Detail label="Browser" full><span className="ax-small">{row.userAgent}</span></Detail>
        </dl>
        {metadata ? <Section title="Metadata"><pre className="ax-pre">{JSON.stringify(metadata, null, 2)}</pre></Section> : null}
      </div>
    </>
  );
}

const DELIVERY = {
  QUEUED: { label: 'Queued', tone: 'info' },
  SENDING: { label: 'Sending', tone: 'info' },
  SENT: { label: 'Push sent', tone: 'success' },
  RETRYABLE: { label: 'Retrying', tone: 'warning' },
  FAILED: { label: 'Failed', tone: 'danger' },
  SUPPRESSED: { label: 'Suppressed', tone: 'neutral' },
  IN_APP_ONLY: { label: 'In-app only', tone: 'neutral' },
};
const RECIPIENT_PAGE = 25;
const RECIPIENT_EXPORT_LIMIT = 5000;

function DeliveryBadge({ row }) {
  const delivery = DELIVERY[row.delivery] || { label: statusLabel(row.delivery), tone: 'neutral' };
  return <Badge tone={delivery.tone} title={row.deliveryError || undefined}>{delivery.label}{row.deliveryError ? <Icon name="alert" size={11} /> : null}</Badge>;
}

/** One notification send: message, audience, delivery stats, and every recipient. */
function SendPanel({ id, seed, onClose, onBack, open }) {
  const now = useNow();
  const { data, error, loading, reload } = useRecord(`/admin/notifications/sends/${encodeURIComponent(id)}`, null, ['audit']);
  const send = data?.send || null;
  const stats = data?.stats || send?.stats || seed?.stats || null;
  const head = send || seed;
  const [query, setQuery] = useState('');
  const [delivery, setDelivery] = useState('');
  const [read, setRead] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [retry, setRetry] = useState(0);
  const debouncedQuery = useDebounced(query.trim(), 300);
  const path = `/admin/notifications/sends/${encodeURIComponent(id)}/recipients`;
  const listParams = { query: debouncedQuery, delivery, read };

  useEffect(() => { setPage(0); }, [debouncedQuery, delivery, read]);
  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    requestApi(`${path}${queryString({ ...listParams, limit: RECIPIENT_PAGE, offset: page * RECIPIENT_PAGE })}`)
      .then((result) => { if (!cancelled) { setRows(result?.items || []); setTotal(result?.total || 0); setListError(''); } })
      .catch((requestError) => { if (!cancelled && !isSessionExpired(requestError)) setListError(errorText(requestError)); })
      .finally(() => { if (!cancelled) setListLoading(false); });
    return () => { cancelled = true; };
    // The serialized filters identify the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, debouncedQuery, delivery, read, page, retry]);

  const columns = [
    { key: 'name', label: 'Member', width: 210, locked: true, verified: (row) => row.isVerified, render: (row) => <span className="ax-person"><Avatar name={row.name} src={row.profilePhotoUrl} size="sm" /><span><RecordLink onOpen={() => open('member', row.userId, { id: row.userId, name: row.name, profilePhotoUrl: row.profilePhotoUrl, isVerified: row.isVerified })}>{display(row.name)}</RecordLink><VerifiedMark show={row.isVerified} /><InternalTag show={row.isInternal} /></span></span>, csv: (row) => row.name },
    { key: 'mobile', label: 'Mobile', width: 150, render: (row) => <span className="ax-mono ax-small">{display(row.mobile)}</span> },
    { key: 'delivery', label: 'Delivery', width: 130, render: (row) => <DeliveryBadge row={row} />, csv: (row) => `${DELIVERY[row.delivery]?.label || row.delivery}${row.deliveryError ? ` (${row.deliveryError})` : ''}` },
    { key: 'readAt', label: 'Read', width: 130, render: (row) => (row.readAt ? <span title={formatDateTime(row.readAt)}>{relativeTime(row.readAt, now)}</span> : <span className="ax-muted">Not read</span>), csv: (row) => row.readAt || '', text: (row) => (row.readAt ? formatDateTime(row.readAt) : 'Not read') },
    { key: 'userId', label: 'Member ID', width: 280, defaultHidden: true, render: (row) => <Mono value={row.userId} /> },
  ];

  const exporter = {
    title: `Recipients: ${head?.title || 'Notification'}`,
    limit: RECIPIENT_EXPORT_LIMIT,
    filename: () => `fluxgo-notification-${String(id).slice(0, 8)}-recipients`,
    load: async () => {
      const all = [];
      for (let offset = 0; offset < Math.min(total, RECIPIENT_EXPORT_LIMIT); offset += 100) {
        const result = await requestApi(`${path}${queryString({ ...listParams, limit: 100, offset })}`);
        all.push(...(result?.items || []));
        if (!result?.hasMore) break;
      }
      return all;
    },
  };

  const filteredList = Boolean(debouncedQuery || delivery || read);
  const pct = (value) => (stats?.total ? ` · ${Math.round((value / stats.total) * 100)}%` : '');
  return (
    <>
      <PanelHeader kind="send" title={display(head?.title || 'Notification')}
        subtitle={head ? `Sent by ${display(head.adminUsername)} · ${relativeTime(head.createdAt, now)}` : null}
        badges={head ? <><Badge tone="neutral" dot={false}>{head.kind === 'OFFER' ? 'Offer' : 'Update'}</Badge><Badge tone="neutral" dot={false}>{head.push === false ? 'In-app only' : 'Push and in-app'}</Badge><Badge tone={head.audience === 'filters' ? 'info' : 'neutral'} dot={false}>{head.audience === 'filters' ? 'Filtered' : 'Specific members'}</Badge></> : null}
        onClose={onClose} onBack={onBack} linkParams={{ open: `send:${id}` }} />
      <PanelState loading={loading} error={error} data={send} onRetry={reload}>
        {send ? (
          <div className="ax-panel-body">
            <div className="ax-send-message"><p>{send.body}</p></div>
            {stats ? (
              <div className="ax-stat-grid is-five">
                <StatTile label="Recipients" value={formatNumber(stats.total)} onClick={filteredList ? () => { setQuery(''); setDelivery(''); setRead(''); } : undefined} />
                <StatTile label="Push sent" value={send.push === false ? '—' : formatNumber(stats.sent)} onClick={send.push !== false && stats.sent ? () => setDelivery('SENT') : undefined} />
                <StatTile label="Failed" value={formatNumber(stats.failed)} tone={stats.failed ? 'danger' : undefined} onClick={stats.failed ? () => setDelivery('FAILED') : undefined} />
                <StatTile label="Pending" value={formatNumber(stats.pending)} tone={stats.pending ? 'warning' : undefined} />
                <StatTile label={`Read${pct(stats.read)}`} value={formatNumber(stats.read)} onClick={stats.read ? () => setRead('true') : undefined} />
              </div>
            ) : null}
            <Section title="Details">
              <dl className="ax-detail-grid">
                <Detail label="Audience" full>{send.audience === 'filters' ? filterSummary(send.filters) : 'Specific members'}</Detail>
                <Detail label="Sent">{formatDateTime(send.createdAt)}</Detail>
                <Detail label="Sent by">{display(send.adminUsername)}</Detail>
                <Detail label="Type">{send.kind === 'OFFER' ? 'Offer (Offers tab)' : 'Update (Updates tab)'}</Detail>
                <Detail label="Delivery">{send.push === false ? 'In-app only' : 'Push and in-app'}</Detail>
                <Detail label="Expires">{send.expiresAt ? formatDateTime(send.expiresAt) : 'Never'}</Detail>
                <Detail label="Event key"><Mono value={send.eventKey} /></Detail>
              </dl>
            </Section>
            <Section title="Recipients" count={formatNumber(total)}>
              <div className="ax-recipient-filters">
                <div className="ax-search is-compact">
                  <Icon name="search" size={15} />
                  <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or mobile" aria-label="Search recipients" autoComplete="off" />
                </div>
                <select value={delivery} onChange={(event) => setDelivery(event.target.value)} aria-label="Delivery">
                  <option value="">Any delivery</option>
                  {Object.entries(DELIVERY).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
                </select>
                <select value={read} onChange={(event) => setRead(event.target.value)} aria-label="Read">
                  <option value="">Read or not</option>
                  <option value="true">Read</option>
                  <option value="false">Not read</option>
                </select>
              </div>
              {listError ? <div className="ax-inline-error" role="alert"><span>{listError}</span><Button size="sm" onClick={() => setRetry((value) => value + 1)}>Try again</Button></div> : null}
              <DataTable tableId="send-recipients" label="Recipients" columns={columns} rows={rows} loading={listLoading} getRowId={(row) => row.notificationId || row.userId}
                total={total} page={page} pageSize={RECIPIENT_PAGE} onPageChange={setPage} exporter={exporter}
                empty={<EmptyState title={filteredList ? 'No matching recipients' : 'No recipients'}>{filteredList ? 'Change or clear the filters.' : null}</EmptyState>} />
            </Section>
          </div>
        ) : null}
      </PanelState>
    </>
  );
}

