export const metadata = {
  metadataBase: new URL('https://www.fluxgo.in'),
  title: 'Fluxgo — Intercity carpools and shared cabs in India',
  description: 'Reliable intercity rides with verified members only. Carpools and shared cabs for trips of a few hours, across India.',
  applicationName: 'Fluxgo',
  keywords: ['intercity carpooling', 'carpool India', 'shared cab', 'intercity cab seat', 'ride sharing between cities', 'Fluxgo'],
  openGraph: {
    title: 'Fluxgo — Reliable intercity rides',
    description: 'Share intercity rides with verified members only. Carpools and shared cabs across India.',
    url: 'https://www.fluxgo.in',
    siteName: 'Fluxgo',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fluxgo — Reliable intercity rides',
    description: 'Share intercity rides with verified members only. Carpools and shared cabs across India.'
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
