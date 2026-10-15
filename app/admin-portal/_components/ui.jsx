'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { initials, statusLabel, statusTone } from '../_lib/format';
import { useFocusTrap } from '../_lib/hooks';

const ICON_PATHS = {
  today: 'M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  analytics: 'M4 20V11M10 20V5M16 20v-6M21 20H3',
  support: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z',
  members: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM22 19v-1a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8',
  rides: 'M5 17h14M6 17l1.5-5.5A2 2 0 0 1 9.4 10h5.2a2 2 0 0 1 1.9 1.5L18 17M7 17v2M17 17v2M8 14h.01M16 14h.01',
  bookings: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V7zM14 5v12',
  vehicles: 'M3 13l2-6h14l2 6M3 13v5h2M21 13v5h-2M3 13h18M7 18h10M7 16h.01M17 16h.01',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 20a2 2 0 0 1-3.4 0',
  admins: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a6 6 0 0 1 9-5.2M17 15l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z',
  audit: 'M9 4h6l1 2h3v15H5V6h3l1-2zM9 12h6M9 16h4',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5',
  close: 'M6 6l12 12M18 6L6 18',
  refresh: 'M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  check: 'M5 12l5 5 9-10',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  arrowLeft: 'M19 12H5M11 18l-6-6 6-6',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5H5V6h5',
  filter: 'M4 5h16l-6 7v6l-4 2v-8L4 5z',
  columns: 'M4 5h16v14H4zM10 5v14M15 5v14',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  sortUp: 'M12 5l5 6H7z',
  sortDown: 'M12 19l-5-6h10z',
  sortNone: 'M12 4l4 5H8zM12 20l-4-5h8z',
  chevronDown: 'M6 9l6 6 6-6',
  chevronUp: 'M6 15l6-6 6 6',
  sidebarCollapse: 'M4 5h16v14H4zM9 5v14M16 10l-2 2 2 2',
  sidebarExpand: 'M4 5h16v14H4zM9 5v14M13 10l2 2-2 2',
  chevronRight: 'M9 6l6 6-6 6',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  menu: 'M4 7h16M4 12h16M4 17h16',
  send: 'M4 12l16-8-6 16-2-6-8-2z',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  alert: 'M12 3l10 18H2L12 3zM12 10v4M12 17h.01',
  plus: 'M12 5v14M5 12h14',
  density: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
  keyboard: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 17h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7',
};

export function Icon({ name, size = 16, className = '', strokeWidth = 1.8 }) {
  const path = ICON_PATHS[name];
  if (!path) return null;
  const filled = name === 'sortUp' || name === 'sortDown' || name === 'sortNone';
  return (
    <svg className={`ax-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

export function Badge({ value, tone, children, dot = true, title }) {
  const resolvedTone = tone || statusTone(value);
  return <span className={`ax-badge is-${resolvedTone}`} title={title}>{dot ? <span className="ax-badge-dot" aria-hidden="true" /> : null}{children ?? statusLabel(value)}</span>;
}

export function Button({ variant = 'secondary', size = 'md', icon, iconRight, children, className = '', busy = false, ...props }) {
  return (
    <button type="button" className={`ax-btn is-${variant} is-${size}${busy ? ' is-busy' : ''} ${className}`} {...props} disabled={props.disabled || busy}>
      {icon ? <Icon name={icon} size={size === 'sm' ? 14 : 16} /> : null}
      {children ? <span>{children}</span> : null}
      {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 14 : 16} /> : null}
    </button>
  );
}

export function IconButton({ icon, label, className = '', size = 16, ...props }) {
  return <button type="button" className={`ax-icon-btn ${className}`} aria-label={label} title={label} {...props}><Icon name={icon} size={size} /></button>;
}

export function Kbd({ children }) {
  return <kbd className="ax-kbd">{children}</kbd>;
}

/** Accept only HTTPS photo URLs. The local mock API uses http://localhost. */
function safePhotoUrl(src) {
  if (typeof src !== 'string') return null;
  return src.startsWith('https://') || /^http:\/\/localhost(:\d+)?\//.test(src) ? src : null;
}

/** Member photo in a circle. Shows initials when there is no photo or the photo fails to load. */
export function Avatar({ name, size = 'md', src }) {
  const photo = safePhotoUrl(src);
  const [failedSrc, setFailedSrc] = useState(null);
  const showPhoto = photo && failedSrc !== photo;
  return (
    <span className={`ax-avatar is-${size}${showPhoto ? ' has-photo' : ''}`} aria-hidden="true">
      {showPhoto
        ? <img key={photo} src={photo} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedSrc(photo)} />
        : initials(name)}
    </span>
  );
}

/** Copy one value to the clipboard and confirm with a short check mark. */
export function CopyButton({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const copy = async (event) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* clipboard blocked */ }
  };
  return <button type="button" className={`ax-copy${copied ? ' is-copied' : ''}`} onClick={copy} aria-label={`${label}: ${value}`} title={copied ? 'Copied' : label}><Icon name={copied ? 'check' : 'copy'} size={13} /></button>;
}

/** An ID or reference in mono type with a copy control. */
export function Mono({ value, copy = true }) {
  if (!value) return <span className="ax-muted">—</span>;
  return <span className="ax-mono-value"><span className="ax-mono">{value}</span>{copy ? <CopyButton value={value} label="Copy reference" /> : null}</span>;
}

export function Skeleton({ width = '100%', height = 12 }) {
  return <span className="ax-skeleton" style={{ width, height }} aria-hidden="true" />;
}

export function EmptyState({ icon = 'search', title, children, action }) {
  return (
    <div className="ax-empty" role="status">
      <span className="ax-empty-icon"><Icon name={icon} size={20} /></span>
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
      {action || null}
    </div>
  );
}

export function Field({ label, htmlFor, hint, error, children, className = '' }) {
  return (
    <div className={`ax-field ${className}`}>
      {label ? <label htmlFor={htmlFor}>{label}</label> : null}
      {children}
      {error ? <p className="ax-field-error" role="alert">{error}</p> : hint ? <p className="ax-field-hint">{hint}</p> : null}
    </div>
  );
}

export function Segmented({ options, value, onChange, label, size = 'md' }) {
  return (
    <div className={`ax-segmented is-${size}`} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" role="radio" aria-checked={value === option.value} className={value === option.value ? 'is-active' : ''} onClick={() => onChange(option.value)}>
          {option.label}{option.count !== undefined && option.count !== null ? <span className="ax-segmented-count">{option.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** A centered modal dialog with a focus trap. */
export function Dialog({ open, title, description, onClose, children, footer, width = 440, tone, busy = false }) {
  const ref = useRef(null);
  useFocusTrap(ref, open, () => { if (!busy) onClose(); });
  useEffect(() => {
    if (!open) return undefined;
    document.body.classList.add('ax-modal-open');
    return () => document.body.classList.remove('ax-modal-open');
  }, [open]);
  if (!open) return null;
  return (
    <div className="ax-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div ref={ref} className={`ax-dialog${tone ? ` is-${tone}` : ''}`} role={tone === 'danger' ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby="ax-dialog-title" aria-describedby={description ? 'ax-dialog-copy' : undefined} tabIndex={-1} style={{ maxWidth: width }}>
        <div className="ax-dialog-head">
          <h2 id="ax-dialog-title">{title}</h2>
          <IconButton icon="close" label="Close" onClick={onClose} disabled={busy} />
        </div>
        {description ? <div id="ax-dialog-copy" className="ax-dialog-copy">{description}</div> : null}
        {children ? <div className="ax-dialog-body">{children}</div> : null}
        {footer ? <div className="ax-dialog-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

/** Ask for confirmation before an action that changes data. */
export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', tone = 'danger', busy, onCancel, onConfirm, children }) {
  return (
    <Dialog open={open} title={title} description={description} onClose={onCancel} tone={tone} busy={busy}
      footer={<><Button onClick={onCancel} disabled={busy}>Cancel</Button><Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} busy={busy} data-autofocus>{busy ? 'Saving…' : confirmLabel}</Button></>}>
      {children}
    </Dialog>
  );
}

/** A side panel for one record. It keeps the list visible behind it. */
export function Drawer({ open, onClose, children, label, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (document.querySelector('.ax-overlay')) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  useEffect(() => {
    if (open) window.requestAnimationFrame(() => ref.current?.focus({ preventScroll: true }));
  }, [open]);
  return (
    <>
      <div className={`ax-drawer-scrim${open ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside ref={ref} className={`ax-drawer${open ? ' is-open' : ''}${wide ? ' is-wide' : ''}`} aria-label={label} aria-hidden={!open} tabIndex={-1} inert={!open}>
        {open ? children : null}
      </aside>
    </>
  );
}

const ToastContext = createContext({ push: () => {} });

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((current) => [...current.slice(-3), { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), tone === 'danger' ? 7000 : 4000);
  }, []);
  const dismiss = (id) => setToasts((current) => current.filter((toast) => toast.id !== id));
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="ax-toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`ax-toast is-${toast.tone}`} role={toast.tone === 'danger' ? 'alert' : 'status'}>
            <Icon name={toast.tone === 'danger' ? 'alert' : 'check'} size={16} />
            <span>{toast.message}</span>
            <IconButton icon="close" label="Dismiss" size={14} onClick={() => dismiss(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext).push;
}

/** A small popover menu that closes on outside click and Escape. */
export function Popover({ trigger, children, align = 'end', label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div className="ax-popover-anchor" ref={ref}>
      {trigger({ open, toggle: () => setOpen((current) => !current), 'aria-expanded': open, 'aria-haspopup': 'true' })}
      {open ? <div className={`ax-popover is-${align}`} role="dialog" aria-label={label}>{children({ close: () => setOpen(false) })}</div> : null}
    </div>
  );
}

/** A labeled pair for a detail panel. */
export function Detail({ label, children, full = false }) {
  return <div className={`ax-detail${full ? ' is-full' : ''}`}><dt>{label}</dt><dd>{children === null || children === undefined || children === '' ? <span className="ax-muted">—</span> : children}</dd></div>;
}

export function Section({ title, action, children, count }) {
  return (
    <section className="ax-section">
      <header className="ax-section-head"><h3>{title}{count !== undefined ? <span className="ax-count">{count}</span> : null}</h3>{action || null}</header>
      {children}
    </section>
  );
}
