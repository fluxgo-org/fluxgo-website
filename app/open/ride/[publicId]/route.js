import { deviceKind, normalizeRideId } from '../../../../lib/app-links';
import { APP_STORE_URL, PLAY_STORE_URL, WEB_APP_URL } from '../../../(site)/_components/links';
import { captureSiteEvent, isBot, newVisitorId, pageLinkContext, readVisitorParam, visitProperties } from '../../../../lib/link-tracking';

/**
 * Target of the "Open in app" button. When the app is installed, the phone
 * opens Fluxgo before this runs. Otherwise send the visitor to the right store.
 * A computer has no app, so it goes to the web app.
 * Each redirect counts as `public_link_action` (redirect_store_ios, redirect_store_android, redirect_web_app).
 */
export async function GET(request, { params }) {
  const { publicId } = await params;
  const id = normalizeRideId(publicId);
  const userAgent = request.headers.get('user-agent') ?? '';
  const kind = deviceKind(userAgent);
  const { searchParams } = new URL(request.url);
  const pathname = id ? `/ride/${id}` : '/ride';
  const link = pageLinkContext({ pathname, searchParams: Object.fromEntries(searchParams) });
  const target = kind === 'ios'
    ? APP_STORE_URL
    : kind === 'android'
      ? link.play(PLAY_STORE_URL)
      : link.next(id ? `${WEB_APP_URL}/trip/${id}` : WEB_APP_URL);
  if (!isBot(userAgent)) {
    await captureSiteEvent('public_link_action', readVisitorParam(searchParams) ?? newVisitorId(), {
      ...visitProperties({ pathname, params: searchParams, userAgent, referer: null }),
      link_action: kind === 'ios' ? 'redirect_store_ios' : kind === 'android' ? 'redirect_store_android' : 'redirect_web_app'
    });
  }
  return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'no-store' } });
}
