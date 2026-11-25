import { cabCopy } from '../../../lib/site-flags';

export const metadata = {
  alternates: { canonical: '/support' },
  title: 'Support | Fluxgo',
  description: cabCopy('Help with Fluxgo bookings, shared cabs, rides, driving, safety, and your account.', 'Help with Fluxgo bookings, rides, driving, safety, and your account.'),
};

export default function SupportLayout({ children }) {
  return children;
}
