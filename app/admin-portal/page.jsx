'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminsView } from './_components/Admins';
import { CommandPalette } from './_components/CommandPalette';
import { RecordPanel } from './_components/Details';
import { LoginScreen } from './_components/Login';
import { NotificationsDialog } from './_components/NotificationsDialog';
import { NotifyView } from './_components/Notify';
import { RecordsView } from './_components/RecordsView';
import { SupportInbox } from './_components/Support';
import { TodayView } from './_components/Today';
import { Button, Dialog, Drawer, Icon, IconButton, Kbd, ToastProvider, useToast } from './_components/ui';
import { NAV_GROUPS, RECORD_SECTIONS, SECTION_IDS, SECTION_META } from './_config/sections';
import { requestApi, SESSION_EXPIRED_EVENT } from './_lib/api';
import { relativeTime } from './_lib/format';
import { isTypingTarget, useNow, useStoredState } from './_lib/hooks';
import { LiveProvider, useLive, useLiveRefresh } from './_lib/live';
import { AdminSessionContext } from './_lib/session';
import { registerServiceWorker, setAppBadge } from './_lib/push';

const RECORD_KINDS = ['member', 'trip', 'booking', 'support', 'review', 'audit', 'send'];
const GO_KEYS = { t: 'today', s: 'support', f: 'safety', m: 'members', r: 'trips', b: 'bookings', v: 'vehicles', n: 'notify', a: 'audit' };

function readParams() {
  if (typeof window === 'undefined') return {};
  return Object.fromEntries(new URLSearchParams(window.location.search).entries());
}

function writeParams(next, push) {
  const search = new URLSearchParams();
  Object.entries(next).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') search.set(key, value); });
  const text = search.toString();
  const url = `${window.location.pathname}${text ? `?${text}` : ''}${window.location.hash}`;
  if (push) window.history.pushState(null, '', url);
  else window.history.replaceState(window.history.state, '', url);
}

function parseOpen(value) {
  if (!value) return null;
  const index = value.indexOf(':');
  const kind = value.slice(0, index);
  const id = value.slice(index + 1);
  return RECORD_KINDS.includes(kind) && id ? { kind, id } : null;
}

function Console({ admin, onLogout, onSessionExpired }) {
  const notify = useToast();
  const now = useNow(10_000);
  const [params, setParamsState] = useState(() => ({}));
  const [ready, setReady] = useState(false);
  const [stack, setStack] = useState([]);
  const [attention, setAttention] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [storedTheme, setTheme] = useStoredState('theme', 'light');
  const [collapsed, setCollapsed] = useStoredState('sidebar:collapsed', false);
  const [tip, setTip] = useState(null);
  const theme = storedTheme === 'dark' ? 'dark' : 'light';
  const seeds = useRef(new Map());
  const goPending = useRef(false);

  const section = SECTION_IDS.includes(params.section) ? params.section : 'today';

  useEffect(() => {
    const sync = () => {
      const next = readParams();
      setParamsState(next);
      const opened = parseOpen(next.open);
      setStack(opened ? [{ ...opened, seed: seeds.current.get(`${opened.kind}:${opened.id}`) }] : []);
    };
    sync();
    setReady(true);
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  useEffect(() => {
    const root = document.querySelector('.admin-root');
    if (!root) return;
    if (theme === 'dark') root.dataset.theme = 'dark';
    else delete root.dataset.theme;
  }, [theme]);

  // The service worker shows push notifications. It does not cache pages or data.
  useEffect(() => { void registerServiceWorker(); }, []);
  // The Home Screen icon shows how many tickets wait for a reply.
  useEffect(() => { if (attention) setAppBadge(attention.support.awaitingReply); }, [attention]);

  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [onSessionExpired]);

  const setParams = useCallback((patch, options = {}) => {
    setParamsState((current) => {
      const next = { ...current, ...patch };
      Object.keys(next).forEach((key) => { if (next[key] === undefined) delete next[key]; });
      writeParams(next, options.push);
      return next;
    });
  }, []);

  const navigate = useCallback((target, extra = {}) => {
    const defaults = RECORD_SECTIONS[target]?.defaultFilters || {};
    const next = { section: target === 'today' ? undefined : target, ...(Object.keys(extra).length ? extra : defaults) };
    Object.keys(next).forEach((key) => { if (next[key] === undefined) delete next[key]; });
    writeParams(next, true);
    setParamsState(next);
    setStack([]);
    setNavOpen(false);
    window.scrollTo({ top: 0 });
  }, []);

  const openRecord = useCallback((kind, id, seed) => {
    if (!kind || !id) return;
    if (seed) seeds.current.set(`${kind}:${id}`, seed);
    setStack((current) => {
      const top = current[current.length - 1];
      if (top && top.kind === kind && String(top.id) === String(id)) return current;
      return [...current.slice(-6), { kind, id, seed: seed || seeds.current.get(`${kind}:${id}`) }];
    });
    setParams({ open: `${kind}:${id}` });
  }, [setParams]);

  const closeRecord = useCallback(() => { setStack([]); setParams({ open: undefined }); }, [setParams]);
  const backRecord = useCallback(() => {
    setStack((current) => {
      const next = current.slice(0, -1);
      const top = next[next.length - 1];
      setParams({ open: top ? `${top.kind}:${top.id}` : undefined });
      return next;
    });
  }, [setParams]);

  const live = useLive();
  const loadBadges = useCallback(async () => {
    try {
      setAttention(await requestApi('/admin/dashboard/attention'));
    } catch { /* badges are optional */ }
  }, []);
  // The Today view loads the same data, so the sidebar does not load it again there.
  const onToday = section === 'today';
  useEffect(() => { if (!onToday) void loadBadges(); }, [loadBadges, onToday]);
  useLiveRefresh(['support', 'bookings', 'reviews', 'vehicles', 'trips'], () => { void loadBadges(); }, !onToday);
  useEffect(() => { requestApi('/admin/users').then((result) => setAdmins(result?.users || [])).catch(() => {}); }, []);
  const onAttention = useCallback((next) => { setAttention(next); }, []);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPaletteOpen((current) => !current); return; }
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (document.querySelector('.ax-overlay')) return;
      if (event.key === '?') { event.preventDefault(); setHelpOpen(true); return; }
      if (event.key === '[') { event.preventDefault(); setCollapsed((current) => !current); setTip(null); return; }
      if (goPending.current) {
        goPending.current = false;
        const target = GO_KEYS[event.key.toLowerCase()];
        if (target) { event.preventDefault(); navigate(target); }
        return;
      }
      if (event.key === 'g') { goPending.current = true; setTimeout(() => { goPending.current = false; }, 1200); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, setCollapsed]);

  const logout = async () => {
    try { await requestApi('/admin/auth/logout', { method: 'POST' }); } catch { /* sign out locally */ }
    onLogout();
  };

  const badges = {
    support: attention?.support.awaitingReply,
    safety: attention?.reviews.safetyReportsLast7Days,
    vehicles: attention?.vehicles.awaitingRecheck,
    bookings: attention?.bookings.awaitingDriver,
  };
  /** Hover and focus handlers that show a name next to an icon in the collapsed rail. */
  function railTip(label, extra = null) {
    if (!label) return {};
    const show = (event) => {
      if (!collapsed || window.matchMedia('(max-width: 960px)').matches) return;
      const rect = event.currentTarget.getBoundingClientRect();
      setTip({ label, extra, top: Math.round(rect.top + rect.height / 2) });
    };
    const hide = () => setTip(null);
    return { onMouseEnter: show, onFocus: show, onMouseLeave: hide, onBlur: hide };
  }

  const meta = SECTION_META[section];
  const top = stack[stack.length - 1];
  const selected = top ? { kind: top.kind, id: top.id } : null;

  if (!ready) return null;

  return (
    <AdminSessionContext.Provider value={{ admin, admins }}>
    <div className={`ax-app${navOpen ? ' is-nav-open' : ''}${collapsed ? ' is-collapsed' : ''}`}>
      <a className="ax-skip" href="#ax-main">Skip to content</a>
      <aside className="ax-sidebar" aria-label="Admin navigation">
        <div className="ax-sidebar-brand">
          <span className="ax-wordmark ax-wordmark-full" role="img" aria-label="Fluxgo">fluxgo<span>.</span></span>
          <span className="ax-wordmark ax-wordmark-mark" aria-hidden="true">f<span>.</span></span>
          <span className="ax-sidebar-tag">Admin</span>
          <IconButton icon="close" label="Close menu" className="ax-nav-close" onClick={() => setNavOpen(false)} />
          <IconButton icon={collapsed ? 'sidebarExpand' : 'sidebarCollapse'} label={collapsed ? 'Expand the sidebar ([)' : 'Collapse the sidebar ([)'} className="ax-sidebar-toggle"
            onClick={() => { setCollapsed(!collapsed); setTip(null); }} {...railTip(collapsed ? 'Expand sidebar' : null)} />
        </div>
        <button type="button" className="ax-sidebar-search" onClick={() => setPaletteOpen(true)} aria-label="Search (⌘K)" {...railTip('Search', '⌘K')}>
          <Icon name="search" size={15} /><span>Search</span><span className="ax-sidebar-kbd"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
        </button>
        <nav className="ax-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="ax-nav-group">
              <p className="ax-nav-label">{group.label}</p>
              {group.items.map((id) => {
                const item = SECTION_META[id];
                const badge = badges[id];
                return (
                  <a key={id} href={`?section=${id}`} className={`ax-nav-item${section === id ? ' is-active' : ''}`} aria-current={section === id ? 'page' : undefined}
                    onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey) return; event.preventDefault(); setTip(null); navigate(id); }}
                    {...railTip(item.label, badge ? (badge > 99 ? '99+' : String(badge)) : null)}>
                    <Icon name={item.icon} size={17} />
                    <span>{item.label}</span>
                    {badge ? <span className={`ax-nav-badge${id === 'safety' ? ' is-danger' : id === 'support' ? ' is-warning' : ''}`} aria-label={`${badge} need attention`}>{badge > 99 ? '99+' : badge}</span> : null}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="ax-sidebar-foot">
          <div className="ax-me">
            <span className="ax-me-dot" aria-hidden="true" />
            <span className="ax-me-text"><strong>{admin?.email || admin?.username}</strong><span>Super admin</span></span>
          </div>
          <div className="ax-sidebar-actions">
            <IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label={theme === 'dark' ? 'Use the light theme' : 'Use the dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} {...railTip(theme === 'dark' ? 'Light theme' : 'Dark theme')} />
            <IconButton icon="bell" label="Notifications on this device" onClick={() => setNotificationsOpen(true)} {...railTip('Notifications')} />
            <IconButton icon="keyboard" label="Keyboard shortcuts (?)" onClick={() => setHelpOpen(true)} {...railTip('Keyboard shortcuts', '?')} />
            <IconButton icon="logout" label="Sign out" onClick={logout} {...railTip('Sign out')} />
          </div>
        </div>
      </aside>
      <div className="ax-nav-scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />
      {collapsed && tip ? <div className="ax-nav-tip" style={{ top: tip.top }} role="tooltip">{tip.label}{tip.extra ? <span>{tip.extra}</span> : null}</div> : null}

      <div className="ax-main" id="ax-main">
        <header className="ax-topbar">
          <IconButton icon="menu" label="Open menu" className="ax-nav-open" onClick={() => setNavOpen(true)} />
          <div className="ax-topbar-title">
            <h1>{meta.label}</h1>
            <p>{meta.description}</p>
          </div>
          <div className="ax-topbar-actions">
            <span className={`ax-sync${live?.paused ? ' is-paused' : ''}`} role="status" title="We check for changes every 60 s (15 s in an open support chat) and reload only what changed. Checks stop while the tab is hidden or after 10 min without input.">
              <span className="ax-sync-dot" aria-hidden="true" />{live?.paused ? 'Paused · move the mouse to resume' : live?.lastSync ? `Checked ${relativeTime(live.lastSync, now)}` : 'Connecting…'}
            </span>
            <IconButton icon="refresh" label="Refresh now" onClick={() => live?.refreshAll()} className={live?.checking ? 'is-spinning' : ''} />
            <Button size="sm" icon="search" className="ax-topbar-search" onClick={() => setPaletteOpen(true)}>Search <Kbd>⌘K</Kbd></Button>
          </div>
        </header>

        <main className={`ax-content is-${section}`}>
          {section === 'today' ? <TodayView admin={admin} openRecord={openRecord} navigate={navigate} onAttention={onAttention} /> : null}
          {section === 'support' ? <SupportInbox params={params} setParams={setParams} openRecord={openRecord} waitingCount={attention?.support.awaitingReply} /> : null}
          {RECORD_SECTIONS[section] ? <RecordsView key={section} section={section} params={params} setParams={setParams} openRecord={openRecord} selected={selected} admins={admins} /> : null}
          {section === 'notify' ? <NotifyView params={params} setParams={setParams} navigate={navigate} openRecord={openRecord} /> : null}
          {section === 'admins' ? <AdminsView admin={admin} onAdminsChanged={setAdmins} /> : null}
        </main>
      </div>

      <Drawer open={Boolean(top)} onClose={closeRecord} label="Record details" wide={top?.kind === 'support' || top?.kind === 'send'}>
        {top ? <RecordPanel key={`${top.kind}:${top.id}`} kind={top.kind} id={top.id} seed={top.seed} onClose={closeRecord} onBack={stack.length > 1 ? backRecord : undefined} open={openRecord} navigate={navigate} notify={notify} /> : null}
      </Drawer>

      <NotificationsDialog open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onOpenRecord={openRecord} onNavigate={navigate} />

      <Dialog open={helpOpen} title="Keyboard shortcuts" onClose={() => setHelpOpen(false)} width={460}>
        <dl className="ax-shortcuts">
          <div><dt><Kbd>⌘</Kbd><Kbd>K</Kbd></dt><dd>Search everything</dd></div>
          <div><dt><Kbd>/</Kbd></dt><dd>Search this list</dd></div>
          <div><dt><Kbd>[</Kbd></dt><dd>Collapse or expand the sidebar</dd></div>
          <div><dt><Kbd>G</Kbd> then <Kbd>T</Kbd> <Kbd>S</Kbd> <Kbd>F</Kbd> <Kbd>M</Kbd> <Kbd>R</Kbd> <Kbd>B</Kbd> <Kbd>V</Kbd> <Kbd>N</Kbd> <Kbd>A</Kbd></dt><dd>Go to Today, Support, Safety, Members, Rides, Bookings, Vehicles, Notify, Audit</dd></div>
          <div><dt><Kbd>↑</Kbd><Kbd>↓</Kbd> <Kbd>↵</Kbd></dt><dd>Move in a table and open a row</dd></div>
          <div><dt><Kbd>J</Kbd><Kbd>K</Kbd></dt><dd>Next or previous ticket</dd></div>
          <div><dt><Kbd>R</Kbd></dt><dd>Write a reply</dd></div>
          <div><dt><Kbd>⌘</Kbd><Kbd>↵</Kbd></dt><dd>Send the reply</dd></div>
          <div><dt><Kbd>N</Kbd></dt><dd>Write an internal note</dd></div>
          <div><dt><Kbd>E</Kbd></dt><dd>Close the ticket</dd></div>
          <div><dt><Kbd>Esc</Kbd></dt><dd>Close a panel or dialog</dd></div>
        </dl>
      </Dialog>
    </div>
    </AdminSessionContext.Provider>
  );
}

function Portal() {
  const [sessionState, setSessionState] = useState('checking');
  const [admin, setAdmin] = useState(null);
  const [resetToken, setResetToken] = useState('');
  const [sessionNotice, setSessionNotice] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('resetToken') || '';
    if (token) {
      setResetToken(token);
      params.delete('resetToken');
      const text = params.toString();
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${text ? `?${text}` : ''}${window.location.hash}`);
    }
    requestApi('/admin/me')
      .then((result) => { setAdmin(result?.admin || null); setSessionState('authenticated'); })
      .catch(() => setSessionState('signed-out'));
  }, []);

  const onSessionExpired = useCallback(() => {
    setSessionNotice('Your session expired. Sign in again.');
    setAdmin(null);
    setSessionState('signed-out');
  }, []);

  if (sessionState === 'checking') return <main className="ax-boot" aria-busy="true"><span className="ax-wordmark">fluxgo<span>.</span></span><span className="ax-spinner" aria-label="Checking your session" /></main>;
  if (sessionState === 'signed-out') {
    return <LoginScreen initialResetToken={resetToken} initialNotice={sessionNotice} onLogin={(next) => { setResetToken(''); setSessionNotice(''); setAdmin(next); setSessionState('authenticated'); }} />;
  }
  return <LiveProvider><Console admin={admin} onSessionExpired={onSessionExpired} onLogout={() => { setSessionNotice(''); setAdmin(null); setSessionState('signed-out'); }} /></LiveProvider>;
}

export default function AdminPortal() {
  return <ToastProvider><Portal /></ToastProvider>;
}
