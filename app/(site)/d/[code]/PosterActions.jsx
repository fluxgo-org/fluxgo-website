'use client';

import { useEffect, useState } from 'react';
import { sendLinkAction } from '../../_components/TrackedLink';
import { AppleGlyph, PlayGlyph } from '../../_components/StoreButtons';

/** The page path with this view's scan ID, so each tap event carries the same `share_id` as the page open. */
function eventPath(scanId) {
  const params = new URLSearchParams(window.location.search);
  params.set('s', scanId);
  return `${window.location.pathname}?${params.toString()}`;
}

/** Copy text. Returns true when the text is on the clipboard. Waits at most `waitMs`. */
async function copyText(text, waitMs = 1500) {
  try {
    if (navigator.clipboard?.writeText) {
      const copied = navigator.clipboard.writeText(text).then(() => true, () => false);
      return await Promise.race([copied, new Promise((resolve) => setTimeout(() => resolve(false), waitMs))]);
    }
  } catch {
    // Use the old way below.
  }
  try {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const done = document.execCommand('copy');
    field.remove();
    return done;
  } catch {
    return false;
  }
}

/**
 * Download button, driver code, and "Open app" link on a poster page.
 * - Android: Google Play with the poster code and scan ID in the install referrer.
 * - iPhone: copies the page link (code and scan ID) for the app to read after install, then opens the App Store.
 * - Computer: both store buttons and a hint to use a phone.
 */
export default function PosterActions({ kind, scanId, code, codeText, links, copy }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const track = (action) => sendLinkAction(action, eventPath(scanId));

  const openAppStore = async (event) => {
    track('install_click');
    if (!links.clipboard) return;
    event.preventDefault();
    await copyText(links.clipboard, 800);
    window.location.href = links.appStore;
  };

  const copyCode = async () => {
    track('copy_code');
    if (await copyText(code)) setCopied(true);
  };

  return (
    <div className="fx-poster-actions">
      {kind === 'android' ? (
        <a className="fx-share-btn" href={links.play} onClick={() => track('install_click')}>{copy.get_app_button}</a>
      ) : kind === 'ios' ? (
        <a className="fx-share-btn" href={links.appStore} onClick={openAppStore}>{copy.get_app_button}</a>
      ) : (
        <div className="fx-poster-stores">
          <div className="fx-stores fx-stores-light">
            <div className="fx-stores-row">
              <a className="fx-store fx-store-apple" href={links.appStore} target="_blank" rel="noopener noreferrer" onClick={() => track('install_click')}>
                <AppleGlyph />
                <span><small>Download on the</small><strong>App Store</strong></span>
              </a>
              <a className="fx-store fx-store-play" href={links.play} target="_blank" rel="noopener noreferrer" onClick={() => track('install_click')}>
                <PlayGlyph />
                <span><small>Get it on</small><strong>Google Play</strong></span>
              </a>
            </div>
          </div>
          <p className="fx-poster-hint">{copy.desktop_hint}</p>
        </div>
      )}

      {code ? (
        <div className="fx-poster-code">
          <p className="fx-poster-label">{copy.code_label}</p>
          <div className="fx-poster-code-row">
            <strong aria-label={code.split('').join(' ')}>{codeText}</strong>
            <button type="button" className="fx-poster-copy" onClick={copyCode}>{copy.copy_button}</button>
          </div>
          <p className="fx-poster-help">{copy.code_help}</p>
        </div>
      ) : null}

      {links.open && kind !== 'desktop' ? (
        <a className="fx-poster-open" href={links.open} onClick={() => track('open_app_click')}>{copy.open_app_button}</a>
      ) : null}

      <p className={`fx-poster-toast${copied ? ' is-on' : ''}`} role="status" aria-live="polite">{copied ? copy.copied_toast : ''}</p>
    </div>
  );
}
