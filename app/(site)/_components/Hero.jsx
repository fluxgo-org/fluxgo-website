'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import StoreButtons from './StoreButtons';
import { IconBolt, IconCab, IconHand, IconTick } from './Icons';

const CYCLE_MS = 4200;

// Example rides for the hero. They show how a listing looks; they are not live data.
const RIDES = [
  { to: 'Mysuru', from: 'Bengaluru', fromCode: 'BLR', toCode: 'MYS', depart: '07:15', arrive: '10:00', duration: '2h 45m', price: 280, left: 3, seats: 3, instant: false, driver: 'Meera', car: 'Tata Nexon', shape: 1 },
  { to: 'Anantapur', from: 'Bengaluru', fromCode: 'BLR', toCode: 'ATP', depart: '16:00', arrive: '20:10', duration: '4h 10m', price: 600, left: 2, seats: 7, cab: true, car: 'Toyota Innova Crysta', shape: 0 },
  { to: 'Pune', from: 'Mumbai', fromCode: 'BOM', toCode: 'PNQ', depart: '18:30', arrive: '21:45', duration: '3h 15m', price: 420, left: 2, seats: 4, instant: false, driver: 'Riya', car: 'Honda City', shape: 1 },
  { to: 'Pondicherry', from: 'Chennai', fromCode: 'MAA', toCode: 'PNY', depart: '08:00', arrive: '11:10', duration: '3h 10m', price: 350, left: 1, seats: 3, instant: true, driver: 'Karthik', car: 'Maruti Baleno', shape: 2 },
  { to: 'Vijayawada', from: 'Hyderabad', fromCode: 'HYD', toCode: 'VGA', depart: '09:30', arrive: '14:40', duration: '5h 10m', price: 550, left: 3, seats: 3, instant: false, driver: 'Sneha', car: 'Toyota Glanza', shape: 0 },
  { to: 'Tirupati', from: 'Bengaluru', fromCode: 'BLR', toCode: 'TPTY', depart: '06:00', arrive: '10:45', duration: '4h 45m', price: 500, left: 2, seats: 3, instant: true, driver: 'Arjun', car: 'Hyundai i20', shape: 2 }
];

const SHAPES = [
  { d: 'M28 96 C 92 96, 104 34, 164 46 S 250 100, 292 30', a: [28, 96], b: [292, 30] },
  { d: 'M28 64 C 76 18, 128 112, 186 66 S 258 34, 292 56', a: [28, 64], b: [292, 56] },
  { d: 'M28 36 C 86 36, 100 100, 160 86 S 244 22, 292 80', a: [28, 36], b: [292, 80] }
];

function RouteMap({ ride, still }) {
  const shape = SHAPES[ride.shape];
  const motion = useRef(null);

  // SMIL runs on the document clock, so start the drive when this card mounts.
  useLayoutEffect(() => {
    if (!still) motion.current?.beginElement?.();
  }, [still]);

  return (
    <div className="fx-ride-map">
      <svg viewBox="0 0 320 128" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <pattern id="fx-dots" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1" fill="rgba(228,228,221,0.09)" />
          </pattern>
          <linearGradient id="fx-route-grad" x1="0" x2="1">
            <stop offset="0" stopColor="#E4E4DD" />
            <stop offset="1" stopColor="#B4E2AE" />
          </linearGradient>
        </defs>
        <rect width="320" height="128" fill="url(#fx-dots)" />
        <path d={shape.d} fill="none" stroke="rgba(180,226,174,0.16)" strokeWidth="10" strokeLinecap="round" />
        <path className="fx-ride-path" d={shape.d} fill="none" stroke="url(#fx-route-grad)" strokeWidth="3" strokeLinecap="round" pathLength="1" />
        <circle cx={shape.a[0]} cy={shape.a[1]} r="6" fill="#171714" stroke="#E4E4DD" strokeWidth="2.5" />
        <circle cx={shape.b[0]} cy={shape.b[1]} r="7" fill="#B4E2AE" />
        <circle cx={shape.b[0]} cy={shape.b[1]} r="2.5" fill="#102A1B" />
        {still ? null : (
          <g className="fx-ride-car">
            <circle r="9" fill="rgba(180,226,174,0.22)" />
            <circle r="4.5" fill="#FFFFFF" />
            <animateMotion ref={motion} begin="indefinite" dur={`${CYCLE_MS - 300}ms`} fill="freeze" path={shape.d} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.25 1" />
          </g>
        )}
      </svg>
      <span className="fx-ride-code fx-ride-code-a">{ride.fromCode}</span>
      <span className="fx-ride-code fx-ride-code-b">{ride.toCode}</span>
    </div>
  );
}

export default function Hero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (paused || reduced) return undefined;
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % RIDES.length), CYCLE_MS);
    return () => window.clearTimeout(timer);
  }, [index, paused, reduced]);

  const ride = RIDES[index];

  return (
    <section className="fx-hero" aria-labelledby="fx-hero-title">
      <div className="fx-hero-glow" aria-hidden="true" />
      <svg className="fx-hero-contours" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <path
            key={n}
            d={`M-40 ${520 - n * 46} C 220 ${420 - n * 52}, 420 ${640 - n * 40}, 660 ${500 - n * 44} S 1040 ${330 - n * 30}, 1260 ${420 - n * 46}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        ))}
      </svg>

      <div className="fx-wrap fx-hero-grid">
        <div className="fx-hero-copy">
          <h1 className="fx-hero-title" id="fx-hero-title">
            <span className="fx-sr">Going to another city? Someone already is.</span>
            <span aria-hidden="true">
              <span className="fx-hero-line">Going to</span>
              <span className="fx-hero-slot">
                {RIDES.map((item, i) => (
                  <span key={item.to} className={`fx-hero-city${i === index ? ' is-active' : ''}`}>{item.to}?</span>
                ))}
              </span>
              <span className="fx-hero-line fx-hero-line-soft">Someone already is.</span>
            </span>
          </h1>

          <p className="fx-hero-lede">
            Reliable intercity rides. Share a ride with verified members, in a carpool or a shared cab.
          </p>

          <StoreButtons tone="dark" />

        </div>

        <div
          className="fx-hero-stage"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <div className="fx-ride-deck" aria-hidden="true"><span /><span /></div>
          <article className="fx-ride" aria-label={`Example ${ride.cab ? 'shared cab' : 'ride'} from ${ride.from} to ${ride.to}`} key={index}>
            <RouteMap ride={ride} still={reduced} />
            <div className="fx-ride-body">
              <div className="fx-ride-top">
                {ride.cab ? (
                  <span className="fx-tag fx-tag-cab"><IconCab width={14} height={14} />Shared cab</span>
                ) : (
                  <span className={`fx-tag ${ride.instant ? 'fx-tag-brand' : ''}`}>
                    {ride.instant ? <IconBolt width={14} height={14} /> : <IconHand width={14} height={14} />}
                    {ride.instant ? 'Instant book' : 'Request to book'}
                  </span>
                )}
              </div>
              <div className="fx-ride-times">
                <div><strong>{ride.depart}</strong><span>{ride.from}</span></div>
                <div className="fx-ride-dur"><span>{ride.duration}</span></div>
                <div className="fx-ride-end"><strong>{ride.arrive}</strong><span>{ride.to}</span></div>
              </div>
              <div className="fx-ride-tear" aria-hidden="true" />
              <div className="fx-ride-foot">
                <div className="fx-ride-driver">
                  {ride.cab ? (
                    <>
                      <span className="fx-avatar fx-avatar-cab"><IconCab width={20} height={20} /></span>
                      <div>
                        <strong>{ride.car}</strong>
                        <small>SUV · Local cab operator</small>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="fx-avatar">{ride.driver[0]}</span>
                      <div>
                        <strong>{ride.driver} <IconTick className="fx-verified" /></strong>
                        <small>{ride.car} · Verified vehicle</small>
                      </div>
                    </>
                  )}
                </div>
                <div className="fx-ride-price"><strong>₹{ride.price}</strong><small>per seat</small></div>
              </div>
              <div className="fx-ride-seats">
                <span className="fx-seat-dots" aria-hidden="true">
                  {Array.from({ length: ride.seats }).map((_, i) => <i key={i} className={i < ride.left ? 'is-free' : ''} />)}
                </span>
                {ride.left} of {ride.seats} seats left
              </div>
            </div>
          </article>

          <div className="fx-ride-picker" role="group" aria-label="Choose an example city">
            {RIDES.map((item, i) => (
              <button
                key={item.to}
                type="button"
                className={i === index ? 'is-active' : ''}
                aria-pressed={i === index}
                aria-label={item.to}
                onClick={() => setIndex(i)}
                style={{ '--cycle': `${CYCLE_MS}ms` }}
              >
                <span />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fx-hero-road" aria-hidden="true"><span /></div>
    </section>
  );
}
