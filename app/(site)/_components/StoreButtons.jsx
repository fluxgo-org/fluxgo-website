import { APP_STORE_URL, PLAY_STORE_URL, WEB_APP_URL } from './links';

export function AppleGlyph() {
  return (
    <svg viewBox="0 0 16 20" width="16" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M13.26 10.62c-.02-2.13 1.74-3.16 1.82-3.21-1-1.45-2.54-1.65-3.08-1.67-1.31-.13-2.56.77-3.22.77-.67 0-1.69-.75-2.78-.73-1.43.02-2.75.83-3.48 2.11-1.49 2.58-.38 6.39 1.07 8.48.71 1.02 1.55 2.17 2.65 2.13 1.07-.04 1.47-.69 2.75-.69 1.29 0 1.65.69 2.77.67 1.15-.02 1.87-1.04 2.57-2.07.81-1.18 1.14-2.33 1.16-2.39-.03-.01-2.22-.85-2.23-3.4ZM11.16 4.37c.58-.71.98-1.69.87-2.67-.84.03-1.86.56-2.46 1.27-.54.62-1.01 1.62-.89 2.58.94.07 1.9-.48 2.48-1.18Z" />
    </svg>
  );
}

export function PlayGlyph() {
  return (
    <svg viewBox="0 0 18 20" width="16" height="18" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M3 1.6v16.8a.8.8 0 0 0 1.2.7l13-8.4a.8.8 0 0 0 0-1.4l-13-8.4A.8.8 0 0 0 3 1.6Z" />
    </svg>
  );
}

export default function StoreButtons({ tone = 'dark', showNote = true }) {
  return (
    <div className={`fx-stores fx-stores-${tone}`}>
      <div className="fx-stores-row">
        <a className="fx-store fx-store-apple" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
          <AppleGlyph />
          <span><small>Download on the</small><strong>App Store</strong></span>
        </a>
        <a className="fx-store fx-store-play" href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
          <PlayGlyph />
          <span><small>Get it on</small><strong>Google Play</strong></span>
        </a>
      </div>
      {showNote ? (
        <p className="fx-stores-note">Not on your phone? <a href={WEB_APP_URL} target="_blank" rel="noopener noreferrer">Continue on the web</a></p>
      ) : null}
    </div>
  );
}
