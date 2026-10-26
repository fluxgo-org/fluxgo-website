import { TripSheet } from './TripSheet';

export const metadata = { title: 'Trip | Fluxgo Partner' };

export default async function TripSheetPage({ params }) {
  const { token } = await params;
  return <TripSheet token={token} />;
}
