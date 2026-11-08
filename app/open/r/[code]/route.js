import { deviceKind, normalizeInviteCode } from '../../../../lib/app-links';
import { APP_STORE_URL, PLAY_STORE_URL, SITE_URL } from '../../../(site)/_components/links';

/**
 * Target of the invite page's "Open in app" button. When the app is installed, the phone opens Fluxgo before
 * this runs. Otherwise the right store opens. A computer goes back to the invite page: invites are phone-only.
 */
export async function GET(request, { params }) {
  const { code } = await params;
  const value = normalizeInviteCode(code);
  const kind = deviceKind(request.headers.get('user-agent') ?? '');
  const target = kind === 'ios' ? APP_STORE_URL : kind === 'android' ? PLAY_STORE_URL : value ? `${SITE_URL}/r/${value}` : SITE_URL;
  return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'no-store' } });
}
