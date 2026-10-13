'use client';

import { useEffect, useRef, useState } from 'react';

const IconShare = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}>
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
  </svg>
);

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * "Share ride" on the public ride page. Opens the system share sheet with the
 * same text as the app. Browsers without a share sheet get WhatsApp and Copy.
 * The share sheet gets one plain string with the link inside, the same
 * payload the app sends. With a separate `url` (and `title`), iOS gives
 * WhatsApp two items and WhatsApp shows no preview card.
 */
export default function ShareRideButton({ text, url }) {
  // One string, as in the app: "Book a seat: https://www.fluxgo.in/ride/…".
  const fullText = `${text} ${url}`;
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !rootRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menuOpen]);

  const share = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: fullText });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    setCopied(false);
    setMenuOpen((open) => !open);
  };

  const copy = async () => {
    if (await copyText(fullText)) {
      setCopied(true);
      setTimeout(() => setMenuOpen(false), 1200);
    }
  };

  return (
    <div className="fx-share-sharebox" ref={rootRef}>
      <button type="button" className="fx-share-sharebtn" onClick={share} aria-haspopup="menu" aria-expanded={menuOpen}>
        <IconShare />
        Share ride
      </button>
      {menuOpen ? (
        <div className="fx-share-sharemenu" role="menu">
          <a role="menuitem" href={`https://wa.me/?text=${encodeURIComponent(fullText)}`} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>
            Share on WhatsApp
          </a>
          <button type="button" role="menuitem" onClick={copy}>{copied ? 'Copied' : 'Copy ride details'}</button>
        </div>
      ) : null}
    </div>
  );
}
