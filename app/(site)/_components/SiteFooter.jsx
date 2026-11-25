import Wordmark from './Wordmark';
import NavLink from './NavLink';
import { CAB_ENABLED } from '../../../lib/site-flags';
import { APP_STORE_URL, PARTNER_URL, PLAY_STORE_URL, SUPPORT_EMAIL, WEB_APP_URL } from './links';

// Groups follow the header: what people come to do, then safety and help.
const GROUPS = [
  {
    label: 'Ride',
    links: [
      { href: '/#find', text: 'Find a ride' },
      { href: '/#offer', text: 'Offer a ride' },
      CAB_ENABLED && { href: '/#cab', text: 'Shared cabs' }
    ].filter(Boolean)
  },
  {
    label: 'More',
    links: [
      { href: '/#reliability', text: 'Reliability' },
      { href: '/#trust', text: 'Trust' },
      { href: '/support', text: 'Support' }
    ]
  },
  {
    label: 'Get the app',
    links: [
      { href: APP_STORE_URL, text: 'iPhone', external: true },
      { href: PLAY_STORE_URL, text: 'Android', external: true },
      { href: WEB_APP_URL, text: 'Web app', external: true },
      CAB_ENABLED && { href: PARTNER_URL, text: 'Partner app', external: true }
    ].filter(Boolean)
  },
  {
    label: 'Legal',
    links: [
      { href: '/privacy-terms#privacy-policy', text: 'Privacy' },
      { href: '/privacy-terms#terms-and-conditions', text: 'Terms' }
    ]
  }
];

export default function SiteFooter() {
  return (
    <footer className="fx-footer">
      <div className="fx-wrap">
        <div className="fx-footer-grid">
          <p className="fx-footer-line">Solving intercity mobility <span>in India.</span></p>
          {GROUPS.map((group) => (
            <nav key={group.label} className="fx-footer-col" aria-label={group.label}>
              <span className="fx-footer-label">{group.label}</span>
              <ul>
                {group.links.map((item) => (
                  <li key={item.text}>
                    {item.external ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer">{item.text}</a>
                    ) : (
                      <NavLink href={item.href}>{item.text}</NavLink>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="fx-footer-mark" aria-hidden="true"><Wordmark /></div>

        <div className="fx-footer-base">
          <span>© {new Date().getFullYear()} Fluxgo. Made in India.</span>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </div>
      </div>
    </footer>
  );
}
