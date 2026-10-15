'use client';

import { useState } from 'react';

/** The Today screen periods. */
export const TODAY_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom' },
];

const PRESET_DAYS = { last7: 7, last30: 30, last90: 90, last365: 365 };

/** Today's yyyy-mm-dd day in India, whatever the browser zone is. */
export function kolkataDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function dayDate(key) {
  return new Date(`${key}T00:00:00Z`);
}

export function addDays(key, count) {
  const date = dayDate(key);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(from, to) {
  return Math.round((dayDate(to) - dayDate(from)) / 86_400_000) + 1;
}

export function dayText(key, options) {
  return dayDate(key).toLocaleDateString('en-IN', { timeZone: 'UTC', ...options });
}

export function presetRange(preset, today = kolkataDay()) {
  const from = preset === 'yesterday' ? addDays(today, -1) : PRESET_DAYS[preset] ? addDays(today, -(PRESET_DAYS[preset] - 1)) : today;
  const to = preset === 'yesterday' ? from : today;
  return { preset, from, to, days: daysBetween(from, to) };
}

function yearOf(key) {
  return key.slice(0, 4);
}

/** A short name for a range: "Today", "Last 7 days" or "7–13 Oct". */
export function rangeLabel(range, today, presets = TODAY_PRESETS) {
  if (range.preset !== 'custom') return presets.find((item) => item.value === range.preset)?.label || '';
  if (range.from === range.to) return range.to === today ? 'Today' : dayText(range.from, { day: 'numeric', month: 'short', year: yearOf(range.from) === yearOf(today) ? undefined : 'numeric' });
  const sameYear = yearOf(range.from) === yearOf(range.to);
  const yearOption = sameYear && yearOf(range.to) === yearOf(today) ? undefined : 'numeric';
  if (sameYear && range.from.slice(5, 7) === range.to.slice(5, 7)) return `${dayText(range.from, { day: 'numeric' })}–${dayText(range.to, { day: 'numeric', month: 'short', year: yearOption })}`;
  return `${dayText(range.from, { day: 'numeric', month: 'short', year: sameYear ? undefined : 'numeric' })} – ${dayText(range.to, { day: 'numeric', month: 'short', year: yearOption })}`;
}

export function rangeError(from, to, today, maxDays) {
  if (!from || !to) return 'Choose a start and an end date.';
  if (to > today || from > today) return 'Choose dates up to today.';
  if (from > to) return 'The start date must be on or before the end date.';
  if (daysBetween(from, to) > maxDays) return `Choose ${maxDays} days or fewer.`;
  return '';
}

/** Preset menu, plus two date fields for a custom range. */
export function PeriodPicker({ range, today, onChange, presets = TODAY_PRESETS, maxDays = 92, label = 'Period' }) {
  const [draft, setDraft] = useState({ from: range.from, to: range.to });
  const message = range.preset === 'custom' ? rangeError(draft.from, draft.to, today, maxDays) : '';
  const choose = (preset) => {
    if (preset === 'custom') {
      setDraft({ from: range.from, to: range.to });
      onChange({ ...range, preset: 'custom' });
    } else onChange(presetRange(preset, today));
  };
  const edit = (patch) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (!rangeError(next.from, next.to, today, maxDays)) onChange({ preset: 'custom', from: next.from, to: next.to, days: daysBetween(next.from, next.to) });
  };
  return (
    <div className="ax-period">
      <div className="ax-period-row">
        <select aria-label={label} value={range.preset} onChange={(event) => choose(event.target.value)}>
          {presets.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        {range.preset === 'custom' ? (
          <div className="ax-period-dates">
            <input type="date" aria-label="From" value={draft.from} max={today} onChange={(event) => edit({ from: event.target.value })} aria-invalid={message ? 'true' : 'false'} />
            <span aria-hidden="true">–</span>
            <input type="date" aria-label="To" value={draft.to} max={today} onChange={(event) => edit({ to: event.target.value })} aria-invalid={message ? 'true' : 'false'} />
          </div>
        ) : null}
      </div>
      {message ? <p className="ax-field-error" role="alert">{message}</p> : null}
    </div>
  );
}
