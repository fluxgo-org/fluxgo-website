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

/** Driver code with Copy code, the hint, and "Open app" (phones only, go.fluxgo.in opens the installed app). */
export function PosterCode({ scanId, code, codeText, openLink, copy }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyCode = async () => {
    sendLinkAction('copy_code', eventPath(scanId));
    if (await copyText(code)) setCopied(true);
  };

  return (
    <>
      <div className="fx-dp-code">
        <div>
          <small>{copy.code_label}</small>
          <strong aria-label={code.split('').join(' ')}>{codeText}</strong>
        </div>
        <button type="button" className="fx-dp-copy" onClick={copyCode}>{copy.copy_button}</button>
      </div>
      <p className="fx-dp-hint">{copy.code_help}</p>
      {openLink ? (
        <a className="fx-dp-open" href={openLink} onClick={() => sendLinkAction('open_app_click', eventPath(scanId))}>{copy.open_app_button}</a>
      ) : null}
      <p className={`fx-dp-toast${copied ? ' is-on' : ''}`} role="status" aria-live="polite">{copied ? copy.copied_toast : ''}</p>
    </>
  );
}

/**
 * Fixed bottom bar with the download button.
 * - Android: Google Play with the poster code and scan ID in the install referrer.
 * - iPhone: copies the page link (code and scan ID) for the app to read after install, then opens the App Store.
 * - Computer: both store buttons and a hint to use a phone.
 */
export function PosterBar({ kind, scanId, links, copy }) {
  const track = () => sendLinkAction('install_click', eventPath(scanId));

  const openAppStore = async (event) => {
    track();
    if (!links.clipboard) return;
    event.preventDefault();
    await copyText(links.clipboard, 800);
    window.location.href = links.appStore;
  };

  return (
    <div className="fx-dp-bar">
      <div className="fx-dp-bar-inner">
        {kind === 'android' ? (
          <a className="fx-dp-btn" href={links.play} onClick={track}>{copy.get_app_button}</a>
        ) : kind === 'ios' ? (
          <a className="fx-dp-btn" href={links.appStore} onClick={openAppStore}>{copy.get_app_button}</a>
        ) : (
          <>
            <div className="fx-dp-stores">
              <a className="fx-store fx-store-apple" href={links.appStore} target="_blank" rel="noopener noreferrer" onClick={track}>
                <AppleGlyph />
                <span><small>Download on the</small><strong>App Store</strong></span>
              </a>
              <a className="fx-store fx-store-play" href={links.play} target="_blank" rel="noopener noreferrer" onClick={track}>
                <PlayGlyph />
                <span><small>Get it on</small><strong>Google Play</strong></span>
              </a>
            </div>
            <p className="fx-dp-desktop-hint">{copy.desktop_hint}</p>
          </>
        )}
      </div>
    </div>
  );
}
