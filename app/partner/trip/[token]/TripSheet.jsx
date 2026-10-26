'use client';

import { useCallback, useEffect, useState } from 'react';

const API_BASE_URL = (process.env.NEXT_PUBLIC_FLUXGO_API_URL || '').replace(/\/+$/, '');

function clock(value) {
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(new Date(value)).toLowerCase();
}

function day(value) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value));
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}/v1/public/cab-runs/${path}`, {
    ...options,
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    cache: 'no-store',
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.error?.message || 'Fluxgo could not load this trip. Try again.');
    error.code = body?.error?.code;
    throw error;
  }
  return body;
}

/** The driver's trip sheet: pickups in order, each group, and Boarded or No-show for each traveller. */
export function TripSheet({ token }) {
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [markError, setMarkError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      setTrip((await request(encodeURIComponent(token))).trip);
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const mark = async (travellerId, status) => {
    setBusy(`${travellerId}:${status}`);
    setMarkError('');
    try {
      await request(`${encodeURIComponent(token)}/travellers/${encodeURIComponent(travellerId)}/status`, { method: 'POST', body: JSON.stringify({ status }) });
      await load();
    } catch (markFailure) {
      setMarkError(markFailure.message);
    } finally {
      setBusy('');
    }
  };

  if (error) {
    return <main className="partner-main"><p className="partner-brand">fluxgo<span>.</span> partner</p><h1>Trip not available</h1><p className="partner-muted">{error}</p></main>;
  }
  if (!trip) return <main className="partner-main"><p className="partner-muted">Loading the trip…</p></main>;

  const closed = trip.status !== 'CONFIRMED' && trip.status !== 'DEPARTED';
  return (
    <main className="partner-main">
      <p className="partner-brand">fluxgo<span>.</span> partner</p>
      <h1>{trip.route}</h1>
      <p className="partner-sub">{day(trip.departureAt)} · leaves {clock(trip.departureAt)} · {trip.vehicleLabel}{trip.registrationNumber ? ` · ${trip.registrationNumber}` : ''}</p>
      {closed ? <p className="partner-note">This trip is closed. Call Fluxgo to change a mark.</p> : null}
      {markError ? <p className="partner-note is-danger" role="alert">{markError}</p> : null}

      {trip.pickups.filter((pickup) => pickup.groups.length).map((pickup) => {
        const boardingOpen = now >= Date.parse(pickup.boardingOpensAt);
        const noShowOpen = now >= Date.parse(pickup.noShowOpensAt);
        return (
          <section className="partner-stop" key={pickup.pointId}>
            <header>
              <h2>{pickup.name} · {clock(pickup.plannedAt)}</h2>
              {pickup.address ? <p className="partner-muted">{pickup.address}</p> : null}
              {pickup.latitude && pickup.longitude ? <a className="partner-link" href={`https://www.google.com/maps/search/?api=1&query=${pickup.latitude},${pickup.longitude}`} target="_blank" rel="noreferrer">Open in Maps</a> : null}
            </header>
            {pickup.groups.map((group) => (
              <div className="partner-group" key={group.interestId}>
                <div className="partner-group-head">
                  <strong>{group.contactName} · {group.seats} seat{group.seats === 1 ? '' : 's'}</strong>
                  {group.contactPhone ? <a className="partner-call" href={`tel:${group.contactPhone}`}>Call</a> : null}
                </div>
                {group.dropName ? <p className="partner-muted">Drop: {group.dropName}</p> : null}
                {group.travellers.map((traveller) => (
                  <div className="partner-traveller" key={traveller.id}>
                    <span>{traveller.firstName}</span>
                    {traveller.boardingStatus ? <span className={`partner-status is-${traveller.boardingStatus.toLowerCase()}`}>{traveller.boardingStatus === 'BOARDED' ? 'Boarded' : 'No-show'}</span> : null}
                    {!closed ? <span className="partner-actions">
                      <button type="button" className="is-primary" disabled={!boardingOpen || busy !== '' || traveller.boardingStatus === 'BOARDED'} onClick={() => mark(traveller.id, 'BOARDED')}>{busy === `${traveller.id}:BOARDED` ? '…' : 'Boarded'}</button>
                      <button type="button" disabled={!noShowOpen || busy !== '' || traveller.boardingStatus === 'NO_SHOW'} onClick={() => mark(traveller.id, 'NO_SHOW')}>{busy === `${traveller.id}:NO_SHOW` ? '…' : 'No-show'}</button>
                    </span> : null}
                  </div>
                ))}
              </div>
            ))}
            {!closed && !noShowOpen ? <p className="partner-muted">Wait 10 minutes after the pickup time before you mark a no-show.</p> : null}
          </section>
        );
      })}

      <section className="partner-stop">
        <h2>Drop</h2>
        {trip.drops.map((drop) => <p key={drop.pointId}>{drop.name} · about {clock(drop.plannedAt)}</p>)}
      </section>
      <p className="partner-muted">Collect the fare in the cab. Tolls, permit tax, and parking are included in it.</p>
    </main>
  );
}
