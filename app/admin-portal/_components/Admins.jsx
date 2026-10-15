'use client';

import { useCallback, useEffect, useState } from 'react';
import { errorText, isSessionExpired, requestApi } from '../_lib/api';
import { display, formatDateTime, relativeTime } from '../_lib/format';
import { useNow } from '../_lib/hooks';
import { DataTable } from './DataTable';
import { Badge, Button, ConfirmDialog, Dialog, EmptyState, Field, Icon, IconButton, useToast } from './ui';

function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%*';
  const values = new Uint32Array(18);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
}

export function AdminsView({ admin, onAdminsChanged }) {
  const now = useNow();
  const notify = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [showPassword, setShowPassword] = useState(true);
  const [busy, setBusy] = useState('');
  const [toggle, setToggle] = useState(null);

  const load = useCallback(async () => {
    try {
      const result = await requestApi('/admin/users');
      setRows(result?.users || []);
      onAdminsChanged?.(result?.users || []);
      setError('');
    } catch (requestError) {
      if (!isSessionExpired(requestError)) setError(errorText(requestError));
    } finally {
      setLoading(false);
    }
  }, [onAdminsChanged]);

  useEffect(() => { void load(); }, [load]);

  const create = async (event) => {
    event.preventDefault();
    setBusy('create');
    try {
      await requestApi('/admin/users', { method: 'POST', body: JSON.stringify({ email: form.email.trim(), username: form.username.trim() || undefined, password: form.password }) });
      notify(`Admin added. Share the temporary password with ${form.email.trim()} in a safe way.`);
      setCreating(false);
      setForm({ email: '', username: '', password: '' });
      await load();
    } catch (requestError) {
      if (!isSessionExpired(requestError)) notify(errorText(requestError), 'danger');
    } finally {
      setBusy('');
    }
  };

  const setStatus = async () => {
    if (!toggle) return;
    const status = toggle.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    setBusy(toggle.id);
    try {
      await requestApi(`/admin/users/${toggle.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      notify(status === 'ACTIVE' ? 'Admin turned on.' : 'Admin turned off. Their sessions end now.');
      setToggle(null);
      await load();
    } catch (requestError) {
      if (!isSessionExpired(requestError)) notify(errorText(requestError), 'danger');
    } finally {
      setBusy('');
    }
  };

  const noEmail = rows.filter((row) => !row.email && row.status === 'ACTIVE');
  const columns = [
    { key: 'email', label: 'Sign-in email', width: 260, locked: true, render: (row) => row.email ? <span className="ax-person"><strong>{row.email}</strong>{row.id === admin?.id ? <Badge tone="info" dot={false}>You</Badge> : null}</span> : <Badge tone="danger">No email: cannot sign in</Badge> },
    { key: 'username', label: 'Display name', width: 180, render: (row) => display(row.username) },
    { key: 'role', label: 'Role', width: 130, render: () => 'Super admin', csv: () => 'Super admin' },
    { key: 'status', label: 'Access', width: 120, render: (row) => <Badge value={row.status === 'ACTIVE' ? 'ACTIVE' : 'DISABLED'}>{row.status === 'ACTIVE' ? 'On' : 'Off'}</Badge>, csv: (row) => (row.status === 'ACTIVE' ? 'On' : 'Off') },
    { key: 'passwordChangedAt', label: 'Password changed', width: 170, render: (row) => <span title={formatDateTime(row.passwordChangedAt)}>{relativeTime(row.passwordChangedAt, now)}</span> },
    { key: 'createdAt', label: 'Added', width: 170, render: (row) => <span title={formatDateTime(row.createdAt)}>{relativeTime(row.createdAt, now)}</span> },
    { key: 'actions', label: '', width: 130, align: 'end', render: (row) => row.id === admin?.id ? <span className="ax-muted ax-small">Current session</span> : <Button size="sm" variant={row.status === 'ACTIVE' ? 'ghost' : 'secondary'} onClick={() => setToggle(row)} busy={busy === row.id}>{row.status === 'ACTIVE' ? 'Turn off' : 'Turn on'}</Button> },
  ];

  return (
    <div className="ax-view">
      {noEmail.length ? <p className="ax-note is-danger"><Icon name="alert" size={14} />{noEmail.length === 1 ? '1 active admin has' : `${noEmail.length} active admins have`} no email. Admins sign in with email only, so these accounts cannot sign in.</p> : null}
      {error ? <div className="ax-inline-error" role="alert"><span>{error}</span><Button size="sm" onClick={load}>Try again</Button></div> : null}
      <DataTable tableId="admins" label="Admin users" columns={columns} rows={rows} loading={loading}
        toolbar={<Button variant="primary" icon="plus" onClick={() => { setForm({ email: '', username: '', password: generatePassword() }); setCreating(true); }}>Add admin</Button>}
        total={rows.length} page={0} pageSize={rows.length || 1}
        exporter={{ title: 'Admin users', filename: () => `fluxgo-admins-${new Date().toISOString().slice(0, 10)}`, load: async () => rows }}
        empty={<EmptyState icon="admins" title="No admins" />} />

      <Dialog open={creating} title="Add an admin" onClose={() => setCreating(false)} busy={busy === 'create'} width={480}
        description="The new admin signs in with this email. Every admin has full access."
        footer={<><Button onClick={() => setCreating(false)} disabled={busy === 'create'}>Cancel</Button><Button variant="primary" type="submit" form="ax-create-admin" busy={busy === 'create'}>Add admin</Button></>}>
        <form id="ax-create-admin" onSubmit={create} className="ax-form-stack">
          <Field label="Email" htmlFor="new-admin-email" hint="They sign in and reset the password with this address.">
            <input id="new-admin-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required autoComplete="off" data-autofocus />
          </Field>
          <Field label="Display name (optional)" htmlFor="new-admin-name" hint="It shows in the audit log. The default is the email.">
            <input id="new-admin-name" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} maxLength={120} pattern="[a-zA-Z0-9][a-zA-Z0-9._+@\-]*" title="Use letters, numbers, dots, dashes, or underscores." />
          </Field>
          <Field label="Temporary password" htmlFor="new-admin-password" hint="At least 12 characters. Ask them to reset it after the first sign-in.">
            <div className="ax-input-group">
              <input id="new-admin-password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={12} required autoComplete="new-password" className="ax-mono" />
              <IconButton icon={showPassword ? 'eyeOff' : 'eye'} label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((current) => !current)} />
              <IconButton icon="refresh" label="Make a new password" onClick={() => setForm({ ...form, password: generatePassword() })} />
              <IconButton icon="copy" label="Copy password" onClick={() => navigator.clipboard?.writeText(form.password)} />
            </div>
          </Field>
        </form>
      </Dialog>

      <ConfirmDialog open={Boolean(toggle)} busy={Boolean(toggle && busy === toggle.id)} tone={toggle?.status === 'ACTIVE' ? 'danger' : 'primary'}
        title={toggle?.status === 'ACTIVE' ? 'Turn off this admin?' : 'Turn on this admin?'}
        description={toggle?.status === 'ACTIVE' ? <><strong>{toggle?.email || toggle?.username}</strong> loses console access now, and their sessions end.</> : <><strong>{toggle?.email || toggle?.username}</strong> can sign in again.</>}
        confirmLabel={toggle?.status === 'ACTIVE' ? 'Turn off' : 'Turn on'} onCancel={() => setToggle(null)} onConfirm={setStatus} />
    </div>
  );
}
