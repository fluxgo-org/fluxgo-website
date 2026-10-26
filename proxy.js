import { NextResponse } from 'next/server';

/**
 * partner.fluxgo.in is the web address for cab drivers and operators.
 * Its paths map to /partner/* in this app. Other hosts are not changed.
 */
export function proxy(request) {
  const host = (request.headers.get('host') || '').toLowerCase();
  if (!host.startsWith('partner.')) return NextResponse.next();
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/partner')) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = pathname === '/' ? '/partner' : `/partner${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|icon.png|robots.txt).*)'],
};
