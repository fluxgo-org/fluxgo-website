'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { errorText, isSessionExpired, queryString, requestApi } from '../_lib/api';
import { dayEndIso, display, formatDateTime, formatNumber, plural, relativeTime } from '../_lib/format';
import { useDebounced, useNow } from '../_lib/hooks';
import { Avatar, Badge, Button, ConfirmDialog, EmptyState, Field, Icon, IconButton, Segmented, useToast } from './ui';

const TITLE_MAX = 160;
const BODY_MAX = 2000;
const BATCH_SIZE = 500;

const TYPES = {
  ANNOUNCEMENT: { kind: 'ANNOUNCEMENT', category: 'UPDATES', label: 'Update', tab: 'Updates' },
  OFFER: { kind: 'OFFER', category: 'OFFERS', label: 'Offer', tab: 'Offers' },
};

export function NotifyView({ params, setParams, navigate }) {
  const now = useNow();
  const notify = useToast();
  const [audience, setAudience] = useState('members');
  const [recipients, setRecipients] = useState([]);
  const [activeTotal, setActiveTotal] = useState(null);
  const [internalTotal, setInternalTotal] = useState(null);
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
    setRecipients((current) => (current.some((item) => item.id === params.to) ? current : [...current, { id: params.to, name: params.toName || 'Member' }]));
    setParams({ to: undefined, toName: undefined });
    // Prefill once from a member panel link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.to]);

  const loadRecent = useCallback(async () => {
    try {
      const result = await requestApi('/admin/audit?action=NOTIFICATION_PUBLISHED&limit=6&offset=0');
      setRecent(result?.items || []);
    } catch { /* recent sends are optional */ }
  }, []);

  useEffect(() => { void loadRecent(); }, [loadRecent]);
  useEffect(() => {
    if (audience !== 'all' || activeTotal !== null) return;
    // Internal members (Fluxgo team and test accounts) get notifications too. Lists hide them by default.
    requestApi('/admin/members?status=ACTIVE&internal=include&limit=1&offset=0').then((result) => setActiveTotal(result?.total ?? 0)).catch(() => setActiveTotal(null));
    requestApi('/admin/members?status=ACTIVE&internal=only&limit=1&offset=0').then((result) => setInternalTotal(result?.total ?? 0)).catch(() => setInternalTotal(null));
  }, [audience, activeTotal]);

  const count = audience === 'all' ? activeTotal || 0 : recipients.length;
  const batches = Math.ceil(count / BATCH_SIZE);
  const ready = title.trim() && body.trim() && count > 0;
  const config = TYPES[type];

  const collectAllActive = async () => {
    const ids = [];
    for (let offset = 0; ; offset += 100) {
      const result = await requestApi(`/admin/members${queryString({ status: 'ACTIVE', internal: 'include', limit: 100, offset, sort: 'createdAt', order: 'asc' })}`);
      (result?.items || []).forEach((member) => ids.push(member.id));
      setProgress(`Collecting recipients: ${formatNumber(ids.length)} of ${formatNumber(result?.total || 0)}`);
      if (!result?.hasMore) break;
    }
    return ids;
  };

  const send = async () => {
    setSending(true);
    try {
      const ids = audience === 'all' ? await collectAllActive() : recipients.map((item) => item.id);
      const key = `portal-${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;
      let delivered = 0;
      for (let index = 0; index < ids.length; index += BATCH_SIZE) {
        const batch = ids.slice(index, index + BATCH_SIZE);
        const batchNumber = index / BATCH_SIZE + 1;
        setProgress(`Sending batch ${batchNumber} of ${Math.ceil(ids.length / BATCH_SIZE)}…`);
        const result = await requestApi('/admin/notifications', {
          method: 'POST',
          body: JSON.stringify({
            eventKey: ids.length > BATCH_SIZE ? `${key}-b${batchNumber}` : key,
            recipientUserIds: batch,
            category: config.category,
            kind: config.kind,
            title: title.trim(),
            body: body.trim(),
            data: {},
            push,
            ...(expires ? { expiresAt: dayEndIso(expires) } : {}),
          }),
        });
        delivered += Number(result?.count || 0);
      }
      notify(`Sent to ${plural(delivered, 'member')}${push ? ' with push' : ' in the app only'}.`);
      setConfirming(false);
      setTitle(''); setBody(''); setRecipients([]); setExpires('');
      void loadRecent();
    } catch (requestError) {
      if (!isSessionExpired(requestError)) notify(errorText(requestError), 'danger');
    } finally {
      setSending(false);
      setProgress('');
    }
  };

  return (
    <div className="ax-notify">
      <form className="ax-card ax-notify-form" onSubmit={(event) => { event.preventDefault(); if (ready) setConfirming(true); }}>
        <section className="ax-form-section">
          <h3>1. Who gets it</h3>
          <Segmented label="Audience" value={audience} onChange={setAudience} options={[{ value: 'members', label: 'Specific members' }, { value: 'all', label: 'All active members' }]} />
          {audience === 'members' ? (
            <MemberPicker selected={recipients} onAdd={(member) => setRecipients((current) => (current.some((item) => item.id === member.id) ? current : [...current, member]))} onRemove={(id) => setRecipients((current) => current.filter((item) => item.id !== id))} />
          ) : (
            <p className="ax-note"><Icon name="members" size={14} />{activeTotal === null ? 'Counting active members…' : `${plural(activeTotal, 'active member')} get this${internalTotal ? `, with ${formatNumber(internalTotal)} internal` : ''}.`}{batches > 1 ? ` We send it in ${batches} batches of up to ${BATCH_SIZE}.` : ''}</p>
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
          <span className="ax-muted">{count ? `${plural(count, 'recipient')} · ${push ? 'push now' : 'in-app only'}` : 'Add recipients to continue'}</span>
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
          <div className="ax-card-title-row"><h3 className="ax-card-title">Recent sends</h3><Button size="sm" variant="ghost" onClick={() => navigate('audit', { action: 'NOTIFICATION_PUBLISHED' })}>All</Button></div>
          {recent.length ? (
            <ul className="ax-activity">
              {recent.map((row) => (
                <li key={row.id}><div className="ax-activity-static">
                  <span className="ax-activity-main"><strong>{formatNumber(row.metadata?.recipientCount)} members</strong> · {row.metadata?.kind === 'OFFER' ? 'Offer' : 'Update'}{row.metadata?.push === false ? ' · in-app' : ' · push'}<br /><span className="ax-muted">by {display(row.adminUsername)}</span></span>
                  <time className="ax-muted" title={formatDateTime(row.createdAt)}>{relativeTime(row.createdAt, now)}</time>
                </div></li>
              ))}
            </ul>
          ) : <EmptyState icon="bell" title="No notifications sent yet" />}
        </div>
      </aside>

      <ConfirmDialog open={confirming} busy={sending} tone="danger" title={`Send to ${plural(count, 'member')}?`} confirmLabel={sending ? 'Sending…' : 'Send now'}
        onCancel={() => setConfirming(false)} onConfirm={send}
        description={<>{push ? 'Members get a push on their phones now.' : 'Members see this in the app only.'} You cannot undo this. The send goes to the audit log.</>}>
        <div className="ax-confirm-summary">
          <Badge tone="neutral" dot={false}>{config.label}</Badge>
          <strong>{title}</strong>
          <p>{body}</p>
          {progress ? <p className="ax-muted" role="status">{progress}</p> : null}
        </div>
      </ConfirmDialog>
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
