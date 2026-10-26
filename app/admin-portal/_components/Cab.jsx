'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { errorText, isSessionExpired, queryString, requestApi } from '../_lib/api';
import { display, formatMoney } from '../_lib/format';
import { Badge, Button, ConfirmDialog, CopyButton, Dialog, EmptyState, Field, Icon, Segmented, useToast } from './ui';
import { InternalTag } from '../_config/sections';
import { useStoredState } from '../_lib/hooks';

const VEHICLES = [
  { value: 'SEDAN', label: 'Sedan', seats: 4 },
  { value: 'SUV_6', label: 'SUV · 6', seats: 6 },
  { value: 'SUV_7', label: 'SUV · 7', seats: 7 },
  { value: 'TEMPO_TRAVELLER', label: 'Tempo Traveller', seats: 12 },
];
const vehicleLabel = (value) => VEHICLES.find((vehicle) => vehicle.value === value)?.label || value || '—';
const AGE = { UNDER_12: '<12', '12_17': '12–17', '18_24': '18–24', '25_34': '25–34', '35_44': '35–44', '45_59': '45–59', '60_PLUS': '60+' };
const GENDER = { WOMAN: 'F', MAN: 'M', NON_BINARY: 'Other' };
const STATUS_TONE = { INTERESTED: 'info', MOVE_OFFERED: 'warn', CONFIRMED: 'success', COMPLETED: 'success', NO_SHOW: 'danger', DECLINED: 'neutral', EXPIRED: 'neutral', WITHDRAWN: 'neutral', CANCELLED_LATE: 'danger', CANCELLED_BY_OPS: 'neutral' };
const OPEN = ['INTERESTED', 'MOVE_OFFERED', 'CONFIRMED'];

/** India clock for an ISO time, for example "8:15 pm". */
function clock(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(new Date(value)).toLowerCase();
}
function slotRange(slot) { return `${clock(slot.startAt)}–${clock(slot.endAt)}`; }
function indiaToday() { return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10); }
/** Value for a datetime-local input in India time. */
function localInput(value) { return value ? new Date(Date.parse(value) + 330 * 60_000).toISOString().slice(0, 16) : ''; }
function fromLocalInput(value) { return value ? new Date(Date.parse(`${value}:00.000Z`) - 330 * 60_000).toISOString() : undefined; }
function travellerText(traveller) {
  return [traveller.firstName, [GENDER[traveller.gender], AGE[traveller.ageGroup]].filter(Boolean).join(' '), traveller.seatLabel ? `${traveller.seatLabel.toLowerCase()} seat` : null].filter(Boolean).join(' · ');
}
function flexText(flex) {
  if (flex.mode === 'ONLY') return 'Only this slot';
  if (flex.mode === 'ADJACENT') return '±1 h';
  return `${clock(flex.from)}–${clock(flex.to)}`;
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

/** Fluxgo Cab ops: slot board, routes and prices, operators, and demand. */
export function CabView({ params, setParams, overview, onOverviewChanged }) {
  // A link with a route or date (from a push or Today) opens the slot board.
  const tab = ['overview', 'board', 'routes', 'operators', 'demand'].includes(params.cab) ? params.cab : params.route || params.date ? 'board' : 'overview';
  const [corridors, setCorridors] = useState([]);
  const [operators, setOperators] = useState([]);
  const [error, setError] = useState('');
  // Same rule as the other admin lists: rows of internal members (Fluxgo team or test accounts) are hidden unless shown.
  const [showInternal, setShowInternal] = useStoredState('cab:showInternal', false);
  const internal = showInternal ? 'include' : undefined;
  const [internalOverview, setInternalOverview] = useState(null);
  const loadInternalOverview = useCallback(async () => {
    try { setInternalOverview(await requestApi(`/admin/cab/overview${queryString({ internal: 'include' })}`)); } catch { setInternalOverview(null); }
  }, []);
  useEffect(() => { if (showInternal) void loadInternalOverview(); }, [loadInternalOverview, showInternal]);
  const shownOverview = showInternal ? internalOverview : overview;
  const refreshOverview = useCallback(() => { onOverviewChanged?.(); if (showInternal) void loadInternalOverview(); }, [loadInternalOverview, onOverviewChanged, showInternal]);

  const loadCorridors = useCallback(async () => {
    try {
      setCorridors((await requestApi('/admin/cab/corridors'))?.corridors || []);
      setError('');
    } catch (requestError) {
      if (!isSessionExpired(requestError)) setError(errorText(requestError));
    }
  }, []);
  const loadOperators = useCallback(async () => {
    try { setOperators((await requestApi('/admin/cab/operators'))?.operators || []); } catch { /* the board still works without operators */ }
  }, []);
  useEffect(() => { void loadCorridors(); void loadOperators(); }, [loadCorridors, loadOperators]);

  return (
    <div className="ax-view">
      <div className="ax-section-head">
        <Segmented label="Cab view" value={tab} onChange={(value) => setParams({ cab: value === 'overview' ? undefined : value, ...(value === 'overview' ? { route: undefined, date: undefined } : {}) })}
          options={[{ value: 'overview', label: 'Overview', count: shownOverview?.waitingSlots.length || null }, { value: 'board', label: 'Slot board' }, { value: 'routes', label: 'Routes and prices' }, { value: 'operators', label: 'Operators' }, { value: 'demand', label: 'Demand' }]} />
        {tab === 'overview' || tab === 'board' || tab === 'demand' ? <label className="ax-check"><input type="checkbox" checked={Boolean(showInternal)} onChange={(event) => setShowInternal(event.target.checked)} /> Show internal</label> : null}
      </div>
      {error ? <div className="ax-inline-error" role="alert"><span>{error}</span><Button size="sm" onClick={loadCorridors}>Try again</Button></div> : null}
      {tab === 'overview' ? <CabOverview overview={shownOverview} onRefresh={refreshOverview} openBoard={(route, date) => setParams({ cab: 'board', route, date })} /> : null}
      {tab === 'board' ? <CabBoard corridors={corridors} operators={operators} params={params} setParams={setParams} onChanged={refreshOverview} internal={internal} /> : null}
      {tab === 'routes' ? <CabRoutes corridors={corridors} onChanged={loadCorridors} /> : null}
      {tab === 'operators' ? <CabOperators operators={operators} onChanged={loadOperators} /> : null}
      {tab === 'demand' ? <CabDemand internal={internal} /> : null}
    </div>
  );
}

function Kpi({ label, value, detail, tone, onClick }) {
  return (
    <button type="button" className={`ax-kpi${tone ? ` is-${tone}` : ''}`} onClick={onClick} disabled={!onClick}>
      <span className="ax-kpi-label">{label}</span>
      <strong className="ax-kpi-value">{value ?? '—'}</strong>
      <span className="ax-kpi-detail">{detail || ' '}</span>
    </button>
  );
}

function dayLabel(date) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00.000Z`));
}

/** Cab work across all dates: what to decide, cabs coming up, the next 7 days, and the last 7 days. */
function CabOverview({ overview, onRefresh, openBoard }) {
  if (!overview) return <EmptyState icon="route" title="Loading Cab overview">If this stays, the server may not have the Cab overview yet.</EmptyState>;
  const m = overview.metrics;
  const week = m.last7Days;
  return (
    <>
      {overview.alerts.map((alert) => <p className="ax-note is-danger" key={`${alert.interestId}${alert.createdAt}`}><Icon name="alert" size={14} />A member reported “The cab is not here” on {alert.corridorName || 'a cab'} at {clock(alert.createdAt)}. <button type="button" className="ax-link" onClick={() => openBoard(alert.corridorId, alert.serviceDate)}>Open the slot</button></p>)}
      <div className="ax-kpis">
        <Kpi label="Travellers waiting" value={m.waitingTravellers} detail={`${m.waitingInterests} interest${m.waitingInterests === 1 ? '' : 's'} in ${overview.waitingSlots.length} slot${overview.waitingSlots.length === 1 ? '' : 's'}`} />
        <Kpi label="Slots to decide now" value={m.slotsToDecide} detail="Decision time within 2 hours" tone={m.slotsToDecide ? 'warning' : undefined} />
        <Kpi label="Confirmed cabs coming up" value={m.upcomingCabs} detail={`${m.confirmedSeats} seats confirmed`} />
        <Kpi label="Cabs today" value={m.cabsToday} detail={m.cabsWithoutDriver ? `${m.cabsWithoutDriver} cab${m.cabsWithoutDriver === 1 ? '' : 's'} without a driver` : 'All cabs have a driver'} tone={m.cabsWithoutDriver ? 'warning' : undefined} />
      </div>
      <div className="ax-kpis">
        <Kpi label="New interests, 7 days" value={week.newInterests} detail={`${week.travellers} travellers`} />
        <Kpi label="Completed, 7 days" value={week.completed} detail={`${week.declinedOrExpired} declined or no cab`} />
        <Kpi label="No-shows, 7 days" value={week.noShows} detail={`${week.lateCancellations} late cancellations`} tone={week.noShows ? 'warning' : undefined} />
        <Kpi label="Requests for new routes, 7 days" value={week.demandRequests} detail="From “Tell us you want it”" />
      </div>

      <section className="ax-card ax-card-pad">
        <div className="ax-section-head"><strong>Waiting for a decision</strong><Button size="sm" icon="refresh" onClick={onRefresh}>Refresh</Button></div>
        {overview.waitingSlots.length ? <table className="ax-cab-table">
          <thead><tr><th>Route</th><th>Slot</th><th>Travellers</th><th>Suggested</th><th>Decide by</th></tr></thead>
          <tbody>{overview.waitingSlots.map((slot) => <tr key={slot.slotId} className="ax-cab-click" onClick={() => openBoard(slot.corridorId, slot.serviceDate)}>
            <td><strong>{slot.corridorName}</strong></td>
            <td>{dayLabel(slot.serviceDate)} · {clock(slot.startAt)}</td>
            <td>{slot.travellers} <span className="ax-muted">({slot.interests} interest{slot.interests === 1 ? '' : 's'}{slot.moveOffers ? `, ${slot.moveOffers} offer open` : ''})</span></td>
            <td>{slot.suggestedVehicleType ? vehicleLabel(slot.suggestedVehicleType) : <span className="ax-muted">Below minimum</span>}</td>
            <td>{slot.decisionDue ? <Badge tone="warn">Decide now</Badge> : null} {dayLabel(slot.decisionAt.slice(0, 10))} · {clock(slot.decisionAt)}</td>
          </tr>)}</tbody>
        </table> : <p className="ax-muted">No cab interests wait for a decision.</p>}
      </section>

      <section className="ax-card ax-card-pad">
        <strong>Cabs coming up</strong>
        {overview.upcomingCabs.length ? <table className="ax-cab-table">
          <thead><tr><th>Route</th><th>Leaves</th><th>Vehicle</th><th>Seats</th><th>Driver</th><th>Trip sheet</th></tr></thead>
          <tbody>{overview.upcomingCabs.map((cab) => <tr key={cab.runId} className="ax-cab-click" onClick={() => openBoard(cab.corridorId, cab.serviceDate)}>
            <td><strong>{cab.corridorName}</strong> {cab.status === 'PLANNED' ? <Badge tone="info">planned</Badge> : null}</td>
            <td>{dayLabel(cab.serviceDate)} · {clock(cab.departureAt)}</td>
            <td>{vehicleLabel(cab.vehicleType)}</td>
            <td>{cab.seatsTaken}/{cab.seatCapacity}</td>
            <td>{cab.driverAssigned ? 'Assigned' : <Badge tone="warn">No driver</Badge>}{cab.notAnswered ? <div className="ax-muted ax-small">{cab.notAnswered} not answered</div> : null}</td>
            <td>{cab.tripSheetSent ? 'Sent' : <span className="ax-muted">Not sent</span>}</td>
          </tr>)}</tbody>
        </table> : <p className="ax-muted">No cabs are planned.</p>}
      </section>

      <section className="ax-card ax-card-pad">
        <strong>Next 7 days</strong>
        <div className="ax-cab-days">{overview.days.map((day) => <div key={day.date} className="ax-cab-day">
          <span className="ax-muted ax-small">{dayLabel(day.date)}</span>
          <strong>{day.waitingTravellers}</strong><span className="ax-small">waiting</span>
          <span className="ax-small">{day.confirmedSeats} confirmed · {day.cabs} cab{day.cabs === 1 ? '' : 's'}</span>
        </div>)}</div>
      </section>
    </>
  );
}

function CabBoard({ corridors, operators, params, setParams, onChanged, internal }) {
  const corridorId = corridors.some((corridor) => corridor.id === params.route) ? params.route : corridors[0]?.id;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date || '') ? params.date : indiaToday();
  const [board, setBoard] = useState(null);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmpty, setShowEmpty] = useState(false);
  const [dialog, setDialog] = useState(null);
  const { busy, run } = useAction();

  const load = useCallback(async () => {
    if (!corridorId) return;
    setLoading(true);
    try {
      const [boardResult, callResult] = await Promise.all([
        requestApi(`/admin/cab/board${queryString({ corridorId, date, internal })}`),
        requestApi(`/admin/cab/call-list${queryString({ date, internal })}`),
      ]);
      setBoard(boardResult);
      setCalls(callResult?.members || []);
      setError('');
    } catch (requestError) {
      if (!isSessionExpired(requestError)) setError(errorText(requestError));
    } finally {
      setLoading(false);
    }
  }, [corridorId, date, internal]);
  useEffect(() => { void load(); }, [load]);

  const act = async (key, path, body, done) => {
    const result = await run(key, () => requestApi(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }), done);
    if (result) { setDialog(null); await load(); onChanged?.(); }
    return result;
  };

  if (!corridors.length) return <EmptyState icon="rides" title="No cab routes yet">Add a route in Routes and prices first.</EmptyState>;
  const slots = (board?.slots || []).filter((slot) => showEmpty || slot.interests.length || slot.runs.length);
  const pointOptions = board?.corridor?.points || [];

  return (
    <>
      <div className="ax-cab-row">
        <Field label="Route" htmlFor="cab-route"><select id="cab-route" value={corridorId || ''} onChange={(event) => setParams({ route: event.target.value })}>{corridors.map((corridor) => <option key={corridor.id} value={corridor.id}>{corridor.name}{corridor.status === 'PAUSED' ? ' (paused)' : ''}</option>)}</select></Field>
        <Field label="Date" htmlFor="cab-date"><input id="cab-date" type="date" value={date} onChange={(event) => setParams({ date: event.target.value })} /></Field>
        <label className="ax-check"><input type="checkbox" checked={showEmpty} onChange={(event) => setShowEmpty(event.target.checked)} /> Show empty slots</label>
        <Button size="sm" icon="refresh" onClick={load} busy={loading}>Refresh</Button>
      </div>
      {error ? <div className="ax-inline-error" role="alert"><span>{error}</span><Button size="sm" onClick={load}>Try again</Button></div> : null}

      {calls.length ? <section className="ax-card ax-card-pad">
        <strong>Call list · no answer to “Are you coming?”</strong>
        {calls.map((call) => <div className="ax-cab-line" key={call.interestId}><span>{call.member?.firstName} <InternalTag show={call.member?.isInternal} /> · {call.seatCount} seats · cab {clock(call.departureAt)}</span><CopyButton value={call.member?.phone || ''} text={call.member?.phone} /></div>)}
      </section> : null}

      {board?.suggestions?.length ? <section className="ax-card ax-card-pad">
        <strong>Merge suggestions</strong>
        {board.suggestions.slice(0, 5).map((suggestion) => <div className="ax-cab-line" key={`${suggestion.fromStartAt}>${suggestion.toStartAt}`}>
          <span>Move {clock(suggestion.fromStartAt)} → {clock(suggestion.toStartAt)} slot: {suggestion.resultingTravellers} travellers. {suggestion.needsOffer.length ? `${suggestion.needsOffer.length} need a move offer.` : 'No consent needed.'}</span>
        </div>)}
      </section> : null}

      {!loading && board && !slots.length ? <EmptyState icon="rides" title="No interest on this date">Members' interests show here.</EmptyState> : null}

      {slots.map((slot) => {
        const openInterests = slot.interests.filter((interest) => OPEN.includes(interest.status));
        return <section className="ax-card ax-cab-slot" key={slot.startAt}>
          <header className="ax-cab-slot-head">
            <div>
              <h3>{slotRange(slot)} <span className="ax-muted">· {slot.travellerCount} travellers</span></h3>
              <p className="ax-muted ax-small">Decide by {new Date(slot.decisionAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}{slot.suggestedVehicleType ? ` · suggested ${vehicleLabel(slot.suggestedVehicleType)}` : ''}</p>
            </div>
            <div className="ax-badge-row">
              {slot.decisionDue ? <Badge tone="warn">Decide now</Badge> : null}
              <Badge tone={slot.status === 'DECIDED' ? 'success' : 'neutral'}>{slot.status === 'OPEN' ? 'No interest' : slot.status.toLowerCase()}</Badge>
              <Button size="sm" icon="plus" onClick={() => setDialog({ kind: 'run', slot, vehicleType: slot.suggestedVehicleType || 'SEDAN' })}>New cab</Button>
              {slot.id && openInterests.some((interest) => !interest.runId) ? <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: 'close', slot, reason: 'Not enough travellers chose this time.' })}>Close slot</Button> : null}
            </div>
          </header>
          {slot.warnings.map((warning) => <p className="ax-note is-danger" key={warning.interestIds.join()}><Icon name="alert" size={14} />Blocked pair: these 2 interests must not share a cab.</p>)}
          {slot.alerts.map((alert) => <p className="ax-note is-danger" key={`${alert.interestId}${alert.createdAt}`}><Icon name="alert" size={14} />A member reported “The cab is not here” at {clock(alert.createdAt)}.</p>)}

          {slot.runs.map((cab) => <CabRunCard key={cab.id} run={cab} slot={slot} operators={operators} points={pointOptions} interests={slot.interests} busy={busy} onAction={act} onEdit={(patch, done) => runPatch(cab.id, patch, done)} setDialog={setDialog} />)}

          <table className="ax-cab-table">
            <thead><tr><th>Member</th><th>Travellers</th><th>Pickup</th><th>Flex</th><th>Status</th><th /></tr></thead>
            <tbody>
              {slot.interests.map((interest) => <tr key={interest.id} className={OPEN.includes(interest.status) ? '' : 'is-closed'}>
                <td><strong>{interest.member?.firstName || '—'}</strong> <InternalTag show={interest.member?.isInternal} /><div className="ax-muted ax-small">{interest.member?.phone}{interest.member?.cabNoShowCount ? ` · ${interest.member.cabNoShowCount} no-show` : ''}{interest.late ? ' · late' : ''}</div></td>
                <td>{interest.travellers.map((traveller) => <div key={traveller.id}>{travellerText(traveller)}</div>)}<div className="ax-muted ax-small">{interest.seatPreferences.join(' > ').toLowerCase()} · {interest.luggage.cabin} cabin, {interest.luggage.large} large{interest.womenPreference ? ' · wants another woman' : ''}</div></td>
                <td>{display(interest.pickupPoint)}</td>
                <td>{flexText(interest.flexibility)}</td>
                <td><Badge tone={STATUS_TONE[interest.status]}>{interest.status.replaceAll('_', ' ').toLowerCase()}</Badge>{interest.runId ? <div className="ax-muted ax-small">in cab {clock(slot.runs.find((item) => item.id === interest.runId)?.departureAt)}</div> : null}{interest.declineReason ? <div className="ax-muted ax-small">{interest.declineReason}</div> : null}</td>
                <td className="ax-cab-actions">{interest.status === 'INTERESTED' ? <>
                  {nearbyRuns(slot).map((item) => <Button key={item.id} size="sm" busy={busy === `assign:${interest.id}`} onClick={() => act(`assign:${interest.id}`, `/admin/cab/runs/${item.id}/assign`, { interestId: interest.id }, 'Added to the cab.')}>Add to {clock(item.departureAt)} cab</Button>)}
                  {interest.runId ? <Button size="sm" variant="ghost" onClick={() => act(`unassign:${interest.id}`, `/admin/cab/interests/${interest.id}/unassign`, null, 'Removed from the cab.')}>Remove from cab</Button> : null}
                  <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: 'move', interest, slot, toSlotStartAt: slot.startAt })}>Move</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: 'decline', interest, reason: '' })}>Decline</Button>
                </> : interest.status === 'MOVE_OFFERED' ? <span className="ax-muted ax-small">Offer open until {clock(interest.pendingOffer?.expiresAt)}</span> : null}</td>
              </tr>)}
            </tbody>
          </table>
        </section>;
      })}

      <CabBoardDialogs dialog={dialog} setDialog={setDialog} busy={busy} corridorId={corridorId} act={act} run={run} reload={load} />
    </>
  );

  /** Open cabs in this slot and in slots up to 2 h away. The server refuses a cab outside the member's flexibility. */
  function nearbyRuns(slot) {
    const start = Date.parse(slot.startAt);
    return (board?.slots || [])
      .filter((other) => Math.abs(Date.parse(other.startAt) - start) <= 2 * 3_600_000)
      .flatMap((other) => other.runs)
      .filter((item) => (item.status === 'PLANNED' || item.status === 'CONFIRMED') && item.freeSeats > 0);
  }

  async function runPatch(runId, patch, done) {
    const result = await run(`run:${runId}`, () => requestApi(`/admin/cab/runs/${runId}`, { method: 'PATCH', body: JSON.stringify(patch) }), done);
    if (result) await load();
  }
}

function CabRunCard({ run, slot, operators, points, interests, busy, onAction, onEdit, setDialog }) {
  const operator = operators.find((item) => item.id === run.operator?.id);
  const inRun = interests.filter((interest) => interest.runId === run.id && OPEN.includes(interest.status));
  const pickup = points.filter((point) => point.kind === 'PICKUP');
  return (
    <div className={`ax-cab-run is-${run.status.toLowerCase()}`}>
      <div className="ax-cab-run-head">
        <strong>{vehicleLabel(run.vehicleType)} · {clock(run.departureAt)}</strong>
        <span className="ax-muted">{run.seatsTaken}/{run.seatCapacity} seats{run.internalSeats ? ` (${run.internalSeats} internal)` : ''}{run.pricePerSeat ? ` · ${formatMoney(run.pricePerSeat)} a seat for new travellers` : ''}</span>
        <Badge tone={run.status === 'CONFIRMED' ? 'success' : run.status === 'CANCELLED' ? 'neutral' : 'info'}>{run.status.toLowerCase()}</Badge>
        {run.womenPreferenceUnmet?.length ? <Badge tone="warn">Women preference not met</Badge> : null}
      </div>
      {run.status === 'PLANNED' || run.status === 'CONFIRMED' ? <div className="ax-cab-row">
        <Field label="Departure" htmlFor={`dep-${run.id}`} className="is-wide"><input id={`dep-${run.id}`} type="datetime-local" defaultValue={localInput(run.departureAt)} onBlur={(event) => { const next = fromLocalInput(event.target.value); if (next && next !== run.departureAt) onEdit({ departureAt: next }, 'Departure saved.'); }} /></Field>
        <Field label="Vehicle" htmlFor={`veh-${run.id}`}><select id={`veh-${run.id}`} value={run.vehicleType} onChange={(event) => onEdit({ vehicleType: event.target.value }, 'Vehicle type saved.')}>{VEHICLES.map((vehicle) => <option key={vehicle.value} value={vehicle.value}>{vehicle.label}</option>)}</select></Field>
        <Field label="Operator" htmlFor={`op-${run.id}`}><select id={`op-${run.id}`} value={run.operator?.id || ''} onChange={(event) => onEdit({ operatorId: event.target.value || null }, 'Operator saved.')}><option value="">—</option>{operators.filter((item) => item.status === 'ACTIVE').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Driver" htmlFor={`dr-${run.id}`}><select id={`dr-${run.id}`} value={run.driver?.id || ''} disabled={!operator} onChange={(event) => onEdit({ driverId: event.target.value || null }, 'Driver saved.')}><option value="">—</option>{(operator?.drivers || []).filter((item) => item.status === 'ACTIVE').map((item) => <option key={item.id} value={item.id}>{item.firstName} · {item.phone}</option>)}</select></Field>
        <Field label="Vehicle number" htmlFor={`vn-${run.id}`}><select id={`vn-${run.id}`} value={run.vehicle?.id || ''} disabled={!operator} onChange={(event) => onEdit({ vehicleId: event.target.value || null }, 'Vehicle saved.')}><option value="">—</option>{(operator?.vehicles || []).filter((item) => item.status === 'ACTIVE').map((item) => <option key={item.id} value={item.id}>{item.registrationNumber} · {vehicleLabel(item.vehicleType)}</option>)}</select></Field>
        <Field label="Price for new travellers" htmlFor={`pr-${run.id}`} hint="Empty uses the route price."><input id={`pr-${run.id}`} type="number" min="1" defaultValue={run.pricePerSeat || ''} onBlur={(event) => { const value = event.target.value ? Number(event.target.value) : null; if (value !== (run.pricePerSeat || null)) onEdit({ pricePerSeat: value }, 'Price saved.'); }} /></Field>
      </div> : null}
      {pickup.length && run.pointTimes?.length ? <p className="ax-muted ax-small">{pickup.map((point) => `${point.friendlyName} ${clock(run.pointTimes.find((time) => time.pointId === point.id)?.plannedAt)}`).join(' · ')}</p> : null}
      <div className="ax-cab-run-people">{inRun.map((interest) => <span key={interest.id}>{interest.travellers.map((traveller) => traveller.firstName).join(', ')} ({interest.seatCount})</span>)}{!inRun.length ? <span className="ax-muted">No travellers yet</span> : null}</div>
      <div className="ax-badge-row">
        {run.status === 'PLANNED' ? <Button size="sm" variant="primary" busy={busy === `confirm:${run.id}`} onClick={() => onAction(`confirm:${run.id}`, `/admin/cab/runs/${run.id}/confirm`, null, 'Cab confirmed. Members are told.')}>Confirm cab</Button> : null}
        {run.status === 'CONFIRMED' || run.status === 'DEPARTED' ? <Button size="sm" icon="send" busy={busy === `sheet:${run.id}`} onClick={async () => { const result = await onAction(`sheet:${run.id}`, `/admin/cab/runs/${run.id}/trip-sheet`, null); if (result && result !== true) setDialog({ kind: 'sheet', sheet: result }); }}>{run.tripSheetSentAt ? 'New trip sheet link' : 'Send trip sheet'}</Button> : null}
        {run.status === 'CONFIRMED' || run.status === 'DEPARTED' || run.status === 'COMPLETED' ? <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: 'marks', run, interests: inRun.length ? inRun : interests.filter((interest) => interest.runId === run.id) })}>Boarding marks</Button> : null}
        {run.status === 'CONFIRMED' || run.status === 'COMPLETED' ? <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: 'settle', run, emptySeats: Math.max(0, run.seatCapacity - run.seatsTaken), amount: '', note: '' })}>Record payment</Button> : null}
        {run.status === 'PLANNED' || run.status === 'CONFIRMED' ? <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: 'cancel', run, slot, reason: '' })}>Cancel cab</Button> : null}
      </div>
    </div>
  );
}

function CabBoardDialogs({ dialog, setDialog, busy, corridorId, act, run, reload }) {
  const [draft, setDraft] = useState(dialog);
  useEffect(() => { setDraft(dialog); }, [dialog]);
  if (!dialog || !draft) return null;
  const close = () => setDialog(null);
  const update = (patch) => setDraft({ ...draft, ...patch });

  if (dialog.kind === 'run') {
    return <Dialog open title={`New cab · ${slotRange(dialog.slot)}`} onClose={close} busy={busy === 'run'}
      footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" busy={busy === 'run'} onClick={async () => {
        const result = await run('run', () => requestApi('/admin/cab/runs', { method: 'POST', body: JSON.stringify({ corridorId, slotStartAt: dialog.slot.startAt, vehicleType: draft.vehicleType, departureAt: fromLocalInput(draft.departure) }) }), 'Cab added. Add interests, then confirm.');
        if (result) { close(); await reload(); }
      }}>Add cab</Button></>}>
      <div className="ax-form-stack">
        <Field label="Vehicle type" htmlFor="new-run-vehicle"><select id="new-run-vehicle" value={draft.vehicleType} onChange={(event) => update({ vehicleType: event.target.value })}>{VEHICLES.map((vehicle) => <option key={vehicle.value} value={vehicle.value}>{vehicle.label} · {vehicle.seats} seats</option>)}</select></Field>
        <Field label="Departure (inside the slot hour)" htmlFor="new-run-departure"><input id="new-run-departure" type="datetime-local" value={draft.departure ?? localInput(dialog.slot.startAt)} onChange={(event) => update({ departure: event.target.value })} /></Field>
      </div>
    </Dialog>;
  }
  if (dialog.kind === 'move') {
    const original = Date.parse(dialog.slot.startAt);
    const options = [-2, -1, 1, 2].map((hours) => new Date(original + hours * 3_600_000).toISOString());
    return <Dialog open title="Move interest" onClose={close} busy={busy === 'move'} width={480}
      description="Inside the member's flexibility, the move is made now and the member is told. Outside it, Fluxgo sends a move offer that the member accepts or refuses."
      footer={<><Button onClick={close}>Cancel</Button>
        <Button busy={busy === 'move'} onClick={() => act('move', `/admin/cab/interests/${dialog.interest.id}/move`, { toSlotStartAt: draft.toSlotStartAt }, 'Interest moved.')}>Move now</Button>
        <Button variant="primary" busy={busy === 'offer'} onClick={() => act('offer', `/admin/cab/interests/${dialog.interest.id}/move-offer`, { toSlotStartAt: draft.toSlotStartAt, expiresAt: new Date(Date.now() + Number(draft.hours || 2) * 3_600_000).toISOString(), note: draft.note || undefined }, 'Move offer sent.')}>Send offer</Button></>}>
      <div className="ax-form-stack">
        <Field label="New slot" htmlFor="move-slot"><select id="move-slot" value={draft.toSlotStartAt} onChange={(event) => update({ toSlotStartAt: event.target.value })}>{options.map((value) => <option key={value} value={value}>{clock(value)}–{clock(new Date(Date.parse(value) + 3_600_000).toISOString())}</option>)}</select></Field>
        <Field label="Offer answer time (hours)" htmlFor="move-hours"><input id="move-hours" type="number" min="1" max="12" value={draft.hours ?? 2} onChange={(event) => update({ hours: event.target.value })} /></Field>
        <Field label="Note to the member (optional)" htmlFor="move-note"><input id="move-note" maxLength={200} value={draft.note || ''} onChange={(event) => update({ note: event.target.value })} /></Field>
      </div>
    </Dialog>;
  }
  if (dialog.kind === 'decline' || dialog.kind === 'cancel' || dialog.kind === 'close') {
    const config = {
      decline: { title: 'Decline interest', path: `/admin/cab/interests/${dialog.interest?.id}/decline`, label: 'Decline', done: 'Interest declined. The member is told.' },
      cancel: { title: 'Cancel cab', path: `/admin/cab/runs/${dialog.run?.id}/cancel`, label: 'Cancel cab', done: 'Cab cancelled. Confirmed members are told.' },
      close: { title: 'Close slot', path: `/admin/cab/slots/${dialog.slot?.id}/close`, label: 'Close slot', done: 'Slot closed. Open interests are declined.' },
    }[dialog.kind];
    return <ConfirmDialog open title={config.title} confirmLabel={config.label} busy={busy === dialog.kind} onCancel={close}
      onConfirm={() => act(dialog.kind, config.path, { reason: draft.reason })}
      description="The member sees this reason.">
      <Field label="Reason" htmlFor="cab-reason"><input id="cab-reason" maxLength={300} value={draft.reason || ''} onChange={(event) => update({ reason: event.target.value })} data-autofocus /></Field>
    </ConfirmDialog>;
  }
  if (dialog.kind === 'sheet') {
    return <Dialog open title="Trip sheet for the driver" onClose={close} width={520}
      description="Send this link to the driver on WhatsApp. An older link stops working."
      footer={<Button variant="primary" onClick={close}>Done</Button>}>
      <div className="ax-form-stack">
        <Field label="Link" htmlFor="sheet-link"><div className="ax-input-group"><input id="sheet-link" readOnly value={dialog.sheet.url} className="ax-mono" /><CopyButton value={dialog.sheet.url} /></div></Field>
        <Field label="WhatsApp text" htmlFor="sheet-text"><textarea id="sheet-text" readOnly rows={10} value={dialog.sheet.whatsappText} /></Field>
        <CopyButton value={dialog.sheet.whatsappText} text="Copy WhatsApp text" />
      </div>
    </Dialog>;
  }
  if (dialog.kind === 'marks') {
    return <Dialog open title="Boarding marks" onClose={close} width={520} description="Correct a mark when the driver could not, or marked the wrong person. The member's counts are recounted."
      footer={<Button onClick={close}>Close</Button>}>
      <div className="ax-form-stack">
        <Field label="Reason for the change" htmlFor="mark-reason"><input id="mark-reason" maxLength={300} value={draft.reason || ''} onChange={(event) => update({ reason: event.target.value })} /></Field>
        {dialog.interests.flatMap((interest) => interest.travellers.map((traveller) => <div className="ax-cab-line" key={traveller.id}>
          <span>{traveller.firstName} · {traveller.boardingStatus ? traveller.boardingStatus.replace('_', ' ').toLowerCase() : 'not marked'}</span>
          <span className="ax-badge-row">
            {['BOARDED', 'NO_SHOW', null].map((status) => <Button key={String(status)} size="sm" variant="ghost" disabled={!draft.reason?.trim()} busy={busy === `mark:${traveller.id}:${status}`}
              onClick={() => act(`mark:${traveller.id}:${status}`, `/admin/cab/travellers/${traveller.id}/mark`, { status, reason: draft.reason }, 'Mark saved.')}>{status === 'BOARDED' ? 'Boarded' : status === 'NO_SHOW' ? 'No-show' : 'Clear'}</Button>)}
          </span>
        </div>))}
      </div>
    </Dialog>;
  }
  if (dialog.kind === 'settle') {
    return <Dialog open title="Record payment to the operator" onClose={close} busy={busy === 'settle'} description="Fluxgo pays the operator for empty seats in the pilot."
      footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" busy={busy === 'settle'} onClick={() => act('settle', `/admin/cab/runs/${dialog.run.id}/settlements`, { emptySeats: Number(draft.emptySeats), amount: Number(draft.amount), paidAt: new Date().toISOString(), note: draft.note || undefined }, 'Payment recorded.')}>Record</Button></>}>
      <div className="ax-form-stack">
        <Field label="Empty seats" htmlFor="settle-seats"><input id="settle-seats" type="number" min="0" value={draft.emptySeats} onChange={(event) => update({ emptySeats: event.target.value })} /></Field>
        <Field label="Amount (₹)" htmlFor="settle-amount"><input id="settle-amount" type="number" min="0" value={draft.amount} onChange={(event) => update({ amount: event.target.value })} /></Field>
        <Field label="Note" htmlFor="settle-note"><input id="settle-note" maxLength={300} value={draft.note} onChange={(event) => update({ note: event.target.value })} /></Field>
      </div>
    </Dialog>;
  }
  return null;
}

const EMPTY_ROUTE = { name: '', originCity: '', destinationCity: '', status: 'PAUSED', pricePerSeat: 600, frontSeatExtra: 50, minSeatsToGo: 3, points: [{ kind: 'PICKUP', name: '', friendlyName: '', address: '', offsetMinutes: 0 }, { kind: 'DROP', name: '', friendlyName: '', address: '', offsetMinutes: 240 }] };

function CabRoutes({ corridors, onChanged }) {
  const [editing, setEditing] = useState(null);
  const { busy, run } = useAction();
  const save = async () => {
    const body = {
      name: editing.name.trim(),
      status: editing.status,
      pricePerSeat: Number(editing.pricePerSeat),
      frontSeatExtra: Number(editing.frontSeatExtra),
      minSeatsToGo: Number(editing.minSeatsToGo),
      points: editing.points.map((point) => ({ ...(point.id ? { id: point.id } : {}), kind: point.kind, name: point.name.trim(), friendlyName: point.friendlyName.trim(), address: point.address?.trim() || undefined, offsetMinutes: Number(point.offsetMinutes), ...(point.status ? { status: point.status } : {}) })),
    };
    const result = await run('route', () => editing.id
      ? requestApi(`/admin/cab/corridors/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      : requestApi('/admin/cab/corridors', { method: 'POST', body: JSON.stringify({ ...body, originCity: editing.originCity.trim(), destinationCity: editing.destinationCity.trim() }) }),
    'Route saved. Members who already sent interest keep their price.');
    if (result) { setEditing(null); await onChanged(); }
  };
  const setPoint = (index, patch) => setEditing({ ...editing, points: editing.points.map((point, position) => position === index ? { ...point, ...patch } : point) });

  return (
    <>
      <div className="ax-section-head"><span className="ax-muted">Each direction is its own route. Members see the friendly point names.</span><Button variant="primary" icon="plus" onClick={() => setEditing({ ...EMPTY_ROUTE, points: EMPTY_ROUTE.points.map((point) => ({ ...point })) })}>Add route</Button></div>
      {!corridors.length ? <EmptyState icon="rides" title="No cab routes yet" /> : null}
      {corridors.map((corridor) => <section className="ax-card ax-card-pad" key={corridor.id}>
        <div className="ax-cab-run-head">
          <strong>{corridor.name}</strong>
          <span className="ax-muted">{formatMoney(corridor.pricePerSeat)} a seat · front +{formatMoney(corridor.frontSeatExtra)} · goes at {corridor.minSeatsToGo}</span>
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
            <Field label="Price a seat (₹)" htmlFor="route-price"><input id="route-price" type="number" min="1" value={editing.pricePerSeat} onChange={(event) => setEditing({ ...editing, pricePerSeat: event.target.value })} /></Field>
            <Field label="Front seat extra (₹)" htmlFor="route-front"><input id="route-front" type="number" min="0" value={editing.frontSeatExtra} onChange={(event) => setEditing({ ...editing, frontSeatExtra: event.target.value })} /></Field>
            <Field label="Goes at (travellers)" htmlFor="route-min"><input id="route-min" type="number" min="1" max="20" value={editing.minSeatsToGo} onChange={(event) => setEditing({ ...editing, minSeatsToGo: event.target.value })} /></Field>
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

function CabOperators({ operators, onChanged }) {
  const [form, setForm] = useState(null);
  const { busy, run } = useAction();
  const save = async () => {
    const { kind, id, ...values } = form;
    const path = { operator: '/admin/cab/operators', driver: '/admin/cab/drivers', vehicle: '/admin/cab/vehicles' }[kind];
    const body = kind === 'vehicle' ? { ...values, seatCapacity: values.seatCapacity ? Number(values.seatCapacity) : undefined } : values;
    const result = await run('save', () => requestApi(id ? `${path}/${id}` : path, { method: id ? 'PATCH' : 'POST', body: JSON.stringify(body) }), 'Saved.');
    if (result) { setForm(null); await onChanged(); }
  };
  const fields = useMemo(() => ({
    operator: [['name', 'Name'], ['phone', 'Phone'], ['note', 'Note']],
    driver: [['firstName', 'First name'], ['phone', 'Phone']],
    vehicle: [['registrationNumber', 'Vehicle number'], ['colour', 'Colour'], ['seatCapacity', 'Seats (empty uses the type)']],
  }), []);

  return (
    <>
      <div className="ax-section-head"><span className="ax-muted">Operators, their drivers, and their vehicles. The future operator app uses the same records.</span><Button variant="primary" icon="plus" onClick={() => setForm({ kind: 'operator', name: '', phone: '', note: '', status: 'ACTIVE' })}>Add operator</Button></div>
      {!operators.length ? <EmptyState icon="vehicles" title="No operators yet" /> : null}
      {operators.map((operator) => <section className="ax-card ax-card-pad" key={operator.id}>
        <div className="ax-cab-run-head">
          <strong>{operator.name}</strong><span className="ax-muted">{operator.phone}</span>
          <Badge tone={operator.status === 'ACTIVE' ? 'success' : 'neutral'}>{operator.status.toLowerCase()}</Badge>
          <Button size="sm" onClick={() => setForm({ kind: 'operator', id: operator.id, name: operator.name, phone: operator.phone, note: operator.note || '', status: operator.status })}>Edit</Button>
          <Button size="sm" icon="plus" onClick={() => setForm({ kind: 'driver', operatorId: operator.id, firstName: '', phone: '', status: 'ACTIVE' })}>Driver</Button>
          <Button size="sm" icon="plus" onClick={() => setForm({ kind: 'vehicle', operatorId: operator.id, vehicleType: 'SEDAN', registrationNumber: '', colour: '', seatCapacity: '', status: 'ACTIVE' })}>Vehicle</Button>
        </div>
        {operator.drivers.map((driver) => <div className="ax-cab-line" key={driver.id}><span>Driver · {driver.firstName} · {driver.phone} {driver.status !== 'ACTIVE' ? '(suspended)' : ''}</span><Button size="sm" variant="ghost" onClick={() => setForm({ kind: 'driver', id: driver.id, operatorId: operator.id, firstName: driver.firstName, phone: driver.phone, status: driver.status })}>Edit</Button></div>)}
        {operator.vehicles.map((vehicle) => <div className="ax-cab-line" key={vehicle.id}><span>Vehicle · {vehicle.registrationNumber} · {vehicleLabel(vehicle.vehicleType)} · {vehicle.colour} · {vehicle.seatCapacity} seats {vehicle.status !== 'ACTIVE' ? '(suspended)' : ''}</span><Button size="sm" variant="ghost" onClick={() => setForm({ kind: 'vehicle', id: vehicle.id, operatorId: operator.id, vehicleType: vehicle.vehicleType, registrationNumber: vehicle.registrationNumber, colour: vehicle.colour, seatCapacity: String(vehicle.seatCapacity), status: vehicle.status })}>Edit</Button></div>)}
      </section>)}

      <Dialog open={Boolean(form)} title={form ? `${form.id ? 'Edit' : 'Add'} ${form.kind}` : ''} onClose={() => setForm(null)} busy={busy === 'save'}
        footer={<><Button onClick={() => setForm(null)}>Cancel</Button><Button variant="primary" busy={busy === 'save'} onClick={save}>Save</Button></>}>
        {form ? <div className="ax-form-stack">
          {form.kind === 'vehicle' ? <Field label="Vehicle type" htmlFor="op-type"><select id="op-type" value={form.vehicleType} onChange={(event) => setForm({ ...form, vehicleType: event.target.value })}>{VEHICLES.map((vehicle) => <option key={vehicle.value} value={vehicle.value}>{vehicle.label}</option>)}</select></Field> : null}
          {fields[form.kind].map(([key, label]) => <Field key={key} label={label} htmlFor={`op-${key}`}><input id={`op-${key}`} value={form[key] ?? ''} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></Field>)}
          <Field label="Status" htmlFor="op-status"><select id="op-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></select></Field>
        </div> : null}
      </Dialog>
    </>
  );
}

function CabDemand({ internal }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    requestApi(`/admin/cab/demand${queryString({ internal })}`).then((result) => setRows(result?.demand || [])).catch((requestError) => { if (!isSessionExpired(requestError)) setError(errorText(requestError)); });
  }, [internal]);
  if (error) return <div className="ax-inline-error" role="alert"><span>{error}</span></div>;
  if (!rows) return null;
  if (!rows.length) return <EmptyState icon="rides" title="No requests yet">Members on routes with no cab can tap “Tell us you want it”.</EmptyState>;
  return <table className="ax-cab-table"><thead><tr><th>From</th><th>To</th><th>Date</th><th>Members</th></tr></thead>
    <tbody>{rows.map((row) => <tr key={`${row.originRegionId}${row.destinationRegionId}${row.travelDate}`}><td>{row.originRegionId}</td><td>{row.destinationRegionId}</td><td>{row.travelDate}</td><td>{row.members}</td></tr>)}</tbody></table>;
}
