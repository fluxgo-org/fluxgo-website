import { CAB_ENABLED, cabCopy } from '../lib/site-flags';

// Cab-free texts by Gemini 4 Neon (2026-11-26).
const SHARE_DESCRIPTION = cabCopy(
  'Reliable intercity carpools and shared cabs with verified members only, across India.',
  'Reliable intercity carpools with verified members only, across India.'
);

export const metadata = {
  metadataBase: new URL('https://www.fluxgo.in'),
  title: cabCopy('Fluxgo: intercity carpools and shared cabs in India', 'Fluxgo: intercity carpools in India'),
  description: cabCopy(
    'Reliable intercity carpools and shared cabs with verified members only, for trips of a few hours across India.',
    'Reliable intercity carpools with verified members only, for trips of a few hours across India.'
  ),
  applicationName: 'Fluxgo',
  keywords: CAB_ENABLED
    ? ['intercity carpooling', 'carpool India', 'shared cab', 'intercity cab seat', 'ride sharing between cities', 'Fluxgo']
    : ['intercity carpooling', 'carpool India', 'ride sharing between cities', 'Fluxgo'],
  openGraph: {
    title: 'Fluxgo: reliable intercity rides',
    description: SHARE_DESCRIPTION,
    url: 'https://www.fluxgo.in',
    siteName: 'Fluxgo',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fluxgo: reliable intercity rides',
    description: SHARE_DESCRIPTION
  },
  itunes: {
    appId: '6814678664'
  }
};

export const viewport = {
  themeColor: '#102A1B'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
