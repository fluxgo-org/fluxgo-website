/**
 * Marketing links (2026-11-24): www.fluxgo.in/g/<code>.
 *
 * Admins make these links in the admin portal (Grow > Marketing > Links). The backend says where a code goes: a
 * www.fluxgo.in path and a query with the link's share ID (`s`) and `utm_*` tags. The page that the visitor lands on
 * then counts the visit as `public_link_opened`, with the same share ID, so PostHog joins clicks, button taps, and app
 * opens to the link. The /g redirect itself is not counted (proxy.js skips it).
 */

const CODE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const SAFE_PATH = /^\/[A-Za-z0-9\-_/]{0,150}$/;
const QUERY_KEYS = ['s', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const QUERY_VALUE = /^[a-z0-9._-]{1,60}$/;

/** The code from the URL, lower case, or null when it cannot be a marketing code. */
export function marketingCode(value) {
  const code = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return CODE.test(code) ? code : null;
}

/**
 * The redirect path with its query, from the backend answer. Only a same-site path and the known tags pass, so a
 * bad answer can never send a visitor to another site. Returns null when the answer does not fit.
 */
export function marketingTarget(answer) {
  const path = answer?.path;
  if (typeof path !== 'string' || !SAFE_PATH.test(path) || path.includes('//') || /^\/g(?:\/|$)/.test(path)) return null;
  const params = new URLSearchParams();
  for (const key of QUERY_KEYS) {
    const value = answer?.query?.[key];
    if (typeof value === 'string' && QUERY_VALUE.test(value)) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
