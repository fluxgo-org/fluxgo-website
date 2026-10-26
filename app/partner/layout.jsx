import { Inter } from 'next/font/google';
import './partner.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata = {
  title: 'Fluxgo Partner',
  description: 'Fluxgo trips for cab drivers and operators.',
  robots: { index: false, follow: false },
  itunes: null,
};

export const viewport = {
  themeColor: '#102A1B',
  width: 'device-width',
  initialScale: 1,
};

export default function PartnerLayout({ children }) {
  return <div className={`partner-root ${inter.variable}`}>{children}</div>;
}
