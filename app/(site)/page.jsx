import Link from 'next/link';
import SiteHeader from './_components/SiteHeader';
import SiteFooter from './_components/SiteFooter';
import Hero from './_components/Hero';
import Stats from './_components/Stats';
import StoreButtons from './_components/StoreButtons';
import Reveal from './_components/Reveal';
import CarpoolSwitch from './_components/CarpoolSwitch';
import { PARTNER_URL } from './_components/links';
import {
  IconArrow, IconBag, IconBell, IconBolt, IconCab, IconCalendar, IconHand,
  IconPin, IconSeat, IconShield, IconSwap
} from './_components/Icons';
import VerifiedMark from './_components/VerifiedMark';

export const metadata = { alternates: { canonical: '/' } };

// Copy below was written by Gemini 4 Neon (2026-11-25) from the approved fact list.
// Mock screens use example data. They are not live data.

const COMPARE_COLS = ['Fluxgo', 'Private buses', 'Solo cab', 'WhatsApp groups', 'Other carpool apps'];
// 1 = yes, 0 = no. The first value is Fluxgo.
const COMPARE_ROWS = [
  ['Leaves at a time you choose', [1, 0, 1, 0, 1]],
  ['Pay only for your seat', [1, 1, 0, 1, 1]],
  ['See who is coming before booking', [1, 0, 0, 0, 1]],
  ['Work email badge', [1, 0, 0, 0, 0]],
  ['Shared cab with checked operators', [1, 0, 0, 0, 0]]
];

const REL_POINTS = [
  ['Record on every profile', 'No-shows and late cancels are shown on every profile, even when the count is 0.'],
  ['Four reliability levels', 'New, Regular, Trusted or Super reliable, based on kept rides, ratings and tags.'],
  ['Two-way blind reviews', 'Both sides rate within 10 days. Reviews stay hidden until both submit or 10 days pass.'],
  ['Clear status and reminders', 'Instant book confirms at once; requests wait. A reminder goes 1 hour before.']
];

const LEVELS = ['New', 'Regular', 'Trusted', 'Super reliable'];

const REVIEWS = [
  { name: 'Ananya', day: 'Sat, 8 Nov', tags: ['Right on time', 'Safe driving'] },
  { name: 'Karthik', day: 'Fri, 31 Oct', tags: ['Great company'] }
];

const TRUST_FACTS = [
  ['Work email badge', 'Verify your work email. Hosts can require verified members.'],
  ['Profiles upfront', 'See profession, bio and who is going before you book.'],
  ['Women on board', 'See women on board and filter for women co-travellers.'],
  ['Live trip sharing', 'Save a trusted contact, share live location, or report.']
];

const CO_TRAVELLERS = [
  { name: 'Divya', note: 'Work email verified' },
  { name: 'Ananya', note: 'Verified' },
  { name: 'Karthik', note: 'Verified' }
];

const RESULTS = [
  { depart: '06:30', arrive: '11:30', duration: '5h 00m', driver: 'Arjun', rating: '4.9', price: 500, left: 2, instant: true },
  { depart: '09:00', arrive: '14:10', duration: '5h 10m', driver: 'Priya', rating: '4.8', price: 450, left: 1, instant: false, women: true },
  { depart: '17:45', arrive: '22:45', duration: '5h 00m', driver: 'Rahul', rating: '4.7', price: 550, left: 3, instant: true }
];

const CAB_CHECKS = [
  'Driving licence',
  'RC in official vehicle records',
  'Vehicle insurance',
  'Driver and vehicle photos',
  'Commercial yellow-board only'
];

const CAB_HOW = [
  ['Pick an hour', 'Choose a window like 6 to 7 AM and book one seat.'],
  ['Get cab details', 'Receive vehicle number, driver details and a boarding code.'],
  ['Pay in the cab', 'Pay a fixed price in the cab. Free cancel 4 hours before.']
];

const CAB_HOURS = ['5–6 AM', '6–7 AM', '7–8 AM', '8–9 AM'];

const INVITE_STEPS = [
  "100 Credits: friend's first 50+ km ride",
  '100 Credits: 3 rides in 60 days, 3 days, 2+ hosts',
  "100 Credits: friend's first hosted ride"
];

const FAQ = [
  { q: 'Who can I travel with on Fluxgo?', a: 'Fellow travellers whose profession, bio, work email badge and ratings you see before booking. Filter for women co-travellers; hosts can accept verified members only.' },
  { q: 'What happens if someone does not show up?', a: 'Every profile displays no-shows and late cancels, even when 0. We also use AI on ride and cancel history to flag likely no-shows early, and send a 1-hour reminder.' },
  { q: 'What if I feel unsafe on a ride?', a: 'Save a trusted contact before your first ride and share your live trip location. Call 112 if in danger. Report any concern from the trip screen; we read every report.' },
  { q: 'Which routes does Fluxgo cover?', a: 'Carpools run on any route a host publishes, and you can set a ride alert if your date is empty. Shared cabs run Bengaluru to Anantapur for now.' },
  { q: 'How does a shared cab work?', a: 'Pick an hourly window and book one seat at a fixed price. You get cab details and a boarding code before pickup. Pay in the cab. Free cancel up to 4 hours before pickup.' },
  { q: 'How are cabs and operators checked?', a: 'Before any booking, our team reviews driving licence, RC in official records, insurance, and driver and cab photos. Yellow-board cabs only, with expiry dates tracked.' },
  { q: 'How do ratings and reviews work?', a: 'Both sides can rate and review within 10 days of a ride. Reviews stay hidden until both submit or 10 days pass, so nobody rates in reply. They feed into member levels.' },
  { q: 'How do invites and Fluxgo Credits work?', a: 'Invite up to 5 friends. You each earn 100 Credits on their first 50+ km ride, 3 rides in 60 days (3 days, 2+ hosts) and first host ride. Up to half a Fluxgo Cab seat.' }
];

function Check({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
      <path d="m5 10.5 3.2 3.2L15 6.8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Cross({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <path d="m6 6 8 8M14 6l-8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SectionHead({ id, eyebrow, title, sub, align = 'left', tone = 'light' }) {
  return (
    <div className={`hx-head hx-head-${align} hx-head-${tone}`} data-reveal>
      {eyebrow ? <p className="hx-eyebrow">{eyebrow}</p> : null}
      <h2 className="fx-h2" id={`${id}-title`}>{title}</h2>
      {sub ? <p className="fx-lede">{sub}</p> : null}
    </div>
  );
}

function TravelPanel() {
  return (
    <div className="hx-split">
      <div className="hx-split-copy">
        <h3 className="hx-h3">Pick a seat at a fixed price</h3>
        <p className="hx-body">Search a route and date, compare times, hosts, ratings and host-set fixed prices, then book your seat.</p>
        <p className="hx-note"><IconBell width={18} height={18} /><span><strong>Nothing on your date?</strong> Turn on a ride alert to hear as soon as a ride is published.</span></p>
      </div>
      <div className="fx-mock hx-mock" data-reveal aria-hidden="true">
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
        <ul className="fx-results hx-results">
          {RESULTS.map((r) => (
            <li key={r.depart} className="fx-result">
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
                <VerifiedMark size={16} />
                <span className="fx-result-rating">★ {r.rating}</span>
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
  );
}

function DrivePanel() {
  return (
    <div className="hx-split">
      <div className="hx-split-copy">
        <h3 className="hx-h3">Publish a ride, control every seat</h3>
        <p className="hx-body">Set route, time, seats, price and luggage. Choose Instant or Request, or allow verified members only.</p>
        <p className="hx-note"><IconPin width={18} height={18} /><span><strong>Vehicle check and demand</strong> Official records verify your car. See daily searches for your route.</span></p>
      </div>
      <div className="fx-mock hx-mock" data-reveal aria-hidden="true">
        <div className="fx-publish">
          <div className="fx-publish-head">
            <span className="fx-mono">Publish a ride</span>
            <span className="hx-vehicle-pill"><IconShield width={14} height={14} />Vehicle verified</span>
          </div>
          <div className="fx-publish-route">
            <div><small>From</small><strong>Pune</strong></div>
            <span className="fx-publish-arrow"><IconArrow width={18} height={18} /></span>
            <div><small>To</small><strong>Mumbai</strong></div>
          </div>
          <div className="fx-publish-grid">
            <div className="fx-field"><small>Leaving</small><strong>Fri, 14 Nov, 07:00</strong></div>
            <div className="fx-field"><small>Price per seat</small><strong>₹420</strong></div>
          </div>
          <div className="fx-field fx-field-row">
            <small>Seats</small>
            <div className="fx-seat-picker">
              {[1, 2, 3, 4].map((n) => <span key={n} className={n <= 3 ? 'is-on' : ''}><IconSeat width={16} height={16} /></span>)}
            </div>
          </div>
          <div className="fx-field fx-field-row">
            <small>Luggage</small>
            <span className="fx-luggage"><IconBag width={16} height={16} />One cabin bag each</span>
          </div>
          <div className="fx-field fx-field-row">
            <small>Who can book</small>
            <span className="fx-luggage"><VerifiedMark size={16} />Verified members only</span>
          </div>
          <div className="fx-segment">
            <span><IconBolt width={14} height={14} />Instant</span>
            <span className="is-on"><IconHand width={14} height={14} />Request</span>
          </div>
          <span className="fx-publish-button">Publish ride</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <a className="fx-skip" href="#main">Skip to content</a>
      <SiteHeader current="/" />
      <Reveal />

      <main id="main">
        <Hero />
        <Stats />

        {/* Why: comparison */}
        <section className="hx-sec" id="why" aria-labelledby="why-title">
          <div className="fx-wrap">
            <SectionHead
              id="why"
              eyebrow="Why Fluxgo"
              title="Short intercity trips force bad trade-offs"
              sub="Fixed overnight buses, full-car cab fares, or WhatsApp groups where people may not show."
            />
            <div className="hx-compare-scroll" data-reveal>
              <table className="hx-compare">
                <caption className="fx-sr">How Fluxgo compares with other ways to travel between cities</caption>
                <thead>
                  <tr>
                    <td />
                    {COMPARE_COLS.map((col, i) => (
                      <th key={col} scope="col" className={i === 0 ? 'is-fx' : ''}>
                        {i === 0 ? <span className="hx-compare-brand">fluxgo<span>.</span></span> : col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map(([label, marks]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      {marks.map((yes, i) => (
                        <td key={i} className={i === 0 ? 'is-fx' : ''}>
                          {yes ? <Check className="hx-yes" /> : <Cross className="hx-no" />}
                          <span className="fx-sr">{yes ? 'Yes' : 'No'}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Two products */}
        <section className="hx-sec hx-sec-tight" id="ways" aria-labelledby="ways-title">
          <div className="fx-wrap">
            <SectionHead id="ways" title="Two ways to travel between cities" />
            <div className="hx-ways">
              <a className="hx-way hx-way-carpool" href="#carpool" data-reveal>
                <div className="hx-way-copy">
                  <h3>Carpool</h3>
                  <p>Share a car a host is already driving, on any route a host publishes.</p>
                </div>
                <div className="hx-way-visual" aria-hidden="true">
                  <div className="hx-mini-ride">
                    <div><strong>06:30</strong><i /><strong>11:30</strong></div>
                    <span>₹500</span>
                  </div>
                  <div className="hx-mini-ride is-back">
                    <div><strong>09:00</strong><i /><strong>14:10</strong></div>
                    <span>₹450</span>
                  </div>
                </div>
                <span className="hx-way-go" aria-hidden="true"><IconArrow width={18} height={18} /></span>
              </a>
              <a className="hx-way hx-way-cab" href="#cab" data-reveal style={{ '--d': '90ms' }}>
                <div className="hx-way-copy">
                  <h3>Shared cab</h3>
                  <p>Book one seat with a checked local operator. Bengaluru to Anantapur for now.</p>
                </div>
                <div className="hx-way-visual" aria-hidden="true">
                  <div className="hx-mini-hours">
                    {CAB_HOURS.map((h, i) => <span key={h} className={i === 1 ? 'is-on' : ''}>{h}</span>)}
                  </div>
                </div>
                <span className="hx-way-go" aria-hidden="true"><IconArrow width={18} height={18} /></span>
              </a>
            </div>
          </div>
        </section>

        {/* Reliability */}
        <section className="hx-sec hx-dark" id="reliability" aria-labelledby="reliability-title">
          <div className="fx-wrap hx-rel">
            <div className="hx-rel-copy">
              <SectionHead
                id="reliability"
                tone="dark"
                eyebrow="Reliability"
                title="Rides you can plan around"
                sub="No-shows and late cancels are visible on every profile, backed by blind reviews and clear booking status."
              />
              <ul className="hx-points">
                {REL_POINTS.map(([t, b], i) => (
                  <li key={t} data-reveal style={{ '--d': `${i * 70}ms` }}>
                    <strong>{t}</strong>
                    <p>{b}</p>
                  </li>
                ))}
              </ul>
              <p className="hx-ai" data-reveal><span>AI</span>We&rsquo;re leveraging AI on ride and cancel history to flag likely no-shows early and match you with the right co-travellers.</p>
            </div>

            <div className="hx-record" data-reveal aria-hidden="true">
              <div className="hx-record-card">
                <div className="hx-record-head">
                  <span className="fx-avatar hx-avatar-lg">M</span>
                  <div>
                    <strong>Meera <VerifiedMark size={18} /></strong>
                    <small>Product designer</small>
                  </div>
                </div>
                <div className="hx-level">
                  <div className="hx-level-top"><span>Level</span><strong>Super reliable</strong></div>
                  <div className="hx-level-bar">{LEVELS.map((l) => <i key={l} />)}</div>
                </div>
                <dl className="hx-record-stats">
                  <div><dt>Rating</dt><dd>4.9</dd></div>
                  <div><dt>No-shows</dt><dd>0</dd></div>
                  <div><dt>Late cancels</dt><dd>0</dd></div>
                </dl>
              </div>
              <ul className="hx-reviews">
                {REVIEWS.map((r) => (
                  <li key={r.name}>
                    <div className="hx-review-top">
                      <span className="fx-avatar fx-avatar-sm">{r.name[0]}</span>
                      <strong>{r.name}</strong>
                      <span className="hx-stars">★★★★★</span>
                      <small>{r.day}</small>
                    </div>
                    <div className="hx-review-tags">{r.tags.map((t) => <span key={t}>{t}</span>)}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="hx-sec" id="trust" aria-labelledby="trust-title">
          <div className="fx-wrap hx-trust">
            <div className="hx-profile" data-reveal aria-hidden="true">
              <div className="hx-profile-card">
                <div className="hx-profile-top">
                  <span className="fx-avatar hx-avatar-xl">D</span>
                  <div>
                    <strong>Divya <VerifiedMark size={18} /></strong>
                    <small>Software engineer</small>
                  </div>
                </div>
                <p className="hx-profile-bio">Bengaluru software engineer. I carpool home on weekends.</p>
                <div className="hx-profile-badges">
                  <span><VerifiedMark size={16} />Work email verified</span>
                </div>
              </div>
              <div className="hx-going">
                <p className="hx-going-head"><span>Going on this ride</span><span className="fx-tag fx-tag-sm fx-tag-soft">2 women</span></p>
                <ul>
                  {CO_TRAVELLERS.map((p) => (
                    <li key={p.name}>
                      <span className="fx-avatar fx-avatar-sm">{p.name[0]}</span>
                      <span>{p.name}</span>
                      <small>{p.note}</small>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="hx-trust-copy">
              <SectionHead
                id="trust"
                eyebrow="Trust"
                title="Know who you are riding with"
                sub="See work email badges, professions, two-way reviews and no-shows before you book."
              />
              <dl className="hx-facts">
                {TRUST_FACTS.map(([t, b], i) => (
                  <div key={t} data-reveal style={{ '--d': `${i * 70}ms` }}><dt>{t}</dt><dd>{b}</dd></div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* Carpool */}
        <section className="hx-sec hx-tinted" id="carpool" aria-labelledby="carpool-title">
          <span className="hx-anchor" id="find" aria-hidden="true" />
          <span className="hx-anchor" id="offer" aria-hidden="true" />
          <div className="fx-wrap">
            <SectionHead id="carpool" eyebrow="Carpool" title="Share a car a host is already driving" align="center" />
            <div data-reveal>
              <CarpoolSwitch tabs={['Travelling', 'Driving']} panels={[<TravelPanel key="t" />, <DrivePanel key="d" />]} />
            </div>
          </div>
        </section>

        {/* Shared cab */}
        <section className="hx-sec" id="cab" aria-labelledby="cab-title">
          <div className="fx-wrap">
            <SectionHead
              id="cab"
              eyebrow="Shared cab"
              title="Book one seat in a checked cab"
              sub="Pick an hourly window, pay a fixed seat price in the cab. Bengaluru to Anantapur for now."
            />
            <div className="hx-cab">
              <div className="hx-checks" data-reveal>
                <h3 className="hx-h3">Checked before a single booking</h3>
                <ul>
                  {CAB_CHECKS.map((c) => <li key={c}><Check className="hx-yes" />{c}</li>)}
                </ul>
                <p>Our team reviews every document and tracks expiry dates. Operators carry a cancel record.</p>
              </div>

              <div className="hx-ticket" data-reveal style={{ '--d': '90ms' }} aria-hidden="true">
                <div className="hx-ticket-top">
                  <div className="hx-ticket-partner">
                    <span className="fx-avatar hx-avatar-lg">R</span>
                    <div>
                      <strong>Ravi <VerifiedMark kind="partner" size={22} label="Verified partner" /></strong>
                      <small>Verified partner</small>
                    </div>
                  </div>
                  <div className="hx-ticket-rating"><strong>★ 4.8</strong><small>0 cancels</small></div>
                </div>
                <div className="hx-ticket-route">
                  <div><small>Thu, 13 Nov</small><strong>Bengaluru</strong></div>
                  <span className="hx-ticket-line"><IconCab width={18} height={18} /></span>
                  <div><small>6–7 AM</small><strong>Anantapur</strong></div>
                </div>
                <div className="hx-ticket-seats">
                  <span className="fx-seat-dots">
                    {Array.from({ length: 7 }).map((_, i) => <i key={i} className={i >= 5 ? 'is-free' : ''} />)}
                  </span>
                  2 of 7 seats left
                </div>
                <div className="hx-ticket-tear" />
                <div className="hx-ticket-foot">
                  <div><small>Vehicle</small><strong>Toyota Innova Crysta</strong></div>
                  <div><small>Price per seat</small><strong>₹600</strong></div>
                  <div><small>Boarding code</small><strong className="hx-code">4821</strong></div>
                </div>
              </div>
            </div>

            <ul className="hx-how">
              {CAB_HOW.map(([t, b], i) => (
                <li key={t} data-reveal style={{ '--d': `${i * 70}ms` }}><strong>{t}</strong><p>{b}</p></li>
              ))}
            </ul>
            <p className="hx-partner" data-reveal><span>Cab operator? Fill empty seats through the Fluxgo partner app.</span> <a className="fx-link" href={PARTNER_URL} target="_blank" rel="noopener noreferrer">Open partner app</a></p>
          </div>
        </section>

        {/* Invite */}
        <section className="hx-sec hx-sec-tight" id="invite" aria-labelledby="invite-title">
          <div className="fx-wrap">
            <div className="hx-invite" data-reveal>
              <div className="hx-invite-copy">
                <h2 className="hx-h2s" id="invite-title">Invite friends, earn Fluxgo Credits</h2>
                <p>Share your code (up to 5 friends). You each earn up to 300 Fluxgo Credits, covering up to half a Fluxgo Cab seat.</p>
              </div>
              <ul className="hx-invite-steps">
                {INVITE_STEPS.map((s) => (
                  <li key={s}><img src="/assets/fluxgo-credits-coin-3d.png" alt="" width="22" height="22" />{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Questions */}
        <section className="hx-sec" id="questions" aria-labelledby="questions-title">
          <div className="fx-wrap hx-faq">
            <div className="hx-faq-head" data-reveal>
              <h2 className="fx-h2" id="questions-title">Common questions</h2>
              <p className="fx-lede">Need more help? Visit the <Link className="fx-link" href="/support">support page</Link>.</p>
            </div>
            <div className="fx-faq hx-faq-list" data-reveal>
              {FAQ.map((item, i) => (
                <details key={item.q} open={i === 0}>
                  <summary>{item.q}<span className="fx-faq-icon" aria-hidden="true" /></summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="hx-sec hx-sec-end" id="download" aria-label="Get Fluxgo">
          <div className="fx-wrap">
            <div className="fx-arrive-card" data-reveal>
              <div className="fx-arrive-copy">
                <h2 className="fx-h2">Get Fluxgo.</h2>
                <p className="fx-lede">iPhone, Android, or web.</p>
                <StoreButtons tone="dark" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
