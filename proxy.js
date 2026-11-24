import { NextResponse } from 'next/server';
import {
  PATH_HEADER, VISITOR_COOKIE, VISITOR_HEADER, captureSiteEvent, isBot, isVisitorId, newVisitorId, visitProperties
} from './lib/link-tracking';

/**
 * 1. partner.fluxgo.in paths map to /partner/* in this app. Other hosts are not changed.
 * 2. Each page open counts as `public_link_opened` (ride, cab ride, invite, and site pages). Link preview bots,
 *    prefetches, and client navigations do not count. The anonymous visitor cookie lets PostHog count unique
 *    visitors; the page reads the same ID from a request header on the first visit. Marketing links (/g/<code>)
 *    are not counted here: the page they redirect to counts the visit with the link's share ID.
 */
export function proxy(request, event) {
  const { nextUrl } = request;
  const host = (request.headers.get('host') || '').toLowerCase();
  const partnerHost = host.startsWith('partner.') && !nextUrl.pathname.startsWith('/partner');
  const pathname = partnerHost ? (nextUrl.pathname === '/' ? '/partner' : `/partner${nextUrl.pathname}`) : nextUrl.pathname;

  const visitorFromCookie = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = isVisitorId(visitorFromCookie) ? visitorFromCookie : newVisitorId();
  const headers = new Headers(request.headers);
  headers.set(VISITOR_HEADER, visitorId);
  // The 404 page reads the path from this header to find the page the visitor wanted.
  headers.set(PATH_HEADER, pathname);
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
      params: nextUrl.searchParams,
      userAgent,
      referer: request.headers.get('referer')
    })));
  }
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/|api/|open/|g/|admin|\\.well-known/|favicon|icon|apple-icon|robots|sitemap|.*opengraph-image|.*twitter-image|.*\\.[a-zA-Z0-9]+$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
        { type: 'header', key: 'sec-purpose', value: 'prefetch' }
      ]
    }
  ]
};
