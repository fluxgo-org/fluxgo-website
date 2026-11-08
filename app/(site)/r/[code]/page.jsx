import Link from 'next/link';
import { headers } from 'next/headers';
import Wordmark from '../../_components/Wordmark';
import StoreButtons from '../../_components/StoreButtons';
import { ANDROID_PACKAGE, APP_STORE_ID, APP_STORE_URL, OPEN_HOST_URL, PLAY_STORE_URL, SITE_URL } from '../../_components/links';
import { deviceKind, normalizeInviteCode } from '../../../../lib/app-links';

export async function generateMetadata({ params }) {
  const { code } = await params;
  const value = normalizeInviteCode(code);
  const title = 'You have an invite to Fluxgo';
  const description = 'Share intercity rides with verified members. Use this invite code in the app, and you both get 100 credits after your first ride, and up to 300 credits each.';
  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: value ? { canonical: `${SITE_URL}/r/${value}` } : undefined,
    openGraph: { title, description, url: value ? `${SITE_URL}/r/${value}` : SITE_URL, siteName: 'Fluxgo', type: 'website' },
    // The Safari banner opens this invite in the app, like the page button.
    itunes: { appId: APP_STORE_ID, appArgument: value ? `${SITE_URL}/r/${value}` : SITE_URL }
  };
}

/** The phone opens Fluxgo when it is installed; if not, the store opens. Invites are in the phone app only. */
function appAction(kind, code) {
  if (kind === 'ios') return { href: code ? `${OPEN_HOST_URL}/open/r/${code}` : APP_STORE_URL, label: 'Open in the Fluxgo app' };
  if (kind === 'android') {
    return {
      href: code ? `intent://profile/invite-code?code=${code}#Intent;scheme=fluxgo;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_URL)};end` : PLAY_STORE_URL,
      label: 'Open in the Fluxgo app'
    };
  }
  return null;
}

const STEPS = [
  ['Get the app', 'Fluxgo for iPhone, or Android when it is out.'],
  ['Enter the code', 'In your first 7 days, before your first booking or ride.'],
  ['Take your first ride', 'You and your friend each get 100 Fluxgo Credits. Your third ride and your first ride as a host add 100 each.']
];

/** Landing page for a member's invite link (www.fluxgo.in/r/CODE). With the app installed, the phone skips this page. */
export default async function InvitePage({ params }) {
  const { code: raw } = await params;
  const code = normalizeInviteCode(raw);
  const kind = deviceKind((await headers()).get('user-agent') ?? '');
  const action = appAction(kind, code);
  return (
    <main className="fx-share fx-share-empty">
      <header className="fx-share-top"><Link href="/" aria-label="Fluxgo home"><Wordmark /></Link></header>
      <section className="fx-share-sheet fx-invite-landing">
        <h1>A friend invited you to Fluxgo</h1>
        <p>Share intercity rides with verified members. Use this code, and you both get 100 credits after your first ride, and up to 300 credits each.</p>
        {code ? <div className="fx-invite-pass fx-invite-landing-pass">
          <div>
            <small>Invite code</small>
            <strong>{code}</strong>
          </div>
          <div className="fx-invite-reward">
            <small>Credits for you</small>
            <strong><img src="/assets/fluxgo-credits-coin-3d.png" alt="" width="22" height="22" />100</strong>
          </div>
        </div> : <p>This invite link is not complete. Ask your friend to share it again.</p>}
        <ol className="fx-cab-steps">
          {STEPS.map(([title, body], i) => (
            <li key={title}>
              <span className="fx-mono">0{i + 1}</span>
              <div><strong>{title}</strong><p>{body}</p></div>
            </li>
          ))}
        </ol>
        {action ? <a className="fx-share-btn" href={action.href}>{action.label}</a> : <div className="fx-invite-landing-stores"><p>Invites work in the Fluxgo phone app.</p><StoreButtons /></div>}
      </section>
    </main>
  );
}
