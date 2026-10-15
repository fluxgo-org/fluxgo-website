'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RecordLink } from '../_config/sections';
import { errorText, isSessionExpired, queryString, requestApi } from '../_lib/api';
import { display, formatDate, formatDateTime, formatTime, relativeTime, statusLabel, waitingFor } from '../_lib/format';
import { isTypingTarget, useNow, useStoredState } from '../_lib/hooks';
import { useFastLive, useLiveRefresh } from '../_lib/live';
import { adminLabel, useAdminSession } from '../_lib/session';
import { Avatar, Badge, Button, ConfirmDialog, CopyButton, EmptyState, Field, Icon, IconButton, Kbd, Popover, Segmented, Skeleton, useToast, VerifiedMark } from './ui';

const LIST_PAGE = 50;
const REPLY_MAX = 2000;

const DEFAULT_TEMPLATES = [
  { id: 'ack', title: 'Checking now', text: 'Hi {name}, thanks for writing to us. I am checking this now and will reply here soon.' },
  { id: 'ref', title: 'Ask for booking reference', text: 'Hi {name}, please send the booking reference for this ride. It is on the booking screen in the app.' },
  { id: 'detail', title: 'Ask for details', text: 'Hi {name}, can you tell me more about what happened? Please include the date and time of the ride.' },
  { id: 'done', title: 'Resolved', text: 'Hi {name}, this is now resolved. If you need more help, reply here and we will help you.' },
];

const TABS = [
  { value: 'waiting', label: 'Waiting on us', params: { status: 'OPEN', awaitingReply: 'true', sort: 'lastMessageAt', order: 'asc' } },
  { value: 'mine', label: 'Mine', params: { status: 'OPEN', sort: 'lastMessageAt', order: 'asc' }, mine: true },
  { value: 'unassigned', label: 'Unassigned', params: { status: 'OPEN', unassigned: 'true', sort: 'lastMessageAt', order: 'asc' } },
  { value: 'open', label: 'Open', params: { status: 'OPEN', sort: 'lastMessageAt', order: 'desc' } },
  { value: 'closed', label: 'Closed', params: { status: 'CLOSED', sort: 'updatedAt', order: 'desc' } },
  { value: 'all', label: 'All', params: { sort: 'updatedAt', order: 'desc' } },
];

export function SupportInbox({ params, setParams, openRecord, waitingCount }) {
  const now = useNow();
  const { admin } = useAdminSession();
  const tab = TABS.find((item) => item.value === params.tab) || TABS[0];
  const [query, setQuery] = useState(params.query || '');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(LIST_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const listRef = useRef(null);
  const searchRef = useRef(null);
  const selectedId = params.ticket || null;

  useEffect(() => {
    const timer = setTimeout(() => { if ((params.query || '') !== query) setParams({ query: query || undefined }); }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const load = useCallback(async ({ silent = false } = {}) => {
    const id = ++sequence.current;
    if (!silent) setLoading(true);
    try {
      const result = await requestApi(`/admin/support/tickets${queryString({ ...tab.params, ...(tab.mine ? { assignedAdminUserId: admin?.id } : {}), query: params.query, internal: params.internal === 'include' ? 'include' : undefined, limit, offset: 0 })}`);
      if (id !== sequence.current) return;
      setItems(result?.items || []);
      setTotal(result?.total || 0);
      setError('');
    } catch (requestError) {
      if (id !== sequence.current || isSessionExpired(requestError)) return;
      setError(errorText(requestError));
    } finally {
      if (id === sequence.current) setLoading(false);
    }
  }, [tab, params.query, params.internal, limit, admin?.id]);

  useEffect(() => { void load(); }, [load]);
  useLiveRefresh(['support'], () => { void load({ silent: true }); });

  const select = (ticketId) => setParams({ ticket: ticketId || undefined });

  useEffect(() => {
    const onKey = (event) => {
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (document.querySelector('.ax-overlay')) return;
      if (event.key === '/') { event.preventDefault(); searchRef.current?.focus(); return; }
      if (event.key !== 'j' && event.key !== 'k') return;
      event.preventDefault();
      const index = items.findIndex((item) => item.id === selectedId);
      const next = items[Math.min(items.length - 1, Math.max(0, index + (event.key === 'j' ? 1 : -1)))] || items[0];
      if (next) {
        select(next.id);
        listRef.current?.querySelector(`[data-ticket="${next.id}"]`)?.scrollIntoView({ block: 'nearest' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, selectedId]);

  return (
    <div className={`ax-inbox${selectedId ? ' has-selection' : ''}`}>
      <section className="ax-inbox-list" aria-label="Support tickets">
        <div className="ax-inbox-list-head">
          <Segmented size="sm" label="Ticket view" value={tab.value} onChange={(value) => setParams({ tab: value === 'waiting' ? undefined : value, ticket: undefined })}
            options={TABS.map((item) => ({ value: item.value, label: item.label, count: item.value === 'waiting' ? waitingCount : item.value === tab.value ? total : undefined }))} />
          <div className="ax-search is-compact">
            <Icon name="search" size={15} />
            <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Subject, reference, name, or mobile" aria-label="Search tickets" />
            {query ? <IconButton icon="close" label="Clear search" size={13} onClick={() => setQuery('')} /> : null}
          </div>
          <label className="ax-check ax-filter-toggle" htmlFor="support-show-internal">
            <input id="support-show-internal" type="checkbox" checked={params.internal === 'include'} onChange={(event) => setParams({ internal: event.target.checked ? 'include' : undefined })} />
            <span>Show internal</span>
          </label>
        </div>
        {error ? <div className="ax-inline-error" role="alert"><span>{error}</span><Button size="sm" onClick={() => load()}>Try again</Button></div> : null}
        <ul className="ax-ticket-list" ref={listRef}>
          {loading && !items.length ? Array.from({ length: 6 }).map((_, index) => (
            <li key={index} className="ax-ticket is-skeleton"><Skeleton width="45%" /><Skeleton width="80%" /><Skeleton width="30%" /></li>
          )) : items.length ? items.map((ticket) => (
            <li key={ticket.id}>
              <button type="button" data-ticket={ticket.id} className={`ax-ticket${ticket.id === selectedId ? ' is-selected' : ''}${ticket.awaitingReply ? ' is-waiting' : ''}`} onClick={() => select(ticket.id)} aria-current={ticket.id === selectedId ? 'true' : undefined}>
                <span className="ax-ticket-top">
                  <strong>{display(ticket.requesterName)}<VerifiedMark show={ticket.requesterVerified} size={13} />{ticket.isInternal ? <span className="ax-internal-tag">Internal</span> : null}</strong>
                  <time title={formatDateTime(ticket.lastMessageAt || ticket.updatedAt)}>{relativeTime(ticket.lastMessageAt || ticket.updatedAt, now)}</time>
                </span>
                <span className="ax-ticket-subject">{ticket.subject}</span>
                <span className="ax-ticket-meta">
                  <span className="ax-mono ax-small">{ticket.publicId}</span>
                  <span className="ax-muted">· {statusLabel(ticket.category)}</span>
                  {ticket.assignedAdminUserId ? <span className="ax-ticket-owner" title={`Owner: ${ticket.assignedAdminName || 'Admin'}`}>{ticket.assignedAdminUserId === admin?.id ? 'You' : String(ticket.assignedAdminName || 'Admin').split('@')[0]}</span> : null}
                  {ticket.awaitingReply ? <Badge tone="warning">Waiting {waitingFor(ticket.lastMessageAt, now)}</Badge> : ticket.status === 'CLOSED' ? <Badge value="CLOSED" /> : <Badge tone="neutral" dot={false}>Replied</Badge>}
                </span>
              </button>
            </li>
          )) : (
            <li><EmptyState icon={tab.value === 'waiting' ? 'check' : 'support'} title={tab.value === 'waiting' ? 'No one is waiting' : tab.value === 'mine' ? 'No open tickets are yours' : tab.value === 'unassigned' ? 'Every open ticket has an owner' : 'No tickets'}>{tab.value === 'waiting' ? 'Every open ticket has a reply from us.' : params.query ? 'Change the search to see more.' : null}</EmptyState></li>
          )}
          {items.length < total ? <li className="ax-ticket-more"><Button size="sm" onClick={() => setLimit((current) => current + LIST_PAGE)} busy={loading}>Show more ({total - items.length})</Button></li> : null}
        </ul>
        <p className="ax-inbox-keys" aria-hidden="true"><Kbd>J</Kbd><Kbd>K</Kbd> move · <Kbd>R</Kbd> reply · <Kbd>⌘</Kbd><Kbd>↵</Kbd> send · <Kbd>N</Kbd> note · <Kbd>E</Kbd> close ticket</p>
      </section>
      <section className="ax-inbox-thread" aria-label="Conversation">
        {selectedId
          ? <SupportConversation key={selectedId} ticketId={selectedId} openRecord={openRecord} onBack={() => select(null)} onChanged={() => load({ silent: true })} variant="inbox" />
          : <EmptyState icon="support" title="Select a ticket">Choose a conversation on the left. Tickets that wait for a reply are first.</EmptyState>}
      </section>
    </div>
  );
}

function fillTemplate(text, ticket) {
  const first = String(ticket?.requesterName || '').trim().split(/\s+/)[0] || 'there';
  return text.replace(/\{name\}/g, first);
}

/** One support conversation with the reply box and status actions. */
export function SupportConversation({ ticketId, openRecord, onBack, onClose, onChanged, variant = 'inbox' }) {
  const now = useNow(15_000);
  const notify = useToast();
  const { admin, admins } = useAdminSession();
  const [mode, setMode] = useState('reply');
  const [note, setNote] = useState('');
  const [ownerBusy, setOwnerBusy] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');
  const [reply, setReply] = useStoredState(`support:draft:${ticketId}`, '');
  const [sending, setSending] = useState(false);
  const [statusAction, setStatusAction] = useState(null);
  const [reason, setReason] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);
  const [templates, setTemplates] = useStoredState('support:templates', DEFAULT_TEMPLATES);
  const scrollRef = useRef(null);
  const replyRef = useRef(null);
  const lastCount = useRef(0);

  const load = useCallback(async () => {
    try {
      const result = await requestApi(`/admin/support/tickets/${encodeURIComponent(ticketId)}`);
      setTicket(result?.ticket || null);
      setError('');
    } catch (requestError) {
      if (isSessionExpired(requestError)) return;
      setError(errorText(requestError));
    }
  }, [ticketId]);

  useEffect(() => { void load(); }, [load]);
  useLiveRefresh(['support'], () => { void load(); });
  // A live conversation checks for changes every 15 s, not every 60 s.
  useFastLive(ticket?.status === 'OPEN');

  useEffect(() => {
    const count = ticket?.messages?.length || 0;
    if (count !== lastCount.current) {
      lastCount.current = count;
      window.requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; });
    }
  }, [ticket?.messages?.length]);

  const send = async () => {
    const text = reply.trim();
    if (!text || sending || ticket?.status !== 'OPEN') return;
    setSending(true);
    try {
      const result = await requestApi(`/admin/support/tickets/${encodeURIComponent(ticket.id)}/messages`, { method: 'POST', body: JSON.stringify({ text }) });
      setReply('');
      const next = result?.ticket?.ticket || result?.ticket;
      if (next?.messages) setTicket(next); else await load();
      notify('Reply sent. The member gets a notification.');
      onChanged?.();
    } catch (requestError) {
      if (!isSessionExpired(requestError)) notify(errorText(requestError), 'danger');
    } finally {
      setSending(false);
    }
  };

  const addNote = async () => {
    const text = note.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const result = await requestApi(`/admin/support/tickets/${encodeURIComponent(ticket.id)}/notes`, { method: 'POST', body: JSON.stringify({ text }) });
      setNote('');
      if (result?.ticket?.messages) setTicket(result.ticket); else await load();
      notify('Note added. Only admins see it.');
    } catch (requestError) {
      if (!isSessionExpired(requestError)) notify(errorText(requestError), 'danger');
    } finally {
      setSending(false);
    }
  };

  const setOwner = async (adminUserId) => {
    setOwnerBusy(true);
    try {
      const result = await requestApi(`/admin/support/tickets/${encodeURIComponent(ticket.id)}/assignee`, { method: 'PATCH', body: JSON.stringify({ adminUserId: adminUserId || null }) });
      if (result?.ticket?.messages) setTicket(result.ticket); else await load();
      notify(adminUserId ? (adminUserId === admin?.id ? 'You own this ticket now.' : 'Owner changed.') : 'Owner removed.');
      onChanged?.();
    } catch (requestError) {
      if (!isSessionExpired(requestError)) notify(errorText(requestError), 'danger');
    } finally {
      setOwnerBusy(false);
    }
  };

  const changeStatus = async () => {
    if (!statusAction || !ticket) return;
    setStatusBusy(true);
    try {
      await requestApi(`/admin/support/tickets/${encodeURIComponent(ticket.id)}`, { method: 'PATCH', body: JSON.stringify({ status: statusAction, reason: reason.trim() || undefined }) });
      notify(statusAction === 'CLOSED' ? 'Ticket closed.' : 'Ticket reopened.');
      setStatusAction(null);
      setReason('');
      await load();
      onChanged?.();
    } catch (requestError) {
      if (!isSessionExpired(requestError)) notify(errorText(requestError), 'danger');
    } finally {
      setStatusBusy(false);
    }
  };

  useEffect(() => {
    const onKey = (event) => {
      if (document.querySelector('.ax-overlay')) return;
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'r' && ticket?.status === 'OPEN') { event.preventDefault(); setMode('reply'); window.requestAnimationFrame(() => replyRef.current?.focus()); }
      if (event.key === 'e' && ticket?.status === 'OPEN') { event.preventDefault(); setStatusAction('CLOSED'); }
      if (event.key === 'n') { event.preventDefault(); setMode('note'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ticket?.status]);

  const grouped = useMemo(() => {
    const groups = [];
    const items = [
      ...(ticket?.messages || []).map((message) => ({ ...message, entry: 'message' })),
      ...(ticket?.notes || []).map((item) => ({ ...item, entry: 'note' })),
    ].sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)));
    items.forEach((message) => {
      const day = formatDate(message.createdAt);
      if (!groups.length || groups[groups.length - 1].day !== day) groups.push({ day, messages: [] });
      groups[groups.length - 1].messages.push(message);
    });
    return groups;
  }, [ticket?.messages, ticket?.notes]);

  if (error && !ticket) return <EmptyState icon="alert" title="We could not load this ticket" action={<Button size="sm" onClick={load}>Try again</Button>}>{error}</EmptyState>;
  if (!ticket) return <div className="ax-thread-loading" aria-busy="true"><Skeleton width="50%" height={18} /><Skeleton width="30%" /><Skeleton width="70%" height={48} /><Skeleton width="60%" height={48} /></div>;

  const isOpen = ticket.status === 'OPEN';
  const saveTemplate = () => {
    const text = reply.trim();
    if (!text) return;
    const title = text.split(/\s+/).slice(0, 4).join(' ');
    setTemplates((current) => [...current, { id: Math.random().toString(36).slice(2), title, text }]);
    notify('Reply saved as a template in this browser.');
  };

  return (
    <div className={`ax-thread is-${variant}`}>
      <header className="ax-thread-head">
        <div className="ax-thread-head-bar">
          {onBack ? <Button size="sm" variant="ghost" icon="arrowLeft" onClick={onBack} className="ax-thread-back">Back</Button> : null}
          <span className="ax-panel-kind">Support ticket · <span className="ax-mono">{ticket.publicId}</span> <CopyButton value={ticket.publicId} label="Copy reference" /></span>
          <div className="ax-panel-head-actions">
            <label className="ax-owner">
              <span className="ax-sr-only">Ticket owner</span>
              <select value={ticket.assignedAdminUserId || ''} disabled={ownerBusy} onChange={(event) => setOwner(event.target.value)}>
                <option value="">No owner</option>
                {admin ? <option value={admin.id}>Me ({adminLabel(admin)})</option> : null}
                {(admins || []).filter((item) => item.status === 'ACTIVE' && item.id !== admin?.id).map((item) => <option key={item.id} value={item.id}>{adminLabel(item)}</option>)}
              </select>
            </label>
            {!ticket.assignedAdminUserId && admin ? <Button size="sm" variant="ghost" onClick={() => setOwner(admin.id)} busy={ownerBusy}>Take it</Button> : null}
            {isOpen
              ? <Button size="sm" onClick={() => setStatusAction('CLOSED')}>Close ticket</Button>
              : <Button size="sm" onClick={() => setStatusAction('OPEN')}>Reopen</Button>}
            {onClose ? <IconButton icon="close" label="Close panel (Esc)" onClick={onClose} /> : null}
          </div>
        </div>
        <h2>{ticket.subject}</h2>
        <div className="ax-thread-requester">
          <Avatar name={ticket.requesterName} src={ticket.requesterPhotoUrl} size="sm" />
          <span><RecordLink onOpen={openRecord ? () => openRecord('member', ticket.requesterUserId) : undefined}>{display(ticket.requesterName)}</RecordLink><VerifiedMark show={ticket.requesterVerified} /></span>
          {ticket.requesterMobile ? <a className="ax-contact" href={`tel:${ticket.requesterMobile}`}><Icon name="phone" size={13} /><span className="ax-mono">{ticket.requesterMobile}</span></a> : null}
          {ticket.requesterEmail ? <a className="ax-contact" href={`mailto:${ticket.requesterEmail}`}><Icon name="mail" size={13} />{ticket.requesterEmail}</a> : null}
          <span className="ax-muted">· {statusLabel(ticket.category)}</span>
          <Badge value={ticket.status} />
          {ticket.awaitingReply ? <Badge tone="warning">Waiting {waitingFor(ticket.lastMessageAt, now)}</Badge> : null}
        </div>
      </header>
      <div className="ax-messages" ref={scrollRef} aria-live="polite">
        {grouped.length ? grouped.map((group) => (
          <div key={group.day} className="ax-message-day">
            <p className="ax-day-sep"><span>{group.day}</span></p>
            {group.messages.map((message) => {
              if (message.entry === 'note') {
                return (
                  <div key={`note-${message.id}`} className="ax-note-entry">
                    <div className="ax-note-bubble"><span className="ax-note-tag"><Icon name="eyeOff" size={12} />Internal note</span><p>{message.text}</p></div>
                    <span className="ax-message-meta">{display(message.adminName)} · <time title={formatDateTime(message.createdAt)}>{formatTime(message.createdAt)}</time> · only admins see this</span>
                  </div>
                );
              }
              const fromMember = message.senderRole === 'REQUESTER';
              const automatic = !fromMember && !message.senderAdminUserId && !message.senderUserId;
              return (
                <div key={message.id} className={`ax-message${fromMember ? ' is-member' : ' is-support'}${automatic ? ' is-auto' : ''}`}>
                  <div className="ax-message-bubble"><p>{message.text}</p></div>
                  <span className="ax-message-meta">{fromMember ? display(ticket.requesterName) : automatic ? 'Automatic message' : message.senderAdminUserId ? 'Fluxgo support (portal)' : 'Fluxgo support'} · <time title={formatDateTime(message.createdAt)}>{formatTime(message.createdAt)}</time></span>
                </div>
              );
            })}
          </div>
        )) : <p className="ax-muted ax-mini-empty">No messages yet.</p>}
      </div>
      <footer className={`ax-composer${mode === 'note' || !isOpen ? ' is-note' : ''}`}>
        <div className="ax-composer-mode">
          <Segmented size="sm" label="Composer" value={isOpen ? mode : 'note'} onChange={setMode}
            options={isOpen ? [{ value: 'reply', label: 'Reply to member' }, { value: 'note', label: 'Internal note' }] : [{ value: 'note', label: 'Internal note' }]} />
          {!isOpen ? <span className="ax-muted ax-small">This ticket is closed{ticket.closedAt ? ` (${relativeTime(ticket.closedAt, now)})` : ''}. Reopen it to reply.</span> : null}
        </div>
        {isOpen && mode === 'reply' ? (
          <form onSubmit={(event) => { event.preventDefault(); void send(); }}>
            <label className="ax-sr-only" htmlFor={`reply-${ticket.id}`}>Reply to {display(ticket.requesterName)}</label>
            <textarea id={`reply-${ticket.id}`} ref={replyRef} value={reply} onChange={(event) => setReply(event.target.value)} maxLength={REPLY_MAX} rows={3}
              placeholder={`Reply to ${display(ticket.requesterName)}…`}
              onKeyDown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void send(); } }} />
            <div className="ax-composer-bar">
              <Popover align="start" label="Reply templates" trigger={(props) => <Button size="sm" variant="ghost" iconRight="chevronDown" onClick={props.toggle} aria-expanded={props['aria-expanded']}>Templates</Button>}>
                {({ close }) => (
                  <div className="ax-menu is-wide">
                    <p className="ax-menu-label">Insert a template</p>
                    {templates.map((template) => (
                      <div key={template.id} className="ax-template-row">
                        <button type="button" className="ax-menu-item" onClick={() => { setReply(fillTemplate(template.text, ticket)); close(); window.requestAnimationFrame(() => replyRef.current?.focus()); }}>
                          <strong>{template.title}</strong><span className="ax-muted">{fillTemplate(template.text, ticket)}</span>
                        </button>
                        <IconButton icon="close" label={`Delete template ${template.title}`} size={12} onClick={() => setTemplates((current) => current.filter((item) => item.id !== template.id))} />
                      </div>
                    ))}
                    <div className="ax-menu-sep" />
                    <button type="button" className="ax-menu-item" disabled={!reply.trim()} onClick={() => { saveTemplate(); close(); }}>Save the current reply as a template</button>
                    <button type="button" className="ax-menu-item" onClick={() => { setTemplates(DEFAULT_TEMPLATES); close(); }}>Restore the default templates</button>
                    <p className="ax-menu-hint">Use {'{name}'} for the member’s first name.</p>
                  </div>
                )}
              </Popover>
              <span className="ax-composer-count">{reply.length}/{REPLY_MAX}</span>
              <Button variant="primary" icon="send" type="submit" busy={sending} disabled={!reply.trim()}>{sending ? 'Sending…' : 'Send'}</Button>
            </div>
            <p className="ax-composer-hint">Open tickets close automatically after 24 hours without activity. We check for new messages every 15 s while this ticket is open.</p>
          </form>
        ) : (
          <form onSubmit={(event) => { event.preventDefault(); void addNote(); }}>
            <label className="ax-sr-only" htmlFor={`note-${ticket.id}`}>Internal note</label>
            <textarea id={`note-${ticket.id}`} value={note} onChange={(event) => setNote(event.target.value)} maxLength={REPLY_MAX} rows={3}
              placeholder="Write a note for other admins. The member does not see it."
              onKeyDown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void addNote(); } }} />
            <div className="ax-composer-bar">
              <span className="ax-composer-count">{note.length}/{REPLY_MAX}</span>
              <Button type="submit" icon="plus" busy={sending} disabled={!note.trim()}>{sending ? 'Saving…' : 'Add note'}</Button>
            </div>
          </form>
        )}
      </footer>
      <ConfirmDialog open={Boolean(statusAction)} busy={statusBusy} tone={statusAction === 'CLOSED' ? 'danger' : 'primary'}
        title={statusAction === 'CLOSED' ? 'Close this ticket?' : 'Reopen this ticket?'}
        description={statusAction === 'CLOSED' ? <>The member cannot add messages to <strong>{ticket.publicId}</strong> after you close it.</> : <>The member and support can send messages to <strong>{ticket.publicId}</strong> again.</>}
        confirmLabel={statusAction === 'CLOSED' ? 'Close ticket' : 'Reopen ticket'}
        onCancel={() => { setStatusAction(null); setReason(''); }} onConfirm={changeStatus}>
        <Field label="Reason (optional, goes to the audit log)" htmlFor="status-reason">
          <input id="status-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="For example: answered on a call" />
        </Field>
      </ConfirmDialog>
    </div>
  );
}
