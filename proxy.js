import { NextResponse } from 'next/server';
import {
  PATH_HEADER, SCAN_HEADER, VISITOR_COOKIE, VISITOR_HEADER, captureSiteEvent, isBot, isVisitorId, linkOf, newScanId,
  newVisitorId, readShareId, visitProperties
} from './lib/link-tracking';

const SITE_ORIGIN = 'https://www.fluxgo.in';

/**
 * 1. partner.fluxgo.in paths map to /partner/* in this app. Other hosts are not changed.
 * 2. Each page open counts as `public_link_opened` (ride, cab ride, invite, and site pages). Link preview bots,
 *    prefetches, and client navigations do not count. The anonymous visitor cookie lets PostHog count unique
 *    visitors; the page reads the same ID from a request header on the first visit. Marketing links (/g/<code>)
 *    are not counted here: the page they redirect to counts the visit with the link's share ID.
 * 3. Partner poster pages (/d/<code>): go.fluxgo.in/d/* opens the app when it is installed. When the browser gets
 *    the link (no app), it goes to the same page on www.fluxgo.in with the query kept. Each poster page view gets
 *    a scan ID (`s` on the link, or a new one). The page reads it from a request header, so the opened event,
 *    the button taps, and the store links carry the same scan ID.
 */
export function proxy(request, event) {
  const { nextUrl } = request;
  const host = (request.headers.get('host') || '').toLowerCase();
  const partnerHost = host.startsWith('partner.') && !nextUrl.pathname.startsWith('/partner');
  const pathname = partnerHost ? (nextUrl.pathname === '/' ? '/partner' : `/partner${nextUrl.pathname}`) : nextUrl.pathname;

  if (host.startsWith('go.') && /^\/d\/[^/]+\/?$/.test(pathname)) {
    return NextResponse.redirect(`${SITE_ORIGIN}${pathname}${nextUrl.search}`, { status: 302, headers: { 'Cache-Control': 'no-store' } });
  }

  const visitorFromCookie = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = isVisitorId(visitorFromCookie) ? visitorFromCookie : newVisitorId();
  const headers = new Headers(request.headers);
  headers.set(VISITOR_HEADER, visitorId);
  // The 404 page reads the path from this header to find the page the visitor wanted.
  headers.set(PATH_HEADER, pathname);
  let params = nextUrl.searchParams;
  if (linkOf(pathname).link_type === 'poster') {
    const scanId = readShareId(params) ?? newScanId();
    headers.set(SCAN_HEADER, scanId);
    params = new URLSearchParams(params);
    params.set('s', scanId);
  }
  let response;
  if (partnerHost) {
    const url = nextUrl.clone();
    url.pathname = pathname;
    response = NextResponse.rewrite(url, { request: { headers } });
  } else {
    response = NextResponse.next({ request: { headers } });
  }
  if (visitorId !== visitorFromCookie) {
    response.cookies.set(VISITOR_COOKIE, visitorId, { maxAge: 60 * 60 * 24 * 365, httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
  }

  const userAgent = request.headers.get('user-agent') ?? '';
  const pageLoad = request.method === 'GET' && !nextUrl.searchParams.has('_rsc') && !isBot(userAgent);
  if (pageLoad) {
    event.waitUntil(captureSiteEvent('public_link_opened', visitorId, visitProperties({
      pathname,
      params,
      userAgent,
      referer: request.headers.get('referer')
    })));
  }
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/|api/|open/|g/|get$|get/|admin|\\.well-known/|favicon|icon|apple-icon|robots|sitemap|.*opengraph-image|.*twitter-image|.*\\.[a-zA-Z0-9]+$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
        { type: 'header', key: 'sec-purpose', value: 'prefetch' }
      ]
    }
  ]
};
