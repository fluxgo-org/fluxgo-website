/**
 * In-app message rules for the admin portal. These values copy the member app exactly:
 * fluxgo-frontend src/lib/inAppMessageLayout.ts and src/components/inAppMessage/InAppMessagePopup.tsx.
 * Change both repositories together.
 */

/** The 6 styles, in the order the admin sees them. */
export const IN_APP_STYLES = [
  { value: 'SHEET', name: 'Bottom sheet', use: 'Rises from the bottom. Good for most messages.' },
  { value: 'MODAL', name: 'Framed card', use: 'Centred card, image with a frame. Good for offers.' },
  { value: 'MODAL_EDGE', name: 'Edge card', use: 'Centred card, image edge to edge, centred text.' },
  { value: 'POSTER', name: 'Poster', use: 'Text on the image. Needs a strong photo.' },
  { value: 'FULLSCREEN', name: 'Full screen', use: 'Covers the app. Keep it for big news.' },
  { value: 'TOP_BANNER', name: 'Top banner', use: 'Small card at the top. Does not block the app. Closes after 8 s.' },
];

export const STYLE_NAME = Object.fromEntries(IN_APP_STYLES.map((style) => [style.value, style.name]));

export const IN_APP_SCREENS = [
  { value: 'HOME', label: 'Home' },
  { value: 'FIND_RIDE', label: 'Find a ride' },
  { value: 'OFFER_RIDE', label: 'Offer a ride' },
  { value: 'TRIPS', label: 'Trips' },
  { value: 'INBOX', label: 'Inbox' },
  { value: 'PROFILE', label: 'Profile' },
  { value: 'NOTIFICATIONS', label: 'Notifications' },
  { value: 'WORK_EMAIL', label: 'Verify work email' },
  { value: 'SUPPORT', label: 'Support' },
  { value: 'DEMAND', label: 'Travellers waiting' },
];

export const TARGET_KINDS = [
  { value: 'SCREEN', label: 'App screen' },
  { value: 'SEARCH', label: 'Ride search' },
  { value: 'RIDE', label: 'One ride' },
  { value: 'URL', label: 'Web link' },
];

export const FREQUENCIES = [
  { value: 'ONCE', label: 'Once', hint: 'Each member sees it one time.' },
  { value: 'DAILY', label: 'Once a day', hint: 'At most once each India day, until tapped.' },
  { value: 'UNTIL_TAPPED', label: 'Every app open', hint: 'Each new app open, until the member taps it.' },
];

export const PRIORITIES = [
  { value: 2, label: 'High' },
  { value: 1, label: 'Normal' },
  { value: 0, label: 'Low' },
];

export const PLATFORMS = [
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
  { value: 'web', label: 'Web app' },
];

export const STATUS_LABEL = { DRAFT: 'Draft', LIVE: 'Live', PAUSED: 'Paused', ENDED: 'Ended' };
export const STATUS_TONE = { DRAFT: 'neutral', LIVE: 'success', PAUSED: 'warning', ENDED: 'neutral' };

export const TITLE_MAX = 120;
export const SUBTITLE_MAX = 300;
export const LABEL_MAX = 40;
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/** Below this width a banner looks soft on a phone (390 pt × 3). */
export const IMAGE_MIN_SHARP_WIDTH = 1080;

/** The phone the preview draws: iPhone 14 points and safe areas. */
export const PHONE = { width: 390, height: 844, top: 47, bottom: 34 };

const BANNER_RULES = {
  SHEET: { fallback: 16 / 10, min: 1.2, max: 2.4, maxScreenShare: 0.4 },
  MODAL: { fallback: 4 / 3, min: 1, max: 2.2, maxScreenShare: 0.38 },
  MODAL_EDGE: { fallback: 16 / 11, min: 1, max: 2.2, maxScreenShare: 0.38 },
};

/** Banner width ÷ height after the app's clamp. Same as fitBanner() in the app. */
export function fitBanner(imageAspect, frameWidth, screenHeight, kind) {
  const rule = BANNER_RULES[kind];
  const own = imageAspect && Number.isFinite(imageAspect) && imageAspect > 0 ? imageAspect : rule.fallback;
  const clamped = Math.min(rule.max, Math.max(rule.min, own));
  const tallest = screenHeight * rule.maxScreenShare;
  return frameWidth / clamped > tallest ? frameWidth / tallest : clamped;
}

/** Poster height. Same as posterHeight() in the app. */
export function posterHeight(imageAspect, cardWidth, freeHeight) {
  const own = imageAspect && Number.isFinite(imageAspect) && imageAspect > 0 ? imageAspect : 4 / 5.4;
  const clamped = Math.min(1, Math.max(0.6, own));
  return Math.round(Math.min(cardWidth / clamped, freeHeight));
}

/** Is the image cropped in this style? Used for the admin hint under the upload. */
export function cropNote(layout, aspect) {
  if (!aspect) return '';
  const ranges = { SHEET: [1.2, 2.4], MODAL: [1, 2.2], MODAL_EDGE: [1, 2.2], POSTER: [0.6, 1] };
  const range = ranges[layout];
  if (!range) return '';
  if (aspect < range[0]) return 'The image is taller than this style allows. The app shows the centre and crops the top and bottom.';
  if (aspect > range[1]) return 'The image is wider than this style allows. The app shows the centre and crops the sides.';
  return '';
}

/** A short line for a target, for the list and the confirm dialog. */
export function targetSummary(target) {
  if (!target) return 'Nothing';
  if (target.kind === 'SCREEN') return IN_APP_SCREENS.find((screen) => screen.value === target.screen)?.label || target.screen;
  if (target.kind === 'SEARCH') return `Search ${target.originCity} → ${target.destinationCity}${target.date ? ` on ${target.date}` : ''}`;
  if (target.kind === 'RIDE') return `Ride ${String(target.tripId).slice(0, 8)}`;
  if (target.kind === 'URL') return target.url;
  return 'Nothing';
}

/** Read width and height of a local image file. */
export function readImageSize(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { resolve({ width: image.naturalWidth, height: image.naturalHeight }); URL.revokeObjectURL(url); };
    image.onerror = () => { reject(new Error('The image could not be read')); URL.revokeObjectURL(url); };
    image.src = url;
  });
}
