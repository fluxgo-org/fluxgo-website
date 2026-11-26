'use client';

/**
 * A link that records the tap as `public_link_action` and then opens as normal. The beacon survives the page
 * change, so app, store, and intent links work the same as a plain link. `path` (optional) replaces the page path
 * and query that the event reads.
 */
export function sendLinkAction(action, path = null) {
  try {
    const body = JSON.stringify({ action, path: path ?? `${window.location.pathname}${window.location.search}` });
    if (navigator.sendBeacon?.('/api/link-event', new Blob([body], { type: 'application/json' }))) return;
    void fetch('/api/link-event', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => undefined);
  } catch {
    // Analytics is best effort.
  }
}

export default function TrackedLink({ action, onClick, children, ...props }) {
  return (
    <a
      {...props}
      onClick={(event) => {
        sendLinkAction(action);
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}
