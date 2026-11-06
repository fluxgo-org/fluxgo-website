'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cleanForm, filterSummary, toAudienceFilters } from '../_lib/audience';
import { errorText, isSessionExpired, queryString, requestApi } from '../_lib/api';
import { formatDateTime, formatNumber, plural, relativeTime } from '../_lib/format';
import { useNow } from '../_lib/hooks';
import {
  cropNote,
  FREQUENCIES,
  IMAGE_MAX_BYTES,
  IMAGE_MIN_SHARP_WIDTH,
  IMAGE_TYPES,
  IN_APP_SCREENS,
  IN_APP_STYLES,
  LABEL_MAX,
  PLATFORMS,
  PRIORITIES,
  readImageSize,
  STATUS_LABEL,
  STATUS_TONE,
  STYLE_NAME,
  SUBTITLE_MAX,
  TARGET_KINDS,
  targetSummary,
  TITLE_MAX,
} from '../_lib/inAppMessages';
import { AudienceFilters, MatchPreview, MemberPicker, useAudienceMatch } from './Notify';
import { InAppPreview } from './InAppPreview';
import { Badge, Button, ConfirmDialog, EmptyState, Field, Icon, Segmented, useToast } from './ui';

const EMPTY = {
  name: '',
  layout: 'SHEET',
  title: '',
  subtitle: '',
  imageUrl: '',
  imageWidth: null,
  imageHeight: null,
  buttons: 1,
  primaryLabel: '',
  target: { kind: 'SCREEN', screen: 'HOME' },
  secondaryLabel: 'Not now',
  secondaryAction: 'DISMISS',
  secondaryTarget: { kind: 'SCREEN', screen: 'HOME' },
  imageOpens: true,
  audienceKind: 'ALL',
  frequency: 'ONCE',
  priority: 1,
  platforms: ['ios', 'android', 'web'],
  startsAt: '',
  endsAt: '',
  pushOnPublish: false,
};

/** datetime-local value in the admin's local time. */
function localInput(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromMessage(message) {
  const buttons = message.primaryLabel ? (message.secondaryLabel ? 2 : 1) : 0;
  return {
    ...EMPTY,
    name: message.name || '',
    layout: message.layout,
    title: message.title || '',
    subtitle: message.subtitle || '',
    imageUrl: message.imageUrl || '',
    imageWidth: message.imageWidth,
    imageHeight: message.imageHeight,
    buttons,
    primaryLabel: message.primaryLabel || '',
    target: message.target || EMPTY.target,
    secondaryLabel: message.secondaryLabel || 'Not now',
    secondaryAction: message.secondaryAction || 'DISMISS',
    secondaryTarget: message.secondaryTarget || EMPTY.secondaryTarget,
    imageOpens: buttons === 0 ? Boolean(message.target) : true,
    audienceKind: message.audienceKind,
    frequency: message.frequency,
    priority: message.priority,
    platforms: message.platforms || EMPTY.platforms,
    startsAt: localInput(message.startsAt),
    endsAt: localInput(message.endsAt),
    pushOnPublish: Boolean(message.pushOnPublish),
  };
}

/** The API body for the form. */
function toPayload(draft, audienceForm, members) {
  const hasButtons = draft.buttons > 0;
  const target = hasButtons || draft.imageOpens ? draft.target : null;
  return {
    name: draft.name.trim() || draft.title.trim().slice(0, 120),
    layout: draft.layout,
    title: draft.title.trim(),
    subtitle: draft.subtitle.trim() || null,
    imageUrl: draft.imageUrl || null,
    imageWidth: draft.imageUrl ? draft.imageWidth : null,
    imageHeight: draft.imageUrl ? draft.imageHeight : null,
    target,
    primaryLabel: hasButtons ? draft.primaryLabel.trim() : null,
    secondaryLabel: draft.buttons === 2 ? draft.secondaryLabel.trim() : null,
    secondaryAction: draft.buttons === 2 ? draft.secondaryAction : null,
    secondaryTarget: draft.buttons === 2 && draft.secondaryAction === 'OPEN' ? draft.secondaryTarget : null,
    audienceKind: draft.audienceKind,
    audienceFilters: draft.audienceKind === 'FILTERS' ? toAudienceFilters(audienceForm) : null,
    memberIds: draft.audienceKind === 'MEMBERS' ? members.map((member) => member.id) : null,
    frequency: draft.frequency,
    priority: Number(draft.priority),
    platforms: draft.platforms,
    startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
    endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
    pushOnPublish: draft.pushOnPublish,
  };
}

/** What is still missing before a save. Empty means ready. */
function missing(draft, audienceForm, members) {
  if (!draft.title.trim()) return 'Add a title';
  if (draft.layout === 'POSTER' && !draft.imageUrl) return 'A poster needs an image';
  if (draft.buttons > 0 && !draft.primaryLabel.trim()) return 'Add the main button text';
  if (draft.buttons === 2 && !draft.secondaryLabel.trim()) return 'Add the second button text';
  const targets = [];
  if (draft.buttons > 0 || draft.imageOpens) targets.push(draft.target);
  if (draft.buttons === 2 && draft.secondaryAction === 'OPEN') targets.push(draft.secondaryTarget);
  for (const target of targets) {
    if (target.kind === 'SEARCH' && (!target.originCity?.trim() || !target.destinationCity?.trim())) return 'Add the from and to cities';
    if (target.kind === 'RIDE' && !/^[0-9a-f-]{36}$/i.test(target.tripId || '')) return 'Add a ride ID';
    if (target.kind === 'URL' && !/^https:\/\//i.test(target.url || '')) return 'Links must start with https://';
  }
  if (draft.audienceKind === 'FILTERS' && !Object.keys(cleanForm(audienceForm)).length) return 'Add at least one filter';
  if (draft.audienceKind === 'MEMBERS' && !members.length) return 'Add at least one member';
  if (!draft.platforms.length) return 'Choose at least one platform';
  if (draft.startsAt && draft.endsAt && new Date(draft.endsAt) <= new Date(draft.startsAt)) return 'The end must be after the start';
  return '';
}

/** Small drawing of each style for the picker. */
function StyleSketch({ value }) {
  const box = { SHEET: 'is-sheet', MODAL: 'is-modal', MODAL_EDGE: 'is-edge', POSTER: 'is-poster', FULLSCREEN: 'is-full', TOP_BANNER: 'is-top' }[value];
  return <span className={`ax-iam-sketch ${box}`} aria-hidden="true"><i /><b /></span>;
}

function TargetPicker({ id, value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="ax-iam-target">
      <label className="ax-aud-field" htmlFor={`${id}-kind`}>
        <span>Opens</span>
        <select id={`${id}-kind`} value={value.kind} onChange={(event) => onChange({ kind: event.target.value, ...(event.target.value === 'SCREEN' ? { screen: 'HOME' } : {}) })}>
          {TARGET_KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
        </select>
      </label>
      {value.kind === 'SCREEN' ? (
        <label className="ax-aud-field" htmlFor={`${id}-screen`}>
          <span>Screen</span>
          <select id={`${id}-screen`} value={value.screen || 'HOME'} onChange={(event) => set({ screen: event.target.value })}>
            {IN_APP_SCREENS.map((screen) => <option key={screen.value} value={screen.value}>{screen.label}</option>)}
          </select>
        </label>
      ) : null}
      {value.kind === 'SEARCH' ? (
        <>
          <label className="ax-aud-field" htmlFor={`${id}-from`}><span>From city</span><input id={`${id}-from`} value={value.originCity || ''} maxLength={80} placeholder="Bengaluru" onChange={(event) => set({ originCity: event.target.value })} /></label>
          <label className="ax-aud-field" htmlFor={`${id}-to`}><span>To city</span><input id={`${id}-to`} value={value.destinationCity || ''} maxLength={80} placeholder="Mysuru" onChange={(event) => set({ destinationCity: event.target.value })} /></label>
          <label className="ax-aud-field" htmlFor={`${id}-date`}><span>Date (optional)</span><input id={`${id}-date`} type="date" value={value.date || ''} onChange={(event) => set({ date: event.target.value || undefined })} /></label>
        </>
      ) : null}
      {value.kind === 'RIDE' ? <label className="ax-aud-field is-wide" htmlFor={`${id}-ride`}><span>Ride ID</span><input id={`${id}-ride`} value={value.tripId || ''} placeholder="Ride UUID from Rides" onChange={(event) => set({ tripId: event.target.value.trim() })} /></label> : null}
      {value.kind === 'URL' ? <label className="ax-aud-field is-wide" htmlFor={`${id}-url`}><span>Link</span><input id={`${id}-url`} value={value.url || ''} placeholder="https://www.fluxgo.in/…" onChange={(event) => set({ url: event.target.value.trim() })} /></label> : null}
    </div>
  );
}

function ImageUpload({ draft, setDraft }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const aspect = draft.imageWidth && draft.imageHeight ? draft.imageWidth / draft.imageHeight : null;
  const upload = async (file) => {
    setError('');
    if (!IMAGE_TYPES.includes(file.type)) { setError('Use a JPG, PNG, or WebP image.'); return; }
    if (file.size > IMAGE_MAX_BYTES) { setError('The image must be 2 MB or smaller.'); return; }
    setBusy(true);
    try {
      const size = await readImageSize(file);
      const step = await requestApi('/admin/in-app-messages/image-upload', { method: 'POST', body: JSON.stringify({ contentType: file.type, sizeBytes: file.size }) });
      // A blocked or failed S3 request must not read as an API connection error.
      const put = await fetch(step.uploadUrl, { method: 'PUT', headers: { 'content-type': file.type }, body: file }).catch(() => null);
      if (!put?.ok) throw new Error('Image storage did not accept the file. Try again. If this continues, check the S3 CORS rule.');
      setDraft((current) => ({ ...current, imageUrl: step.imageUrl, imageWidth: size.width, imageHeight: size.height }));
    } catch (uploadError) {
      if (!isSessionExpired(uploadError)) setError(errorText(uploadError, 'The image upload failed. Try again.'));
    } finally {
      setBusy(false);
    }
  };
  const soft = draft.imageWidth && draft.imageWidth < IMAGE_MIN_SHARP_WIDTH;
  const crop = cropNote(draft.layout, aspect);
  return (
    <div className="ax-iam-upload">
      {draft.imageUrl ? (
        <div className="ax-iam-upload-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={draft.imageUrl} alt="" />
          <div>
            <strong>{draft.imageWidth} × {draft.imageHeight} px</strong>
            {soft ? <p className="ax-iam-warn">Below {IMAGE_MIN_SHARP_WIDTH} px wide, the banner can look soft on phones.</p> : null}
            {crop ? <p className="ax-muted">{crop}</p> : null}
            <div className="ax-iam-upload-actions">
              <label className="ax-btn is-secondary is-sm">Replace<input type="file" accept={IMAGE_TYPES.join(',')} hidden disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ''; }} /></label>
              <Button size="sm" variant="ghost" onClick={() => setDraft((current) => ({ ...current, imageUrl: '', imageWidth: null, imageHeight: null }))}>Remove</Button>
            </div>
          </div>
        </div>
      ) : (
        <label className={`ax-iam-drop${busy ? ' is-busy' : ''}`}>
          <Icon name="upload" size={18} />
          <span><strong>{busy ? 'Uploading…' : 'Upload a banner'}</strong><small>JPG, PNG, or WebP · 2 MB or less · 1600 px wide or more looks best</small></span>
          <input type="file" accept={IMAGE_TYPES.join(',')} hidden disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ''; }} />
        </label>
      )}
      {error ? <p className="ax-iam-error" role="alert">{error}</p> : null}
    </div>
  );
}

function Editor({ seed, onClose, onSaved }) {
  const notify = useToast();
  const [draft, setDraft] = useState(() => (seed ? fromMessage(seed) : EMPTY));
  const [audienceForm, setAudienceForm] = useState(() => seed?.audienceFilters || {});
  const [members, setMembers] = useState(() => (seed?.memberIds || []).map((id) => ({ id, name: id.slice(0, 8) })));
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (value) => setDraft((current) => ({ ...current, [key]: value }));
  const filters = useMemo(() => toAudienceFilters(audienceForm), [audienceForm]);
  const match = useAudienceMatch(filters, draft.audienceKind === 'FILTERS');
  const allMatch = useAudienceMatch({}, draft.audienceKind === 'ALL');
  const live = seed?.status === 'LIVE';
  const ended = seed?.status === 'ENDED';
  const problem = missing(draft, audienceForm, members);

  const previewMessage = {
    layout: draft.layout,
    title: draft.title,
    subtitle: draft.subtitle,
    imageUrl: draft.imageUrl || null,
    primaryLabel: draft.buttons > 0 ? draft.primaryLabel || 'Button' : null,
    secondaryLabel: draft.buttons === 2 ? draft.secondaryLabel || 'Not now' : null,
  };
  const aspect = draft.imageWidth && draft.imageHeight ? draft.imageWidth / draft.imageHeight : null;

  const save = async (publish) => {
    setSaving(true);
    setError('');
    try {
      const body = toPayload(draft, audienceForm, members);
      const saved = seed
        ? await requestApi(`/admin/in-app-messages/${seed.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await requestApi('/admin/in-app-messages', { method: 'POST', body: JSON.stringify(body) });
      let result = saved;
      if (publish) result = await requestApi(`/admin/in-app-messages/${saved.message.id}/status`, { method: 'POST', body: JSON.stringify({ status: 'LIVE' }) });
      const push = result.push;
      notify(publish
        ? push?.status === 'ENQUEUED' ? `Live. Push sent to ${plural(push.count, 'member')}.` : push?.status === 'FAILED' ? 'Live. The push failed; members still see the popup.' : 'Live. Members see it at the next app open.'
        : live ? 'Saved. Members see the change within 15 s.' : 'Draft saved.');
      setConfirming(false);
      onSaved(result.message);
    } catch (saveError) {
      if (!isSessionExpired(saveError)) setError(errorText(saveError));
    } finally {
      setSaving(false);
    }
  };

  const audienceText = draft.audienceKind === 'ALL'
    ? `All members${allMatch.total !== null ? ` (${formatNumber(allMatch.total)} now)` : ''}`
    : draft.audienceKind === 'FILTERS' ? filterSummary(filters) : plural(members.length, 'picked member');

  return (
    <div className="ax-notify ax-iam">
      <form className="ax-card ax-notify-form" onSubmit={(event) => { event.preventDefault(); if (!problem) setConfirming(true); }}>
        <div className="ax-iam-head">
          <Button size="sm" variant="ghost" icon="arrowLeft" onClick={onClose}>All messages</Button>
          {seed ? <Badge tone={STATUS_TONE[seed.status]}>{STATUS_LABEL[seed.status]}</Badge> : null}
        </div>
        {ended ? <p className="ax-iam-note">This message ended. You can read it, but not change it.</p> : null}
        <fieldset disabled={ended} className="ax-iam-fields">
          <section className="ax-form-section">
            <h3>1. Style</h3>
            <div className="ax-iam-styles" role="radiogroup" aria-label="Style">
              {IN_APP_STYLES.map((style) => (
                <button key={style.value} type="button" role="radio" aria-checked={draft.layout === style.value} className={`ax-iam-style${draft.layout === style.value ? ' is-active' : ''}`} onClick={() => set('layout')(style.value)}>
                  <StyleSketch value={style.value} />
                  <strong>{style.name}</strong>
                  <small>{style.use}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="ax-form-section">
            <h3>2. Content</h3>
            <Field label="Banner image" htmlFor="iam-image" hint={draft.layout === 'POSTER' ? 'Required for a poster' : 'Optional'}>
              <ImageUpload draft={draft} setDraft={setDraft} />
            </Field>
            <Field label="Title" htmlFor="iam-title" hint={`${draft.title.length}/${TITLE_MAX}`}>
              <input id="iam-title" value={draft.title} maxLength={TITLE_MAX} onChange={(event) => set('title')(event.target.value)} placeholder="For example: Weekend rides to Tirupati are open" required />
            </Field>
            <Field label="Subtitle (optional)" htmlFor="iam-subtitle" hint={`${draft.subtitle.length}/${SUBTITLE_MAX}`}>
              <textarea id="iam-subtitle" rows={3} value={draft.subtitle} maxLength={SUBTITLE_MAX} onChange={(event) => set('subtitle')(event.target.value)} placeholder="One or two short lines." />
            </Field>
          </section>

          <section className="ax-form-section">
            <h3>3. Buttons</h3>
            <Segmented label="Buttons" value={String(draft.buttons)} onChange={(value) => set('buttons')(Number(value))} options={[{ value: '0', label: 'No buttons' }, { value: '1', label: '1 button' }, { value: '2', label: '2 buttons' }]} />
            {draft.buttons === 0 ? (
              <>
                <label className="ax-iam-check"><input type="checkbox" checked={draft.imageOpens} onChange={(event) => set('imageOpens')(event.target.checked)} /> A tap on the image opens something</label>
                {draft.imageOpens ? <TargetPicker id="iam-target" value={draft.target} onChange={set('target')} /> : <p className="ax-field-hint">Members close it with ×, a swipe, or a tap outside.</p>}
              </>
            ) : (
              <>
                <Field label="Main button" htmlFor="iam-primary" hint={`${draft.primaryLabel.length}/${LABEL_MAX}`}>
                  <input id="iam-primary" value={draft.primaryLabel} maxLength={LABEL_MAX} onChange={(event) => set('primaryLabel')(event.target.value)} placeholder="See rides" />
                </Field>
                <TargetPicker id="iam-target" value={draft.target} onChange={set('target')} />
              </>
            )}
            {draft.buttons === 2 ? (
              <>
                <Field label="Second button" htmlFor="iam-secondary" hint={`${draft.secondaryLabel.length}/${LABEL_MAX}`}>
                  <input id="iam-secondary" value={draft.secondaryLabel} maxLength={LABEL_MAX} onChange={(event) => set('secondaryLabel')(event.target.value)} placeholder="Not now" />
                </Field>
                <Segmented label="Second button does" value={draft.secondaryAction} onChange={set('secondaryAction')} options={[{ value: 'DISMISS', label: 'Closes the popup' }, { value: 'OPEN', label: 'Opens something' }]} />
                {draft.secondaryAction === 'OPEN' ? <TargetPicker id="iam-target-2" value={draft.secondaryTarget} onChange={set('secondaryTarget')} /> : null}
              </>
            ) : null}
          </section>

          <section className="ax-form-section">
            <h3>4. Who sees it</h3>
            <Segmented label="Audience" value={draft.audienceKind} onChange={set('audienceKind')} options={[{ value: 'ALL', label: 'All members' }, { value: 'FILTERS', label: 'Filtered members' }, { value: 'MEMBERS', label: 'Specific members' }]} />
            {draft.audienceKind === 'ALL' ? <p className="ax-field-hint">Every active member, also members who join after you publish.</p> : null}
            {draft.audienceKind === 'FILTERS' ? (
              <>
                <p className="ax-field-hint">The app checks the filters each time it asks, so members who match later also see it.</p>
                <AudienceFilters form={audienceForm} onChange={setAudienceForm} />
                <MatchPreview match={match} />
              </>
            ) : null}
            {draft.audienceKind === 'MEMBERS' ? (
              <MemberPicker selected={members} onAdd={(member) => setMembers((current) => (current.some((item) => item.id === member.id) ? current : [...current, member]))} onRemove={(id) => setMembers((current) => current.filter((item) => item.id !== id))} />
            ) : null}
          </section>

          <section className="ax-form-section">
            <h3>5. When and how often</h3>
            <Segmented label="How often" value={draft.frequency} onChange={set('frequency')} options={FREQUENCIES.map((item) => ({ value: item.value, label: item.label }))} />
            <p className="ax-field-hint">{FREQUENCIES.find((item) => item.value === draft.frequency)?.hint} Members see at most one popup each app open: highest priority first, then newest.</p>
            <Segmented label="Priority" value={String(draft.priority)} onChange={(value) => set('priority')(Number(value))} options={PRIORITIES.map((item) => ({ value: String(item.value), label: item.label }))} />
            <div className="ax-iam-grid">
              <Field label="Start (optional)" htmlFor="iam-start"><input id="iam-start" type="datetime-local" value={draft.startsAt} onChange={(event) => set('startsAt')(event.target.value)} /></Field>
              <Field label="End (optional)" htmlFor="iam-end"><input id="iam-end" type="datetime-local" value={draft.endsAt} onChange={(event) => set('endsAt')(event.target.value)} /></Field>
            </div>
            <div className="ax-iam-platforms" role="group" aria-label="Platforms">
              {PLATFORMS.map((platform) => (
                <label key={platform.value} className="ax-iam-check">
                  <input type="checkbox" checked={draft.platforms.includes(platform.value)} onChange={(event) => set('platforms')(event.target.checked ? [...draft.platforms, platform.value] : draft.platforms.filter((item) => item !== platform.value))} />
                  {platform.label}
                </label>
              ))}
            </div>
            {!seed?.publishedAt ? (
              <label className="ax-iam-check"><input type="checkbox" checked={draft.pushOnPublish} onChange={(event) => set('pushOnPublish')(event.target.checked)} /> Also send a push when I publish (members with the app closed hear about it)</label>
            ) : null}
            <Field label="Name in this list (optional)" htmlFor="iam-name" hint="Members never see it">
              <input id="iam-name" value={draft.name} maxLength={120} onChange={(event) => set('name')(event.target.value)} placeholder={draft.title || 'For example: Tirupati weekend, Nov'} />
            </Field>
          </section>
        </fieldset>

        {error ? <p className="ax-iam-error" role="alert">{error}</p> : null}
        {!ended ? (
          <div className="ax-form-foot">
            <span className="ax-muted">{problem || `${audienceText} · ${FREQUENCIES.find((item) => item.value === draft.frequency)?.label.toLowerCase()}`}</span>
            <div className="ax-iam-foot-actions">
              <Button type="button" disabled={Boolean(problem) || saving} busy={saving && !confirming} onClick={() => save(false)}>{live ? 'Save changes' : 'Save draft'}</Button>
              {!live ? <Button variant="primary" type="submit" icon="send" disabled={Boolean(problem) || saving}>Review and publish</Button> : null}
            </div>
          </div>
        ) : null}
      </form>

      <aside className="ax-notify-side ax-iam-side">
        <div className="ax-card ax-preview">
          <div className="ax-card-title-row"><h3 className="ax-card-title">{STYLE_NAME[draft.layout]}</h3><span className="ax-muted ax-small">As on an iPhone 14</span></div>
          <InAppPreview message={previewMessage} aspect={aspect} scale={0.78} />
        </div>
      </aside>

      <ConfirmDialog open={confirming} busy={saving} tone="primary" title="Publish this message?" confirmLabel={saving ? 'Publishing…' : 'Publish now'}
        onCancel={() => setConfirming(false)} onConfirm={() => save(true)}
        description={<>Members see it at their next app open. Open apps show it within 15 s.{draft.pushOnPublish ? ' Members also get a push now.' : ''} You can pause or end it later.</>}>
        <div className="ax-confirm-summary">
          <span className="ax-confirm-audience"><Icon name={draft.audienceKind === 'MEMBERS' ? 'members' : 'filter'} size={13} />{audienceText}</span>
          <Badge tone="neutral" dot={false}>{STYLE_NAME[draft.layout]}</Badge>
          <strong>{draft.title}</strong>
          {draft.buttons > 0 || draft.imageOpens ? <p>Opens: {targetSummary(draft.target)}</p> : <p>No action. Members can only close it.</p>}
        </div>
      </ConfirmDialog>
    </div>
  );
}

function rate(part, whole) {
  return whole ? `${Math.round((part / whole) * 100)}%` : '—';
}

export function InAppMessagesView({ params, setParams }) {
  const now = useNow();
  const notify = useToast();
  const [page, setPage] = useState({ items: [], total: 0, loading: true, error: '' });
  const [busyId, setBusyId] = useState('');
  const [ending, setEnding] = useState(null);
  const [seed, setSeed] = useState(null);
  const editing = params.edit;

  const load = useCallback(async () => {
    setPage((current) => ({ ...current, loading: true, error: '' }));
    try {
      const result = await requestApi(`/admin/in-app-messages${queryString({ limit: 50, offset: 0 })}`);
      setPage({ items: result.items || [], total: result.total || 0, loading: false, error: '' });
    } catch (loadError) {
      if (!isSessionExpired(loadError)) setPage((current) => ({ ...current, loading: false, error: errorText(loadError) }));
    }
  }, []);

  useEffect(() => { if (!editing) void load(); }, [editing, load]);

  useEffect(() => {
    if (!editing || editing === 'new') { setSeed(null); return undefined; }
    let cancelled = false;
    requestApi(`/admin/in-app-messages/${editing}`).then((result) => { if (!cancelled) setSeed(result.message); }).catch((loadError) => { if (!cancelled && !isSessionExpired(loadError)) notify(errorText(loadError)); });
    return () => { cancelled = true; };
  }, [editing, notify]);

  const setStatus = async (row, status) => {
    setBusyId(row.id);
    try {
      await requestApi(`/admin/in-app-messages/${row.id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
      notify(status === 'PAUSED' ? 'Paused. Members stop seeing it.' : status === 'ENDED' ? 'Ended.' : 'Live again.');
      setEnding(null);
      await load();
    } catch (statusError) {
      if (!isSessionExpired(statusError)) notify(errorText(statusError));
    } finally {
      setBusyId('');
    }
  };

  if (editing) {
    if (editing !== 'new' && !seed) return <div className="ax-card"><p className="ax-muted">Loading…</p></div>;
    return <Editor key={editing} seed={editing === 'new' ? null : seed} onClose={() => setParams({ edit: undefined })} onSaved={(message) => { setSeed(message); setParams({ edit: message.id }); }} />;
  }

  return (
    <div className="ax-iam-list">
      <div className="ax-iam-list-head">
        <p className="ax-muted">Members see at most one popup each app open: highest priority first, then newest.</p>
        <Button variant="primary" icon="plus" onClick={() => setParams({ edit: 'new' })}>New message</Button>
      </div>
      {page.error ? <div className="ax-card"><p className="ax-iam-error" role="alert">{page.error}</p><Button size="sm" onClick={load}>Try again</Button></div> : null}
      {!page.loading && !page.error && !page.items.length ? (
        <div className="ax-card"><EmptyState icon="bell" title="No in-app messages yet" action={<Button variant="primary" icon="plus" onClick={() => setParams({ edit: 'new' })}>New message</Button>}>Make a popup with a banner, text, and buttons.</EmptyState></div>
      ) : null}
      {page.items.length ? (
        <div className="ax-card ax-iam-table">
          {page.items.map((row) => (
            <div key={row.id} className="ax-iam-row">
              <button type="button" className="ax-iam-row-main" onClick={() => setParams({ edit: row.id })}>
                {row.imageUrl ? <img src={row.imageUrl} alt="" /> /* eslint-disable-line @next/next/no-img-element */ : <span className="ax-iam-noimg"><StyleSketch value={row.layout} /></span>}
                <span className="ax-iam-row-text">
                  <strong className="ax-truncate">{row.name || row.title}</strong>
                  <span className="ax-muted ax-small">{STYLE_NAME[row.layout]} · {row.audienceKind === 'ALL' ? 'All members' : row.audienceKind === 'FILTERS' ? filterSummary(row.audienceFilters || {}) : 'Picked members'} · {FREQUENCIES.find((item) => item.value === row.frequency)?.label}</span>
                  <span className="ax-muted ax-small">{row.publishedAt ? `Published ${relativeTime(row.publishedAt, now)}` : `Created ${relativeTime(row.createdAt, now)}`}{row.endsAt ? ` · ends ${formatDateTime(row.endsAt)}` : ''}</span>
                </span>
              </button>
              <span className="ax-iam-stats" title="Members who saw it, tapped it, and closed it">
                <span><strong>{formatNumber(row.stats.shown)}</strong><small>saw</small></span>
                <span><strong>{rate(row.stats.opened, row.stats.shown)}</strong><small>tapped</small></span>
                <span><strong>{formatNumber(row.stats.dismissed)}</strong><small>closed</small></span>
              </span>
              <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
              <span className="ax-iam-row-actions">
                {row.status === 'DRAFT' ? <Button size="sm" variant="primary" busy={busyId === row.id} onClick={() => setParams({ edit: row.id })}>Review</Button> : null}
                {row.status === 'LIVE' ? <Button size="sm" busy={busyId === row.id} onClick={() => setStatus(row, 'PAUSED')}>Pause</Button> : null}
                {row.status === 'PAUSED' ? <Button size="sm" busy={busyId === row.id} onClick={() => setStatus(row, 'LIVE')}>Resume</Button> : null}
                {row.status !== 'ENDED' ? <Button size="sm" variant="ghost" onClick={() => setEnding(row)}>End</Button> : null}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <ConfirmDialog open={Boolean(ending)} busy={Boolean(busyId)} title="End this message?" confirmLabel="End message" onCancel={() => setEnding(null)} onConfirm={() => ending && setStatus(ending, 'ENDED')}
        description="Members stop seeing it. An ended message cannot go live again." />
    </div>
  );
}
