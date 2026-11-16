import { deviceKind, normalizeInviteCode } from '../../../../lib/app-links';
import { APP_STORE_URL, PLAY_STORE_URL, SITE_URL } from '../../../(site)/_components/links';
import { captureSiteEvent, isBot, newVisitorId, pageLinkContext, readVisitorParam, visitProperties } from '../../../../lib/link-tracking';

/**
 * Target of the invite page's "Open in app" button. When the app is installed, the phone opens Fluxgo before
 * this runs. Otherwise the right store opens. A computer goes back to the invite page: invites are phone-only.
 * Each store redirect counts as `public_link_action`. The invite code is never sent.
 */
export async function GET(request, { params }) {
  const { code } = await params;
  const value = normalizeInviteCode(code);
  const userAgent = request.headers.get('user-agent') ?? '';
  const kind = deviceKind(userAgent);
  const { searchParams } = new URL(request.url);
  const link = pageLinkContext({ pathname: '/r/code', searchParams: Object.fromEntries(searchParams) });
  const target = kind === 'ios'
    ? APP_STORE_URL
    : kind === 'android'
      ? link.play(PLAY_STORE_URL)
      : link.next(value ? `${SITE_URL}/r/${value}` : SITE_URL);
  if (!isBot(userAgent) && kind !== 'desktop') {
    await captureSiteEvent('public_link_action', readVisitorParam(searchParams) ?? newVisitorId(), {
      ...visitProperties({ pathname: '/r/code', params: searchParams, userAgent, referer: null }),
      link_action: kind === 'ios' ? 'redirect_store_ios' : 'redirect_store_android'
    });
  }
  return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'no-store' } });
}
