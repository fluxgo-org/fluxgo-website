import Link from 'next/link';
import SiteHeader from '../_components/SiteHeader';
import SiteFooter from '../_components/SiteFooter';
import Reveal from '../_components/Reveal';
import { SUPPORT_EMAIL } from '../_components/links';
import { IconArrow, IconCab, IconChat, IconHand, IconSeat, IconShield } from '../_components/Icons';

const TOPICS = [
  {
    id: 'booking',
    icon: IconSeat,
    title: 'Booking a seat',
    items: [
      ['When is my seat confirmed?', 'With Instant book, at once. With Request to book, when the driver accepts. The app tells you either way, and the trip shows its status.'],
      ['How do I change or cancel a booking?', 'Open the trip in the Fluxgo app and use the change or cancel action for that booking. Check the result before you leave the screen.'],
      ['How do I agree on a pickup point?', 'Use chat on the trip. Keep the plan in writing, so you and the driver see the same thing on the day.']
    ]
  },
  {
    id: 'cab',
    icon: IconCab,
    title: 'Shared cabs',
    items: [
      ['When is my cab seat confirmed?', 'When the app shows Seat confirmed. If a cab already has free seats in the slot, that happens at once. If not, your interest waits until 4 seats fill and a local cab operator takes the trip.'],
      ['When do I get the cab and driver details?', '2 hours before pickup. You see the vehicle number, the driver name, and a chat with the driver. The driver never sees your phone number.'],
      ['How do I pay?', 'Pay the fixed seat price to the cab operator in the cab. You pay nothing in the app.'],
      ['What is the boarding code?', 'A code in the app that shows 1 hour before pickup. Give it to the driver when you get in. Without it, the trip cannot mark you as on board.'],
      ['Can I cancel?', 'Yes. Open the cab in Trips and cancel. A cancellation within 2 hours of pickup shows as a late cancel on your profile. If a cab does not go because seats did not fill, nothing counts against you.']
    ]
  },
  {
    id: 'driving',
    icon: IconHand,
    title: 'Offering a ride',
    items: [
      ['How do I publish a ride?', 'Add your vehicle and verify it. Then set the route, date, time, seats, luggage space, price per seat, and booking type.'],
      ['Why must my vehicle be verified?', 'We match each car to its registration. Riders then know which car to look for, and that it is the car on your profile.'],
      ['Can I choose who rides with me?', 'Yes. Use Request to book and accept each rider yourself. Use Instant book when you want seats to fill without a check.']
    ]
  },
  {
    id: 'safety',
    icon: IconShield,
    title: 'Safety',
    items: [
      ['What should I check before I get into the car?', 'Check that the driver, the car, and the number plate match the trip in the app. If anything does not match, do not get in.'],
      ['How do I report an unsafe experience?', 'Move to a safe place first. Then report the ride from the trip screen, or email support@fluxgo.in with the route, the date, and what happened.'],
      ['What is a trusted contact?', 'A person you save in the app before your first ride, so help is close if you need it during a trip.']
    ]
  },
  {
    id: 'account',
    icon: IconChat,
    title: 'Account and privacy',
    items: [
      ['How do I request a privacy change?', 'Open Profile → Help & Support in the app and write “Privacy request” in the subject. You can also email support@fluxgo.in.'],
      ['How do I delete my account?', 'Open your profile in the app and choose Delete account. You confirm it twice. Trip history can remain with an anonymous profile.'],
      ['What should I put in a support request?', 'Your account mobile number, the trip route, the date, the booking reference, and what you need. Never send passwords, one-time codes, or payment details.']
    ]
  }
];

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
              <h1 className="fx-page-title" id="support-title">Stuck between two cities? Start here.</h1>
              <p className="fx-hero-lede">Answers for bookings, shared cabs, rides, and your account. A real person reads every message we get.</p>
            </div>

            <a className="fx-sos" href="tel:112">
              <span className="fx-sos-ring" aria-hidden="true"><span>112</span></span>
              <span>
                <strong>In danger right now?</strong>
                <small>Call 112 first. Then tell us when you are safe.</small>
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
                <span className="fx-mono">0{index + 1}</span>
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
              <p className="fx-mono fx-arrive-kicker">Still stuck?</p>
              <h2 className="fx-h2" id="contact-title">Write to us. Give us the facts.</h2>
              <p className="fx-lede">In the app, open Profile → Help &amp; Support. Or email us with your trip details.</p>
              <a className="fx-contact-mail" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}<IconArrow width={20} height={20} /></a>
            </div>
            <ol className="fx-checklist">
              <li className="fx-mono">Before you send</li>
              <li><span>01</span>The trip route and date.</li>
              <li><span>02</span>Your booking reference, if you have one.</li>
              <li><span>03</span>No passwords, codes, or payment details.</li>
            </ol>
          </div>
          <p className="fx-contact-legal">Read how we handle your data in our <Link className="fx-link" href="/privacy-terms">Privacy Policy and Terms</Link>.</p>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
