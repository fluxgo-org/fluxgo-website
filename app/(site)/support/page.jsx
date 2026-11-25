import Link from 'next/link';
import SiteHeader from '../_components/SiteHeader';
import SiteFooter from '../_components/SiteFooter';
import Reveal from '../_components/Reveal';
import { SUPPORT_EMAIL } from '../_components/links';
import { CAB_ENABLED, cabCopy } from '../../../lib/site-flags';
import { IconArrow, IconCab, IconChat, IconHand, IconSeat, IconShield } from '../_components/Icons';

const ALL_TOPICS = [
  {
    id: 'booking',
    icon: IconSeat,
    title: 'Booking a seat',
    items: [
      ['When is my seat confirmed?', 'With Instant book, at once. With Request to book, when the driver accepts. The app notifies you and shows the status on the trip.'],
      ['How do I change or cancel a booking?', 'Open the trip in the app and select change or cancel on your booking. Check the updated status before leaving.'],
      ['How do I agree on a pickup point?', 'Use the trip chat so you and the driver have the pickup point in writing.']
    ]
  },
  {
    id: 'cab',
    icon: IconCab,
    title: 'Shared cabs',
    items: [
      ['When is my cab seat confirmed?', 'When the app shows Seat confirmed. If a cab in that slot has free seats, it confirms at once. Otherwise, it waits until 4 seats fill and a local operator takes the trip.'],
      ['When do I get cab and driver details?', '2 hours before pickup. You see the vehicle number, driver name, and driver chat. The driver never sees your phone number.'],
      ['How do I pay?', 'Pay the fixed seat price to the operator in the cab. You pay nothing in the app.'],
      ['What is the boarding code?', 'A code shown in the app 1 hour before pickup. Give it to the driver when boarding so the trip marks you on board.'],
      ['Can I cancel?', 'Yes. Open the cab in Trips and cancel. Cancelling within 2 hours of pickup shows as a late cancel on your profile. If the cab does not fill, nothing counts against you.']
    ]
  },
  {
    id: 'driving',
    icon: IconHand,
    title: 'Offering a ride',
    items: [
      ['How do I publish a ride?', 'Add and verify your vehicle, then set the route, date, time, seats, luggage space, seat price, and booking type.'],
      ['Why must my vehicle be verified?', 'We match each car to its registration so riders know which car to look for and that it matches your profile.'],
      ['Can I choose who rides with me?', 'Yes. Use Request to book to approve each rider yourself, or Instant book to fill seats automatically.']
    ]
  },
  {
    id: 'safety',
    icon: IconShield,
    title: 'Safety',
    items: [
      ['What should I check before getting in?', 'Check that the driver, car, and number plate match the app. If anything does not match, do not get in.'],
      ['How do I report a safety issue?', 'Get to a safe place first. Then report the ride from the trip screen, or email support@fluxgo.in with the route, date, and details.'],
      ['What is a trusted contact?', 'Someone you save in the app before your first ride, so help is close if needed during a trip.']
    ]
  },
  {
    id: 'account',
    icon: IconChat,
    title: 'Account and privacy',
    items: [
      ['How do I request a privacy change?', 'Open Profile → Help & Support with “Privacy request” as the subject, or email support@fluxgo.in.'],
      ['How do I delete my account?', 'Open your profile, choose Delete account, and confirm twice. Trip history can remain with an anonymous profile.'],
      ['What should I put in a support request?', 'Your account mobile number, route, date, booking reference, and what you need. Never send passwords, one-time codes, or payment details.']
    ]
  }
];
const TOPICS = CAB_ENABLED ? ALL_TOPICS : ALL_TOPICS.filter((topic) => topic.id !== 'cab');

function SupportText({ text }) {
  const [before, after] = text.split(SUPPORT_EMAIL);
  if (after === undefined) return text;
  return <>{before}<a className="fx-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{after}</>;
}

export default function SupportPage() {
  return (
    <>
      <a className="fx-skip" href="#main">Skip to content</a>
      <SiteHeader current="/support" />
      <Reveal />

      <main id="main">
        <section className="fx-page-hero" aria-labelledby="support-title">
          <div className="fx-hero-glow" aria-hidden="true" />
          <div className="fx-wrap fx-page-hero-grid">
            <div className="fx-page-hero-copy">
              <p className="fx-chip fx-chip-dark"><span className="fx-pulse" aria-hidden="true" />Support</p>
              <h1 className="fx-page-title" id="support-title">Need help with a trip?</h1>
              <p className="fx-hero-lede">{cabCopy('Answers on bookings, rides, shared cabs, and accounts. A person reads every message.', 'Answers on bookings, rides, and accounts. A person reads every message.')}</p>
            </div>

            <a className="fx-sos" href="tel:112">
              <span className="fx-sos-ring" aria-hidden="true"><span>112</span></span>
              <span>
                <strong>In danger right now?</strong>
                <small>Call 112 first. Tell us once you are safe.</small>
              </span>
              <IconArrow width={22} height={22} />
            </a>
          </div>

          <nav className="fx-wrap fx-topic-nav" aria-label="Help topics">
            {TOPICS.map(({ id, icon: Icon, title }) => (
              <a key={id} href={`#${id}`}><Icon width={20} height={20} />{title}</a>
            ))}
          </nav>
        </section>

        <div className="fx-wrap fx-help">
          {TOPICS.map(({ id, title, items }, index) => (
            <section key={id} className="fx-help-topic" id={id} aria-labelledby={`${id}-title`}>
              <div className="fx-help-head" data-reveal>
                <h2 id={`${id}-title`}>{title}</h2>
              </div>
              <div className="fx-faq" data-reveal>
                {items.map(([q, a], i) => (
                  <details key={q} open={index === 0 && i === 0}>
                    <summary>{q}<span className="fx-faq-icon" aria-hidden="true" /></summary>
                    <p><SupportText text={a} /></p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="fx-wrap fx-contact" aria-labelledby="contact-title">
          <div className="fx-arrive-card" data-reveal>
            <div className="fx-arrive-copy">
              <h2 className="fx-h2" id="contact-title">Still need help? Write to us.</h2>
              <p className="fx-lede">Open Profile → Help &amp; Support in the app, or email us your trip details.</p>
              <a className="fx-contact-mail" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}<IconArrow width={20} height={20} /></a>
            </div>
            <ol className="fx-checklist">
              <li className="fx-mono">Before you send</li>
              <li>Trip route and date.</li>
              <li>Booking reference, if you have one.</li>
              <li>No passwords, codes, or payment details.</li>
            </ol>
          </div>
          <p className="fx-contact-legal">See how we handle your data in our <Link className="fx-link" href="/privacy-terms">privacy policy and terms</Link>.</p>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
