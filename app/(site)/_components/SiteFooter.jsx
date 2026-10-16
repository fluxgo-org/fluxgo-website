import Link from 'next/link';
import Wordmark from './Wordmark';
import { AppleGlyph, PlayGlyph } from './StoreButtons';
import { APP_STORE_URL, PLAY_STORE_URL, SUPPORT_EMAIL, WEB_APP_URL } from './links';

export default function SiteFooter() {
  return (
    <footer className="fx-footer">
      <div className="fx-wrap">
        <div className="fx-footer-grid">
          <div className="fx-footer-lead">
            <p className="fx-footer-line">Between cities, <span>together.</span></p>
            <div className="fx-footer-get">
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer"><AppleGlyph />App Store</a>
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"><PlayGlyph />Google Play</a>
            </div>
          </div>
          <nav className="fx-footer-col" aria-label="Ride">
            <span className="fx-mono">Ride</span>
            <Link href="/#find">Find a ride</Link>
            <Link href="/#trust">Safety</Link>
            <Link href="/#offer">Offer a ride</Link>
          </nav>
          <nav className="fx-footer-col" aria-label="Get Fluxgo">
            <span className="fx-mono">Get Fluxgo</span>
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">iPhone</a>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">Android</a>
            <a href={WEB_APP_URL} target="_blank" rel="noopener noreferrer">On a computer: web app</a>
          </nav>
          <nav className="fx-footer-col" aria-label="Help">
            <span className="fx-mono">Help</span>
            <Link href="/support">Support</Link>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            <Link href="/privacy-terms#privacy-policy">Privacy</Link>
            <Link href="/privacy-terms#terms-and-conditions">Terms</Link>
          </nav>
        </div>

        <div className="fx-footer-mark" aria-hidden="true"><Wordmark /></div>

        <div className="fx-footer-base">
          <span>© {new Date().getFullYear()} Fluxgo</span>
          <span>Made in India, for the road between cities.</span>
        </div>
      </div>
    </footer>
  );
}
