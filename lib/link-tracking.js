/**
 * Shared link tracking for the public site (2026-11-16).
 *
 * Fluxgo links carry a short share ID (`?s=k3f9x2ab`) that the app or partner app makes for each share. The site
 * also reads standard `utm_*` tags from marketing links. Each page open and each button tap goes to PostHog as an
 * anonymous visitor event: no person profile, no IP address, no invite code, no member data.
 *
 * Events (keep equal to ANALYTICS_TRACKING_PLAN.md in fluxgo-frontend):
 * - `public_link_opened`: a person (not a link preview bot) opened a site page.
 * - `public_link_action`: the visitor tapped a button, or an /open link sent them to a store or the web app.
 * - `public_page_not_found`: a person opened an address that has no page (app/not-found.jsx).
 */

export const VISITOR_COOKIE = 'fx_vid';
export const VISITOR_HEADER = 'x-fx-vid';
/** The page path, set by proxy.js. The 404 page cannot read its own path in another way. */
export const PATH_HEADER = 'x-fx-path';
/** The scan ID of a partner poster page view (/d/<code>), set by proxy.js. */
export const SCAN_HEADER = 'x-fx-scan';

export const LINK_TYPES = ['ride', 'cab_ride', 'invite', 'partner_trip', 'poster', 'site'];

/** Button taps and /open redirects. Keep equal to the `link_action` values in the tracking plan. */
export const LINK_ACTIONS = [
  'open_app', 'store_ios', 'store_android', 'web_app', 'share_page', 'other_cabs', 'partner_signup',
  'redirect_store_ios', 'redirect_store_android', 'redirect_web_app',
  // Partner poster page (/d/<code>).
  'install_click', 'open_app_click', 'copy_code'
];

const SHARE_ID = /^[a-z0-9]{6,16}$/;
const TAG = /^[a-z0-9._-]{1,60}$/;
const CAMPAIGN_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

/** The share ID from a link, or null. */
export function readShareId(params) {
  const value = params?.get?.('s')?.trim().toLowerCase();
  return value && SHARE_ID.test(value) ? value : null;
}

/** A visitor ID that a page passed to an /open link (`v`), or null. */
export function readVisitorParam(params) {
  const value = params?.get?.('v')?.trim().toLowerCase();
  return value && /^[a-f0-9]{16,32}$/.test(value) ? value : null;
}

/** Lower-case `utm_*` tags. Values that are not plain tags are dropped. */
export function readCampaign(params) {
  const campaign = {};
  for (const key of CAMPAIGN_KEYS) {
    const value = params?.get?.(key)?.trim().toLowerCase();
    if (value && TAG.test(value)) campaign[key] = value;
  }
  return campaign;
}

/** A partner poster code: 6 digits, spaces ignored. Returns the digits or null. */
export function normalizePosterCode(value) {
  if (typeof value !== 'string') return null;
  let text = value;
  try {
    text = decodeURIComponent(value);
  } catch {
    // Keep the raw value.
  }
  const digits = text.replace(/\s+/g, '');
  return /^[0-9]{6}$/.test(digits) ? digits : null;
}

/** A new scan ID for one poster page view: 8 random characters, a-z and 0-9. */
export function newScanId() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

/** Page path to link type and a safe link ID. Invite codes are never sent. Poster codes are sent (never a partner name). */
export function linkOf(pathname = '/') {
  const ride = /^\/ride\/([A-Za-z0-9-]{1,40})\/?$/.exec(pathname);
  if (ride) return { link_type: 'ride', link_id: ride[1].replace('-', '').toUpperCase() };
  const cab = /^\/cab-ride\/([0-9a-f-]{36})\/?$/i.exec(pathname);
  if (cab) return { link_type: 'cab_ride', link_id: cab[1].toLowerCase() };
  if (/^\/ride\/?$/.test(pathname)) return { link_type: 'ride' };
  if (/^\/r\/[^/]+\/?$/.test(pathname)) return { link_type: 'invite' };
  if (/^\/partner\/trip\/[^/]+\/?$/.test(pathname)) return { link_type: 'partner_trip' };
  const poster = /^\/d\/([^/]+)\/?$/.exec(pathname);
  if (poster) {
    const code = normalizePosterCode(poster[1]);
    return code ? { link_type: 'poster', code } : { link_type: 'poster' };
  }
  const page = pathname === '/' ? 'home' : pathname.split('/')[1];
  return { link_type: 'site', page: ['support', 'privacy-terms', 'partner', 'get'].includes(page) ? page : page === 'home' ? 'home' : 'other' };
}

/**
 * Source and medium for one visit. A share ID with no tags means a member or partner shared the link:
 * source `share`, medium = the link type. Tags on the link always win.
 */
export function attributionOf({ shareId, campaign = {}, linkType, referrerDomain }) {
  // A poster page is opened from the QR code in a cab: the scan ID is not a member share.
  if (linkType === 'poster') return { ...campaign, utm_source: campaign.utm_source ?? 'poster', utm_medium: campaign.utm_medium ?? 'poster' };
  const source = campaign.utm_source ?? (shareId ? 'share' : referrerDomain ? 'referral' : 'direct');
  const medium = campaign.utm_medium ?? (shareId ? linkType : referrerDomain ? 'referral' : 'none');
  return { ...campaign, utm_source: source, utm_medium: medium };
}

/**
 * Link preview fetchers and crawlers. WhatsApp, Telegram, and others load the page once to make the preview card.
 * Those loads are not clicks.
 */
const BOT = /bot\b|bot\/|crawler|spider|crawl|slurp|facebookexternalhit|facebookcatalog|meta-externalagent|whatsapp|telegram|slack|discord|skypeuripreview|linkedinbot|pinterest|embedly|quora link preview|bitlybot|vkshare|redditbot|applebot|google-inspectiontool|googleother|lighthouse|headlesschrome|phantomjs|preview|curl\/|wget|python-requests|python-urllib|node-fetch|undici|axios|go-http-client|okhttp|java\/|httpclient|postman|vercel-screenshot|vercelbot/i;

export function isBot(userAgent = '') {
  return !userAgent || BOT.test(userAgent);
}

/** The app whose in-app browser opened the link, or `browser`. */
export function openedIn(userAgent = '') {
  if (/instagram/i.test(userAgent)) return 'instagram';
  if (/FBAN|FBAV|FB_IAB|FBIOS|FB4A/.test(userAgent)) return 'facebook';
  if (/LinkedInApp/i.test(userAgent)) return 'linkedin';
  if (/Snapchat/i.test(userAgent)) return 'snapchat';
  if (/Twitter|TwitterAndroid/i.test(userAgent)) return 'x';
  if (/\bLine\//.test(userAgent)) return 'line';
  if (/GSA\//.test(userAgent)) return 'google_app';
  if (/; wv\)/.test(userAgent)) return 'android_webview';
  return 'browser';
}

/** Host of the page that sent the visitor (no path), or null for the same site and no referrer. */
export function referrerDomainOf(referer) {
  if (!referer) return null;
  try {
    const host = new URL(referer).hostname.toLowerCase().replace(/^www\./, '');
    if (!host || host === 'fluxgo.in' || host.endsWith('.fluxgo.in')) return null;
    return host.slice(0, 80);
  } catch {
    return null;
  }
}

/** 16 random hex characters. */
export function newVisitorId() {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function isVisitorId(value) {
  return typeof value === 'string' && /^[a-f0-9]{16,32}$/.test(value);
}

/** Device kind from the user agent: ios, android, or desktop. Keep equal to deviceKind in app-links.js. */
function deviceOf(userAgent = '') {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua) || (ua.includes('macintosh') && ua.includes('mobile'))) return 'ios';
  if (ua.includes('android')) return 'android';
  return 'desktop';
}

/** Properties that every site event carries. */
export function visitProperties({ pathname, params, userAgent, referer }) {
  const link = linkOf(pathname);
  const shareId = readShareId(params);
  const referrerDomain = referrerDomainOf(referer);
  return {
    ...link,
    ...(shareId ? { share_id: shareId } : {}),
    ...attributionOf({ shareId, campaign: readCampaign(params), linkType: link.link_type, referrerDomain }),
    ...(referrerDomain ? { $referring_domain: referrerDomain } : {}),
    device_kind: deviceOf(userAgent),
    opened_in: openedIn(userAgent)
  };
}

/**
 * Query string that carries the visit to the next step (an /open link, the web app, or Google Play).
 * `v` keeps the same anonymous visitor across www.fluxgo.in and go.fluxgo.in.
 */
export function carryParams({ shareId, campaign = {}, visitorId, includeVisitor = false }) {
  const params = new URLSearchParams();
  if (shareId) params.set('s', shareId);
  for (const key of CAMPAIGN_KEYS) if (campaign[key]) params.set(key, campaign[key]);
  if (includeVisitor && isVisitorId(visitorId)) params.set('v', visitorId);
  return params;
}

/** Add carried values to a link. Returns the link unchanged when there is nothing to add. */
export function withParams(url, params) {
  const text = params.toString();
  if (!text) return url;
  return `${url}${url.includes('?') ? '&' : '?'}${text}`;
}

/**
 * Google Play link with an install referrer. Play Console shows installs by these utm values. The app does not
 * read the referrer yet.
 */
export function playStoreWithReferrer(playUrl, { shareId, campaign = {}, linkType }) {
  const source = campaign.utm_source ?? (shareId ? 'share' : 'website');
  const medium = campaign.utm_medium ?? linkType ?? 'site';
  const referrer = new URLSearchParams({ utm_source: source, utm_medium: medium, utm_campaign: campaign.utm_campaign ?? linkType ?? 'site' });
  if (shareId) referrer.set('utm_content', shareId);
  return `${playUrl}&referrer=${encodeURIComponent(referrer.toString())}`;
}

/**
 * Google Play link for a partner poster page. The app reads `poster` and `s` from the install referrer.
 * Without a code (paused or unknown code), the referrer has no code.
 */
export function posterPlayUrl(playUrl, { code = null, scanId = null } = {}) {
  const referrer = new URLSearchParams({ utm_source: 'poster', utm_medium: 'poster' });
  if (code) {
    referrer.set('utm_content', code);
    referrer.set('poster', code);
  }
  if (scanId) referrer.set('s', scanId);
  return `${playUrl}&referrer=${encodeURIComponent(referrer.toString())}`;
}

function analyticsSettings() {
  const key = process.env.FLUXGO_POSTHOG_KEY?.trim();
  const host = (process.env.FLUXGO_POSTHOG_HOST?.trim() || 'https://m.fluxgo.in').replace(/\/+$/, '');
  const environment = process.env.VERCEL_ENV === 'production' ? 'production' : process.env.VERCEL_ENV || 'development';
  return { key, host, environment };
}

/**
 * Send one anonymous event to PostHog. Never throws, and gives up after 2.5 s so a slow PostHog never holds a page.
 * Without FLUXGO_POSTHOG_KEY this does nothing.
 */
export async function captureSiteEvent(event, visitorId, properties) {
  const { key, host, environment } = analyticsSettings();
  if (!key || !isVisitorId(visitorId)) return;
  try {
    await fetch(`${host}/i/v0/e/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: `site_${visitorId}`,
        timestamp: new Date().toISOString(),
        properties: {
          ...properties,
          $process_person_profile: false,
          $ip: null,
          $geoip_disable: true,
          source: 'website',
          app: 'website',
          schema_version: 2,
          environment,
          visitor_id: visitorId
        }
      }),
      signal: AbortSignal.timeout(2500)
    });
  } catch {
    // Analytics is best effort.
  }
}

/** Next.js page `searchParams` (an object) as URLSearchParams. */
export function toSearchParams(searchParams = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === 'string') params.set(key, first);
  }
  return params;
}

/**
 * What a page passes on to its buttons: the share ID, the source and medium of this visit, and the visitor ID.
 * `next(url, { visitor })` adds them to a link; `play()` gives the Google Play link with an install referrer.
 */
export function pageLinkContext({ pathname, searchParams, visitorId, referer }) {
  const params = toSearchParams(searchParams);
  const { link_type: linkType } = linkOf(pathname);
  const shareId = readShareId(params);
  const campaign = readCampaign(params);
  const attribution = attributionOf({ shareId, campaign, linkType, referrerDomain: referrerDomainOf(referer) });
  const tags = Object.fromEntries(Object.entries(attribution).filter(([key]) => key.startsWith('utm_')));
  return {
    shareId,
    next: (url, { visitor = false } = {}) => withParams(url, carryParams({ shareId, campaign: tags, visitorId, includeVisitor: visitor })),
    play: (playUrl) => playStoreWithReferrer(playUrl, { shareId, campaign: tags, linkType })
  };
}
