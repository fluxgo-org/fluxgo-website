/**
 * Website switches. Set them in Vercel (Project → Settings → Environment Variables), then redeploy:
 * Next.js puts NEXT_PUBLIC_ values into the build, so a change shows only after a new deploy.
 *
 * NEXT_PUBLIC_SITE_CAB_ENABLED=false hides every shared cab item on the site: header and footer links, the hero
 * cab seat, the home cab sections and FAQ items, the support cab topic, the cab parts of privacy and terms,
 * /cab-ride/<id> and /partner pages (404), and cab suggestions on the 404 page. Not set, or any other value = shown.
 */
const OFF_VALUES = ['false', '0', 'off', 'no'];

export const CAB_ENABLED = !OFF_VALUES.includes(String(process.env.NEXT_PUBLIC_SITE_CAB_ENABLED ?? '').trim().toLowerCase());

/** The first text while cabs show, the second (approved cab-free copy) while they are hidden. */
export function cabCopy(withCab, withoutCab) {
  return CAB_ENABLED ? withCab : withoutCab;
}
