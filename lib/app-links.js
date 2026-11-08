/** Shared values for iOS universal links and Android app links. */
export const APPLE_APP_ID = 'TL4T5M464F.in.fluxgo.app';
export const ANDROID_PACKAGE = 'in.fluxgo.app';

/**
 * SHA-256 fingerprints of the Android signing certificates.
 * 1. Google Play app signing key (builds installed from Play, including closed testing).
 * 2. Upload key (local release builds that do not come from Play).
 */
export const ANDROID_CERT_FINGERPRINTS = [
  'C7:AE:12:57:92:4B:89:4C:B3:FF:3F:DB:62:CB:89:79:3C:EA:66:65:54:D2:91:4C:B7:2A:E4:DD:29:98:BE:21',
  'A7:E9:22:8E:A3:44:82:76:55:78:BA:41:DC:6C:DD:C9:51:43:8C:9B:04:7C:F5:1D:F0:38:BC:51:F0:EB:70:8D'
];

/** Paths that open the app. Keep these in sync with the app intent filters and +native-intent. */
export const APP_LINK_PATHS = ['/ride/*', '/open/ride/*', '/r/*', '/open/r/*'];

const PUBLIC_ID = /^TRP-?[0-9A-HJKMNP-TV-Z]{10}$/i;

/** Return the canonical public ride ID (no hyphen, upper case) or null. */
export function normalizeRideId(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!PUBLIC_ID.test(trimmed)) return null;
  return trimmed.replace('-', '').toUpperCase();
}

/** Return an invite code (3 to 12 letters and digits, upper case) or null. */
export function normalizeInviteCode(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toUpperCase();
  return /^[A-Z0-9]{3,12}$/.test(trimmed) ? trimmed : null;
}

/** Pick the store or web target for a device that does not have the app. */
export function deviceKind(userAgent = '') {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua) || (ua.includes('macintosh') && ua.includes('mobile'))) return 'ios';
  if (ua.includes('android')) return 'android';
  return 'desktop';
}
