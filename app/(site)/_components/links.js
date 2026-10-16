export const APP_STORE_URL = 'https://apps.apple.com/in/app/fluxgo-intercity-carpooling/id6814678664';
export const APP_STORE_ID = '6814678664';
export const WEB_APP_URL = 'https://app.fluxgo.in';
export const SUPPORT_EMAIL = 'support@fluxgo.in';
export const ANDROID_PACKAGE = 'in.fluxgo.app';
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
/** The public site host. The bare domain redirects here, so app links use this host. */
export const SITE_URL = 'https://www.fluxgo.in';
/**
 * A second host for the "Open in app" button. iOS opens the app only when a
 * link goes to a different domain from the current page.
 */
export const OPEN_HOST_URL = (process.env.NEXT_PUBLIC_FLUXGO_OPEN_HOST_URL || 'https://go.fluxgo.in').replace(/\/+$/, '');
