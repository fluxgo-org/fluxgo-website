'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { errorText, isSessionExpired, queryString, requestApi } from '../_lib/api';
import { formatMoney, formatNumber } from '../_lib/format';
import { useLiveRefresh } from '../_lib/live';
import { Button, EmptyState, Icon, Popover, Segmented, Skeleton } from './ui';
import { dayDate, dayText, kolkataDay, PeriodPicker, presetRange, rangeLabel } from './PeriodPicker';

const PRESETS = [
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last90', label: 'Last 90 days' },
  { value: 'last365', label: 'Last 365 days' },
  { value: 'custom', label: 'Custom' },
];
const MAX_DAYS = 366;
const GROUP_BY = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];
const INTERNAL = [
  { value: 'exclude', label: 'Hide internal' },
  { value: 'include', label: 'Include internal' },
  { value: 'only', label: 'Internal only' },
];
const LIVE = ['members', 'trips', 'bookings', 'reviews', 'support'];

const total = (rows, field) => rows.reduce((sum, row) => sum + Number(row[field] || 0), 0);
const ratio = (top, bottom) => (bottom ? top / bottom : null);
const last = (rows, field) => (rows.length ? Number(rows[rows.length - 1][field] || 0) : null);
const average = (rows, field) => (rows.length ? total(rows, field) / rows.length : null);

/**
 * Each metric reads daily rows of one API group.
 * `value` turns the rows of one bucket (a day, week, or month) into one number, or null when there is nothing to divide.
 * `headline` is the number for the whole period. Most metrics use `value` on all rows.
 */
const METRICS = [
  { id: 'dau', section: 'active', group: 'active', label: 'Daily active members', chart: 'bar', format: 'number', note: 'Average per day', value: (rows) => average(rows, 'dau') },
  { id: 'wau', section: 'active', group: 'active', label: 'Weekly active members', chart: 'line', format: 'number', note: 'Last 7 days to the end date', value: (rows) => last(rows, 'wau') },
  { id: 'mau', section: 'active', group: 'active', label: 'Monthly active members', chart: 'line', format: 'number', note: 'Last 30 days to the end date', value: (rows) => last(rows, 'mau') },
  { id: 'stickiness', section: 'active', group: 'active', label: 'Stickiness (DAU ÷ MAU)', chart: 'line', format: 'percent', note: 'Average DAU ÷ average MAU', value: (rows) => ratio(total(rows, 'dau'), total(rows, 'mau')) },

  { id: 'signups', section: 'growth', group: 'growth', label: 'Sign-ups', chart: 'bar', format: 'number', value: (rows) => total(rows, 'signups') },
  { id: 'onboarded', section: 'growth', group: 'growth', label: 'Sign-ups that finished onboarding', chart: 'line', format: 'percent', note: 'Onboarding status now', value: (rows) => ratio(total(rows, 'onboarded'), total(rows, 'signups')) },
  { id: 'ridesPublished', section: 'growth', group: 'supply', label: 'Rides published', chart: 'bar', format: 'number', value: (rows) => total(rows, 'ridesPublished') },
  { id: 'bookings', section: 'growth', group: 'demand', label: 'Bookings', chart: 'bar', format: 'number', value: (rows) => total(rows, 'bookings') },

  { id: 'ridesWithBooking', section: 'health', group: 'supply', label: 'Rides with a booking', chart: 'line', format: 'percent', note: 'Of rides published', value: (rows) => ratio(total(rows, 'ridesWithBooking'), total(rows, 'ridesPublished')) },
  { id: 'seatFill', section: 'health', group: 'supply', label: 'Seat fill on completed rides', chart: 'line', format: 'percent', value: (rows) => ratio(total(rows, 'seatsFilledOnCompleted'), total(rows, 'seatsOnCompleted')) },
  { id: 'confirmation', section: 'health', group: 'demand', label: 'Bookings confirmed', chart: 'line', format: 'percent', note: 'Status now', value: (rows) => ratio(total(rows, 'confirmed'), total(rows, 'bookings')) },
  { id: 'cancellation', section: 'health', group: 'demand', label: 'Bookings cancelled', chart: 'line', format: 'percent', note: 'By the passenger or the driver',
    value: (rows) => ratio(total(rows, 'cancelledByPassenger') + total(rows, 'cancelledByDriver'), total(rows, 'bookings')) },

  { id: 'seatsOffered', section: 'volume', group: 'supply', label: 'Seats offered', chart: 'bar', format: 'number', value: (rows) => total(rows, 'seatsOffered') },
  { id: 'seatsBooked', section: 'volume', group: 'demand', label: 'Seats booked', chart: 'bar', format: 'number', value: (rows) => total(rows, 'seatsBooked') },
  { id: 'ridesCompleted', section: 'volume', group: 'supply', label: 'Rides completed', chart: 'bar', format: 'number', value: (rows) => total(rows, 'ridesCompleted') },
  { id: 'completedValue', section: 'volume', group: 'supply', label: 'Fares on completed rides', chart: 'bar', format: 'money', value: (rows) => total(rows, 'completedValue') },

  { id: 'rating', section: 'quality', group: 'quality', label: 'Average rating', chart: 'line', format: 'rating', value: (rows) => ratio(total(rows, 'ratingTotal'), total(rows, 'reviews')) },
  { id: 'lowRatings', section: 'quality', group: 'quality', label: 'Reviews with 1 or 2 stars', chart: 'bar', format: 'number', value: (rows) => total(rows, 'lowRatings') },
  { id: 'safetyReports', section: 'quality', group: 'quality', label: 'Safety reports', chart: 'bar', format: 'number', value: (rows) => total(rows, 'safetyReports') },
  { id: 'ticketsOpened', section: 'quality', group: 'quality', label: 'Support tickets opened', chart: 'bar', format: 'number', value: (rows) => total(rows, 'ticketsOpened') },
];

/** Sections in page order. Each section shows its metrics in the order of METRICS. */
const SECTIONS = [
  { id: 'active', title: 'Active members', hint: 'A member is active on a day when they open the app.' },
  { id: 'growth', title: 'Growth' },
  { id: 'health', title: 'Marketplace health' },
  { id: 'volume', title: 'Volume' },
  { id: 'quality', title: 'Trust and support' },
];

function formatValue(value, format) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (format === 'percent') return `${(value * 100).toFixed(value >= 0.995 || value === 0 ? 0 : 1)}%`;
  if (format === 'money') return formatMoney(Math.round(value));
  if (format === 'rating') return value.toFixed(2);
  return formatNumber(Math.round(value * 10) / 10);
}

/** The yyyy-mm-dd Monday of the week that holds the day. */
function weekStart(key) {
  const date = dayDate(key);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

/** Group daily rows into day, week (Monday start), or month buckets, oldest first. */
function bucketize(daily, by) {
  const buckets = [];
  for (const row of daily) {
    const key = by === 'week' ? weekStart(row.day) : by === 'month' ? row.day.slice(0, 7) : row.day;
    const current = buckets[buckets.length - 1];
    if (current && current.key === key) current.rows.push(row);
    else buckets.push({ key, rows: [row] });
  }
  return buckets.map((bucket) => ({
    ...bucket,
    start: bucket.rows[0].day,
    end: bucket.rows[bucket.rows.length - 1].day,
    partial: bucket.rows.some((row) => row.partial),
  }));
}

function bucketName(bucket, by, long) {
  if (by === 'month') return dayText(bucket.start, { month: long ? 'long' : 'short', year: long ? 'numeric' : undefined });
  if (by === 'week') return long ? `${dayText(bucket.start, { day: 'numeric', month: 'short' })} – ${dayText(bucket.end, { day: 'numeric', month: 'short' })}` : dayText(bucket.start, { day: 'numeric', month: 'short' });
  return dayText(bucket.start, long ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' });
}

// Answers for the same query, for 60 s. Several charts can share one request.
const cache = new Map();
const CACHE_MS = 60_000;

function loadAnalytics(query, fresh) {
  const key = queryString(query);
  const hit = cache.get(key);
  if (!fresh && hit && hit.expires > Date.now()) return hit.promise;
  const promise = requestApi(`/admin/analytics${key}`);
  cache.set(key, { promise, expires: Date.now() + CACHE_MS });
  promise.catch(() => cache.delete(key));
  return promise;
}

/** Load Analytics for a query. `enabled` false skips the request (a chart that uses the page data). */
function useAnalytics(query, enabled = true) {
  const [state, setState] = useState({ data: null, error: null, key: '' });
  const key = queryString(query);
  const request = useRef(0);
  const load = useCallback(async (fresh = false) => {
    if (!enabled) return;
    const id = ++request.current;
    try {
      const data = await loadAnalytics(query, fresh);
      if (id === request.current) setState({ data, error: null, key });
    } catch (error) {
      if (id === request.current && !isSessionExpired(error)) setState((current) => ({ ...current, error, key }));
    }
    // The key holds every field of the query, so the query object is not a dependency.
  }, [key, enabled]);
  useEffect(() => { void load(); }, [load]);
  useLiveRefresh(LIVE, () => { void load(true); }, enabled);
  return { data: state.key === key ? state.data : null, error: state.key === key ? state.error : null, reload: () => load(true) };
}

function queryFor(range, internal, groups) {
  return { from: range.from, to: range.to, internal: internal === 'exclude' ? undefined : internal, groups };
}

function readRange(params, today) {
  if (params.preset === 'custom' && /^\d{4}-\d{2}-\d{2}$/.test(params.from || '') && /^\d{4}-\d{2}-\d{2}$/.test(params.to || '') && params.from <= params.to && params.to <= today) {
    return { preset: 'custom', from: params.from, to: params.to, days: Math.round((dayDate(params.to) - dayDate(params.from)) / 86_400_000) + 1 };
  }
  return presetRange(PRESETS.some((item) => item.value === params.preset && item.value !== 'custom') ? params.preset : 'last30', today);
}

export function AnalyticsView({ params, setParams }) {
  const today = kolkataDay();
  const range = readRange(params, today);
  const internal = INTERNAL.some((item) => item.value === params.internal) ? params.internal : 'exclude';
  const by = GROUP_BY.some((item) => item.value === params.by) ? params.by : 'day';
  const page = useAnalytics(queryFor(range, internal));
  const setRange = (next) => setParams(next.preset === 'custom' ? { preset: 'custom', from: next.from, to: next.to } : { preset: next.preset === 'last30' ? undefined : next.preset, from: undefined, to: undefined });
  const periodName = rangeLabel(range, today, PRESETS);
  const missingApi = page.error?.status === 404;

  return (
    <div className="ax-analytics">
      <div className="ax-analytics-filters" role="group" aria-label="Filters for every chart">
        <PeriodPicker range={range} today={today} onChange={setRange} presets={PRESETS} maxDays={MAX_DAYS} />
        <Segmented size="sm" label="Group by" options={GROUP_BY} value={by} onChange={(value) => setParams({ by: value === 'day' ? undefined : value })} />
        <select aria-label="Internal members" className="ax-analytics-internal" value={internal} onChange={(event) => setParams({ internal: event.target.value === 'exclude' ? undefined : event.target.value })}>
          {INTERNAL.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <span className="ax-muted ax-analytics-zone">India dates</span>
      </div>

      {missingApi ? <EmptyState icon="analytics" title="Analytics is not available yet">The API does not have the analytics route. Deploy the backend first.</EmptyState> : null}
      {page.error && !missingApi ? <div className="ax-inline-error" role="alert"><span>{errorText(page.error)}</span><Button size="sm" onClick={page.reload}>Try again</Button></div> : null}

      {missingApi ? null : (
        <>
          <ActiveSummary data={page.data} periodName={periodName} />
          {SECTIONS.map((section) => (
            <section key={section.id} className="ax-analytics-section" aria-labelledby={`analytics-${section.id}`}>
              <div className="ax-analytics-section-head">
                <h3 className="ax-group-title" id={`analytics-${section.id}`}>{section.title}</h3>
                {section.hint ? <p className="ax-muted">{section.hint}</p> : null}
              </div>
              {section.id === 'active' ? <CoverageNote active={page.data?.active} /> : null}
              <div className="ax-metric-grid">
                {METRICS.filter((metric) => metric.section === section.id).map((metric) => (
                  <MetricCard key={metric.id} metric={metric} by={by} today={today} pageRange={range} pageInternal={internal} pageData={page.data} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

/** Latest DAU, WAU, and MAU at the end date, and stickiness over the period. */
function ActiveSummary({ data, periodName }) {
  const daily = data?.active?.daily;
  const end = daily?.[daily.length - 1];
  const stickiness = daily ? ratio(total(daily, 'dau'), total(daily, 'mau')) : null;
  const tiles = [
    { label: 'DAU', value: end?.dau, detail: end ? `On ${dayText(end.day, { day: 'numeric', month: 'short' })}` : null },
    { label: 'WAU', value: end?.wau, detail: 'Last 7 days' },
    { label: 'MAU', value: end?.mau, detail: 'Last 30 days' },
    { label: 'Stickiness', value: stickiness, format: 'percent', detail: `DAU ÷ MAU, ${periodName.toLowerCase()}` },
  ];
  return (
    <div className="ax-kpis ax-analytics-kpis">
      {tiles.map((tile) => (
        <div key={tile.label} className="ax-kpi is-static">
          <span className="ax-kpi-label">{tile.label}</span>
          <strong className="ax-kpi-value">{daily ? formatValue(tile.value ?? null, tile.format || 'number') : <Skeleton width={56} height={26} />}</strong>
          <span className="ax-kpi-detail">{daily ? tile.detail : ' '}</span>
        </div>
      ))}
    </div>
  );
}

/** Says when active member counts before tracking started are not complete. */
function CoverageNote({ active }) {
  if (!active) return null;
  const partial = active.daily.some((day) => day.partial);
  if (!partial && !active.truncated) return null;
  const short = (key) => dayText(key, { day: 'numeric', month: 'short' });
  const lastPartial = [...active.daily].reverse().find((day) => day.partial)?.day;
  const reason = active.history === 'unavailable' ? 'PostHog did not answer.' : 'PostHog history is not set up on the API.';
  return (
    <p className="ax-note">
      <Icon name="alert" size={14} />
      <span>
        {partial ? `Counts up to ${short(lastPartial)} are too low (striped bars). Full tracking started on ${short(active.trackingStartedOn)}. ${reason}` : null}
        {active.truncated ? ' PostHog sent only its first 50,000 rows, so early days can be too low.' : null}
      </span>
    </p>
  );
}

/** One metric with its own optional period and internal filter. */
function MetricCard({ metric, by, today, pageRange, pageInternal, pageData }) {
  const [own, setOwn] = useState(null);
  const range = own?.range || pageRange;
  const internal = own?.internal || pageInternal;
  const custom = Boolean(own);
  const local = useAnalytics(queryFor(range, internal, metric.group), custom);
  const data = custom ? local.data : pageData;
  const daily = data?.[metric.group]?.daily || null;
  const buckets = useMemo(() => (daily ? bucketize(daily, by) : null), [daily, by]);
  const values = buckets ? buckets.map((bucket) => metric.value(bucket.rows)) : null;
  const headline = daily ? metric.value(daily) : null;
  const [hover, setHover] = useState(null);
  const active = hover !== null && buckets?.[hover] ? { bucket: buckets[hover], value: values[hover] } : null;
  const ownLabel = custom ? [rangeLabel(range, today, PRESETS), INTERNAL.find((item) => item.value === internal)?.label].join(' · ') : null;

  return (
    <figure className="ax-metric">
      <figcaption>
        <div className="ax-metric-head">
          <span className="ax-trend-label">{metric.label}</span>
          <Popover align="end" label={`Filters for ${metric.label}`} trigger={(props) => (
            <button type="button" className={`ax-metric-filter${custom ? ' is-on' : ''}`} onClick={props.toggle} aria-expanded={props['aria-expanded']} aria-haspopup="true" aria-label={`Filters for ${metric.label}`} title="Filters for this chart">
              <Icon name="filter" size={13} />
            </button>
          )}>
            {({ close }) => <MetricFilters range={range} internal={internal} today={today} custom={custom}
              onChange={(next) => setOwn({ range: next.range, internal: next.internal })}
              onReset={() => { setOwn(null); close(); }} />}
          </Popover>
        </div>
        <strong className="ax-trend-total">{daily ? formatValue(headline, metric.format) : <Skeleton width={64} height={22} />}</strong>
        <span className="ax-metric-sub">
          {active ? `${bucketName(active.bucket, by, true)}: ${formatValue(active.value, metric.format)}${active.bucket.partial ? ' (too low)' : ''}`
            : ownLabel ? <span className="ax-metric-own">{ownLabel}</span> : metric.note || ' '}
        </span>
      </figcaption>
      {local.error && custom ? <p className="ax-field-error" role="alert">{errorText(local.error)}</p> : null}
      {buckets ? <MetricChart metric={metric} buckets={buckets} values={values} by={by} hover={hover} onHover={setHover} />
        : <Skeleton width="100%" height={88} />}
    </figure>
  );
}

function MetricFilters({ range, internal, today, custom, onChange, onReset }) {
  return (
    <div className="ax-metric-filters">
      <p className="ax-metric-filters-title">This chart only</p>
      <PeriodPicker range={range} today={today} presets={PRESETS} maxDays={MAX_DAYS} label="Period for this chart" onChange={(next) => onChange({ range: next, internal })} />
      <select aria-label="Internal members for this chart" value={internal} onChange={(event) => onChange({ range, internal: event.target.value })}>
        {INTERNAL.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
      <Button size="sm" variant="ghost" onClick={onReset} disabled={!custom}>Use the page filters</Button>
    </div>
  );
}

const CHART_HEIGHT = 88;

/** One series per chart, on a zero baseline. Hover a column to read its value. */
function MetricChart({ metric, buckets, values, by, hover, onHover }) {
  const count = buckets.length;
  const numbers = values.map((value) => (value === null ? 0 : value));
  const max = metric.format === 'percent' ? Math.max(0.01, ...numbers) : metric.format === 'rating' ? 5 : Math.max(1, ...numbers);
  // About 5 labels fit the width of one card, counted back from the last bucket.
  const step = Math.max(1, Math.ceil(count / 5));
  const columns = { gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` };
  const label = (bucket, index) => {
    if (by !== 'day') return bucketName(bucket, by, false);
    const previous = buckets[index - step];
    return dayText(bucket.start, { day: 'numeric', month: !previous || previous.start.slice(5, 7) !== bucket.start.slice(5, 7) ? 'short' : undefined });
  };
  const y = (value) => CHART_HEIGHT - (value / max) * (CHART_HEIGHT - 6);
  const points = values.map((value, index) => (value === null ? null : [(index + 0.5) * (100 / count), y(value)]));
  const lineSegments = [];
  let current = [];
  points.forEach((point) => {
    if (point) current.push(point);
    else if (current.length) { lineSegments.push(current); current = []; }
  });
  if (current.length) lineSegments.push(current);

  return (
    <div className={`ax-metric-chart${count > 31 ? ' is-dense' : ''}`}>
      <div className="ax-metric-plot" style={{ height: CHART_HEIGHT }} onMouseLeave={() => onHover(null)}>
        {metric.chart === 'line' ? (
          <svg className="ax-metric-line" viewBox={`0 0 100 ${CHART_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
            {lineSegments.map((segment, index) => (
              <polyline key={index} points={segment.map(([px, py]) => `${px},${py}`).join(' ')} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
        ) : null}
        <div className="ax-metric-cols" style={columns} role="img"
          aria-label={`${metric.label} per ${by}. ${buckets.map((bucket, index) => `${bucketName(bucket, by, true)}: ${formatValue(values[index], metric.format)}`).slice(-3).join('; ')}`}>
          {buckets.map((bucket, index) => {
            const value = values[index];
            const height = value ? `${Math.max(metric.chart === 'bar' ? 4 : 0, (value / max) * 100 * ((CHART_HEIGHT - 6) / CHART_HEIGHT))}%` : 0;
            return (
              <span key={bucket.key} className={`ax-metric-col${hover === index ? ' is-hover' : ''}${bucket.partial ? ' is-partial' : ''}`} onMouseEnter={() => onHover(index)}>
                {metric.chart === 'bar' ? <span className="ax-metric-bar" style={{ height }} />
                  : value !== null && hover === index ? <span className="ax-metric-dot" style={{ bottom: height }} /> : null}
              </span>
            );
          })}
        </div>
      </div>
      <div className="ax-trend-axis" style={columns} aria-hidden="true">
        {buckets.map((bucket, index) => <span key={bucket.key}>{(count - 1 - index) % step === 0 ? label(bucket, index) : ''}</span>)}
      </div>
      <table className="ax-sr-only">
        <caption>{metric.label}</caption>
        <tbody>{buckets.map((bucket, index) => <tr key={bucket.key}><th scope="row">{bucketName(bucket, by, true)}</th><td>{formatValue(values[index], metric.format)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
