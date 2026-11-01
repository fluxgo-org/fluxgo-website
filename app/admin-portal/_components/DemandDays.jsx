'use client';

import { useCallback, useEffect, useState } from 'react';
import { errorText, isSessionExpired, requestApi } from '../_lib/api';
import { formatDateTime, relativeTime } from '../_lib/format';
import { useNow } from '../_lib/hooks';
import { DataTable } from './DataTable';
import { Button, ConfirmDialog, Dialog, EmptyState, Field, useToast } from './ui';

/** Today's India date as YYYY-MM-DD. */
function indiaToday() {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** "Sat, 7 Nov 2026" for a YYYY-MM-DD date. */
function calendarDate(value) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00.000Z`));
}

/**
 * Dates with high travel. The server sends the ride digest at 18:00 IST, 2 days before each date,
 * to members whose routes have open rides on that date.
 */
export function DemandDaysView() {
  const now = useNow();
  const notify = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ demandDate: '', label: '' });
  const [busy, setBusy] = useState('');
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    try {
      const result = await requestApi('/admin/demand-days');
      setRows((result?.demandDays || []).map((row) => ({ ...row, id: row.demandDate })));
      setError('');
    } catch (requestError) {
      if (!isSessionExpired(requestError)) setError(errorText(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async (event) => {
    event.preventDefault();
    setBusy('save');
    try {
      await requestApi(`/admin/demand-days/${form.demandDate}`, { method: 'PUT', body: JSON.stringify({ label: form.label.trim() }) });
      notify(`${form.label.trim()} added. The digest goes out on ${calendarDate(addDays(form.demandDate, -2))} at 18:00.`);
      setAdding(false);
      await load();
    } catch (requestError) {
      if (!isSessionExpired(requestError)) notify(errorText(requestError), 'danger');
    } finally {
      setBusy('');
    }
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(removing.demandDate);
    try {
      await requestApi(`/admin/demand-days/${removing.demandDate}`, { method: 'DELETE' });
      notify(`${removing.label} removed.`);
      setRemoving(null);
      await load();
    } catch (requestError) {
      if (!isSessionExpired(requestError)) notify(errorText(requestError), 'danger');
    } finally {
      setBusy('');
    }
  };

  const today = indiaToday();
  const columns = [
    { key: 'demandDate', label: 'Date', width: 190, locked: true, render: (row) => <strong>{calendarDate(row.demandDate)}</strong>, csv: (row) => row.demandDate },
    { key: 'label', label: 'Name', width: 220 },
    {
      key: 'digest', label: 'Digest', width: 230,
      render: (row) => {
        const sendDate = addDays(row.demandDate, -2);
        return sendDate < today ? <span className="ax-muted">Sent or past</span> : <span>{calendarDate(sendDate)}, 18:00</span>;
      },
      csv: (row) => `${addDays(row.demandDate, -2)} 18:00 IST`
    },
    { key: 'createdAt', label: 'Added', width: 150, render: (row) => <span title={formatDateTime(row.createdAt)}>{relativeTime(row.createdAt, now)}</span> },
    { key: 'actions', label: '', width: 110, align: 'end', render: (row) => <Button size="sm" variant="ghost" onClick={() => setRemoving(row)} busy={busy === row.demandDate}>Remove</Button> },
  ];

  return (
    <div className="ax-view">
      <p className="ax-note">The ride digest goes out at 18:00 IST, 2 days before each date. Members get it when their routes have open rides on that date. Weekends need no entry.</p>
      {error ? <div className="ax-inline-error" role="alert"><span>{error}</span><Button size="sm" onClick={load}>Try again</Button></div> : null}
      <DataTable tableId="demandDays" label="Demand days" columns={columns} rows={rows} loading={loading}
        toolbar={<Button variant="primary" icon="plus" onClick={() => { setForm({ demandDate: addDays(today, 3), label: '' }); setAdding(true); }}>Add demand day</Button>}
        total={rows.length} page={0} pageSize={rows.length || 1}
        exporter={{ title: 'Demand days', filename: () => `fluxgo-demand-days-${today}`, load: async () => rows }}
        empty={<EmptyState icon="calendar" title="No demand days">Add festivals and long weekends. Members then hear about rides 2 days before.</EmptyState>} />

      <Dialog open={adding} title="Add a demand day" onClose={() => setAdding(false)} busy={busy === 'save'} width={440}
        description="Use a date with high travel, such as a festival or the start of a long weekend."
        footer={<><Button onClick={() => setAdding(false)} disabled={busy === 'save'}>Cancel</Button><Button variant="primary" type="submit" form="ax-add-demand-day" busy={busy === 'save'}>Add</Button></>}>
        <form id="ax-add-demand-day" onSubmit={save} className="ax-form-stack">
          <Field label="Date" htmlFor="demand-day-date" hint={form.demandDate ? `The digest goes out on ${calendarDate(addDays(form.demandDate, -2))} at 18:00 IST.` : undefined}>
            <input id="demand-day-date" type="date" value={form.demandDate} min={today} max={addDays(today, 366)} onChange={(event) => setForm({ ...form, demandDate: event.target.value })} required data-autofocus />
          </Field>
          <Field label="Name" htmlFor="demand-day-label" hint="Members see it in the push, for example “Diwali”.">
            <input id="demand-day-label" value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} maxLength={80} required autoComplete="off" />
          </Field>
        </form>
      </Dialog>

      <ConfirmDialog open={Boolean(removing)} busy={Boolean(removing && busy === removing.demandDate)} tone="danger"
        title="Remove this demand day?"
        description={<><strong>{removing?.label}</strong> on {removing ? calendarDate(removing.demandDate) : ''} gets no digest. A digest that went out stays sent.</>}
        confirmLabel="Remove" onCancel={() => setRemoving(null)} onConfirm={remove} />
    </div>
  );
}
