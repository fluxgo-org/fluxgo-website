'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ACTIVITY_GROUPS,
  AUDIENCE_PRESETS,
  cleanForm,
  filterSummary,
  GENDER_OPTIONS,
  INTENT_OPTIONS,
  INTERNAL_OPTIONS,
  ONBOARDING_OPTIONS,
  RIDES_OPTIONS,
  SOURCE_OPTIONS,
  toAudienceFilters,
  WORK_EMAIL_OPTIONS,
} from '../_lib/audience';
import { errorText, isSessionExpired, queryString, requestApi } from '../_lib/api';
import { dayEndIso, display, formatDateTime, formatNumber, plural, relativeTime } from '../_lib/format';
import { useDebounced, useNow } from '../_lib/hooks';
import { Avatar, Badge, Button, ConfirmDialog, EmptyState, Field, Icon, IconButton, Segmented, useToast } from './ui';

const TITLE_MAX = 160;
const BODY_MAX = 2000;
const BATCH_SIZE = 500;
const PREVIEW_SIZE = 5;

const TYPES = {
  ANNOUNCEMENT: { kind: 'ANNOUNCEMENT', category: 'UPDATES', label: 'Update', tab: 'Updates' },
  OFFER: { kind: 'OFFER', category: 'OFFERS', label: 'Offer', tab: 'Offers' },
};

/** Count and preview the active members that match the filters. */
function useAudienceMatch(filters, enabled) {
  const key = JSON.stringify(filters);
  const debouncedKey = useDebounced(key, 300);
  const [state, setState] = useState({ key: null, total: null, items: [], error: '' });
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setLoading(true);
    requestApi(`/admin/members${queryString({ status: 'ACTIVE', ...JSON.parse(debouncedKey), limit: PREVIEW_SIZE, offset: 0 })}`)
      .then((result) => { if (!cancelled) setState({ key: debouncedKey, total: result?.total ?? 0, items: result?.items || [], error: '' }); })
      .catch((requestError) => { if (!cancelled && !isSessionExpired(requestError)) setState((current) => ({ ...current, key: debouncedKey, error: errorText(requestError) })); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedKey, enabled, retry]);
  const current = state.key === key;
  return {
    total: current && !state.error ? state.total : null,
    items: state.items,
    lastTotal: state.total,
    error: current ? state.error : '',
    counting: enabled && (loading || !current),
    retry: () => setRetry((value) => value + 1),
  };
}

export function NotifyView({ params, setParams, navigate, openRecord }) {
  const now = useNow();
  const notify = useToast();
  const [audience, setAudience] = useState('members');
  const [recipients, setRecipients] = useState([]);
  const [form, setForm] = useState({});
  const [type, setType] = useState('ANNOUNCEMENT');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [push, setPush] = useState(true);
  const [expires, setExpires] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState('');
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    if (!params.to) return;
    setAudience('members');
    setRecipients((current) => (current.some((item) => item.id === params.to) ? current : [...current, { id: params.to, name: params.toName || 'Member' }]));
    setParams({ to: undefined, toName: undefined });
    // Prefill once from a member panel link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.to]);

  const loadRecent = useCallback(async () => {
    try {
      const result = await requestApi('/admin/notifications/sends?limit=6&offset=0');
      setRecent(result?.items || []);
    } catch { /* recent sends are optional */ }
  }, []);
  useEffect(() => { void loadRecent(); }, [loadRecent]);

  const filtered = audience === 'filters';
  const filters = useMemo(() => toAudienceFilters(form), [form]);
  const match = useAudienceMatch(filters, filtered);
  const count = filtered ? match.total || 0 : recipients.length;
  const ready = title.trim() && body.trim() && count > 0 && (!filtered || !match.counting);
  const config = TYPES[type];

  const send = async () => {
    setSending(true);
    try {
      const key = `portal-${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;
      const message = {
        category: config.category,
        kind: config.kind,
        title: title.trim(),
        body: body.trim(),
        data: {},
        push,
        ...(expires ? { expiresAt: dayEndIso(expires) } : {}),
      };
      let delivered = 0;
      if (filtered) {
        // One request for any audience size. The server finds the members and writes in bulk.
        const result = await requestApi('/admin/notifications', { method: 'POST', body: JSON.stringify({ eventKey: key, audience: { filters }, ...message }) });
        delivered = Number(result?.count || 0);
      } else {
        const ids = recipients.map((item) => item.id);
        for (let index = 0; index < ids.length; index += BATCH_SIZE) {
          const batchNumber = index / BATCH_SIZE + 1;
          if (ids.length > BATCH_SIZE) setProgress(`Sending batch ${batchNumber} of ${Math.ceil(ids.length / BATCH_SIZE)}…`);
          const result = await requestApi('/admin/notifications', {
            method: 'POST',
            body: JSON.stringify({ eventKey: ids.length > BATCH_SIZE ? `${key}-b${batchNumber}` : key, recipientUserIds: ids.slice(index, index + BATCH_SIZE), ...message }),
          });
          delivered += Number(result?.count || 0);
        }
      }
      notify(`Sent to ${plural(delivered, 'member')}${push ? ' with push' : ' in the app only'}.`);
      setConfirming(false);
      setTitle(''); setBody(''); setExpires('');
      if (!filtered) setRecipients([]);
      void loadRecent();
    } catch (requestError) {
      if (!isSessionExpired(requestError)) notify(errorText(requestError), 'danger');
    } finally {
      setSending(false);
      setProgress('');
    }
  };

  const footText = filtered
    ? match.counting ? 'Counting members…' : match.error ? 'Members could not be counted' : count ? `${plural(count, 'recipient')} · ${push ? 'push now' : 'in-app only'}` : 'No members match the filters'
    : count ? `${plural(count, 'recipient')} · ${push ? 'push now' : 'in-app only'}` : 'Add recipients to continue';

  return (
    <div className="ax-notify">
      <form className="ax-card ax-notify-form" onSubmit={(event) => { event.preventDefault(); if (ready) setConfirming(true); }}>
        <section className="ax-form-section">
          <h3>1. Who gets it</h3>
          <Segmented label="Audience" value={audience} onChange={setAudience} options={[{ value: 'members', label: 'Specific members' }, { value: 'filters', label: 'Filtered members' }]} />
          {filtered ? (
            <>
              <AudienceFilters form={form} onChange={setForm} />
              <MatchPreview match={match} />
            </>
          ) : (
            <MemberPicker selected={recipients} onAdd={(member) => setRecipients((current) => (current.some((item) => item.id === member.id) ? current : [...current, member]))} onRemove={(id) => setRecipients((current) => current.filter((item) => item.id !== id))} />
          )}
        </section>
        <section className="ax-form-section">
          <h3>2. Message</h3>
          <Segmented label="Notification type" value={type} onChange={setType} options={[{ value: 'ANNOUNCEMENT', label: 'Update' }, { value: 'OFFER', label: 'Offer' }]} />
          <p className="ax-field-hint">It shows in the {config.tab} tab of the member’s notification centre.</p>
          <Field label="Title" htmlFor="notify-title" hint={`${title.length}/${TITLE_MAX}`}>
            <input id="notify-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={TITLE_MAX} placeholder="For example: New routes from Gachibowli" required />
          </Field>
          <Field label="Message" htmlFor="notify-body" hint={`${body.length}/${BODY_MAX}`}>
            <textarea id="notify-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={BODY_MAX} rows={4} placeholder="Keep it short. The first line shows on the lock screen." required />
          </Field>
        </section>
        <section className="ax-form-section">
          <h3>3. Delivery</h3>
          <Segmented label="Delivery" value={push ? 'push' : 'inapp'} onChange={(value) => setPush(value === 'push')} options={[{ value: 'push', label: 'Push and in-app' }, { value: 'inapp', label: 'In-app only' }]} />
          <Field label="Remove from the notification centre after (optional)" htmlFor="notify-expires">
            <input id="notify-expires" type="date" value={expires} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setExpires(event.target.value)} />
          </Field>
        </section>
        <div className="ax-form-foot">
          <span className="ax-muted">{footText}</span>
          <Button variant="primary" type="submit" icon="send" disabled={!ready}>Review and send</Button>
        </div>
      </form>

      <aside className="ax-notify-side">
        <div className="ax-card ax-preview">
          <h3 className="ax-card-title">Preview</h3>
          <div className="ax-phone">
            <div className="ax-push">
              <span className="ax-push-app"><span className="ax-push-logo" aria-hidden="true">f</span>Fluxgo · now</span>
              <strong>{title || 'Notification title'}</strong>
              <p>{body || 'The message text shows here.'}</p>
            </div>
            {!push ? <p className="ax-preview-note">No push. Members see it only in the app.</p> : null}
          </div>
          <div className="ax-inapp">
            <span className="ax-inapp-tab">{config.tab}</span>
            <div className="ax-inapp-item">
              <span className="ax-inapp-icon"><Icon name={type === 'OFFER' ? 'star' : 'bell'} size={14} /></span>
              <div><strong>{title || 'Notification title'}</strong><p>{body || 'The message text shows here.'}</p></div>
            </div>
          </div>
        </div>
        <div className="ax-card">
          <div className="ax-card-title-row"><h3 className="ax-card-title">Recent sends</h3><Button size="sm" variant="ghost" onClick={() => navigate('sends')}>All</Button></div>
          {recent.length ? (
            <ul className="ax-activity ax-sends">
              {recent.map((row) => (
                <li key={row.id}>
                  <button type="button" onClick={() => openRecord?.('send', row.id, row)}>
                    <span className="ax-activity-main">
                      <strong className="ax-truncate">{display(row.title)}</strong>
                      <span className="ax-sends-meta">{row.kind === 'OFFER' ? 'Offer' : 'Update'} · {row.audience === 'filters' ? 'Filtered' : 'Specific'} · {plural(row.recipientCount || 0, 'member')} · {row.push === false ? 'in-app' : 'push'}</span>
                      <span className="ax-muted ax-small">by {display(row.adminUsername)}</span>
                    </span>
                    <time className="ax-muted" title={formatDateTime(row.createdAt)}>{relativeTime(row.createdAt, now)}</time>
                  </button>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon="bell" title="No notifications sent yet" />}
        </div>
      </aside>

      <ConfirmDialog open={confirming} busy={sending} tone="danger" title={`Send to ${plural(count, 'member')}?`} confirmLabel={sending ? 'Sending…' : 'Send now'}
        onCancel={() => setConfirming(false)} onConfirm={send}
        description={<>{push ? 'Members get a push on their phones now.' : 'Members see this in the app only.'} You cannot undo this. The send goes to the audit log.</>}>
        <div className="ax-confirm-summary">
          <span className="ax-confirm-audience"><Icon name={filtered ? 'filter' : 'members'} size={13} />{filtered ? filterSummary(filters) : recipients.slice(0, 3).map((item) => item.name).join(', ') + (recipients.length > 3 ? ` and ${formatNumber(recipients.length - 3)} more` : '')}</span>
          <Badge tone="neutral" dot={false}>{config.label}</Badge>
          <strong>{title}</strong>
          <p>{body}</p>
          {progress ? <p className="ax-muted" role="status">{progress}</p> : null}
        </div>
      </ConfirmDialog>
    </div>
  );
}

function Select({ id, label, value, onChange, options, groups, any = 'Any', wide = false }) {
  return (
    <label className={`ax-aud-field${wide ? ' is-wide' : ''}`} htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value || ''} onChange={(event) => onChange(event.target.value)} className={value ? 'is-set' : ''}>
        <option value="">{any}</option>
        {options ? options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>) : null}
        {groups ? groups.map((group) => <optgroup key={group.label} label={group.label}>{group.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</optgroup>) : null}
      </select>
    </label>
  );
}

/** The audience filter panel: quick presets, then grouped fields. */
function AudienceFilters({ form, onChange }) {
  const set = (key) => (value) => onChange((current) => ({ ...current, [key]: value }));
  const active = cleanForm(form);
  const activeCount = Object.keys(active).length;
  const presetFilters = (preset) => cleanForm(preset.filters());
  const isPreset = (preset) => {
    const target = presetFilters(preset);
    const { internal, ...rest } = active;
    return Object.keys(target).length === Object.keys(rest).length && Object.entries(target).every(([key, value]) => rest[key] === value);
  };
  return (
    <div className="ax-aud">
      <div className="ax-aud-presets" role="group" aria-label="Quick audiences">
        {AUDIENCE_PRESETS.map((preset) => {
          const on = isPreset(preset);
          return <button key={preset.label} type="button" className={`ax-preset${on ? ' is-active' : ''}`} aria-pressed={on}
            onClick={() => onChange((current) => (on ? { internal: current.internal } : { internal: current.internal, ...preset.filters() }))}>{preset.label}</button>;
        })}
        {activeCount ? <button type="button" className="ax-chip-clear" onClick={() => onChange({})}>Clear</button> : null}
      </div>

      <fieldset className="ax-aud-group">
        <legend>Profile</legend>
        <div className="ax-aud-grid">
          <Select id="aud-gender" label="Gender" value={form.gender} onChange={set('gender')} options={GENDER_OPTIONS} />
          <fieldset className="ax-aud-field is-wide ax-aud-range">
            <legend>Joined</legend>
            <div>
              <input type="date" aria-label="Joined on or after" value={form.joinedFrom || ''} max={form.joinedTo || undefined} onChange={(event) => set('joinedFrom')(event.target.value)} className={form.joinedFrom ? 'is-set' : ''} />
              <span aria-hidden="true">–</span>
              <input type="date" aria-label="Joined on or before" value={form.joinedTo || ''} min={form.joinedFrom || undefined} onChange={(event) => set('joinedTo')(event.target.value)} className={form.joinedTo ? 'is-set' : ''} />
            </div>
          </fieldset>
          <Select id="aud-intent" label="Joined to" value={form.intent} onChange={set('intent')} options={INTENT_OPTIONS} />
          <Select id="aud-source" label="Signup source" value={form.acquisitionSource} onChange={set('acquisitionSource')} options={SOURCE_OPTIONS} />
          <Select id="aud-photo" label="Profile photo" value={form.hasPhoto} onChange={set('hasPhoto')} options={[{ value: 'true', label: 'Has photo' }, { value: 'false', label: 'No photo' }]} />
        </div>
      </fieldset>

      <fieldset className="ax-aud-group">
        <legend>Verification</legend>
        <div className="ax-aud-grid">
          <Select id="aud-work-email" label="Work email" value={form.workEmailStatus} onChange={set('workEmailStatus')} options={WORK_EMAIL_OPTIONS} />
          <Select id="aud-vehicle" label="Vehicle" value={form.hasVehicle} onChange={set('hasVehicle')} options={[{ value: 'true', label: 'Has vehicle' }, { value: 'false', label: 'No vehicle' }]} />
          <Select id="aud-onboarding" label="Onboarding" value={form.onboarding} onChange={set('onboarding')} options={ONBOARDING_OPTIONS} />
        </div>
      </fieldset>

      <fieldset className="ax-aud-group">
        <legend>Activity</legend>
        <div className="ax-aud-grid">
          <Select id="aud-activity" label="Last app use" value={form.activity} onChange={set('activity')} groups={ACTIVITY_GROUPS} wide />
          <Select id="aud-driver" label="Rides as driver" value={form.driverRides} onChange={set('driverRides')} options={RIDES_OPTIONS} />
          <Select id="aud-passenger" label="Rides as passenger" value={form.passengerRides} onChange={set('passengerRides')} options={RIDES_OPTIONS} />
          <label className="ax-aud-field" htmlFor="aud-city">
            <span>Ride city</span>
            <input id="aud-city" value={form.city || ''} onChange={(event) => set('city')(event.target.value)} placeholder="Last 90 days" className={form.city ? 'is-set' : ''} autoComplete="off" />
          </label>
        </div>
      </fieldset>

      <div className="ax-aud-internal">
        <span>Internal members</span>
        <Segmented size="sm" label="Internal members" value={form.internal || 'include'} onChange={set('internal')} options={INTERNAL_OPTIONS} />
      </div>
    </div>
  );
}

/** The live member count with the first few names. */
function MatchPreview({ match }) {
  if (match.error) {
    return <div className="ax-aud-match is-error" role="alert"><Icon name="alert" size={15} /><span>{match.error}</span><Button size="sm" onClick={match.retry}>Try again</Button></div>;
  }
  const total = match.total ?? match.lastTotal;
  if (total === null || total === undefined) {
    return <div className="ax-aud-match" aria-busy="true"><span className="ax-spinner" aria-hidden="true" /><span className="ax-muted">Counting members…</span></div>;
  }
  const names = match.items.slice(0, PREVIEW_SIZE).map((member) => display(member.name || member.mobile));
  const rest = total - names.length;
  return (
    <div className={`ax-aud-match${match.counting ? ' is-stale' : ''}${total === 0 ? ' is-empty' : ''}`} role="status" aria-busy={match.counting ? 'true' : 'false'}>
      {total > 0 ? (
        <span className="ax-avatar-stack" aria-hidden="true">
          {match.items.slice(0, PREVIEW_SIZE).map((member) => <Avatar key={member.id} name={member.name} src={member.profilePhotoUrl} size="sm" />)}
        </span>
      ) : <Icon name="members" size={16} />}
      <span className="ax-aud-match-text">
        <strong>{total === 0 ? 'No members match' : `${formatNumber(total)} ${total === 1 ? 'member matches' : 'members match'}`}</strong>
        <span className="ax-muted">{total === 0 ? 'Change or clear the filters.' : `${names.join(', ')}${rest > 0 ? ` and ${formatNumber(rest)} more` : ''}`}</span>
      </span>
      {match.counting ? <span className="ax-spinner" aria-label="Counting" /> : null}
    </div>
  );
}

function MemberPicker({ selected, onAdd, onRemove }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const debounced = useDebounced(query, 250);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!debounced.trim()) { setResults([]); return; }
    let cancelled = false;
    requestApi(`/admin/members${queryString({ query: debounced.trim(), status: 'ACTIVE', internal: 'include', limit: 8, offset: 0 })}`)
      .then((result) => { if (!cancelled) { setResults(result?.items || []); setActive(0); } })
      .catch(() => { if (!cancelled) setResults([]); });
    return () => { cancelled = true; };
  }, [debounced]);

  useEffect(() => {
    const onDown = (event) => { if (!boxRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const choose = (member) => {
    onAdd({ id: member.id, name: member.name || member.mobile, mobile: member.mobile, profilePhotoUrl: member.profilePhotoUrl || null, isInternal: Boolean(member.isInternal) });
    setQuery('');
    setResults([]);
  };

  return (
    <div className="ax-picker" ref={boxRef}>
      <div className="ax-search">
        <Icon name="search" size={15} />
        <input value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Find active members by name, mobile, or email" aria-label="Find members"
          role="combobox" aria-expanded={open && results.length > 0} aria-controls="ax-picker-results"
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') { event.preventDefault(); setActive((current) => Math.min(results.length - 1, current + 1)); }
            if (event.key === 'ArrowUp') { event.preventDefault(); setActive((current) => Math.max(0, current - 1)); }
            if (event.key === 'Enter' && results[active]) { event.preventDefault(); choose(results[active]); }
          }} />
      </div>
      {open && results.length ? (
        <ul className="ax-picker-results" id="ax-picker-results" role="listbox">
          {results.map((member, index) => {
            const added = selected.some((item) => item.id === member.id);
            return (
              <li key={member.id} role="option" aria-selected={index === active}>
                <button type="button" className={index === active ? 'is-active' : ''} onMouseEnter={() => setActive(index)} onClick={() => choose(member)} disabled={added}>
                  <Avatar name={member.name} src={member.profilePhotoUrl} size="sm" /><span><strong>{display(member.name)}{member.isInternal ? <span className="ax-internal-tag">Internal</span> : null}</strong><span className="ax-muted ax-mono ax-small">{member.mobile}</span></span>{added ? <Icon name="check" size={14} /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {selected.length ? (
        <div className="ax-chips">
          {selected.map((member) => (
            <span key={member.id} className="ax-chip"><Avatar name={member.name} src={member.profilePhotoUrl} size="xs" />{member.name}{member.isInternal ? <span className="ax-internal-tag">Internal</span> : null}<IconButton icon="close" size={12} label={`Remove ${member.name}`} onClick={() => onRemove(member.id)} /></span>
          ))}
        </div>
      ) : <p className="ax-field-hint">No recipients yet.</p>}
    </div>
  );
}
