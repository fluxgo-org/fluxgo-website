/**
 * Help for the 404 page (2026-11-24). From a wrong address, find the page the visitor most likely wanted:
 * a ride or cab ride ID anywhere in the path, a marketing code without /g/, or a site page with another name.
 * Also gives a safe path to send to PostHog, so broken links can be found and fixed.
 */
import { normalizeRideId } from './app-links.js';
import { marketingCode } from './marketing-links.js';

const RIDE_IN_PATH = /TRP-?[0-9A-HJKMNP-TV-Z]{10}(?![0-9A-Z])/i;
const CAB_IN_PATH = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Other names for site pages. Keys are lower case, without a slash at the end. */
const PAGE_ALIASES = {
  help: 'support', contact: 'support', 'contact-us': 'support', faq: 'support', faqs: 'support', supprt: 'support', suport: 'support',
  privacy: 'privacy-terms', terms: 'privacy-terms', 'privacy-policy': 'privacy-terms', tos: 'privacy-terms', legal: 'privacy-terms',
  download: 'download', app: 'download', 'get-app': 'download', install: 'download',
  cab: 'cab', cabs: 'cab', 'shared-cab': 'cab', 'shared-cabs': 'cab',
  offer: 'offer', drive: 'offer', host: 'offer', 'offer-a-ride': 'offer',
  find: 'find', search: 'find', rides: 'find', 'find-a-ride': 'find',
  partners: 'partner', driver: 'partner', drivers: 'partner', operator: 'partner', operators: 'partner'
};

/** Page key to path. The page name for the button comes from the page itself (see not-found.jsx). */
export const PAGE_TARGETS = {
  support: '/support',
  'privacy-terms': '/privacy-terms',
  download: '/#download',
  cab: '/#cab',
  offer: '/#offer',
  find: '/#find',
  partner: 'https://partner.fluxgo.in'
};

/**
 * What the wrong address may point to, before any API check:
 * `{ kind: 'ride', id }`, `{ kind: 'cab', id }`, `{ kind: 'marketing', code }`, `{ kind: 'page', page }`, or null.
 * With `cab: false` (cabs hidden on the site), cab rides and the cab and partner pages are never offered.
 */
export function guessTarget(pathname = '/', { cab: cabShown = true } = {}) {
  let path;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    path = pathname;
  }
  const ride = RIDE_IN_PATH.exec(path);
  if (ride) {
    const id = normalizeRideId(ride[0]);
    if (id) return { kind: 'ride', id };
  }
  const cab = CAB_IN_PATH.exec(path);
  if (cab && cabShown) return { kind: 'cab', id: cab[0].toLowerCase() };
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 1) {
    const page = PAGE_ALIASES[segments[0].toLowerCase()];
    if (page && (cabShown || (page !== 'cab' && page !== 'partner'))) return { kind: 'page', page };
    const code = marketingCode(segments[0]);
    if (code) return { kind: 'marketing', code };
  }
  return null;
}

/**
 * The path for analytics: no query, at most 100 characters, only plain URL characters. Invite codes (/r/<code>)
 * never leave the site, in any letter case.
 */
export function safeMissingPath(pathname = '/') {
  const path = String(pathname).split('?')[0].split('#')[0];
  if (/^\/r\//i.test(path)) return '/r/*';
  return path.replace(/[^A-Za-z0-9\-_/.~]/g, '_').slice(0, 100) || '/';
}
