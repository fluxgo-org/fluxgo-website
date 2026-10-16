import Link from 'next/link';
import Wordmark from '../../_components/Wordmark';

export default function RideNotFound() {
  return (
    <main className="fx-share fx-share-empty">
      <header className="fx-share-top"><Link href="/" aria-label="Fluxgo home"><Wordmark /></Link></header>
      <section className="fx-share-sheet">
        <h1>We could not find this ride</h1>
        <p>Check the link, or find another ride in the Fluxgo app.</p>
        <Link className="fx-share-btn" href="/">Get the Fluxgo app</Link>
      </section>
    </main>
  );
}
