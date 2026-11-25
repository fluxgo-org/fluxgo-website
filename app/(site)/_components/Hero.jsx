'use client';

import { useEffect, useRef, useState } from 'react';
import StoreButtons from './StoreButtons';
import VerifiedMark from './VerifiedMark';
import { CAB_ENABLED, cabCopy } from '../../../lib/site-flags';

const CYCLE_MS = 4200;

// Example seats for the pass and the headline cities. They are not live data.
// Headline wording from the owner; the rest of the hero copy by Gemini 4 Neon (2026-11-25).
const ALL_PASSES = [
  { from: 'Bengaluru', fromCode: 'BLR', to: 'Anantapur', toCode: 'ATP', day: 'Fri, 28 Nov', depart: '6–7 AM', arrive: '10–11 AM', duration: '4h 10m', host: 'Ravi', vehicle: 'Innova Crysta', rating: '4.8', record: '0 cancels', seat: '4', price: 600, code: '7310', cab: true, instant: true },
  { from: 'Hyderabad', fromCode: 'HYD', to: 'Vijayawada', toCode: 'VGA', day: 'Sun, 30 Nov', depart: '09:30', arrive: '14:40', duration: '5h 10m', host: 'Sneha', vehicle: 'Toyota Glanza', rating: '4.8', record: '0 no-shows', seat: '1', price: 550, left: 2, seats: 3, instant: true },
  { from: 'Chennai', fromCode: 'MAA', to: 'Pondicherry', toCode: 'PNY', day: 'Sat, 29 Nov', depart: '08:00', arrive: '11:10', duration: '3h 10m', host: 'Karthik', vehicle: 'Maruti Baleno', rating: '4.7', record: '0 no-shows', seat: '3', price: 350, left: 2, seats: 4, instant: false },
  { from: 'Mumbai', fromCode: 'BOM', to: 'Pune', toCode: 'PNQ', day: 'Sat, 29 Nov', depart: '18:30', arrive: '21:45', duration: '3h 15m', host: 'Riya', vehicle: 'Honda City', rating: '4.9', record: '0 no-shows', seat: '2', price: 420, left: 1, seats: 3, instant: false }
];
// The cab seat leaves the cycle while the site hides cabs.
const PASSES = CAB_ENABLED ? ALL_PASSES : ALL_PASSES.filter((pass) => !pass.cab);

// Cab-free line by Gemini 4 Neon (2026-11-26).
const SUB = cabCopy(
  'Book a seat on reliable rides with car owners or verified cab operators. Driving? Share empty seats and costs.',
  'Book a seat on reliable rides with car owners. Driving? Share empty seats and costs.'
);

export default function Hero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const video = useRef(null);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (paused || reduced) return undefined;
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % PASSES.length), CYCLE_MS);
    return () => window.clearTimeout(timer);
  }, [index, paused, reduced]);

  // Reduced motion: stop the background video on its first frame.
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (reduced) {
      el.pause();
      el.currentTime = 0;
    } else {
      el.play?.().catch(() => {});
    }
  }, [reduced]);

  const pass = PASSES[index];

  return (
    <section className="fx-hero fx-hero-pass" aria-labelledby="fx-hero-title">
      <video
        ref={video}
        className="fx-hero-video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/assets/hero/fluxgo-hero-poster.jpg"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src="/assets/hero/fluxgo-hero.webm" type="video/webm" />
        <source src="/assets/hero/fluxgo-hero.mp4" type="video/mp4" />
      </video>
      <div className="fx-hero-shade" aria-hidden="true" />

      <div className="fx-wrap fx-hero-grid">
        <div className="fx-hero-copy">
          <h1 className="fx-hero-title" id="fx-hero-title">
            <span className="fx-sr">Travelling between cities?</span>
            <span aria-hidden="true">
              <span className="fx-hero-line">Travelling from</span>
              <span className="fx-hero-slot">
                {PASSES.map((p, i) => (
                  <span key={p.toCode} className={`fx-hero-city${i === index ? ' is-active' : ''}`}>{p.from} to {p.to}?</span>
                ))}
              </span>
            </span>
          </h1>
          <p className="fx-hero-sub">{SUB}</p>
          <StoreButtons tone="dark" />
        </div>

        <div
          className={`fx-pass-stage${paused ? ' is-paused' : ''}`}
          style={{ '--cycle': `${CYCLE_MS}ms` }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <article className="fx-pass" aria-label={`Example ${pass.cab ? 'shared cab' : 'carpool'} seat from ${pass.from} to ${pass.to}`}>
            <div className="fx-pass-main fx-pass-anim" key={`m${index}`}>
              <div className="fx-pass-top">
                <span>{pass.cab ? 'Shared cab' : 'Carpool'}</span>
                <span>{pass.day}</span>
              </div>

              <div className="fx-pass-route">
                <div className="fx-pass-end">
                  <strong>{pass.fromCode}</strong>
                  <b>{pass.depart}</b>
                  <span>{pass.from}</span>
                </div>
                <div className="fx-pass-line" aria-hidden="true">
                  <span className="fx-pass-track"><i /></span>
                  <em>{pass.duration}</em>
                </div>
                <div className="fx-pass-end">
                  <strong>{pass.toCode}</strong>
                  <b>{pass.arrive}</b>
                  <span>{pass.to}</span>
                </div>
              </div>

              <dl className="fx-pass-grid">
                <div>
                  <dt>{pass.cab ? 'Operator' : 'Host'}</dt>
                  <dd>
                    <span className="fx-pass-name">
                      {pass.host}
                      <VerifiedMark kind={pass.cab ? 'partner' : 'member'} size={pass.cab ? 18 : 16} label={pass.cab ? 'Verified partner' : 'Verified'} />
                    </span>
                    <small>{pass.vehicle}</small>
                  </dd>
                </div>
                <div>
                  <dt>Rating</dt>
                  <dd>{pass.rating}<small>{pass.record}</small></dd>
                </div>
                <div>
                  <dt>Booking</dt>
                  <dd>{pass.instant ? 'Instant' : 'Request'}</dd>
                </div>
              </dl>
            </div>

            <dl className="fx-pass-stub fx-pass-grid fx-pass-anim" key={`s${index}`}>
              <div><dt>Seat</dt><dd>{pass.seat}</dd></div>
              <div><dt>Price per seat</dt><dd>₹{pass.price}</dd></div>
              {pass.cab ? (
                <div><dt>Boarding code</dt><dd className="fx-pass-code">{pass.code}</dd></div>
              ) : (
                <div><dt>Seats left</dt><dd>{pass.left} of {pass.seats}</dd></div>
              )}
            </dl>
          </article>

          <div className="fx-pass-progress" aria-hidden="true">
            {PASSES.map((p, i) => (
              <span key={p.toCode} className={i === index ? 'is-on' : i < index ? 'is-done' : ''}><i key={i === index ? `on${index}` : 'off'} /></span>
            ))}
          </div>
        </div>
      </div>

      <div className="fx-hero-road" aria-hidden="true"><span /></div>
    </section>
  );
}
