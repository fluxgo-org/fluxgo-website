import Link from 'next/link';
import Wordmark from '../../_components/Wordmark';

export default function CabRideNotFound() {
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
