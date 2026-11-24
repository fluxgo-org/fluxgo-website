import Link from 'next/link';
import { headers } from 'next/headers';
import { after } from 'next/server';
import SiteLayout from './(site)/layout';
import Wordmark from './(site)/_components/Wordmark';
import TrackedLink from './(site)/_components/TrackedLink';
import { APP_STORE_URL, PLAY_STORE_URL, WEB_APP_URL } from './(site)/_components/links';
import { loadRide } from './(site)/ride/[publicId]/ride-data';
import { loadCabRide } from './(site)/cab-ride/[id]/cab-data';
import { deviceKind } from '../lib/app-links';
import { PATH_HEADER, VISITOR_HEADER, captureSiteEvent, isBot, visitProperties } from '../lib/link-tracking';
import { PAGE_TARGETS, guessTarget, safeMissingPath } from '../lib/not-found';

const DESCRIPTION = 'This link may be incomplete, expired, or no longer available.';

export const metadata = {
  title: 'Page not found | Fluxgo',
  description: DESCRIPTION,
  robots: { index: false, follow: true },
  openGraph: { title: 'Page not found | Fluxgo', description: DESCRIPTION },
  twitter: { title: 'Page not found | Fluxgo', description: DESCRIPTION }
};

const API_BASE_URL = (process.env.FLUXGO_API_URL || process.env.NEXT_PUBLIC_FLUXGO_API_URL || 'https://api.fluxgo.in').replace(/\/+$/, '');

const PAGE_NAMES = {
  support: 'Support',
  'privacy-terms': 'Privacy and terms',
  download: 'Get the app',
  cab: 'Shared cabs',
  offer: 'Offer a ride',
  find: 'Find a ride',
  partner: 'Partner app'
};

async function marketingLinkExists(code) {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/public/marketing-links/${code}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * The page the visitor most likely wanted, checked against the API: `{ kind, title, button, href }` or null.
 * A ride or link that the API cannot confirm is not offered.
 */
async function suggestionFor(pathname) {
  const guess = guessTarget(pathname);
  if (!guess) return null;
  if (guess.kind === 'page') {
    return { kind: 'page', title: PAGE_NAMES[guess.page], button: `Open ${PAGE_NAMES[guess.page]}`, href: PAGE_TARGETS[guess.page] };
  }
  if (guess.kind === 'ride') {
    const result = await loadRide(guess.id);
    return result.trip ? { kind: 'ride', title: 'We found the carpool ride', button: 'Open ride page', href: `/ride/${guess.id}` } : null;
  }
  if (guess.kind === 'cab') {
    const result = await loadCabRide(guess.id);
    return result.ride ? { kind: 'cab', title: 'We found the shared cab ride', button: 'Open cab ride', href: `/cab-ride/${guess.id}` } : null;
  }
  if (guess.kind === 'marketing') {
    return (await marketingLinkExists(guess.code)) ? { kind: 'marketing', title: 'We found the Fluxgo short link', button: 'Open link', href: `/g/${guess.code}` } : null;
  }
  return null;
}

/** The main button: the store for this phone, or the web app on a computer. */
function primaryAction(kind) {
  if (kind === 'ios') return { action: 'store_ios', href: APP_STORE_URL, label: 'Get on the App Store' };
  if (kind === 'android') return { action: 'store_android', href: PLAY_STORE_URL, label: 'Get on Google Play' };
  return { action: 'web_app', href: WEB_APP_URL, label: 'Find a ride on the web' };
}

/**
 * Shows for every address that has no page. It offers the page the visitor most likely wanted, the next step for
 * this device, and home and support. Each open goes to PostHog as `public_page_not_found` with a safe path and the
 * sending site, so broken links can be found and fixed.
 */
export default async function NotFound() {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get(PATH_HEADER) || '/';
  const userAgent = requestHeaders.get('user-agent') ?? '';
  const suggestion = await suggestionFor(pathname);
  const primary = primaryAction(deviceKind(userAgent));

  if (!isBot(userAgent)) {
    const visitorId = requestHeaders.get(VISITOR_HEADER);
    const referer = requestHeaders.get('referer');
    after(() => captureSiteEvent('public_page_not_found', visitorId, {
      ...visitProperties({ pathname: '/404', params: new URLSearchParams(), userAgent, referer }),
      missing_path: safeMissingPath(pathname),
      suggestion: suggestion?.kind ?? 'none'
    }));
  }

  return (
    <SiteLayout>
      <main className="fx-share fx-share-empty">
        <header className="fx-share-top"><Link href="/" aria-label="Fluxgo home"><Wordmark /></Link></header>
        <section className="fx-share-sheet fx-missing">
          <h1>Page not found</h1>
          <p>{DESCRIPTION}</p>
          {suggestion ? (
            <div className="fx-missing-card">
              <small>Based on your link</small>
              <strong>{suggestion.title}</strong>
              <Link className="fx-share-btn" href={suggestion.href}>{suggestion.button}</Link>
            </div>
          ) : null}
          <div className="fx-share-actions">
            <TrackedLink action={primary.action} className={`fx-share-btn${suggestion ? ' fx-share-btn-ghost' : ''}`} href={primary.href} target="_blank" rel="noopener noreferrer">{primary.label}</TrackedLink>
          </div>
          <nav className="fx-missing-links" aria-label="More">
            <Link href="/">Go to home</Link>
            <Link href="/support">Contact support</Link>
          </nav>
        </section>
      </main>
    </SiteLayout>
  );
}
