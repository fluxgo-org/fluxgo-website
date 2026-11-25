import { cabCopy } from '../../../lib/site-flags';

export const metadata = {
  alternates: { canonical: '/privacy-terms' },
  title: 'Privacy Policy & Terms | Fluxgo',
  description: cabCopy('Read the Fluxgo Privacy Policy and Terms and Conditions for intercity carpools and shared cabs in India.', 'Read the Fluxgo Privacy Policy and Terms and Conditions for intercity carpools in India.'),
};

export default function PrivacyTermsLayout({ children }) {
  return children;
}
