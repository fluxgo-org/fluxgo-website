import { notFound } from 'next/navigation';
import { CAB_ENABLED } from '../../lib/site-flags';

export default function PartnerHome() {
  // Cabs hidden on the site: the cab operator page is a 404 (also for old /partner/trip links).
  if (!CAB_ENABLED) notFound();
  return (
    <main className="partner-main">
      <p className="partner-brand">fluxgo<span>.</span> partner</p>
      <h1>Fluxgo trips for cab operators and drivers</h1>
      <p className="partner-muted">Trip links are replaced by the Fluxgo Partner app. Sign in with your mobile number to see your trips and check boarding codes. For help, call Fluxgo.</p>
    </main>
  );
}
