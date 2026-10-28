'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { errorText, isSessionExpired, queryString, requestApi } from '../_lib/api';
import { display, formatMoney, relativeTime } from '../_lib/format';
import { Badge, Button, ConfirmDialog, Dialog, Drawer, EmptyState, Field, Icon, Segmented, useToast } from './ui';
import { InternalTag } from '../_config/sections';
import { useStoredState } from '../_lib/hooks';

/*
 * Fluxgo Cab ops (v4, fluxgo-backend docs/CAB_V4_DESIGN.md). The section opens on To do: everything that needs an
 * admin, sorted by deadline, with 1 main button each. The trip panel opens from every section, so an admin never
 * leaves the page to act on a cab. Every admin can do every operator action here.
 */

const VEHICLES = [
  { value: 'SEDAN', label: 'Sedan', seats: 4 },
  { value: 'SUV_6', label: 'SUV · 6', seats: 6 },
  { value: 'SUV_7', label: 'SUV · 7', seats: 7 },
  { value: 'TEMPO_TRAVELLER', label: 'Tempo Traveller', seats: 12 },
];
const vehicleLabel = (value) => VEHICLES.find((vehicle) => vehicle.value === value)?.label || value || '—';
const FUELS = [{ value: 'PETROL', label: 'Petrol' }, { value: 'DIESEL', label: 'Diesel' }, { value: 'CNG', label: 'CNG' }, { value: 'ELECTRIC', label: 'Electric' }];
const fuelLabel = (value) => FUELS.find((fuel) => fuel.value === value)?.label || null;
const AGE = { UNDER_12: '<12', '12_17': '12–17', '18_24': '18–24', '25_34': '25–34', '35_44': '35–44', '45_59': '45–59', '60_PLUS': '60+' };
const GENDER = { WOMAN: 'F', MAN: 'M', NON_BINARY: 'Other' };
const DOCS = { DRIVER_PHOTO: 'Driver photo', LICENCE: 'Driving licence', RC: 'Vehicle RC', VEHICLE_PHOTO: 'Vehicle photo', INSURANCE: 'Insurance' };
const PHASE = {
  BOOKING: { label: 'Taking bookings', tone: 'info' },
  DETAILS_SENT: { label: 'Details sent', tone: 'success' },
  CODES_OPEN: { label: 'Codes open', tone: 'warning' },
  DONE: { label: 'Done', tone: 'neutral' },
  NOT_FULFILLED: { label: 'Not fulfilled', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  CHECK: { label: 'Check marks', tone: 'danger' },
};
const TODO = {
  NO_DRIVER: { label: 'No driver', tone: 'danger' },
  UNDER_MINIMUM: { label: 'Under 4 seats', tone: 'warning' },
  CHECK_TRIP: { label: 'No codes', tone: 'danger' },
  DEMAND: { label: 'Demand', tone: 'info' },
  APPROVAL: { label: 'Approval', tone: 'info' },
  EXPIRING: { label: 'Expiring', tone: 'warning' },
  OPERATOR_CANCELLED: { label: 'Operator cancelled', tone: 'danger' },
  CAB_NOT_HERE: { label: 'Cab not here', tone: 'danger' },
  WOMEN_PREFERENCE: { label: 'Women preference', tone: 'warning' },
};
const BOOKING_TONE = { CONFIRMED: 'success', COMPLETED: 'success', NO_SHOW: 'danger', CANCELLED_LATE: 'danger', CANCELLED_BY_OPS: 'neutral', NOT_FULFILLED: 'neutral', WITHDRAWN: 'neutral', INTERESTED: 'info' };
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** India clock for an ISO time, for example "8:15 pm". */
function clock(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(new Date(value)).toLowerCase();
}
function hourLabel(hour) { return `${hour % 12 || 12} ${hour < 12 ? 'am' : 'pm'}`; }
function indiaToday() { return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10); }
function addDays(date, days) { return new Date(Date.parse(`${date}T00:00:00.000Z`) + days * 864e5).toISOString().slice(0, 10); }
function dayLabel(date) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00.000Z`));
}
function dayTime(value) {
  if (!value) return '—';
  return `${new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value))}, ${clock(value)}`;
}
/** India date and hour of a slot start. */
function slotParts(startAt) {
  const india = new Date(Date.parse(startAt) + 330 * 60_000);
  return { date: india.toISOString().slice(0, 10), hour: india.getUTCHours() };
}

function useAction() {
  const notify = useToast();
  const [busy, setBusy] = useState('');
  const run = useCallback(async (key, work, done) => {
    setBusy(key);
    try {
      const result = await work();
      if (done) notify(done);
      return result ?? true;
    } catch (error) {
      if (!isSessionExpired(error)) notify(errorText(error), 'danger');
      return null;
    } finally {
      setBusy('');
    }
  }, [notify]);
  return { busy, run };
}

/** Load a GET path. A null path loads nothing. */
function useLoad(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!path) return;
    try {
      setData(await requestApi(path));
      setError('');
    } catch (requestError) {
      if (!isSessionExpired(requestError)) setError(errorText(requestError));
    }
  }, [path]);
  useEffect(() => { void load(); }, [load]);
  return { data, error, reload: load };
}

/** Fluxgo seats, seats sold elsewhere, and free seats, with a mark at the minimum. */
function SeatsBar({ taken = 0, elsewhere = 0, capacity = 0, min = 4 }) {
  const free = Math.max(0, capacity - taken - elsewhere);
  const cells = Array.from({ length: capacity }, (_, index) => index < taken ? 'is-fluxgo' : index < taken + elsewhere ? 'is-elsewhere' : '');
  return <span className="ax-seats" title={`${taken} Fluxgo · ${elsewhere} elsewhere · ${free} free · goes at ${min}`} aria-label={`${taken} Fluxgo seats, ${elsewhere} sold elsewhere, ${free} free`}>
    {cells.map((tone, index) => <span key={index} className={`ax-seat ${tone}${index === min - 1 ? ' is-min' : ''}`} />)}
  </span>;
}

const SECTIONS = [
  { value: 'todo', label: 'To do' },
  { value: 'today', label: 'Today' },
  { value: 'planner', label: 'Planner' },
  { value: 'partners', label: 'Partners' },
  { value: 'insights', label: 'Insights' },
  { value: 'routes', label: 'Routes' },
];

/** Fluxgo Cab: To do, Today, Planner, Partners, Insights, Routes, one search box, and the trip panel. */
export function CabView({ params, setParams, todo, onTodoChanged }) {
  // A push link with a route or date (older alerts) opens the Planner of that route.
  const tab = SECTIONS.some((section) => section.value === params.cab) ? params.cab : params.route || params.date ? 'planner' : 'todo';
  const [corridors, setCorridors] = useState([]);
  const [partners, setPartners] = useState(null);
  const [error, setError] = useState('');
  // Same rule as the other admin lists: internal members (Fluxgo team or test accounts) are hidden unless shown.
  const [showInternal, setShowInternal] = useStoredState('cab:showInternal', false);
  const internal = showInternal ? 'include' : undefined;
  const [search, setSearch] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [addCab, setAddCab] = useState(null);
  const notify = useToast();
  const openRun = useCallback((runId) => setParams({ run: runId }), [setParams]);

  const loadCorridors = useCallback(async () => {
    try {
      setCorridors((await requestApi('/admin/cab/corridors'))?.corridors || []);
      setError('');
    } catch (requestError) {
      if (!isSessionExpired(requestError)) setError(errorText(requestError));
    }
  }, []);
  const loadPartners = useCallback(async () => {
    try { setPartners((await requestApi('/admin/cab/partners'))?.operators || []); } catch { /* sections that need partners show their own state */ }
  }, []);
  useEffect(() => { void loadCorridors(); void loadPartners(); }, [loadCorridors, loadPartners]);
  const changed = useCallback(() => { onTodoChanged?.(); void loadPartners(); }, [loadPartners, onTodoChanged]);

  const doSearch = async (event) => {
    event.preventDefault();
    if (search.trim().length < 2) return;
    setSearching(true);
    try {
      setResults(await requestApi(`/admin/cab/search${queryString({ q: search.trim() })}`));
    } catch (requestError) {
      if (!isSessionExpired(requestError)) notify(errorText(requestError), 'danger');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="ax-view">
      <div className="ax-section-head ax-cab-head">
        <Segmented label="Cab view" value={tab} onChange={(value) => setParams({ cab: value === 'todo' ? undefined : value })}
          options={SECTIONS.map((section) => ({ ...section, count: section.value === 'todo' ? todo?.count || null : null }))} />
        <form className="ax-cab-search" onSubmit={doSearch} role="search">
          <Icon name="search" size={15} />
          <input aria-label="Search cab bookings, members, vehicles, drivers, operators" placeholder={searching ? 'Searching…' : 'Code, phone, name, vehicle'} value={search} onChange={(event) => setSearch(event.target.value)} />
        </form>
        {tab === 'todo' || tab === 'today' || tab === 'insights' ? <label className="ax-check"><input type="checkbox" checked={Boolean(showInternal)} onChange={(event) => setShowInternal(event.target.checked)} /> Show internal</label> : null}
      </div>
      {error ? <div className="ax-inline-error" role="alert"><span>{error}</span><Button size="sm" onClick={loadCorridors}>Try again</Button></div> : null}
      {tab === 'todo' ? <CabTodo internal={internal} shared={todo} onChanged={changed} openRun={openRun} openPartners={() => setParams({ cab: 'partners' })} onAddCab={setAddCab} partners={partners} /> : null}
      {tab === 'today' ? <CabToday internal={internal} openRun={openRun} /> : null}
      {tab === 'planner' ? <CabPlanner corridors={corridors} params={params} setParams={setParams} openRun={openRun} onAddCab={setAddCab} /> : null}
      {tab === 'partners' ? <CabPartners partners={partners} corridors={corridors} onChanged={changed} /> : null}
      {tab === 'insights' ? <CabInsights internal={internal} /> : null}
      {tab === 'routes' ? <CabRoutes corridors={corridors} onChanged={loadCorridors} /> : null}

      <Drawer open={Boolean(params.run)} onClose={() => setParams({ run: undefined })} label="Cab" wide>
        {params.run ? <CabTripPanel key={params.run} runId={params.run} partners={partners} onClose={() => setParams({ run: undefined })} onChanged={changed} /> : null}
      </Drawer>
      {addCab ? <AddCabDialog corridors={corridors} partners={partners} initial={addCab} onClose={() => setAddCab(null)} onDone={() => { setAddCab(null); changed(); }} /> : null}
      {results ? <SearchResults results={results} onClose={() => setResults(null)} openRun={(id) => { setResults(null); openRun(id); }} openPartners={() => { setResults(null); setParams({ cab: 'partners' }); }} /> : null}
    </div>
  );
}

// To do

function CabTodo({ internal, shared, onChanged, openRun, openPartners, onAddCab, partners }) {
  // The page loads the shared To do for the Cab badge. With Show internal on, this section loads its own.
  const own = useLoad(internal ? `/admin/cab/todo${queryString({ internal })}` : null);
  const data = internal ? own.data : shared;
  const { busy, run } = useAction();
  const [review, setReview] = useState(null);
  const refresh = () => { onChanged(); if (internal) void own.reload(); };

  if (!data) return <EmptyState icon="route" title="Loading the Cab to do list">If this stays, the server may not have Cab v4 yet.</EmptyState>;
  if (!data.items.length) return <EmptyState icon="check" title="Nothing to do">New approvals, demand, and cabs that need you show here first.</EmptyState>;

  const action = (item) => {
    switch (item.type) {
      case 'DEMAND': return <>
        <Button size="sm" onClick={() => onAddCab({ corridorId: item.corridorId, cells: [slotParts(item.slotStartAt)] })}>Add a cab</Button>
        <Button size="sm" variant="primary" busy={busy === item.id} onClick={() => run(item.id, () => requestApi('/admin/cab/slots/ask-operators', { method: 'POST', body: JSON.stringify({ corridorId: item.corridorId, slotStartAt: item.slotStartAt }) }), 'The operators on this route got the request.').then((ok) => ok && refresh())}>Ask operators</Button>
      </>;
      case 'APPROVAL': return <Button size="sm" variant="primary" onClick={() => setReview(item.owner)}>Review</Button>;
      case 'EXPIRING': return <Button size="sm" variant="primary" busy={busy === item.id} onClick={() => run(item.id, () => requestApi(`/admin/cab/partners/${item.owner.kind.toLowerCase()}/${item.owner.id}/notify-expiry`, { method: 'POST' }), 'The operator got a message.')}>Tell the operator</Button>;
      case 'UNDER_MINIMUM': return <>
        <Button size="sm" onClick={() => openRun(item.runId)}>Open cab</Button>
        <Button size="sm" variant="primary" busy={busy === item.id} onClick={() => run(item.id, () => requestApi(`/admin/cab/runs/${item.runId}/go-anyway`, { method: 'POST' }), 'This cab goes. Members get the details 2 hours before.').then((ok) => ok && refresh())}>Let it go</Button>
      </>;
      case 'CHECK_TRIP': return <Button size="sm" variant="primary" onClick={() => openRun(item.runId)}>Mark bookings</Button>;
      default: return item.runId ? <Button size="sm" variant="primary" onClick={() => openRun(item.runId)}>Open cab</Button> : null;
    }
  };

  return (
    <>
      <p className="ax-muted ax-small">{data.count} item{data.count === 1 ? '' : 's'}, the nearest deadline first. An item goes away when its cause is fixed.</p>
      <ul className="ax-cab-todo">
        {data.items.map((item) => <li key={item.id} className="ax-cab-todo-row">
          <Badge tone={TODO[item.type]?.tone}>{TODO[item.type]?.label || item.type}</Badge>
          <div className="ax-cab-todo-text">
            <strong>{item.title}</strong>
            <span className="ax-muted">{item.detail}</span>
          </div>
          <span className="ax-muted ax-small ax-cab-due" title={dayTime(item.dueAt)}>{relativeTime(item.dueAt)}</span>
          <div className="ax-cab-actions">{action(item)}</div>
        </li>)}
      </ul>
      {review ? <ApprovalDialog owner={review} partners={partners} onClose={() => setReview(null)} onDone={() => { setReview(null); refresh(); }} openPartners={openPartners} /> : null}
    </>
  );
}

/** Approve or reject one operator, driver, or vehicle, with its documents next to its details. */
function ApprovalDialog({ owner, partners, onClose, onDone, openPartners }) {
  const { busy, run } = useAction();
  const [reason, setReason] = useState('');
  const list = owner.kind === 'DRIVER' ? 'drivers' : 'vehicles';
  const operator = partners?.find((row) => owner.kind === 'OPERATOR' ? row.id === owner.id : row[list].some((item) => item.id === owner.id));
  const record = owner.kind === 'OPERATOR' ? operator : operator?.[list].find((item) => item.id === owner.id);
  const decide = (approve) => run(`decide-${approve}`, () => requestApi(`/admin/cab/partners/${owner.kind.toLowerCase()}/${owner.id}/decision`, { method: 'POST', body: JSON.stringify({ approve, reason: reason.trim() || undefined }) }), approve ? 'Approved. The operator got a message.' : 'Not approved. The operator sees your reason.').then((ok) => ok && onDone());
  return (
    <Dialog open title={owner.kind === 'OPERATOR' ? 'Approve operator' : owner.kind === 'DRIVER' ? 'Approve driver' : 'Approve vehicle'} onClose={onClose} width={620} busy={Boolean(busy)}
      footer={<><Button onClick={onClose}>Close</Button><Button variant="danger" busy={busy === 'decide-false'} disabled={!reason.trim()} onClick={() => decide(false)}>Reject</Button><Button variant="primary" busy={busy === 'decide-true'} onClick={() => decide(true)}>Approve</Button></>}>
      {!record ? <p className="ax-muted">This record is not loaded. <button type="button" className="ax-link" onClick={openPartners}>Open Partners</button></p> : <div className="ax-form-stack">
        {owner.kind === 'OPERATOR' ? <dl className="ax-cab-facts">
          <dt>Name</dt><dd>{record.name}</dd><dt>Business</dt><dd>{display(record.businessName)}</dd><dt>Phone</dt><dd>{record.phone}</dd><dt>Signed up</dt><dd>{dayTime(record.createdAt)}</dd>
        </dl> : owner.kind === 'DRIVER' ? <dl className="ax-cab-facts">
          <dt>Operator</dt><dd>{operator.businessName || operator.name}</dd><dt>Name</dt><dd>{record.firstName}</dd><dt>Phone</dt><dd>{record.phone}</dd><dt>Licence</dt><dd>{display(record.licenceNumber)}</dd><dt>Valid until</dt><dd>{display(record.licenceExpiresOn)}</dd>
        </dl> : <dl className="ax-cab-facts">
          <dt>Operator</dt><dd>{operator.businessName || operator.name}</dd><dt>Number</dt><dd>{record.registrationNumber}</dd><dt>Vehicle</dt><dd>{[record.colour, record.model].filter(Boolean).join(' ')} · {vehicleLabel(record.vehicleType)} · {record.seatCapacity} seats</dd><dt>Fuel</dt><dd>{fuelLabel(record.fuelType) || <Badge tone="warning">Not set (needed to approve)</Badge>}</dd><dt>Insurance until</dt><dd>{display(record.insuranceExpiresOn)}</dd>
        </dl>}
        {record.documents ? <DocumentLinks documents={record.documents} /> : null}
        <Field label="Reason (needed to reject; the operator sees it)" htmlFor="approve-reason"><input id="approve-reason" maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="For example: the RC photo is not clear" /></Field>
      </div>}
    </Dialog>
  );
}

function DocumentLinks({ documents }) {
  const { busy, run } = useAction();
  const open = async (document) => {
    // Open the tab first, so the browser does not block it after the request.
    const tab = window.open('about:blank', '_blank');
    const result = await run(document.id, () => requestApi(`/admin/cab/documents/${document.id}/url`));
    if (result?.url && tab) tab.location.href = result.url; else tab?.close();
  };
  return <div className="ax-cab-docs">
    {documents.map((document) => document.id
      ? <Button key={document.kind} size="sm" icon="external" busy={busy === document.id} onClick={() => open(document)}>{DOCS[document.kind]}</Button>
      : <Badge key={document.kind} tone="warning">{DOCS[document.kind]} missing</Badge>)}
  </div>;
}

// Today

function CabToday({ internal, openRun }) {
  const [date, setDate] = useState(indiaToday());
  const { data, error, reload } = useLoad(`/admin/cab/today${queryString({ date, internal })}`);
  useEffect(() => {
    const timer = setInterval(() => { void reload(); }, 60_000);
    return () => clearInterval(timer);
  }, [reload]);
  return (
    <>
      <div className="ax-cab-row ax-cab-daybar">
        <Button size="sm" icon="arrowLeft" onClick={() => setDate(addDays(date, -1))}>Previous</Button>
        <strong>{date === indiaToday() ? 'Today' : dayLabel(date)}</strong>
        <Button size="sm" iconRight="arrowRight" onClick={() => setDate(addDays(date, 1))}>Next</Button>
        {date !== indiaToday() ? <Button size="sm" variant="ghost" onClick={() => setDate(indiaToday())}>Today</Button> : null}
      </div>
      {error ? <div className="ax-inline-error" role="alert"><span>{error}</span></div> : null}
      {data && !data.cabs.length ? <EmptyState icon="route" title="No cabs on this day" /> : null}
      {data?.cabs.length ? <table className="ax-cab-table">
        <thead><tr><th>Leaves</th><th>Route</th><th>State</th><th>Seats</th><th>Boarded</th><th>Operator</th><th>Cab</th></tr></thead>
        <tbody>{data.cabs.map((cab) => <tr key={cab.id} className="ax-cab-click" tabIndex={0} onClick={() => openRun(cab.id)} onKeyDown={(event) => { if (event.key === 'Enter') openRun(cab.id); }}>
          <td><strong>{clock(cab.departureAt)}</strong></td>
          <td>{cab.corridorName}</td>
          <td><Badge tone={PHASE[cab.phase]?.tone}>{PHASE[cab.phase]?.label || cab.phase}</Badge></td>
          <td><SeatsBar taken={cab.seatsTaken} elsewhere={cab.seatsElsewhere} capacity={cab.seatCapacity} min={cab.minSeatsToGo} /> <span className="ax-muted ax-small">{cab.filledSeats}/{cab.seatCapacity}</span></td>
          <td>{cab.bookings ? `${cab.boardedBookings} of ${cab.bookings}` : '—'}{cab.noShowBookings ? <span className="ax-muted"> · {cab.noShowBookings} no-show</span> : null}</td>
          <td>{cab.operator ? cab.operator.name : <span className="ax-muted">Fluxgo</span>}</td>
          <td>{cab.vehicle ? cab.vehicle.registrationNumber : <Badge tone="warning">No vehicle</Badge>} {cab.driver ? <span className="ax-muted">· {cab.driver.firstName}</span> : <Badge tone="warning">No driver</Badge>}</td>
        </tr>)}</tbody>
      </table> : null}
    </>
  );
}

// Planner

function CabPlanner({ corridors, params, setParams, openRun, onAddCab }) {
  const corridorId = params.route || corridors[0]?.id;
  const [from, setFrom] = useState(params.date || indiaToday());
  const { data, error, reload } = useLoad(corridorId ? `/admin/cab/planner${queryString({ corridorId, from, days: 7 })}` : null);
  const [selected, setSelected] = useState([]);
  const key = (cell) => `${cell.date}:${cell.hour}`;
  const toggle = (cell) => setSelected((current) => current.some((item) => key(item) === key(cell)) ? current.filter((item) => key(item) !== key(cell)) : [...current, cell]);
  useEffect(() => { setSelected([]); }, [corridorId, from]);
  if (!corridors.length) return <EmptyState icon="rides" title="No cab routes yet">Add a route in Routes first.</EmptyState>;
  const min = data?.corridor.minSeatsToGo ?? 4;
  return (
    <>
      <div className="ax-cab-row ax-cab-daybar">
        <Field label="Route" htmlFor="planner-route"><select id="planner-route" value={corridorId} onChange={(event) => setParams({ route: event.target.value })}>{corridors.map((corridor) => <option key={corridor.id} value={corridor.id}>{corridor.name}</option>)}</select></Field>
        <Button size="sm" icon="arrowLeft" onClick={() => setFrom(addDays(from, -7))}>Earlier</Button>
        <Button size="sm" iconRight="arrowRight" onClick={() => setFrom(addDays(from, 7))}>Later</Button>
        <Button size="sm" variant="ghost" onClick={() => setFrom(indiaToday())}>This week</Button>
        <span className="ax-cab-grow" />
        {selected.length ? <><span className="ax-muted ax-small">{selected.length} slot{selected.length === 1 ? '' : 's'} chosen</span><Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear</Button></> : <span className="ax-muted ax-small">Click cells to choose slots</span>}
        <Button size="sm" variant="primary" icon="plus" disabled={!selected.length} onClick={() => onAddCab({ corridorId, cells: selected, onDone: () => { setSelected([]); void reload(); } })}>Add cab{selected.length > 1 ? ` to ${selected.length} slots` : ''}</Button>
      </div>
      <p className="ax-muted ax-small ax-cab-legend"><span className="ax-cab-key is-going" /> {min} or more filled <span className="ax-cab-key is-forming" /> under {min} <span className="ax-cab-key is-demand" /> interest, no cab <span className="ax-cab-key is-waiting" /> waiting for approval</p>
      {error ? <div className="ax-inline-error" role="alert"><span>{error}</span></div> : null}
      {data ? <div className="ax-cab-planner" role="grid" aria-label={`${data.corridor.name}, 7 days`}>
        <div className="ax-cab-planner-row is-head" role="row">
          <span role="columnheader" />
          {data.dates.map((day) => <span role="columnheader" key={day.date}>{day.date === indiaToday() ? 'Today' : dayLabel(day.date)}</span>)}
        </div>
        {Array.from({ length: 24 }, (_, hour) => <div className="ax-cab-planner-row" role="row" key={hour}>
          <span role="rowheader" className="ax-muted ax-small">{hourLabel(hour)}</span>
          {data.dates.map((day) => {
            const cell = day.cells[hour];
            const chosen = selected.some((item) => item.date === day.date && item.hour === hour);
            return <div role="gridcell" key={day.date} aria-selected={chosen} tabIndex={cell.past ? -1 : 0}
              className={`ax-cab-cell${cell.past ? ' is-past' : ''}${chosen ? ' is-chosen' : ''}`}
              onClick={() => { if (!cell.past) toggle({ date: day.date, hour }); }}
              onKeyDown={(event) => { if (!cell.past && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); toggle({ date: day.date, hour }); } }}>
              {cell.cabs.map((cab) => <button type="button" key={cab.id}
                className={`ax-cab-chip is-${cab.status === 'CANCELLED' ? 'cancelled' : !cab.ready ? 'waiting' : cab.fulfilment.toLowerCase()}`}
                title={`${cab.operatorName || 'Fluxgo'} · ${formatMoney(cab.seatPrice)}${cab.ready ? '' : ' · waiting for approval'}`}
                onClick={(event) => { event.stopPropagation(); openRun(cab.id); }}>{cab.filledSeats}/{cab.seatCapacity}</button>)}
              {cell.interestSeats ? <span className="ax-cab-chip is-demand">{cell.interestSeats} want</span> : null}
            </div>;
          })}
        </div>)}
      </div> : null}
    </>
  );
}

/** Add the same cab to chosen slots, for an operator or for Fluxgo. The server skips slots that do not fit. */
function AddCabDialog({ corridors, partners, initial, onClose, onDone }) {
  const { busy, run } = useAction();
  const corridor = corridors.find((row) => row.id === initial.corridorId);
  const active = (partners || []).filter((row) => row.status === 'ACTIVE');
  // The default operator works on this route. Without one, the cab is a Fluxgo cab until the admin picks.
  const [form, setForm] = useState(() => ({ operatorId: active.find((row) => row.routeIds.includes(initial.corridorId))?.id || '', vehicleType: 'SEDAN', vehicleId: '', driverId: '', price: String(corridor?.pricePerSeat || ''), elsewhere: '0', minute: '0' }));
  const [skipped, setSkipped] = useState(null);
  const operator = active.find((row) => row.id === form.operatorId);
  const vehicles = operator?.vehicles.filter((row) => row.approvalStatus === 'APPROVED' && row.status === 'ACTIVE' && !row.expired) || [];
  const drivers = operator?.drivers.filter((row) => row.approvalStatus === 'APPROVED' && row.status === 'ACTIVE' && !row.expired) || [];
  const byDate = useMemo(() => {
    const map = new Map();
    for (const cell of initial.cells) map.set(cell.date, [...(map.get(cell.date) || []), cell.hour]);
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [initial.cells]);
  const price = Number(form.price);
  const save = async () => {
    const result = await run('add', async () => {
      let added = 0;
      const rows = [];
      // The server adds every date x hour. One call for each date keeps only the cells that the admin chose.
      for (const [date, hours] of byDate) {
        const response = await requestApi('/admin/cab/runs/bulk', { method: 'POST', body: JSON.stringify({
          corridorId: initial.corridorId, dates: [date], hours, operatorId: form.operatorId || null,
          vehicleType: vehicles.find((row) => row.id === form.vehicleId)?.vehicleType || form.vehicleType,
          vehicleId: form.vehicleId || null, driverId: form.driverId || null,
          pricePerSeat: price === corridor?.pricePerSeat ? null : price, seatsElsewhere: Number(form.elsewhere), departureMinute: Number(form.minute),
        }) });
        added += response.runs.length;
        rows.push(...response.skipped);
      }
      return { added, rows };
    });
    if (!result) return;
    initial.onDone?.();
    if (result.rows.length) setSkipped(result); else onDone();
  };
  if (skipped) {
    return <Dialog open title={`${skipped.added} cab${skipped.added === 1 ? '' : 's'} added`} onClose={onDone} width={520} footer={<Button variant="primary" onClick={onDone}>Done</Button>}>
      <p className="ax-muted">Skipped slots:</p>
      <ul className="ax-cab-plain">{skipped.rows.map((row) => <li key={row.slotStartAt}>{dayTime(row.slotStartAt)}: {row.reason}</li>)}</ul>
    </Dialog>;
  }
  return (
    <Dialog open title={`Add cab to ${initial.cells.length} slot${initial.cells.length === 1 ? '' : 's'}`} description={`${corridor?.name || 'Route'} · ${byDate.map(([date, hours]) => `${dayLabel(date)} ${hours.sort((a, b) => a - b).map(hourLabel).join(', ')}`).join(' · ')}`} onClose={onClose} width={560} busy={busy === 'add'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" busy={busy === 'add'} disabled={!corridor || !(price >= corridor.pricePerSeat)} onClick={save}>Add</Button></>}>
      <div className="ax-form-stack">
        <Field label="Operator" htmlFor="add-operator"><select id="add-operator" value={form.operatorId} onChange={(event) => setForm({ ...form, operatorId: event.target.value, vehicleId: '', driverId: '' })}>
          <option value="">Fluxgo (no operator)</option>
          {active.map((row) => <option key={row.id} value={row.id}>{row.businessName || row.name}</option>)}
        </select></Field>
        <div className="ax-cab-row">
          <Field label="Vehicle" htmlFor="add-vehicle"><select id="add-vehicle" value={form.vehicleId} onChange={(event) => setForm({ ...form, vehicleId: event.target.value })}>
            <option value="">Choose later</option>{vehicles.map((row) => <option key={row.id} value={row.id}>{row.registrationNumber} · {row.seatCapacity} seats</option>)}
          </select></Field>
          {!form.vehicleId ? <Field label="Type" htmlFor="add-type"><select id="add-type" value={form.vehicleType} onChange={(event) => setForm({ ...form, vehicleType: event.target.value })}>{VEHICLES.map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}</select></Field> : null}
          <Field label="Driver" htmlFor="add-driver"><select id="add-driver" value={form.driverId} onChange={(event) => setForm({ ...form, driverId: event.target.value })}>
            <option value="">Choose later</option>{drivers.map((row) => <option key={row.id} value={row.id}>{row.firstName}</option>)}
          </select></Field>
        </div>
        <div className="ax-cab-row">
          <Field label={`Price a seat (₹, at least ${formatMoney(corridor?.pricePerSeat)})`} htmlFor="add-price"><input id="add-price" type="number" min={corridor?.pricePerSeat} value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></Field>
          <Field label="Sold elsewhere" htmlFor="add-elsewhere"><input id="add-elsewhere" type="number" min="0" max="20" value={form.elsewhere} onChange={(event) => setForm({ ...form, elsewhere: event.target.value })} /></Field>
          <Field label="Leaves at minute" htmlFor="add-minute"><select id="add-minute" value={form.minute} onChange={(event) => setForm({ ...form, minute: event.target.value })}>{[0, 15, 30, 45].map((value) => <option key={value} value={value}>:{String(value).padStart(2, '0')}</option>)}</select></Field>
        </div>
        <p className="ax-muted ax-small">Interests in these slots at the same or a higher price become bookings at once. Slots that leave in less than 1 hour, or where the driver or vehicle is busy, are skipped.</p>
      </div>
    </Dialog>
  );
}

// Trip panel

function CabTripPanel({ runId, partners, onClose, onChanged }) {
  const { data, error, reload } = useLoad(`/admin/cab/runs/${runId}/trip`);
  const { busy, run } = useAction();
  const [mark, setMark] = useState(null);
  const [cancel, setCancel] = useState(null);
  const [code, setCode] = useState('');
  const [edit, setEdit] = useState(null);
  const after = async (ok) => { if (ok) { await reload(); onChanged(); } return ok; };
  const post = (key, path, body, done) => run(key, () => requestApi(path, { method: 'POST', ...(body ? { body: JSON.stringify(body) } : {}) }), done).then(after);
  const patch = (body, done) => run('edit', () => requestApi(`/admin/cab/runs/${runId}`, { method: 'PATCH', body: JSON.stringify(body) }), done).then(after).then((ok) => { if (ok) setEdit(null); });

  if (error) return <div className="ax-drawer-body"><div className="ax-inline-error" role="alert"><span>{error}</span></div></div>;
  if (!data) return <div className="ax-drawer-body"><p className="ax-muted">Loading…</p></div>;
  const cab = data.run;
  const open = cab.status === 'CONFIRMED' || cab.status === 'PLANNED';
  const operator = partners?.find((row) => row.id === cab.operatorId);
  const drivers = operator?.drivers.filter((row) => row.approvalStatus === 'APPROVED' && row.status === 'ACTIVE' && !row.expired) || [];
  const vehicles = operator?.vehicles.filter((row) => row.approvalStatus === 'APPROVED' && row.status === 'ACTIVE' && !row.expired) || [];
  const booked = data.bookings.filter((row) => ['CONFIRMED', 'COMPLETED', 'NO_SHOW'].includes(row.status));
  const others = data.bookings.filter((row) => !booked.includes(row));

  return (
    <div className="ax-drawer-body ax-cab-panel">
      <header className="ax-cab-panel-head">
        <div>
          <h2>{dayTime(cab.departureAt)}</h2>
          <p className="ax-muted">{cab.corridorName} · {formatMoney(cab.seatPrice)} a seat{cab.pricePerSeat ? '' : ' (route price)'}</p>
        </div>
        <Badge tone={PHASE[cab.phase]?.tone}>{PHASE[cab.phase]?.label || cab.phase}</Badge>
        <Button size="sm" variant="ghost" icon="close" onClick={onClose} aria-label="Close" />
      </header>

      <section className="ax-cab-panel-block">
        <div className="ax-cab-line"><SeatsBar taken={cab.seatsTaken} elsewhere={cab.seatsElsewhere} capacity={cab.seatCapacity} min={cab.minSeatsToGo} /><span>{cab.seatsTaken} Fluxgo · {cab.seatsElsewhere} elsewhere · {cab.freeSeats} free · goes at {cab.minSeatsToGo}</span></div>
        {!cab.ready ? <p className="ax-note is-warning">No bookings until the operator, driver, and vehicle are approved.</p> : null}
        {cab.cancelReason ? <p className="ax-note">{cab.cancelReason}</p> : null}
        <dl className="ax-cab-facts">
          <dt>Operator</dt><dd>{data.operator ? `${data.operator.name} · ${data.operator.phone}` : 'Fluxgo'}</dd>
          <dt>Vehicle</dt><dd>{data.vehicle ? `${data.vehicle.registrationNumber} · ${[data.vehicle.colour, data.vehicle.model, fuelLabel(data.vehicle.fuelType)].filter(Boolean).join(' ')}` : <Badge tone="warning">None yet · {vehicleLabel(cab.vehicleType)}</Badge>}</dd>
          <dt>Driver</dt><dd>{data.driver ? `${data.driver.firstName} · ${data.driver.phone}` : <Badge tone="warning">None yet</Badge>}</dd>
        </dl>
        {open ? <div className="ax-cab-actions is-left">
          <Button size="sm" onClick={() => setEdit({ seatsElsewhere: String(cab.seatsElsewhere), price: String(cab.seatPrice), driverId: cab.driverId || '', vehicleId: cab.vehicleId || '' })}>Change</Button>
          {!cab.fulfilledAt && cab.status === 'CONFIRMED' ? <Button size="sm" busy={busy === 'go'} onClick={() => post('go', `/admin/cab/runs/${runId}/go-anyway`, null, 'This cab goes even under the minimum.')}>Let it go under {cab.minSeatsToGo}</Button> : null}
          <Button size="sm" variant="danger" onClick={() => setCancel({ reason: '', chargeOperator: false })}>Cancel cab</Button>
        </div> : null}
      </section>

      {['CONFIRMED', 'DEPARTED', 'COMPLETED'].includes(cab.status) && booked.length ? <section className="ax-cab-panel-block">
        <form className="ax-cab-row" onSubmit={(event) => { event.preventDefault(); if (/^\d{4}$/.test(code)) void post('code', `/admin/cab/runs/${runId}/code`, { code }, 'Boarded.').then((ok) => ok && setCode('')); }}>
          <Field label="Boarding code (when the driver calls)" htmlFor="panel-code"><input id="panel-code" inputMode="numeric" maxLength={4} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} placeholder="4 digits" /></Field>
          <Button size="sm" variant="primary" type="submit" busy={busy === 'code'} disabled={code.length !== 4}>Check code</Button>
        </form>
      </section> : null}

      <section className="ax-cab-panel-block">
        <h3>Bookings <span className="ax-muted">{booked.length}</span></h3>
        {!booked.length ? <p className="ax-muted">No Fluxgo booking.</p> : <table className="ax-cab-table">
          <thead><tr><th>Member</th><th>Pickup</th><th>Seats</th><th>Mark</th><th /></tr></thead>
          <tbody>{booked.map((row) => <tr key={row.id}>
            <td>
              <strong>{row.member?.firstName || '—'}</strong>{row.member?.isInternal ? <InternalTag /> : null}<br />
              <span className="ax-muted ax-small">{row.member?.phone} · {row.travellers.map((traveller) => [traveller.firstName, GENDER[traveller.gender], AGE[traveller.ageGroup]].filter(Boolean).join(' ')).join(', ')}</span>
              {row.member?.missedOrLate ? <><br /><Badge tone="warning">{row.member.missedOrLate} no-show or late cancel</Badge></> : null}
              {row.womenPreference ? <><br /><span className="ax-muted ax-small">Wants another woman in the cab</span></> : null}
            </td>
            <td>{row.pickup}<br /><span className="ax-muted ax-small">to {row.drop}{row.luggage.large ? ' · large bag' : ''}</span></td>
            <td>{row.seats} · {formatMoney(row.pricePerSeat * row.seats)}</td>
            <td>{row.boardedAt ? <Badge tone="success">Boarded {clock(row.boardedAt)}</Badge> : row.noShowAt ? <Badge tone="danger">{row.noShowPublishedAt ? 'No-show (on profile)' : 'No-show'}</Badge> : <Badge tone={row.status === 'COMPLETED' ? 'warning' : 'neutral'}>{row.status === 'COMPLETED' ? 'No mark' : 'Waiting'}</Badge>}</td>
            <td><div className="ax-cab-actions">
              {!row.boardedAt ? <Button size="sm" onClick={() => setMark({ booking: row, status: 'BOARDED', reason: '' })}>Boarded</Button> : null}
              {!row.noShowAt ? <Button size="sm" onClick={() => setMark({ booking: row, status: 'NO_SHOW', reason: '' })}>No-show</Button> : null}
              {row.boardedAt || row.noShowAt ? <Button size="sm" variant="ghost" onClick={() => setMark({ booking: row, status: null, reason: '' })}>Clear</Button> : null}
            </div></td>
          </tr>)}</tbody>
        </table>}
        {others.length ? <details><summary className="ax-muted ax-small">{others.length} closed booking{others.length === 1 ? '' : 's'} or waiting interest{others.length === 1 ? '' : 's'}</summary>
          <ul className="ax-cab-plain">{others.map((row) => <li key={row.id}><Badge tone={BOOKING_TONE[row.status]}>{row.status.replace(/_/g, ' ').toLowerCase()}</Badge> {row.member?.firstName} · {row.seats} seat{row.seats === 1 ? '' : 's'}{row.declineReason ? ` · ${row.declineReason}` : ''}</li>)}</ul>
        </details> : null}
      </section>

      <section className="ax-cab-panel-block">
        <h3>History</h3>
        <ol className="ax-cab-history">{data.history.slice().reverse().map((event) => <li key={event.id}>
          <span className="ax-muted ax-small">{dayTime(event.at)}</span> <strong>{event.action.replace(/_/g, ' ').toLowerCase()}</strong> <span className="ax-muted">by {event.actorType.toLowerCase()}</span>{event.reason ? ` · ${event.reason}` : ''}
        </li>)}</ol>
      </section>

      <Dialog open={Boolean(edit)} title="Change this cab" onClose={() => setEdit(null)} busy={busy === 'edit'} width={520}
        footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" busy={busy === 'edit'} onClick={() => {
          const body = {};
          if (Number(edit.seatsElsewhere) !== cab.seatsElsewhere) body.seatsElsewhere = Number(edit.seatsElsewhere);
          if (Number(edit.price) !== cab.seatPrice) body.pricePerSeat = Number(edit.price) === cab.minimumPrice ? null : Number(edit.price);
          if ((edit.driverId || null) !== (cab.driverId || null)) body.driverId = edit.driverId || null;
          if ((edit.vehicleId || null) !== (cab.vehicleId || null)) body.vehicleId = edit.vehicleId || null;
          if (!Object.keys(body).length) { setEdit(null); return; }
          void patch(body, 'Saved. Members get the new cab details when they change.');
        }}>Save</Button></>}>
        {edit ? <div className="ax-form-stack">
          <div className="ax-cab-row">
            <Field label="Seats sold elsewhere" htmlFor="edit-elsewhere"><input id="edit-elsewhere" type="number" min="0" max={cab.seatCapacity - cab.seatsTaken} value={edit.seatsElsewhere} onChange={(event) => setEdit({ ...edit, seatsElsewhere: event.target.value })} /></Field>
            <Field label={`Price a seat (at least ${formatMoney(cab.minimumPrice)})`} htmlFor="edit-price"><input id="edit-price" type="number" min={cab.minimumPrice} value={edit.price} onChange={(event) => setEdit({ ...edit, price: event.target.value })} /></Field>
          </div>
          {operator ? <div className="ax-cab-row">
            <Field label="Driver" htmlFor="edit-driver"><select id="edit-driver" value={edit.driverId} onChange={(event) => setEdit({ ...edit, driverId: event.target.value })}><option value="">None</option>{drivers.map((row) => <option key={row.id} value={row.id}>{row.firstName} · {row.phone}</option>)}</select></Field>
            <Field label="Vehicle" htmlFor="edit-vehicle"><select id="edit-vehicle" value={edit.vehicleId} onChange={(event) => setEdit({ ...edit, vehicleId: event.target.value })}><option value="">None</option>{vehicles.map((row) => <option key={row.id} value={row.id}>{row.registrationNumber} · {row.seatCapacity} seats</option>)}</select></Field>
          </div> : <p className="ax-muted ax-small">A cab with no operator has no driver or vehicle to choose from.</p>}
          <p className="ax-muted ax-small">Members who already booked keep their price. Fluxgo seats cannot be sold elsewhere.</p>
        </div> : null}
      </Dialog>

      <ConfirmDialog open={Boolean(mark)} title={mark?.status === 'BOARDED' ? 'Mark as boarded' : mark?.status === 'NO_SHOW' ? 'Mark as no-show' : 'Clear the mark'} confirmLabel="Save" tone={mark?.status === 'NO_SHOW' ? 'danger' : 'primary'} busy={busy === 'mark'}
        description={mark?.status === 'NO_SHOW' ? 'The no-show shows on the public profile 24 hours from now.' : 'The member counts are recounted.'}
        onCancel={() => setMark(null)}
        onConfirm={() => { if (mark?.reason.trim()) void post('mark', `/admin/cab/interests/${mark.booking.id}/mark`, { status: mark.status, reason: mark.reason.trim() }, 'Saved.').then((ok) => ok && setMark(null)); }}>
        <Field label="Reason (kept in the history)" htmlFor="mark-reason"><input id="mark-reason" maxLength={300} value={mark?.reason || ''} onChange={(event) => setMark({ ...mark, reason: event.target.value })} placeholder="For example: called the member" /></Field>
      </ConfirmDialog>

      <ConfirmDialog open={Boolean(cancel)} title="Cancel this cab" confirmLabel="Cancel cab" tone="danger" busy={busy === 'cancel'}
        description={`${booked.length} booking${booked.length === 1 ? '' : 's'} will be cancelled. Members get a message and nothing counts against them. Nobody is moved.`}
        onCancel={() => setCancel(null)}
        onConfirm={() => { if (cancel?.reason.trim()) void post('cancel', `/admin/cab/runs/${runId}/cancel`, { reason: cancel.reason.trim(), chargeOperator: cancel.chargeOperator }, 'Cab cancelled.').then((ok) => ok && setCancel(null)); }}>
        <Field label="Reason (members see it)" htmlFor="cancel-reason"><input id="cancel-reason" maxLength={300} value={cancel?.reason || ''} onChange={(event) => setCancel({ ...cancel, reason: event.target.value })} /></Field>
        {cab.operatorId ? <label className="ax-check"><input type="checkbox" checked={Boolean(cancel?.chargeOperator)} onChange={(event) => setCancel({ ...cancel, chargeOperator: event.target.checked })} /> The operator caused it (count on the operator, driver, and vehicle)</label> : null}
      </ConfirmDialog>
    </div>
  );
}

// Partners

const EMPTY_PARTNER = {
  operator: { name: '', businessName: '', phone: '', note: '' },
  driver: { firstName: '', phone: '', licenceNumber: '', licenceExpiresOn: '' },
  vehicle: { vehicleType: 'SEDAN', fuelType: '', registrationNumber: '', colour: '', model: '', seatCapacity: '', insuranceExpiresOn: '' },
};

function approvalBadge(row) {
  if (row.status === 'SUSPENDED') return <Badge tone="neutral">Stopped</Badge>;
  if (row.expired) return <Badge tone="danger">Expired</Badge>;
  if (row.approvalStatus === 'APPROVED') return <Badge tone="success">Approved</Badge>;
  if (row.approvalStatus === 'REJECTED') return <Badge tone="danger" title={row.rejectReason}>Not approved</Badge>;
  return row.missingDocuments.length ? <Badge tone="warning">{row.missingDocuments.length} document{row.missingDocuments.length === 1 ? '' : 's'} missing</Badge> : <Badge tone="info">To check</Badge>;
}

function CabPartners({ partners, corridors, onChanged }) {
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState(null);
  const [review, setReview] = useState(null);
  const [upload, setUpload] = useState(null);
  const { busy, run } = useAction();
  if (!partners) return <EmptyState icon="vehicles" title="Loading partners" />;
  const routeName = (id) => corridors.find((row) => row.id === id)?.name || 'Route';
  const needsCheck = (operator) => operator.status === 'PENDING' || [...operator.drivers, ...operator.vehicles].some((row) => row.approvalStatus === 'PENDING' && !row.missingDocuments.length);
  const shown = partners.filter((row) => filter === 'all' || (filter === 'check' ? needsCheck(row) : row.status === filter));
  const save = async () => {
    const { kind, id, operatorId, ...values } = form;
    const path = { operator: '/admin/cab/operators', driver: '/admin/cab/drivers', vehicle: '/admin/cab/vehicles' }[kind];
    const body = kind === 'operator' ? { ...values, businessName: values.businessName || null, note: values.note || null }
      : kind === 'driver' ? { ...values, operatorId, licenceNumber: values.licenceNumber || null, licenceExpiresOn: values.licenceExpiresOn || null }
        : { ...values, operatorId, model: values.model || null, fuelType: values.fuelType || undefined, insuranceExpiresOn: values.insuranceExpiresOn || null, seatCapacity: values.seatCapacity ? Number(values.seatCapacity) : undefined };
    const result = await run('save', () => requestApi(id ? `${path}/${id}` : path, { method: id ? 'PATCH' : 'POST', body: JSON.stringify(body) }), 'Saved.');
    if (result) { setForm(null); onChanged(); }
  };
  return (
    <>
      <div className="ax-section-head">
        <Segmented size="sm" label="Partner filter" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'check', label: 'To check', count: partners.filter(needsCheck).length || null }, { value: 'ACTIVE', label: 'Approved' }, { value: 'PENDING', label: 'New' }, { value: 'SUSPENDED', label: 'Suspended' }]} />
        <Button variant="primary" icon="plus" onClick={() => setForm({ kind: 'operator', ...EMPTY_PARTNER.operator })}>Add operator</Button>
      </div>
      {!shown.length ? <EmptyState icon="vehicles" title="No operators here">Operators sign up at partner.fluxgo.in, or you add them here.</EmptyState> : null}
      {shown.map((operator) => <section className="ax-card ax-card-pad ax-cab-partner" key={operator.id}>
        <div className="ax-cab-run-head">
          <strong>{operator.businessName || operator.name}</strong>
          <span className="ax-muted">{operator.name} · {operator.phone}{operator.createdBy === 'PARTNER' ? ' · signed up in the app' : ''}</span>
          <Badge tone={operator.status === 'ACTIVE' ? 'success' : operator.status === 'PENDING' ? 'info' : operator.status === 'REJECTED' ? 'danger' : 'neutral'}>{operator.status === 'ACTIVE' ? 'Approved' : operator.status === 'PENDING' ? 'New' : operator.status.toLowerCase()}</Badge>
          <span className="ax-cab-grow" />
          {operator.status !== 'ACTIVE' ? <Button size="sm" variant="primary" onClick={() => setReview({ kind: 'OPERATOR', id: operator.id })}>Review</Button> : null}
          <Button size="sm" onClick={() => setForm({ kind: 'operator', id: operator.id, name: operator.name, businessName: operator.businessName || '', phone: operator.phone, note: operator.note || '', status: operator.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE' })}>Edit</Button>
        </div>
        <div className="ax-cab-stats">
          <span><strong>{operator.tripsDone}</strong> trips done</span>
          <span><strong>{operator.upcomingCabs}</strong> upcoming cabs</span>
          <span><strong>{operator.fillRate == null ? '—' : `${operator.fillRate}%`}</strong> fill rate</span>
          <span className={operator.cancelledCount ? 'is-bad' : ''}><strong>{operator.cancelledCount}</strong> cancels</span>
          <span className="ax-muted">{operator.routeIds.length ? operator.routeIds.map(routeName).join(', ') : 'No routes chosen'}</span>
        </div>
        <div className="ax-cab-fleet">
          {operator.drivers.map((driver) => <div className="ax-cab-line" key={driver.id}>
            <span><strong>{driver.firstName}</strong> <span className="ax-muted">driver · {driver.phone} · licence to {display(driver.licenceExpiresOn)}{driver.cancelledCount ? ` · ${driver.cancelledCount} cancels` : ''}</span></span>
            <span className="ax-cab-actions">{approvalBadge(driver)}
              {driver.approvalStatus !== 'APPROVED' || driver.expired ? <Button size="sm" variant="primary" onClick={() => setReview({ kind: 'DRIVER', id: driver.id })}>Review</Button> : null}
              <Button size="sm" variant="ghost" onClick={() => setUpload({ operatorId: operator.id, ownerKind: 'DRIVER', owner: driver })}>Documents</Button>
              <Button size="sm" variant="ghost" onClick={() => setForm({ kind: 'driver', id: driver.id, operatorId: operator.id, firstName: driver.firstName, phone: driver.phone, licenceNumber: driver.licenceNumber || '', licenceExpiresOn: driver.licenceExpiresOn || '', status: driver.status })}>Edit</Button>
            </span>
          </div>)}
          {operator.vehicles.map((vehicle) => <div className="ax-cab-line" key={vehicle.id}>
            <span><strong>{vehicle.registrationNumber}</strong> <span className="ax-muted">{[vehicle.colour, vehicle.model].filter(Boolean).join(' ')} · {fuelLabel(vehicle.fuelType) || 'fuel not set'} · {vehicleLabel(vehicle.vehicleType)} · {vehicle.seatCapacity} seats · insurance to {display(vehicle.insuranceExpiresOn)}</span></span>
            <span className="ax-cab-actions">{approvalBadge(vehicle)}
              {vehicle.approvalStatus !== 'APPROVED' || vehicle.expired ? <Button size="sm" variant="primary" onClick={() => setReview({ kind: 'VEHICLE', id: vehicle.id })}>Review</Button> : null}
              <Button size="sm" variant="ghost" onClick={() => setUpload({ operatorId: operator.id, ownerKind: 'VEHICLE', owner: vehicle })}>Documents</Button>
              <Button size="sm" variant="ghost" onClick={() => setForm({ kind: 'vehicle', id: vehicle.id, operatorId: operator.id, vehicleType: vehicle.vehicleType, fuelType: vehicle.fuelType || '', registrationNumber: vehicle.registrationNumber, colour: vehicle.colour, model: vehicle.model || '', seatCapacity: String(vehicle.seatCapacity), insuranceExpiresOn: vehicle.insuranceExpiresOn || '', status: vehicle.status })}>Edit</Button>
            </span>
          </div>)}
          <div className="ax-cab-actions is-left">
            <Button size="sm" icon="plus" onClick={() => setForm({ kind: 'driver', operatorId: operator.id, ...EMPTY_PARTNER.driver })}>Driver</Button>
            <Button size="sm" icon="plus" onClick={() => setForm({ kind: 'vehicle', operatorId: operator.id, ...EMPTY_PARTNER.vehicle })}>Vehicle</Button>
          </div>
        </div>
      </section>)}

      <Dialog open={Boolean(form)} title={form ? `${form.id ? 'Edit' : 'Add'} ${form.kind}` : ''} onClose={() => setForm(null)} busy={busy === 'save'}
        footer={<><Button onClick={() => setForm(null)}>Cancel</Button><Button variant="primary" busy={busy === 'save'} onClick={save}>Save</Button></>}>
        {form ? <div className="ax-form-stack">
          {form.kind === 'vehicle' ? <div className="ax-cab-row">
            <Field label="Vehicle type" htmlFor="op-type"><select id="op-type" value={form.vehicleType} onChange={(event) => setForm({ ...form, vehicleType: event.target.value })}>{VEHICLES.map((vehicle) => <option key={vehicle.value} value={vehicle.value}>{vehicle.label}</option>)}</select></Field>
            <Field label="Fuel" htmlFor="op-fuel"><select id="op-fuel" value={form.fuelType} onChange={(event) => setForm({ ...form, fuelType: event.target.value })}><option value="" disabled>Choose</option>{FUELS.map((fuel) => <option key={fuel.value} value={fuel.value}>{fuel.label}</option>)}</select></Field>
          </div> : null}
          {({
            operator: [['name', 'Name'], ['businessName', 'Business name'], ['phone', 'Phone'], ['note', 'Note (admins only)']],
            driver: [['firstName', 'First name'], ['phone', 'Mobile number (the driver signs in with it)'], ['licenceNumber', 'Licence number'], ['licenceExpiresOn', 'Licence valid until (YYYY-MM-DD)']],
            vehicle: [['registrationNumber', 'Vehicle number'], ['model', 'Model'], ['colour', 'Colour'], ['seatCapacity', 'Seats (empty uses the type)'], ['insuranceExpiresOn', 'Insurance valid until (YYYY-MM-DD)']],
          })[form.kind].map(([key, label]) => <Field key={key} label={label} htmlFor={`op-${key}`}><input id={`op-${key}`} value={form[key] ?? ''} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></Field>)}
          {form.id ? <Field label="Status" htmlFor="op-status"><select id="op-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="ACTIVE">In use</option><option value="SUSPENDED">Suspended</option></select></Field> : null}
          {form.kind !== 'operator' && !form.id ? <p className="ax-muted ax-small">A new driver or vehicle needs its documents and your approval before it goes in a cab.</p> : null}
        </div> : null}
      </Dialog>
      {review ? <ApprovalDialog owner={review} partners={partners} onClose={() => setReview(null)} onDone={() => { setReview(null); onChanged(); }} openPartners={() => setReview(null)} /> : null}
      {upload ? <DocumentsDialog target={upload} onClose={() => setUpload(null)} onDone={() => { setUpload(null); onChanged(); }} /> : null}
    </>
  );
}

/** See and upload the documents of one driver or vehicle for an operator (step 1 URL, PUT the file, step 2 save). */
function DocumentsDialog({ target, onClose, onDone }) {
  const { busy, run } = useAction();
  const uploadFile = async (kind, file) => {
    if (!file) return;
    const ok = await run(kind, async () => {
      const step = await requestApi(`/admin/cab/operators/${target.operatorId}/documents/upload-url`, { method: 'POST', body: JSON.stringify({ ownerKind: target.ownerKind, ownerId: target.owner.id, kind, contentType: file.type }) });
      if (file.size > step.maxBytes) throw new Error('Choose a file of at most 10 MB.');
      const put = await fetch(step.uploadUrl, { method: 'PUT', headers: { 'content-type': file.type }, body: file });
      if (!put.ok) throw new Error('The file did not upload. Try again.');
      return requestApi(`/admin/cab/operators/${target.operatorId}/documents`, { method: 'POST', body: JSON.stringify({ ownerKind: target.ownerKind, ownerId: target.owner.id, kind, storageKey: step.storageKey }) });
    }, 'Uploaded. It now needs approval.');
    if (ok) onDone();
  };
  return (
    <Dialog open title={`Documents · ${target.owner.firstName || target.owner.registrationNumber}`} onClose={onClose} width={520} footer={<Button onClick={onClose}>Close</Button>}>
      <div className="ax-form-stack">
        <DocumentLinks documents={target.owner.documents} />
        {target.owner.documents.map((document) => <Field key={document.kind} label={`${document.id ? 'Replace' : 'Upload'} ${DOCS[document.kind]}`} htmlFor={`doc-${document.kind}`}>
          <input id={`doc-${document.kind}`} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={Boolean(busy)} onChange={(event) => uploadFile(document.kind, event.target.files?.[0])} />
        </Field>)}
        <p className="ax-muted ax-small">JPG, PNG, WebP, or PDF, at most 10 MB. A new document sends the {target.ownerKind === 'DRIVER' ? 'driver' : 'vehicle'} back to approval.</p>
      </div>
    </Dialog>
  );
}

// Insights

function CabInsights({ internal }) {
  const [days, setDays] = useState(30);
  const { data, error } = useLoad(`/admin/cab/insights${queryString({ days, internal })}`);
  const demand = useLoad(`/admin/cab/demand${queryString({ internal })}`);
  const max = useMemo(() => Math.max(1, ...(data?.heatmap || []).map((cell) => Math.max(cell.demandSeats, cell.offeredSeats))), [data]);
  if (error) return <div className="ax-inline-error" role="alert"><span>{error}</span></div>;
  if (!data) return <EmptyState icon="analytics" title="Loading Cab insights" />;
  const funnel = data.funnel;
  const kpis = [
    ['Seats asked for', funnel.requestedSeats, `${funnel.requests} requests`],
    ['Booked', funnel.booked, funnel.requests ? `${Math.round((funnel.booked / funnel.requests) * 100)}% of requests` : ''],
    ['Boarded', funnel.boarded, funnel.booked ? `${Math.round((funnel.boarded / funnel.booked) * 100)}% of bookings` : ''],
    ['Seat value (estimate)', formatMoney(data.seatValue), 'Paid offline in the cab'],
    ['No-shows + late cancels', data.reliability.noShows + data.reliability.lateCancels, `${data.reliability.noShows} no-shows · ${data.reliability.lateCancels} late`],
    ['Not fulfilled / operator cancels', `${data.reliability.notFulfilledCabs} / ${data.reliability.operatorCancels}`, 'Cabs'],
  ];
  return (
    <>
      <div className="ax-section-head"><Segmented size="sm" label="Period" value={days} onChange={setDays} options={[{ value: 7, label: '7 days' }, { value: 30, label: '30 days' }, { value: 90, label: '90 days' }]} /></div>
      <div className="ax-kpis is-period">{kpis.map(([label, value, detail]) => <div key={label} className="ax-kpi is-static"><span className="ax-kpi-label">{label}</span><strong className="ax-kpi-value">{value ?? '—'}</strong><span className="ax-kpi-detail">{detail || ' '}</span></div>)}</div>
      <section className="ax-card ax-card-pad">
        <h3>Demand against seats offered</h3>
        <p className="ax-muted ax-small">Darker green = more seats asked for. A red edge = more seats asked for than offered: add cabs there.</p>
        <div className="ax-cab-heat" role="table" aria-label="Demand by weekday and hour">
          <div className="ax-cab-heat-row" role="row"><span role="columnheader" />{Array.from({ length: 24 }, (_, hour) => <span role="columnheader" key={hour} className="ax-muted ax-small">{hour % 3 === 0 ? hourLabel(hour) : ''}</span>)}</div>
          {WEEKDAYS.map((weekday, index) => <div className="ax-cab-heat-row" role="row" key={weekday}>
            <span role="rowheader" className="ax-muted ax-small">{weekday}</span>
            {data.heatmap.filter((cell) => cell.weekday === index).sort((a, b) => a.hour - b.hour).map((cell) => <span role="cell" key={cell.hour}
              className={`ax-cab-heat-cell${cell.demandSeats > cell.offeredSeats ? ' is-short' : ''}`}
              style={{ '--heat': cell.demandSeats / max }}
              title={`${weekday} ${hourLabel(cell.hour)}: ${cell.demandSeats} seats asked for, ${cell.offeredSeats} offered`} />)}
          </div>)}
        </div>
      </section>
      <section className="ax-card ax-card-pad">
        <h3>Fill rate by route</h3>
        <table className="ax-cab-table"><thead><tr><th>Route</th><th>Completed cabs</th><th>Fill rate</th></tr></thead>
          <tbody>{data.fillRate.map((row) => <tr key={row.corridorId}><td>{row.corridorName}</td><td>{row.cabs}</td><td>{row.fillRate == null ? '—' : `${row.fillRate}%`}</td></tr>)}</tbody></table>
      </section>
      <section className="ax-card ax-card-pad">
        <h3>Asked for routes with no cab</h3>
        {!demand.data?.demand?.length ? <p className="ax-muted">No requests yet.</p> : <table className="ax-cab-table"><thead><tr><th>From</th><th>To</th><th>Date</th><th>Members</th></tr></thead>
          <tbody>{demand.data.demand.map((row) => <tr key={`${row.originRegionId}${row.destinationRegionId}${row.travelDate}`}><td>{row.originRegionId}</td><td>{row.destinationRegionId}</td><td>{row.travelDate}</td><td>{row.members}</td></tr>)}</tbody></table>}
      </section>
    </>
  );
}

function SearchResults({ results, onClose, openRun, openPartners }) {
  const empty = !results.bookings.length && !results.vehicles.length && !results.drivers.length && !results.operators.length;
  const records = [
    ...results.operators.map((row) => ({ key: `o${row.id}`, label: `Operator · ${row.name} · ${row.phone}` })),
    ...results.drivers.map((row) => ({ key: `d${row.id}`, label: `Driver · ${row.firstName} · ${row.phone}` })),
    ...results.vehicles.map((row) => ({ key: `v${row.id}`, label: `Vehicle · ${row.registrationNumber}${row.model ? ` · ${row.model}` : ''}` })),
  ];
  return (
    <Dialog open title="Search results" onClose={onClose} width={620} footer={<Button onClick={onClose}>Close</Button>}>
      {empty ? <p className="ax-muted">Nothing found. Try a 4-digit code, a 10-digit phone, a first name, or a vehicle number.</p> : <div className="ax-form-stack">
        {results.bookings.length ? <ul className="ax-cab-plain">{results.bookings.map((row) => <li key={row.interestId}>
          <button type="button" className="ax-link" disabled={!row.runId} onClick={() => row.runId && openRun(row.runId)}>{row.member?.firstName || 'Member'} · {row.member?.phone} · {row.seats} seat{row.seats === 1 ? '' : 's'} · {dayTime(row.departureAt)}</button> <Badge tone={BOOKING_TONE[row.status]}>{row.status.replace(/_/g, ' ').toLowerCase()}</Badge>
        </li>)}</ul> : null}
        {records.length ? <ul className="ax-cab-plain">{records.map((row) => <li key={row.key}><button type="button" className="ax-link" onClick={openPartners}>{row.label}</button></li>)}</ul> : null}
      </div>}
    </Dialog>
  );
}

// Routes

const EMPTY_ROUTE = { name: '', originCity: '', destinationCity: '', status: 'PAUSED', pricePerSeat: 600, minSeatsToGo: 4, points: [{ kind: 'PICKUP', name: '', friendlyName: '', address: '', offsetMinutes: 0 }, { kind: 'DROP', name: '', friendlyName: '', address: '', offsetMinutes: 240 }] };

function CabRoutes({ corridors, onChanged }) {
  const [editing, setEditing] = useState(null);
  const { busy, run } = useAction();
  const save = async () => {
    const body = {
      name: editing.name.trim(),
      status: editing.status,
      pricePerSeat: Number(editing.pricePerSeat),
      minSeatsToGo: Number(editing.minSeatsToGo),
      points: editing.points.map((point) => ({ ...(point.id ? { id: point.id } : {}), kind: point.kind, name: point.name.trim(), friendlyName: point.friendlyName.trim(), address: point.address?.trim() || undefined, offsetMinutes: Number(point.offsetMinutes), ...(point.status ? { status: point.status } : {}) })),
    };
    const result = await run('route', () => editing.id
      ? requestApi(`/admin/cab/corridors/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      : requestApi('/admin/cab/corridors', { method: 'POST', body: JSON.stringify({ ...body, originCity: editing.originCity.trim(), destinationCity: editing.destinationCity.trim() }) }),
    'Route saved. Members who already booked keep their price.');
    if (result) { setEditing(null); await onChanged(); }
  };
  const setPoint = (index, patch) => setEditing({ ...editing, points: editing.points.map((point, position) => position === index ? { ...point, ...patch } : point) });

  return (
    <>
      <div className="ax-section-head"><span className="ax-muted">Each direction is its own route. The route price is the minimum price for every cab on it. Members see the friendly point names.</span><Button variant="primary" icon="plus" onClick={() => setEditing({ ...EMPTY_ROUTE, points: EMPTY_ROUTE.points.map((point) => ({ ...point })) })}>Add route</Button></div>
      {!corridors.length ? <EmptyState icon="rides" title="No cab routes yet" /> : null}
      {corridors.map((corridor) => <section className="ax-card ax-card-pad" key={corridor.id}>
        <div className="ax-cab-run-head">
          <strong>{corridor.name}</strong>
          <span className="ax-muted">From {formatMoney(corridor.pricePerSeat)} a seat · goes at {corridor.minSeatsToGo} filled seats</span>
          <Badge tone={corridor.status === 'ACTIVE' ? 'success' : 'neutral'}>{corridor.status === 'ACTIVE' ? 'Live' : 'Paused'}</Badge>
          <Button size="sm" onClick={() => setEditing({ ...corridor, points: corridor.points.map((point) => ({ ...point, address: point.address || '' })) })}>Edit</Button>
        </div>
        <p className="ax-muted ax-small">{corridor.points.map((point) => `${point.kind === 'PICKUP' ? 'Pickup' : 'Drop'} ${point.friendlyName} (+${point.offsetMinutes} min)`).join(' · ')}</p>
      </section>)}

      <Dialog open={Boolean(editing)} title={editing?.id ? 'Edit route' : 'Add route'} onClose={() => setEditing(null)} busy={busy === 'route'} width={640}
        footer={<><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" busy={busy === 'route'} onClick={save}>Save</Button></>}>
        {editing ? <div className="ax-form-stack">
          <Field label="Name" htmlFor="route-name"><input id="route-name" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} placeholder="Bengaluru → Anantapur" /></Field>
          {!editing.id ? <div className="ax-cab-row">
            <Field label="From city" htmlFor="route-from"><input id="route-from" value={editing.originCity} onChange={(event) => setEditing({ ...editing, originCity: event.target.value })} /></Field>
            <Field label="To city" htmlFor="route-to"><input id="route-to" value={editing.destinationCity} onChange={(event) => setEditing({ ...editing, destinationCity: event.target.value })} /></Field>
          </div> : null}
          <div className="ax-cab-row">
            <Field label="Minimum price a seat (₹)" htmlFor="route-price"><input id="route-price" type="number" min="1" value={editing.pricePerSeat} onChange={(event) => setEditing({ ...editing, pricePerSeat: event.target.value })} /></Field>
            <Field label="Goes at (filled seats)" htmlFor="route-min"><input id="route-min" type="number" min="1" max="20" value={editing.minSeatsToGo} onChange={(event) => setEditing({ ...editing, minSeatsToGo: event.target.value })} /></Field>
            <Field label="Status" htmlFor="route-status"><select id="route-status" value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value })}><option value="ACTIVE">Live</option><option value="PAUSED">Paused</option></select></Field>
          </div>
          <strong>Points</strong>
          {editing.points.map((point, index) => <div className="ax-cab-row" key={point.id || index}>
            <Field label="Kind" htmlFor={`pt-kind-${index}`}><select id={`pt-kind-${index}`} value={point.kind} onChange={(event) => setPoint(index, { kind: event.target.value })}><option value="PICKUP">Pickup</option><option value="DROP">Drop</option></select></Field>
            <Field label="Place" htmlFor={`pt-name-${index}`}><input id={`pt-name-${index}`} value={point.name} onChange={(event) => setPoint(index, { name: event.target.value })} placeholder="Marathahalli" /></Field>
            <Field label="Friendly name (members see this)" htmlFor={`pt-friendly-${index}`}><input id={`pt-friendly-${index}`} maxLength={80} value={point.friendlyName} onChange={(event) => setPoint(index, { friendlyName: event.target.value })} placeholder="Marathahalli bridge" /></Field>
            <Field label="Minutes after departure" htmlFor={`pt-offset-${index}`}><input id={`pt-offset-${index}`} type="number" min="0" max="1440" value={point.offsetMinutes} onChange={(event) => setPoint(index, { offsetMinutes: event.target.value })} /></Field>
            <Field label="Address or landmark" htmlFor={`pt-address-${index}`}><input id={`pt-address-${index}`} maxLength={300} value={point.address} onChange={(event) => setPoint(index, { address: event.target.value })} /></Field>
            {point.id ? <Field label="Use" htmlFor={`pt-status-${index}`}><select id={`pt-status-${index}`} value={point.status || 'ACTIVE'} onChange={(event) => setPoint(index, { status: event.target.value })}><option value="ACTIVE">On</option><option value="INACTIVE">Off</option></select></Field>
              : <Button size="sm" variant="ghost" onClick={() => setEditing({ ...editing, points: editing.points.filter((_, position) => position !== index) })}>Remove</Button>}
          </div>)}
          <Button size="sm" icon="plus" onClick={() => setEditing({ ...editing, points: [...editing.points, { kind: 'PICKUP', name: '', friendlyName: '', address: '', offsetMinutes: 0 }] })}>Add point</Button>
        </div> : null}
      </Dialog>
    </>
  );
}
