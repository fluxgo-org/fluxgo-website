'use client';

import { useEffect, useState } from 'react';
import { formatDate, statusLabel } from '../_lib/format';
import { Button, Icon, IconButton } from './ui';

/**
 * Filter field types:
 * - select: { key, label, options: [{ value, label }] }
 * - boolean: { key, label, yes, no }
 * - dateRange: { key, label, fromKey, toKey } (values are local yyyy-mm-dd days)
 * - text: { key, label, placeholder }
 * - entity: { key, label, labelKey } (set from links, shown as a chip only)
 * - toggle: { key, label, value, chipLabel, chipLabels } (a checkbox that sets key to value)
 *   A sticky toggle keeps its plain value when presets or "Clear all" change the other filters.
 */
export function FilterBar({ config, filters, onChange, searchPlaceholder, searchRef, resultCount }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(filters.query || '');
  const fields = config.filters || [];
  const advanced = fields.filter((field) => field.type !== 'entity' && !field.primary);
  const primary = fields.filter((field) => field.primary);

  useEffect(() => { setQuery(filters.query || ''); }, [filters.query]);
  useEffect(() => {
    if ((filters.query || '') === query) return undefined;
    const timer = setTimeout(() => onChange({ query: query || undefined }), 300);
    return () => clearTimeout(timer);
    // onChange identity changes with filters; the query value drives this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const chips = activeChips(fields, filters);
  const advancedCount = advanced.filter((field) => fieldActive(field, filters)).length;
  const presets = config.presets || [];
  const presetActive = (preset) => Object.entries(resolvePreset(preset.filters)).every(([key, value]) => String(filters[key] ?? '') === String(value ?? ''))
    && fields.every((field) => keepsValue(field, filters) || fieldKeys(field).every((key) => key in preset.filters || !filters[key]));

  return (
    <div className="ax-filters">
      <div className="ax-filter-row">
        {config.search !== false ? (
          <div className="ax-search">
            <Icon name="search" size={16} />
            <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder || config.searchPlaceholder || 'Search'}
              aria-label={`Search ${config.label.toLowerCase()}`} autoComplete="off" onKeyDown={(event) => { if (event.key === 'Escape' && query) { event.preventDefault(); setQuery(''); } }} />
            {query ? <IconButton icon="close" label="Clear search" size={14} onClick={() => setQuery('')} /> : <span className="ax-search-hint" aria-hidden="true">/</span>}
          </div>
        ) : null}
        {primary.map((field) => <FilterControl key={field.key} field={field} filters={filters} onChange={onChange} inline />)}
        {advanced.length ? (
          <Button icon="filter" onClick={() => setOpen((current) => !current)} aria-expanded={open} className={advancedCount ? 'has-count' : ''}>
            Filters{advancedCount ? <span className="ax-btn-count">{advancedCount}</span> : null}
          </Button>
        ) : null}
        {resultCount !== undefined ? <span className="ax-result-count">{resultCount}</span> : null}
      </div>
      {presets.length ? (
        <div className="ax-presets" role="group" aria-label="Quick views">
          {presets.map((preset) => {
            const active = presetActive(preset);
            return <button key={preset.label} type="button" className={`ax-preset${active ? ' is-active' : ''}`} aria-pressed={active}
              onClick={() => onChange(active ? clearedFilters(fields, filters, preset.filters) : { ...clearedFilters(fields, filters), ...resolvePreset(preset.filters) }, { replace: true })}>{preset.label}</button>;
          })}
        </div>
      ) : null}
      {open && advanced.length ? (
        <div className="ax-filter-panel">
          {advanced.map((field) => <FilterControl key={field.key} field={field} filters={filters} onChange={onChange} />)}
          <div className="ax-filter-panel-foot">
            <Button size="sm" variant="ghost" onClick={() => onChange(clearedFilters(fields, filters), { replace: true })} disabled={!chips.length}>Clear all</Button>
            <Button size="sm" onClick={() => setOpen(false)}>Done</Button>
          </div>
        </div>
      ) : null}
      {chips.length ? (
        <div className="ax-chips" aria-label="Active filters">
          {chips.map((chip) => (
            <span key={chip.id} className="ax-chip">
              <span className="ax-chip-label">{chip.label}:</span> {chip.value}
              <button type="button" onClick={() => onChange(chip.clear)} aria-label={`Remove ${chip.label} filter`}><Icon name="close" size={12} /></button>
            </span>
          ))}
          {chips.length > 1 ? <button type="button" className="ax-chip-clear" onClick={() => onChange(clearedFilters(fields, filters), { replace: true })}>Clear all</button> : null}
        </div>
      ) : null}
    </div>
  );
}

function FilterControl({ field, filters, onChange, inline = false }) {
  const id = `filter-${field.key}`;
  if (field.type === 'toggle') {
    return (
      <label className="ax-check ax-filter-toggle" htmlFor={id}>
        <input id={id} type="checkbox" checked={Boolean(filters[field.key])} onChange={(event) => onChange({ [field.key]: event.target.checked ? field.value : undefined })} />
        <span>{field.label}</span>
      </label>
    );
  }
  if (field.type === 'select' || field.type === 'boolean') {
    const options = field.type === 'boolean'
      ? [{ value: 'true', label: field.yes || 'Yes' }, { value: 'false', label: field.no || 'No' }]
      : field.options;
    return (
      <label className={`ax-filter-field${inline ? ' is-inline' : ''}`} htmlFor={id}>
        <span>{field.label}</span>
        <select id={id} value={filters[field.key] || ''} onChange={(event) => onChange({ [field.key]: event.target.value || undefined })}>
          <option value="">{field.anyLabel || 'Any'}</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    );
  }
  if (field.type === 'dateRange') {
    const from = filters[field.fromKey] || '';
    const to = filters[field.toKey] || '';
    const invalid = from && to && from > to;
    return (
      <fieldset className="ax-filter-field ax-filter-range">
        <legend>{field.label}</legend>
        <div>
          <input type="date" aria-label={`${field.label} from`} value={from} max={to || undefined} onChange={(event) => onChange({ [field.fromKey]: event.target.value || undefined })} aria-invalid={invalid ? 'true' : 'false'} />
          <span aria-hidden="true">–</span>
          <input type="date" aria-label={`${field.label} to`} value={to} min={from || undefined} onChange={(event) => onChange({ [field.toKey]: event.target.value || undefined })} aria-invalid={invalid ? 'true' : 'false'} />
        </div>
        {invalid ? <p className="ax-field-error" role="alert">The end date must be on or after the start date.</p> : null}
      </fieldset>
    );
  }
  if (field.type === 'text') {
    return (
      <label className="ax-filter-field" htmlFor={id}>
        <span>{field.label}</span>
        <TextFilter id={id} value={filters[field.key] || ''} placeholder={field.placeholder} onCommit={(value) => onChange({ [field.key]: value || undefined })} />
      </label>
    );
  }
  return null;
}

function TextFilter({ id, value, placeholder, onCommit }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => {
    if (draft === value) return undefined;
    const timer = setTimeout(() => onCommit(draft.trim()), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);
  return <input id={id} value={draft} placeholder={placeholder} maxLength={160} onChange={(event) => setDraft(event.target.value)} />;
}

function fieldKeys(field) {
  return field.type === 'dateRange' ? [field.fromKey, field.toKey] : field.type === 'entity' ? [field.key, field.labelKey].filter(Boolean) : [field.key];
}

function fieldActive(field, filters) {
  return fieldKeys(field).some((key) => filters[key]);
}

/** A sticky toggle keeps its plain value. Other values, such as a preset's, are cleared. */
function keepsValue(field, filters) {
  return field.type === 'toggle' && field.sticky && filters[field.key] === field.value;
}

function clearedFilters(fields, filters = {}, presetValues = {}) {
  const next = { query: undefined };
  fields.forEach((field) => {
    if (keepsValue(field, filters) && !(field.key in presetValues)) return;
    fieldKeys(field).forEach((key) => { next[key] = undefined; });
  });
  return next;
}

/** Preset values can be functions so relative days stay current. */
function resolvePreset(values) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === 'function' ? value() : value]));
}

function activeChips(fields, filters) {
  const chips = [];
  if (filters.query) chips.push({ id: 'query', label: 'Search', value: `“${filters.query}”`, clear: { query: undefined } });
  fields.forEach((field) => {
    if (field.type === 'dateRange') {
      const from = filters[field.fromKey];
      const to = filters[field.toKey];
      if (!from && !to) return;
      const value = from && to ? (from === to ? formatDate(`${from}T00:00:00`) : `${formatDate(`${from}T00:00:00`)} – ${formatDate(`${to}T00:00:00`)}`) : from ? `from ${formatDate(`${from}T00:00:00`)}` : `until ${formatDate(`${to}T00:00:00`)}`;
      chips.push({ id: field.key, label: field.label, value, clear: { [field.fromKey]: undefined, [field.toKey]: undefined } });
      return;
    }
    const value = filters[field.key];
    if (!value) return;
    let text = value;
    if (field.type === 'select') text = field.options.find((option) => option.value === value)?.label || statusLabel(value);
    if (field.type === 'boolean') text = value === 'true' ? (field.yes || 'Yes') : (field.no || 'No');
    if (field.type === 'toggle') {
      chips.push({ id: field.key, label: field.chipLabel || field.label, value: field.chipLabels?.[value] || 'On', clear: { [field.key]: undefined } });
      return;
    }
    if (field.type === 'entity') text = (field.labelKey && filters[field.labelKey]) || `${String(value).slice(0, 8)}…`;
    chips.push({ id: field.key, label: field.label, value: text, clear: Object.fromEntries(fieldKeys(field).map((key) => [key, undefined])) });
  });
  return chips;
}
