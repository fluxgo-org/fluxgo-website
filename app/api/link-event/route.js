import { cookies } from 'next/headers';
import { LINK_ACTIONS, VISITOR_COOKIE, captureSiteEvent, isBot, visitProperties } from '../../../lib/link-tracking';

/**
 * Button taps on public link pages (`public_link_action`). The page sends a beacon before the browser leaves.
 * Body: { action, path } where `path` is the page path with its query (share ID and utm tags). Answers 204 always.
 */
export async function POST(request) {
  try {
    const userAgent = request.headers.get('user-agent') ?? '';
    const visitorId = (await cookies()).get(VISITOR_COOKIE)?.value;
    const body = JSON.parse((await request.text()).slice(0, 2000) || '{}');
    if (!isBot(userAgent) && LINK_ACTIONS.includes(body.action) && typeof body.path === 'string' && body.path.startsWith('/')) {
      const url = new URL(body.path, 'https://www.fluxgo.in');
      await captureSiteEvent('public_link_action', visitorId, {
        ...visitProperties({ pathname: url.pathname, params: url.searchParams, userAgent, referer: null }),
        link_action: body.action
      });
    }
  } catch {
    // A bad body is ignored.
  }
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
