'use client';

import { useCallback, useEffect, useState } from 'react';
import { errorText, isSessionExpired, requestApi } from '../_lib/api';
import { currentEndpoint, disablePush, enablePush, isIos, pushState } from '../_lib/push';
import { Button, Dialog, Icon, useToast } from './ui';

const CATEGORIES = [
  { key: 'support', title: 'Support messages', text: 'A new ticket, or a member reply. Every admin gets these, also when a ticket has an owner.' },
  { key: 'safety', title: 'Safety reports', text: 'A review with a safety issue, for example rash driving.' },
  { key: 'bookings', title: 'Stuck booking requests', text: 'A request that waits more than 30 min for the driver.' },
  { key: 'adminActions', title: 'Admin actions', text: 'Another admin suspends a member or cancels a ride.' },
  { key: 'cab', title: 'Cab', text: 'New cab interests, a slot to decide, a cancelled seat, members to call, and “cab is not here”.' },
];

const DEFAULTS = { support: true, safety: true, bookings: true, adminActions: true, cab: true };

export function NotificationsDialog({ open, onClose }) {
  const notify = useToast();
  const [state, setState] = useState('loading');
  const [preferences, setPreferences] = useState(DEFAULTS);
  const [busy, setBusy] = useState('');

  const refresh = useCallback(async () => {
    const next = await pushState();
    setState(next);
    if (next === 'on') {
      const endpoint = await currentEndpoint();
      if (endpoint) {
        try {
          const status = await requestApi(`/admin/push/subscription?endpoint=${encodeURIComponent(endpoint)}`);
          if (status?.subscribed) setPreferences(status.preferences);
          else setState('off');
        } catch { /* keep the device state */ }
      }
    }
  }, []);

  useEffect(() => { if (open) void refresh(); }, [open, refresh]);

  const turnOn = async () => {
    setBusy('on');
    try {
      const result = await enablePush(preferences);
      setPreferences(result?.preferences || preferences);
      setState('on');
      notify('Notifications are on for this device.');
    } catch (error) {
      if (!isSessionExpired(error)) notify(errorText(error), 'danger');
      await refresh();
    } finally { setBusy(''); }
  };

  const turnOff = async () => {
    setBusy('off');
    try {
      await disablePush();
      setState('off');
      notify('Notifications are off for this device.');
    } catch (error) {
      if (!isSessionExpired(error)) notify(errorText(error), 'danger');
    } finally { setBusy(''); }
  };

  const toggle = async (key) => {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    if (state !== 'on') return;
    try {
      const endpoint = await currentEndpoint();
      await requestApi('/admin/push/subscription/preferences', { method: 'POST', body: JSON.stringify({ endpoint, preferences: { [key]: next[key] } }) });
    } catch (error) {
      setPreferences(preferences);
      if (!isSessionExpired(error)) notify(errorText(error), 'danger');
    }
  };

  const sendTest = async () => {
    setBusy('test');
    try {
      const endpoint = await currentEndpoint();
      await requestApi('/admin/push/test', { method: 'POST', body: JSON.stringify({ endpoint }) });
      notify('Test sent. It can take a few seconds to arrive.');
    } catch (error) {
      if (!isSessionExpired(error)) notify(errorText(error), 'danger');
    } finally { setBusy(''); }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Notifications" width={500}
      description="Get alerts on this device when something needs an admin. The settings apply to this device only."
      footer={state === 'on'
        ? <><Button onClick={turnOff} busy={busy === 'off'}>Turn off on this device</Button><Button variant="primary" icon="send" onClick={sendTest} busy={busy === 'test'}>Send a test</Button></>
        : <Button onClick={onClose}>Close</Button>}>
      <div className="ax-form-stack">
        <PushStatus state={state} busy={busy === 'on'} onTurnOn={turnOn} />
        <div className="ax-push-categories" role="group" aria-label="Notification types">
          {CATEGORIES.map((category) => (
            <label key={category.key} className="ax-push-category">
              <span className="ax-switch">
                <input type="checkbox" role="switch" checked={preferences[category.key] !== false} onChange={() => toggle(category.key)} />
                <span aria-hidden="true" />
              </span>
              <span><b>{category.title}</b><i>{category.text}</i></span>
            </label>
          ))}
        </div>
        <p className="ax-field-hint">Lock-screen text shows at most a member’s first name and the ticket subject. It never shows message text, review comments, or names in safety alerts.</p>
      </div>
    </Dialog>
  );
}

function PushStatus({ state, busy, onTurnOn }) {
  if (state === 'loading') return <p className="ax-muted">Checking this device…</p>;
  if (state === 'on') return <p className="ax-push-state is-on"><Icon name="check" size={15} />Notifications are on for this device.</p>;
  if (state === 'needs-install') {
    return (
      <div className="ax-push-state is-info">
        <strong>Add the portal to your Home Screen first</strong>
        <ol>
          <li>Open this page in Safari.</li>
          <li>Tap <b>Share</b>, then <b>Add to Home Screen</b>.</li>
          <li>Open <b>Fluxgo Admin</b> from the Home Screen, sign in, and open this screen again.</li>
        </ol>
        <span className="ax-muted">iPhone needs iOS 16.4 or later. If you added the portal before this update, delete that icon and add it again.</span>
      </div>
    );
  }
  if (state === 'unsupported') return <p className="ax-push-state is-warn">This browser does not support push notifications. {isIos() ? 'Use the Home Screen app from Safari.' : 'Use Chrome, Edge, or Firefox.'}</p>;
  if (state === 'denied') return <p className="ax-push-state is-warn">Notifications are blocked for this app. Allow them in the device or browser settings, then open this screen again.</p>;
  return (
    <div className="ax-push-state">
      <span>Notifications are off for this device.</span>
      <Button variant="primary" icon="bell" onClick={onTurnOn} busy={busy}>Turn on notifications</Button>
    </div>
  );
}
