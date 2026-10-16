import Link from 'next/link';
import SiteHeader from './_components/SiteHeader';
import SiteFooter from './_components/SiteFooter';
import Hero from './_components/Hero';
import Journey, { Stop } from './_components/Journey';
import StoreButtons from './_components/StoreButtons';
import Reveal from './_components/Reveal';
import {
  IconArrow, IconBag, IconBolt, IconCalendar, IconClock, IconHand,
  IconPin, IconSeat, IconShield, IconSwap, IconTick
} from './_components/Icons';

export const metadata = { alternates: { canonical: '/' } };

const RESULTS = [
  { depart: '06:30', arrive: '11:25', duration: '4h 55m', driver: 'Arjun', rating: '4.9', price: 650, left: 2, instant: true },
  { depart: '09:00', arrive: '14:10', duration: '5h 10m', driver: 'Priya', rating: '4.8', price: 600, left: 1, instant: false, women: true },
  { depart: '17:45', arrive: '22:40', duration: '4h 55m', driver: 'Rahul', rating: 'New', price: 700, left: 3, instant: true }
];

const PILLARS = [
  {
    icon: IconShield,
    kicker: 'Trust',
    title: 'Know who is driving.',
    items: [
      ['Checked vehicles', 'Every car is matched to its registration before the driver can publish a ride.'],
      ['Verified numbers', 'Every member signs in with a verified mobile number.'],
      ['Work email badge', 'Members can verify a work email. You see the badge on their profile.'],
      ['Honest ratings', 'Riders and drivers rate each other after the trip. New members show as New.']
    ]
  },
  {
    icon: IconPin,
    kicker: 'Safety',
    title: 'Help, close at hand.',
    items: [
      ['Trusted contact', 'Save someone you trust before your first ride.'],
      ['Live location', 'While the ride is on, the trip shows where the car is.'],
      ['Women co-travellers', 'Filter for rides where at least one woman has a confirmed seat.'],
      ['Report a concern', 'Report any ride from the trip screen. Our team reads every report.']
    ]
  },
  {
    icon: IconClock,
    kicker: 'Reliability',
    title: 'The plan holds.',
    items: [
      ['Fixed seat price', 'The driver sets it before you book. Nothing to negotiate in the car.'],
      ['Clear booking', 'Instant book confirms at once. Request to book tells you it is waiting.'],
      ['Pickup in writing', 'Agree on the pickup point in chat, so nobody guesses on the day.'],
      ['A nudge before you go', 'A reminder reaches you one hour before departure.']
    ]
  }
];

const FAQ = [
  { q: 'How do I know a driver is genuine?', a: 'Each driver signs in with a verified mobile number and adds a vehicle that we match to its registration. Before you book, you see their ratings from past trips, their car, and a work email badge if they have one.' },
  { q: 'What if something feels wrong during a ride?', a: 'Ask to stop at a safe public place. If you are in danger, call 112. Your trusted contact is saved in the app, and you can report the ride from the trip screen. Our team reads every report.' },
  { q: 'Is Fluxgo a taxi service?', a: 'No. Drivers on Fluxgo are already making the trip. They share the empty seats and the cost of the road. Nobody drives for a fare.' },
  { q: 'Can I find a ride and offer one with the same account?', a: 'Yes. One account does both. Take a seat this weekend and offer yours the next.' },
  { q: 'Where can I get Fluxgo?', a: 'On the App Store for iPhone and on Google Play for Android. On a computer, open app.fluxgo.in in your browser.' }
];

export default function Home() {
  return (
    <>
      <a className="fx-skip" href="#main">Skip to content</a>
      <SiteHeader current="/" />
      <Reveal />

      <main id="main">
        <Hero />

        <Journey>
          <Stop id="find" number="01" label="Find a ride">
            <div className="fx-stop-grid">
              <div className="fx-stop-copy" data-reveal>
                <h2 className="fx-h2" id="find-title">No sold-out buses. No haggling at the pickup.</h2>
                <p className="fx-lede">Search your route and see every car going that day. Each ride shows when it leaves, the fixed price per seat, the car, and how past riders rated the driver.</p>
                <ol className="fx-steps">
                  <li><span className="fx-mono">01</span>Search your route and date.</li>
                  <li><span className="fx-mono">02</span>Compare times, prices, and drivers.</li>
                  <li><span className="fx-mono">03</span>Book, then settle the pickup in chat.</li>
                </ol>
              </div>

              <div className="fx-mock fx-mock-find" data-reveal>
                <div className="fx-search">
                  <div className="fx-search-route">
                    <div className="fx-search-field"><span className="fx-search-dot" /><div><small>From</small><strong>Bengaluru</strong></div></div>
                    <div className="fx-search-field"><span className="fx-search-dot fx-search-dot-end" /><div><small>To</small><strong>Hyderabad</strong></div></div>
                    <span className="fx-search-swap"><IconSwap width={18} height={18} /></span>
                  </div>
                  <div className="fx-search-row">
                    <span><IconCalendar width={18} height={18} />Sat, 18 Oct</span>
                    <span><IconSeat width={18} height={18} />1 seat</span>
                  </div>
                </div>

                <p className="fx-mock-caption fx-mono">3 rides · Bengaluru → Hyderabad</p>
                <ul className="fx-results">
                  {RESULTS.map((r, i) => (
                    <li key={r.depart} className="fx-result" style={{ '--d': `${160 + i * 90}ms` }}>
                      <div className="fx-result-times">
                        <strong>{r.depart}</strong>
                        <span className="fx-result-line"><i /></span>
                        <strong>{r.arrive}</strong>
                        <small>{r.duration}</small>
                      </div>
                      <div className="fx-result-side">
                        <strong>₹{r.price}</strong>
                        <small>{r.left} left</small>
                      </div>
                      <div className="fx-result-foot">
                        <span className="fx-avatar fx-avatar-sm">{r.driver[0]}</span>
                        <span>{r.driver}</span>
                        <IconTick className="fx-verified" />
                        <span className="fx-result-rating">{r.rating === 'New' ? 'New' : `★ ${r.rating}`}</span>
                        {r.women ? <span className="fx-tag fx-tag-sm fx-tag-soft">Women co-travellers</span> : null}
                        <span className={`fx-tag fx-tag-sm ${r.instant ? 'fx-tag-brand' : ''}`}>
                          {r.instant ? <IconBolt width={12} height={12} /> : <IconHand width={12} height={12} />}
                          {r.instant ? 'Instant' : 'Request'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Stop>

          <Stop id="trust" number="02" label="Before you get in">
            <div className="fx-trust-head" data-reveal>
              <h2 className="fx-h2" id="trust-title">Getting into a car with someone new is a big ask.</h2>
              <p className="fx-lede">So the answers come first. Who is driving, what they drive, what you pay, and who to call. All of it before you leave home.</p>
            </div>
            <div className="fx-pillars">
              {PILLARS.map(({ icon: Icon, kicker, title, items }, i) => (
                <article key={kicker} className="fx-pillar" data-reveal style={{ '--d': `${i * 90}ms` }}>
                  <div className="fx-pillar-head">
                    <span className="fx-pillar-icon"><Icon /></span>
                    <span className="fx-mono">{kicker}</span>
                  </div>
                  <h3>{title}</h3>
                  <ul>
                    {items.map(([name, body]) => (
                      <li key={name}><strong>{name}</strong><span>{body}</span></li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </Stop>

          <Stop id="offer" number="03" label="Offer a ride">
            <div className="fx-stop-grid fx-stop-grid-flip">
              <div className="fx-stop-copy" data-reveal>
                <h2 className="fx-h2" id="offer-title">Driving home anyway? Split the fuel with good company.</h2>
                <p className="fx-lede">Publish the trip you were already making. Set the time, the seats, the luggage space, and the price per seat. Then choose how people join.</p>
                <div className="fx-split-points">
                  <div><span><IconHand /></span><p><strong>Request to book</strong>See each profile. Accept who you want.</p></div>
                  <div><span><IconBolt /></span><p><strong>Instant book</strong>Seats fill without you lifting a finger.</p></div>
                </div>
              </div>

              <div className="fx-mock fx-mock-offer" data-reveal>
                <div className="fx-publish">
                  <div className="fx-publish-head">
                    <span className="fx-mono">Publish a ride</span>
                    <span className="fx-verified-pill"><IconTick className="fx-verified" />Vehicle verified</span>
                  </div>
                  <div className="fx-publish-route">
                    <div><small>From</small><strong>Pune</strong></div>
                    <span className="fx-publish-arrow"><IconArrow width={18} height={18} /></span>
                    <div><small>To</small><strong>Mumbai</strong></div>
                  </div>
                  <div className="fx-publish-grid">
                    <div className="fx-field"><small>Leaving</small><strong>Fri, 24 Oct · 07:00</strong></div>
                    <div className="fx-field"><small>Price per seat</small><strong>₹420</strong></div>
                  </div>
                  <div className="fx-field fx-field-row">
                    <small>Seats</small>
                    <div className="fx-seat-picker" aria-hidden="true">
                      {[1, 2, 3, 4].map((n) => <span key={n} className={n <= 3 ? 'is-on' : ''}><IconSeat width={16} height={16} /></span>)}
                    </div>
                  </div>
                  <div className="fx-field fx-field-row">
                    <small>Luggage</small>
                    <span className="fx-luggage"><IconBag width={16} height={16} />One cabin bag each</span>
                  </div>
                  <div className="fx-segment" aria-hidden="true">
                    <span><IconBolt width={14} height={14} />Instant</span>
                    <span className="is-on"><IconHand width={14} height={14} />Request</span>
                  </div>
                  <span className="fx-publish-button">Publish ride</span>
                </div>
              </div>
            </div>
          </Stop>

          <Stop id="idea" number="04" label="The idea">
            <p className="fx-statement" data-reveal id="idea-title">
              Not a taxi. Not a bus. <em>A car that was already going your way</em>, with a seat saved for you.
            </p>
            <div className="fx-facts">
              <div data-reveal><span className="fx-mono">You pay</span><strong>A share, not a fare</strong><p>Drivers split the cost of a trip they were making anyway.</p></div>
              <div data-reveal style={{ '--d': '80ms' }}><span className="fx-mono">You get</span><strong>One account</strong><p>Take a seat today. Offer yours tomorrow. No switching.</p></div>
              <div data-reveal style={{ '--d': '160ms' }}><span className="fx-mono">You go</span><strong>City to city</strong><p>Made for the long road between cities, not trips across town.</p></div>
            </div>
          </Stop>

          <Stop id="questions" number="05" label="Questions">
            <div className="fx-faq-grid">
              <div data-reveal>
                <h2 className="fx-h2" id="questions-title">Fair questions.</h2>
                <p className="fx-lede">Ask us anything else on the <Link className="fx-link" href="/support">support page</Link>.</p>
              </div>
              <div className="fx-faq" data-reveal>
                {FAQ.map((item, i) => (
                  <details key={item.q} open={i === 0}>
                    <summary>{item.q}<span className="fx-faq-icon" aria-hidden="true" /></summary>
                    <p>{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </Stop>

          <div className="fx-arrive" id="download">
            <div className="fx-arrive-pin" data-reveal aria-hidden="true"><IconPin width={22} height={22} /></div>
            <div className="fx-arrive-card" data-reveal>
              <div className="fx-arrive-copy">
                <p className="fx-mono fx-arrive-kicker">You have arrived</p>
                <h2 className="fx-h2">Your seat is waiting.</h2>
                <p className="fx-lede">Get Fluxgo on iPhone or Android.</p>
                <StoreButtons tone="dark" />
              </div>
            </div>
          </div>
        </Journey>
      </main>

      <SiteFooter />
    </>
  );
}
