import Link from 'next/link';
import SiteHeader from './_components/SiteHeader';
import SiteFooter from './_components/SiteFooter';
import Hero from './_components/Hero';
import Stats from './_components/Stats';
import Journey, { Stop } from './_components/Journey';
import StoreButtons from './_components/StoreButtons';
import Reveal from './_components/Reveal';
import { PARTNER_URL } from './_components/links';
import {
  IconArrow, IconBag, IconBell, IconBolt, IconCab, IconCalendar, IconHand,
  IconPin, IconSeat, IconSwap, IconTick
} from './_components/Icons';

export const metadata = { alternates: { canonical: '/' } };

// Example listings for the mock screens. They are not live data.
const RESULTS = [
  { depart: '06:30', arrive: '11:30', duration: '5h 00m', driver: 'Arjun', rating: '4.9', price: 500, left: 2, instant: true },
  { depart: '09:00', arrive: '14:10', duration: '5h 10m', driver: 'Priya', rating: '4.8', price: 450, left: 1, instant: false, women: true },
  { depart: '17:45', arrive: '22:45', duration: '5h 00m', driver: 'Rahul', rating: 'New', price: 550, left: 3, instant: true }
];

const SLOTS = [
  { time: '06:00', wanted: 1 },
  { time: '08:00', wanted: 3 },
  { time: '10:00', wanted: 0 },
  { time: '16:00', wanted: 5, active: true },
  { time: '18:00', wanted: 2 },
  { time: '21:00', wanted: 1 }
];

const SLOT_TRAVELLERS = [
  { name: 'Ananya', facts: 'Female · 25–34' },
  { name: 'Ravi', facts: 'Male · 35–44' },
  { name: 'Guest of Ravi', facts: 'Female · 35–44', guest: true }
];

const CAB_STEPS = [
  ['Pick a slot', 'Free, and not a booking yet.'],
  ['Seat confirmed', 'Once 4 seats fill, an operator takes the trip.'],
  ['Cab details', 'Vehicle number and driver, 2 hours before pickup.'],
  ['Pay in the cab', 'Nothing to pay in the app.']
];

const TRUST_FACTS = [
  ['Verified phone', 'Every member, before their first ride.'],
  ['Work email badge', 'Hosts can accept verified members only.'],
  ['Women on board', 'See them before you book, or filter for them.'],
  ['Trusted contact', 'Saved before your first ride. Live location on the trip.']
];

const RELIABILITY_FACTS = [
  ['2 h', 'A shared cab is confirmed or called off 2 hours before pickup.'],
  ['1 code', 'Each cab seat gets a boarding code. No code, no boarding.'],
  ['On record', 'Late cancels and no-shows show on every profile.']
];

const PROFILE_FACTS = [
  ['Rating', '★ 4.9'],
  ['Trips', '18'],
  ['No-shows or late cancels', '0']
];

const CO_TRAVELLERS = [
  { name: 'Ananya', note: 'Work email verified', woman: true },
  { name: 'Divya', note: 'Verified', woman: true },
  { name: 'Karthik', note: 'Verified' }
];

const FAQ = [
  { q: 'Who can I travel with?', a: 'Only members with a verified phone. Hosts can also limit a ride to members with a verified work email.' },
  { q: 'What if someone does not show up?', a: 'Late cancels and no-shows go on the member’s profile, so everyone sees them before they book.' },
  { q: 'How does a shared cab work?', a: 'Pick an hourly slot. When 4 seats fill, a local cab operator takes the trip. You pay in the cab.' },
  { q: 'What if the cab does not fill?', a: 'We tell you before 2 hours to pickup, and nothing counts against you.' },
  { q: 'Which routes?', a: 'Carpools run anywhere a host publishes. Shared cabs run Bengaluru ↔ Anantapur for now.' },
  { q: 'Something feels wrong on a ride?', a: 'Call 112 if you are in danger. Then report the ride from the trip screen. We read every report.' }
];

export default function Home() {
  return (
    <>
      <a className="fx-skip" href="#main">Skip to content</a>
      <SiteHeader current="/" />
      <Reveal />

      <main id="main">
        <Hero />
        <Stats />

        <Journey>
          <Stop id="why" number="01" label="Why Fluxgo">
            <h2 className="fx-h2 fx-why-title" data-reveal id="why-title">Short trips between cities are hard.</h2>
            <div className="fx-facts">
              <div data-reveal><span className="fx-mono">Private buses</span><strong>Built for long routes</strong><p>Mostly overnight, at fixed times.</p></div>
              <div data-reveal style={{ '--d': '80ms' }}><span className="fx-mono">Cabs</span><strong>Too much on your own</strong><p>You pay for the whole car.</p></div>
              <div data-reveal style={{ '--d': '160ms' }}><span className="fx-mono">WhatsApp groups</span><strong>A gamble</strong><p>No idea who is coming, or if they will.</p></div>
            </div>
          </Stop>

          <Stop id="reliability" number="02" label="Reliability">
            <h2 className="fx-h2 fx-why-title" data-reveal id="reliability-title">Rides that actually leave.</h2>
            <div className="fx-facts fx-facts-num">
              {RELIABILITY_FACTS.map(([n, t], i) => (
                <div key={n} data-reveal style={{ '--d': `${i * 80}ms` }}><strong>{n}</strong><p>{t}</p></div>
              ))}
            </div>
            <div className="fx-ai" data-reveal>
              <span className="fx-mono">AI</span>
              <p><strong>Built to cut no-shows.</strong> We’re leveraging AI on ride and cancel history to flag likely no-shows early, and to match you with the right co-travellers.</p>
            </div>
          </Stop>

          <Stop id="trust" number="03" label="Trust">
            <div className="fx-stop-grid">
              <div className="fx-stop-copy" data-reveal>
                <h2 className="fx-h2" id="trust-title">Share rides with verified members only.</h2>
                <p className="fx-lede">See who is going before you book.</p>
                <dl className="fx-kv">
                  {TRUST_FACTS.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
                </dl>
              </div>

              <div className="fx-mock fx-mock-trust" data-reveal>
                <div className="fx-profile">
                  <div className="fx-profile-head">
                    <span className="fx-avatar fx-avatar-lg">A</span>
                    <div>
                      <strong>Ananya <IconTick className="fx-verified" /></strong>
                      <small>Work email verified · Software engineer</small>
                    </div>
                  </div>
                  <dl className="fx-profile-facts">
                    {PROFILE_FACTS.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
                  </dl>
                </div>
                <div className="fx-going">
                  <p className="fx-going-head"><span>Going on this ride</span><span className="fx-tag fx-tag-sm fx-tag-soft">2 women</span></p>
                  <ul>
                    {CO_TRAVELLERS.map((p) => (
                      <li key={p.name}>
                        <span className={`fx-avatar fx-avatar-sm${p.woman ? ' is-woman' : ''}`}>{p.name[0]}</span>
                        <span>{p.name}</span>
                        <small>{p.note}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Stop>

          <Stop id="find" number="04" label="Find a ride">
            <div className="fx-stop-grid">
              <div className="fx-stop-copy" data-reveal>
                <h2 className="fx-h2" id="find-title">Every car and cab going your way.</h2>
                <p className="fx-lede">Search a route and date. Compare times, prices, and hosts. Book a seat.</p>
                <p className="fx-aside"><IconBell width={18} height={18} /><span><strong>Nothing on your date?</strong> Turn on alerts. We’ll tell you when a ride is published.</span></p>
              </div>

              <div className="fx-mock fx-mock-find" data-reveal>
                <div className="fx-search">
                  <div className="fx-search-route">
                    <div className="fx-search-field"><span className="fx-search-dot" /><div><small>From</small><strong>Hyderabad</strong></div></div>
                    <div className="fx-search-field"><span className="fx-search-dot fx-search-dot-end" /><div><small>To</small><strong>Vijayawada</strong></div></div>
                    <span className="fx-search-swap"><IconSwap width={18} height={18} /></span>
                  </div>
                  <div className="fx-search-row">
                    <span><IconCalendar width={18} height={18} />Sat, 15 Nov</span>
                    <span><IconSeat width={18} height={18} />1 seat</span>
                  </div>
                </div>

                <div className="fx-tabs" aria-hidden="true">
                  <span className="is-on">Carpool <small>3</small></span>
                  <span><IconCab width={15} height={15} />Cab</span>
                </div>
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

          <Stop id="cab" number="05" label="Shared cabs">
            <div className="fx-stop-grid fx-stop-grid-flip">
              <div className="fx-stop-copy" data-reveal>
                <h2 className="fx-h2" id="cab-title">One seat in a shared cab.</h2>
                <p className="fx-lede">Pick an hourly slot. Local operators run the cabs. You pay in the cab, not in the app.</p>
                <ol className="fx-cab-steps">
                  {CAB_STEPS.map(([title, body], i) => (
                    <li key={title}>
                      <span className="fx-mono">0{i + 1}</span>
                      <div><strong>{title}</strong><p>{body}</p></div>
                    </li>
                  ))}
                </ol>
                <p className="fx-aside"><IconCab width={18} height={18} /><span><strong>Run cabs?</strong> Fill empty seats on your routes. <a className="fx-link" href={PARTNER_URL} target="_blank" rel="noopener noreferrer">Open the partner app</a></span></p>
              </div>

              <div className="fx-mock fx-mock-cab" data-reveal>
                <div className="fx-cab">
                  <div className="fx-cab-head">
                    <div>
                      <small>Thu, 13 Nov</small>
                      <strong>Bengaluru <IconArrow width={16} height={16} /> Anantapur</strong>
                    </div>
                  </div>

                  <div className="fx-slots" aria-hidden="true">
                    {SLOTS.map((s) => (
                      <span key={s.time} className={s.active ? 'is-on' : ''}>
                        <strong>{s.time}</strong>
                        <small>{s.wanted ? `${s.wanted} going` : 'Be first'}</small>
                      </span>
                    ))}
                  </div>

                  <div className="fx-slot-card">
                    <div className="fx-slot-top">
                      <div>
                        <strong>16:00 – 17:00</strong>
                        <small>From Marathahalli</small>
                      </div>
                      <div className="fx-slot-price"><strong>₹600</strong><small>per seat</small></div>
                    </div>
                    <div className="fx-slot-vehicle">
                      <IconCab width={20} height={20} />
                      <div><strong>Toyota Innova Crysta</strong><small>SUV · Diesel · White</small></div>
                    </div>
                    <div className="fx-slot-fill">
                      <span className="fx-seat-dots" aria-hidden="true">
                        {Array.from({ length: 7 }).map((_, i) => <i key={i} className={i < 5 ? 'is-taken' : 'is-free'} />)}
                      </span>
                      5 going · 2 seats left
                    </div>
                    <ul className="fx-slot-people">
                      {SLOT_TRAVELLERS.map((p) => (
                        <li key={p.name}>
                          <span className={`fx-avatar fx-avatar-sm${p.guest ? ' is-guest' : ''}`}>{p.name[0]}</span>
                          <span>{p.name}</span>
                          <small>{p.facts}</small>
                        </li>
                      ))}
                    </ul>
                    <span className="fx-publish-button">Send interest</span>
                  </div>
                </div>
              </div>
            </div>
          </Stop>

          <Stop id="offer" number="06" label="Offer a ride">
            <div className="fx-stop-grid">
              <div className="fx-stop-copy" data-reveal>
                <h2 className="fx-h2" id="offer-title">Driving anyway? Fill your empty seats.</h2>
                <p className="fx-lede">You choose who rides. Accept people one by one, or allow verified members only.</p>
                <p className="fx-aside"><IconPin width={18} height={18} /><span><strong>Know the demand.</strong> See how many people searched your route this week, day by day.</span></p>
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
                    <div className="fx-field"><small>Leaving</small><strong>Fri, 14 Nov · 07:00</strong></div>
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
                  <div className="fx-field fx-field-row">
                    <small>Who can book</small>
                    <span className="fx-luggage"><IconTick className="fx-verified" />Verified members only</span>
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

          <Stop id="questions" number="07" label="Questions">
            <div className="fx-faq-grid">
              <div data-reveal>
                <h2 className="fx-h2" id="questions-title">Questions.</h2>
                <p className="fx-lede">More on the <Link className="fx-link" href="/support">support page</Link>.</p>
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
                <h2 className="fx-h2">Get Fluxgo.</h2>
                <p className="fx-lede">iPhone, Android, or the web.</p>
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
