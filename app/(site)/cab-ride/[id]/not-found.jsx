import Link from 'next/link';
import Wordmark from '../../_components/Wordmark';
import SiteNotFound from '../../../not-found';
import { CAB_ENABLED } from '../../../../lib/site-flags';

export default function CabRideNotFound() {
  // Cabs hidden on the site: show the site 404, which does not mention cabs.
  if (!CAB_ENABLED) return <SiteNotFound />;
  return (
    <main className="fx-share fx-share-empty">
      <header className="fx-share-top"><Link href="/" aria-label="Fluxgo home"><Wordmark /></Link></header>
      <section className="fx-share-sheet">
        <h1>We could not find this cab</h1>
        <p>The link may be wrong. Open the Cab tab in the Fluxgo app to see cabs on your route.</p>
        <Link className="fx-share-btn" href="/">Go to Fluxgo</Link>
      </section>
    </main>
  );
}
