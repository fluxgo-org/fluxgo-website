import Link from 'next/link';
import { headers } from 'next/headers';
import Wordmark from '../../_components/Wordmark';
import { IconShield } from '../../_components/Icons';
import { APP_STORE_URL, OPEN_HOST_URL, PLAY_STORE_URL, SITE_URL } from '../../_components/links';
import { deviceKind } from '../../../../lib/app-links';
import { SCAN_HEADER, newScanId, posterPlayUrl, readShareId, toSearchParams } from '../../../../lib/link-tracking';
import { COPY } from './copy';
import { displayCode, loadPoster } from './poster-data';
import PosterActions from './PosterActions';

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
    keywords: ['intercity carpooling', 'carpool India', 'ride sharing between cities', 'Fluxgo']
  };
}

/**
 * Landing page for the QR code on a partner poster in a cab (www.fluxgo.in/d/482915). It always opens in the
 * browser: /d/* opens the app only from go.fluxgo.in. The download button carries the code to the app:
 * Android through the Play install referrer, iPhone through the clipboard (the app reads the copied page link).
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
    clipboard: installCode ? `${SITE_URL}/d/${installCode}?s=${scanId}` : null,
    open: poster?.active ? `${OPEN_HOST_URL}/d/${poster.code}?s=${scanId}` : null
  };

  return (
    <main className="fx-share fx-share-empty">
      <header className="fx-share-top"><Link href="/" aria-label="Fluxgo home"><Wordmark /></Link></header>
      <section className="fx-share-sheet fx-invite-landing fx-poster">
        {poster?.active ? (
          <>
            <div className="fx-poster-partner">
              <p className="fx-poster-label">{COPY.driver_label}</p>
              <h1>{poster.firstName}</h1>
              {poster.verified ? <p className="fx-poster-verified"><IconShield width={18} height={18} aria-hidden="true" />{COPY.verified_line}</p> : null}
            </div>
            {poster.vehicles.length ? (
              <div className="fx-poster-vehicles">
                <p className="fx-poster-label">{COPY.vehicles_label}</p>
                <ul>{poster.vehicles.map((line) => <li key={line}>{line}</li>)}</ul>
              </div>
            ) : null}
            <div className="fx-poster-pitch">
              <h2>{COPY.pitch_title}</h2>
              <p>{COPY.pitch_body}</p>
            </div>
          </>
        ) : poster ? (
          <div className="fx-poster-pitch">
            <h1>{COPY.paused_title}</h1>
            <p>{COPY.paused_body}</p>
          </div>
        ) : result.notFound ? (
          <div className="fx-poster-pitch">
            <h1>{COPY.not_found_title}</h1>
          </div>
        ) : (
          <div className="fx-poster-pitch">
            <h1>{COPY.pitch_title}</h1>
            <p>{COPY.pitch_body}</p>
          </div>
        )}
        <PosterActions
          kind={kind}
          scanId={scanId}
          code={poster?.active ? poster.code : null}
          codeText={poster?.active ? displayCode(poster.code) : null}
          links={links}
          copy={COPY}
        />
      </section>
    </main>
  );
}
