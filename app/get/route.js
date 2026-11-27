import { deviceKind } from '../../lib/app-links';
import { APP_STORE_URL, PLAY_STORE_URL, SITE_URL } from '../(site)/_components/links';
import {
  captureSiteEvent, carryParams, isBot, newVisitorId, playStoreWithReferrer, readCampaign, readShareId, visitProperties, withParams
} from '../../lib/link-tracking';

/**
 * www.fluxgo.in/get: one link for posters and social posts (QR codes). An iPhone goes to the App Store, an Android
 * phone goes to Google Play (with the link's utm tags as the install referrer), and a computer goes to the download
 * section of the home page. Each store redirect counts as `public_link_action` (link_type `site`, page `get`).
 * The home page counts its own visit, so a computer redirect sends no event here.
 */
export async function GET(request) {
  const userAgent = request.headers.get('user-agent') ?? '';
  const kind = deviceKind(userAgent);
  const { searchParams } = new URL(request.url);
  const shareId = readShareId(searchParams);
  const campaign = readCampaign(searchParams);
  const target = kind === 'ios'
    ? APP_STORE_URL
    : kind === 'android'
      ? playStoreWithReferrer(PLAY_STORE_URL, { shareId, campaign, linkType: 'get' })
      : `${withParams(`${SITE_URL}/`, carryParams({ shareId, campaign }))}#download`;
  if (!isBot(userAgent) && kind !== 'desktop') {
    await captureSiteEvent('public_link_action', newVisitorId(), {
      ...visitProperties({ pathname: '/get', params: searchParams, userAgent, referer: request.headers.get('referer') }),
      link_action: kind === 'ios' ? 'redirect_store_ios' : 'redirect_store_android'
    });
  }
  return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'no-store' } });
}
