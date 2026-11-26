import { headers } from 'next/headers';
import Link from 'next/link';
import Wordmark from '../../_components/Wordmark';
import { APP_STORE_URL, OPEN_HOST_URL, PLAY_STORE_URL, SITE_URL } from '../../_components/links';
import { deviceKind } from '../../../../lib/app-links';
import { SCAN_HEADER, newScanId, posterPlayUrl, readShareId, toSearchParams } from '../../../../lib/link-tracking';
import { COPY } from './copy';
import { displayCode, loadPoster } from './poster-data';
import { PosterBar, PosterCode } from './PosterActions';

export async function generateMetadata({ params }) {
  const { code: raw } = await params;
  const result = await loadPoster(raw);
  const poster = result.poster;
  const title = poster?.active
    ? COPY.page_title.replace('{name}', poster.firstName)
    : poster ? COPY.paused_title : result.notFound ? COPY.not_found_title : COPY.pitch_title;
  const description = poster && !poster.active ? COPY.paused_body : result.notFound ? COPY.pitch_body : COPY.page_description;
  const code = poster?.code ?? result.code;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: code ? { canonical: `${SITE_URL}/d/${code}` } : undefined,
    openGraph: { title, description, url: code ? `${SITE_URL}/d/${code}` : SITE_URL, siteName: 'Fluxgo', type: 'website' },
    // Replace the site-wide values, which can mention cabs. This page never does, whatever the cab switch is.
    twitter: { card: 'summary_large_image', title, description },
    keywords: ['intercity carpooling', 'carpool India', 'ride sharing between cities', 'Fluxgo'],
    // No Safari Smart App Banner: its button opens the App Store without the clipboard copy that carries the code.
    itunes: null
  };
}

/**
 * Landing page for the QR code on a driver's poster (www.fluxgo.in/d/482915). It always opens in the browser:
 * /d/* opens the app only from go.fluxgo.in. The download button carries the code to the app: Android through
 * the Play install referrer, iPhone through the clipboard (the app reads the copied page link).
 * States: active (driver card), paused, not found, and API error (no card).
 */
export default async function PosterPage({ params, searchParams }) {
  const { code: raw } = await params;
  const result = await loadPoster(raw);
  const requestHeaders = await headers();
  const kind = deviceKind(requestHeaders.get('user-agent') ?? '');
  const scanId = readShareId(new URLSearchParams(`s=${requestHeaders.get(SCAN_HEADER) ?? ''}`))
    ?? readShareId(toSearchParams(await searchParams))
    ?? newScanId();

  const poster = result.poster;
  // Paused and unknown codes send no code to the app. When the API cannot answer, the code goes on: the app checks it.
  const installCode = poster ? (poster.active ? poster.code : null) : result.unavailable ? result.code : null;
  const links = {
    play: posterPlayUrl(PLAY_STORE_URL, { code: installCode, scanId }),
    appStore: APP_STORE_URL,
    clipboard: installCode ? `${SITE_URL}/d/${installCode}?s=${scanId}` : null
  };
  const openLink = poster?.active && kind !== 'desktop' ? `${OPEN_HOST_URL}/d/${poster.code}?s=${scanId}` : null;

  return (
    <main className={`fx-dp${kind === 'desktop' ? ' fx-dp-wide-bar' : ''}`}>
      <section className="fx-dp-hero">
        <div className="fx-dp-col">
          <Link href="/" aria-label="Fluxgo home"><Wordmark /></Link>
          <h1>{COPY.hero_title}<span>{COPY.hero_title_second}</span></h1>
          <p>{COPY.hero_sub}</p>
        </div>
      </section>
      <section className="fx-dp-col fx-dp-rows">
        {COPY.rows.map(([title, body]) => (
          <div key={title} className="fx-dp-row"><strong>{title}</strong><span>{body}</span></div>
        ))}
      </section>
      {poster?.active ? (
        <section className="fx-dp-col">
          <div className="fx-dp-card">
            <div className="fx-dp-who"><small>{COPY.driver_label}</small><strong>{poster.firstName}</strong></div>
            <PosterCode scanId={scanId} code={poster.code} codeText={displayCode(poster.code)} openLink={openLink} copy={COPY} />
          </div>
        </section>
      ) : poster || result.notFound ? (
        <section className="fx-dp-col">
          <div className="fx-dp-card fx-dp-note">
            <h2>{poster ? COPY.paused_title : COPY.not_found_title}</h2>
            {poster ? <p>{COPY.paused_body}</p> : null}
          </div>
        </section>
      ) : null}
      <PosterBar kind={kind} scanId={scanId} links={links} copy={COPY} />
    </main>
  );
}
