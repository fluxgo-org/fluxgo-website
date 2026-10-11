'use client';

import { useCallback, useEffect, useState } from 'react';
import { errorText, isSessionExpired, requestApi } from '../_lib/api';
import { auditActionLabel, display, formatDateTime, formatNumber, formatTime, plural, relativeTime, waitingFor } from '../_lib/format';
import { useNow, useStoredState } from '../_lib/hooks';
import { LIVE_KEYS, useLiveRefresh } from '../_lib/live';
import { Badge, Button, EmptyState, Icon, Skeleton } from './ui';


export function TodayView({ admin, openRecord, navigate, onAttention }) {
  const now = useNow();
  const [state, setState] = useState({ attention: null, summary: null, audit: [] });
  const [error, setError] = useState('');
  // Counts and queues hide internal (team and test) members unless the admin turns this on.
  const [showInternal, setShowInternal] = useStoredState('today:showInternal', false);
  const scope = showInternal ? '?internal=include' : '';
  // Open lists with the same internal setting as this dashboard.
  const go = (target, extra = {}) => navigate(target, showInternal && target !== 'audit' ? { ...extra, internal: 'include' } : extra);

  // Load only the parts that match the changed data. With no list, load all three.
  const load = useCallback(async (changed) => {
    const want = (keys) => !changed || keys.some((key) => changed.includes(key));
    try {
      const [attention, summary, audit] = await Promise.all([
        want(['support', 'trips', 'bookings', 'members', 'reviews', 'vehicles']) ? requestApi('/admin/dashboard/attention' + scope) : null,
        want(['members', 'trips', 'bookings', 'support']) ? requestApi('/admin/dashboard/summary' + scope) : null,
        want(['audit']) ? requestApi('/admin/audit?limit=6&offset=0') : null,
      ]);
      setState((current) => ({
        attention: attention ?? current.attention,
        summary: summary ?? current.summary,
        audit: audit ? audit.items || [] : current.audit,
      }));
      if (attention) onAttention?.(attention);
      setError('');
    } catch (requestError) {
      if (!isSessionExpired(requestError)) setError(errorText(requestError));
    }
  }, [onAttention, scope]);

  useEffect(() => { void load(); }, [load]);
  useLiveRefresh(LIVE_KEYS, (changed) => { void load(changed); });

  const { attention, summary, audit } = state;
  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = String(admin?.email || admin?.username || '').split('@')[0];
  const waiting = attention?.support.awaitingReply ?? 0;
  const tasks = attention ? waiting + attention.bookings.awaitingDriver + attention.vehicles.awaitingRecheck + attention.reviews.safetyReportsLast7Days : 0;

  return (
    <div className="ax-today">
      <div className="ax-today-head">
        <div>
          <h2>{greeting}{name ? `, ${name}` : ''}</h2>
          <p className="ax-muted">{new Date(now).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} · {attention ? (tasks ? `${plural(tasks, 'item')} need you` : 'Nothing waits for you right now') : 'Loading…'}</p>
        </div>
        <div className="ax-today-tools">
          <label className="ax-check ax-filter-toggle" htmlFor="today-show-internal">
            <input id="today-show-internal" type="checkbox" checked={Boolean(showInternal)} onChange={(event) => setShowInternal(event.target.checked)} />
            <span>Show internal</span>
          </label>
        </div>
      </div>
      {error ? <div className="ax-inline-error" role="alert"><span>{error}</span><Button size="sm" onClick={() => load()}>Try again</Button></div> : null}

      <div className="ax-kpis">
        <Kpi label="Members" value={summary?.members?.total} detail={attention ? `+${formatNumber(sum(attention.trends, 'newMembers'))} in 7 days` : null} onClick={() => go('members')} />
        <Kpi label="Rides live now" value={attention?.trips.inProgress} detail={summary ? `${formatNumber(summary.trips?.published)} upcoming` : null} onClick={() => go('trips', { status: 'IN_PROGRESS' })} />
        <Kpi label="Bookings, 7 days" value={attention ? sum(attention.trends, 'bookings') : undefined} detail={summary ? `${formatNumber(summary.bookings?.total)} all time` : null} onClick={() => go('bookings')} />
        <Kpi label="Open tickets" value={summary?.support?.open} detail={attention ? (waiting ? `${waiting} waiting on us` : 'All replied') : null} tone={waiting ? 'warning' : undefined} onClick={() => go('support', { tab: 'open' })} />
      </div>

      <h3 className="ax-group-title">Needs attention</h3>
      <div className="ax-attention-grid">
        <AttentionCard icon="support" title="Waiting for a reply" count={attention?.support.awaitingReply} tone="warning" loading={!attention}
          empty="Every open ticket has a reply." onAll={() => go('support')}
          items={attention?.support.items.map((item) => ({
            key: item.id,
            title: display(item.requesterName),
            meta: item.subject,
            side: <Badge tone="warning">{waitingFor(item.waitingSince, now)}</Badge>,
            onClick: () => go('support', { ticket: item.id }),
          }))} />
        <AttentionCard icon="clock" title="Departing in the next 2 hours" count={attention?.trips.departingSoon} loading={!attention}
          empty="No rides leave in the next 2 hours." onAll={() => go('trips', { status: 'PUBLISHED', departFrom: todayKey(), departTo: todayKey() })}
          items={attention?.trips.departingSoonItems.map((trip) => ({
            key: trip.id,
            title: `${trip.origin} → ${trip.destination}`,
            meta: `${display(trip.driverName)} · ${trip.seatsTotal - trip.seatsAvailable}/${trip.seatsTotal} booked`,
            side: <span className="ax-time-chip">{formatTime(trip.departureAt)}<small>{relativeTime(trip.departureAt, now)}</small></span>,
            onClick: () => openRecord('trip', trip.id),
          }))} />
        <AttentionCard icon="rides" title="Rides in progress" count={attention?.trips.inProgress} tone="info" loading={!attention}
          empty="No rides are in progress." onAll={() => go('trips', { status: 'IN_PROGRESS' })}
          items={attention?.trips.inProgressItems.map((trip) => ({
            key: trip.id,
            title: `${trip.origin} → ${trip.destination}`,
            meta: `${display(trip.driverName)} · started ${relativeTime(trip.departureAt, now)}`,
            side: <Badge value="IN_PROGRESS" />,
            onClick: () => openRecord('trip', trip.id),
          }))} />
        <AttentionCard icon="bookings" title="Requests waiting for the driver" count={attention?.bookings.awaitingDriver} loading={!attention}
          empty="No booking requests wait for a driver." onAll={() => go('bookings', { status: 'REQUESTED' })}
          items={attention?.bookings.items.map((booking) => ({
            key: booking.id,
            title: display(booking.bookedByName),
            meta: `${booking.tripPublicId} · ${plural(booking.passengerCount, 'seat')} · departs ${relativeTime(booking.departureAt, now)}`,
            side: <Badge tone="warning">{waitingFor(booking.createdAt, now)}</Badge>,
            onClick: () => openRecord('booking', booking.id),
          }))} />
        <CountCard icon="shield" title="Safety reports, last 7 days" count={attention?.reviews.safetyReportsLast7Days} tone="danger" loading={!attention}
          detail={attention ? `${plural(attention.reviews.issueReportsLast7Days, 'review')} with any issue` : null}
          action="Review reports" onClick={() => go('safety', { issues: 'SAFETY', submittedFrom: weekAgoKey() })} />
        <CountCard icon="vehicles" title="Vehicles awaiting a recheck" count={attention?.vehicles.awaitingRecheck} loading={!attention}
          detail="Added by hand. The system rechecks them every 6 hours." action="Open vehicles" onClick={() => go('vehicles', { source: 'manual', status: 'ACTIVE' })} />
      </div>

      <h3 className="ax-group-title">Last 7 days</h3>
      <div className="ax-trends">
        {[
          { key: 'newMembers', label: 'New members' },
          { key: 'ridesPublished', label: 'Rides published' },
          { key: 'bookings', label: 'Bookings' },
          { key: 'ridesCompleted', label: 'Rides completed' },
        ].map((metric) => <TrendChart key={metric.key} label={metric.label} days={attention?.trends || null} field={metric.key} />)}
      </div>

      <div className="ax-group-title-row">
        <h3 className="ax-group-title">Recent admin activity</h3>
        <Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => go('audit')}>Audit log</Button>
      </div>
      <div className="ax-card">
        {audit.length ? (
          <ul className="ax-activity">
            {audit.map((row) => (
              <li key={row.id}>
                <button type="button" onClick={() => openRecord('audit', row.id, row)}>
                  <span className="ax-activity-dot" aria-hidden="true" />
                  <span className="ax-activity-main"><strong>{display(row.adminUsername)}</strong> {auditActionLabel(row.action).toLowerCase()}</span>
                  <time className="ax-muted" title={formatDateTime(row.createdAt)}>{relativeTime(row.createdAt, now)}</time>
                </button>
              </li>
            ))}
          </ul>
        ) : summary ? <EmptyState icon="audit" title="No admin activity yet" /> : <div className="ax-card-pad"><Skeleton width="70%" /><Skeleton width="50%" /></div>}
      </div>
    </div>
  );
}

function sum(days, field) {
  return (days || []).reduce((total, day) => total + Number(day[field] || 0), 0);
}

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function weekAgoKey() {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function Kpi({ label, value, detail, onClick, tone }) {
  return (
    <button type="button" className={`ax-kpi${tone ? ` is-${tone}` : ''}`} onClick={onClick}>
      <span className="ax-kpi-label">{label}</span>
      <strong className="ax-kpi-value">{value === undefined || value === null ? <Skeleton width={56} height={26} /> : formatNumber(value)}</strong>
      <span className="ax-kpi-detail">{detail || ' '}</span>
    </button>
  );
}

function AttentionCard({ icon, title, count, items, empty, onAll, loading, tone }) {
  return (
    <section className={`ax-attention${count ? ` is-${tone || 'active'}` : ''}`}>
      <header>
        <span className="ax-attention-icon"><Icon name={icon} size={16} /></span>
        <h4>{title}</h4>
        <span className="ax-attention-count">{loading ? '…' : formatNumber(count)}</span>
      </header>
      {loading ? <div className="ax-card-pad"><Skeleton width="80%" /><Skeleton width="60%" /></div> : items?.length ? (
        <ul>
          {items.map((item) => (
            <li key={item.key}>
              <button type="button" onClick={item.onClick}>
                <span className="ax-attention-main"><strong>{item.title}</strong><span className="ax-muted">{item.meta}</span></span>
                <span className="ax-attention-side">{item.side}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="ax-attention-empty"><Icon name="check" size={14} />{empty}</p>}
      {count > (items?.length || 0) || (count && onAll) ? <footer><button type="button" className="ax-link" onClick={onAll}>{count > (items?.length || 0) ? `See all ${formatNumber(count)}` : 'Open list'} <Icon name="arrowRight" size={12} /></button></footer> : null}
    </section>
  );
}

function CountCard({ icon, title, count, detail, action, onClick, tone, loading }) {
  return (
    <section className={`ax-attention is-count${count ? ` is-${tone || 'active'}` : ''}`}>
      <header>
        <span className="ax-attention-icon"><Icon name={icon} size={16} /></span>
        <h4>{title}</h4>
      </header>
      <div className="ax-count-body">
        <strong>{loading ? <Skeleton width={40} height={30} /> : formatNumber(count)}</strong>
        {detail ? <p className="ax-muted">{detail}</p> : null}
      </div>
      <footer><button type="button" className="ax-link" onClick={onClick}>{action} <Icon name="arrowRight" size={12} /></button></footer>
    </section>
  );
}

/** One metric over seven days. A single series: the title names it, so no legend. */
function TrendChart({ label, days, field }) {
  const [hover, setHover] = useState(null);
  if (!days) return <div className="ax-trend"><span className="ax-trend-label">{label}</span><Skeleton width="100%" height={72} /></div>;
  const values = days.map((day) => Number(day[field] || 0));
  const total = values.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...values);
  const dayName = (key) => new Date(`${key}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' });
  const dayLong = (key) => new Date(`${key}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const active = hover === null ? null : days[hover];
  return (
    <figure className="ax-trend">
      <figcaption>
        <span className="ax-trend-label">{label}</span>
        <strong className="ax-trend-total">{formatNumber(total)}</strong>
        <span className="ax-trend-hover" aria-hidden="true">{active ? `${dayLong(active.day)}: ${formatNumber(values[hover])}` : ' '}</span>
      </figcaption>
      <div className="ax-trend-bars" role="img" aria-label={`${label} per day for the last 7 days, ${formatNumber(total)} in total`} onMouseLeave={() => setHover(null)}>
        {values.map((value, index) => (
          <span key={days[index].day} className={`ax-trend-col${hover === index ? ' is-hover' : ''}${index === values.length - 1 ? ' is-today' : ''}`} onMouseEnter={() => setHover(index)}>
            <span className="ax-trend-bar" style={{ height: value ? `${Math.max(4, (value / max) * 100)}%` : 0 }} />
          </span>
        ))}
      </div>
      <div className="ax-trend-axis" aria-hidden="true">{days.map((day, index) => <span key={day.day}>{index === days.length - 1 ? 'Today' : dayName(day.day)}</span>)}</div>
      <table className="ax-sr-only"><caption>{label}</caption><tbody>{days.map((day, index) => <tr key={day.day}><th scope="row">{dayLong(day.day)}</th><td>{values[index]}</td></tr>)}</tbody></table>
    </figure>
  );
}
