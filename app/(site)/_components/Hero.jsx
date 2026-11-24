'use client';

import { useEffect, useRef, useState } from 'react';
import StoreButtons from './StoreButtons';
import VerifiedMark from './VerifiedMark';
import { IconBolt, IconCab, IconHand } from './Icons';

const CYCLE_MS = 4200;

// Example seats for the pass and the headline cities. They are not live data.
// Headline wording from the owner; the rest of the hero copy by Gemini 4 Neon (2026-11-25).
const PASSES = [
  { from: 'Bengaluru', fromCode: 'BLR', to: 'Mysuru', toCode: 'MYS', day: 'Sat, 29 Nov', depart: '07:15', arrive: '10:00', duration: '2h 45m', host: 'Meera', vehicle: 'Tata Nexon', rating: '4.9', record: '0 no-shows', seat: '2', price: 280, left: 1, seats: 3, instant: false },
  { from: 'Bengaluru', fromCode: 'BLR', to: 'Anantapur', toCode: 'ATP', day: 'Fri, 28 Nov', depart: '6–7 AM', arrive: '10–11 AM', duration: '4h 10m', host: 'Ravi', vehicle: 'Toyota Innova Crysta', rating: '4.8', record: '0 cancels', seat: '4', price: 600, code: '7310', cab: true },
  { from: 'Hyderabad', fromCode: 'HYD', to: 'Vijayawada', toCode: 'VGA', day: 'Sun, 30 Nov', depart: '09:30', arrive: '14:40', duration: '5h 10m', host: 'Sneha', vehicle: 'Toyota Glanza', rating: '4.8', record: '0 no-shows', seat: '1', price: 550, left: 2, seats: 3, instant: true },
  { from: 'Chennai', fromCode: 'MAA', to: 'Pondicherry', toCode: 'PNY', day: 'Sat, 29 Nov', depart: '08:00', arrive: '11:10', duration: '3h 10m', host: 'Karthik', vehicle: 'Maruti Baleno', rating: '4.7', record: '0 no-shows', seat: '3', price: 350, left: 2, seats: 4, instant: false }
];

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
          <p className="fx-hero-sub">Book reliable rides with car owners or shared seats from verified cab operators at fixed prices.</p>
          <StoreButtons tone="dark" />
        </div>

        <div
          className={`fx-pass-stage${paused ? ' is-paused' : ''}`}
          style={{ '--cycle': `${CYCLE_MS}ms` }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <article className="fx-pass" aria-label={`Example seat from ${pass.from} to ${pass.to}`}>
            <div className="fx-pass-main fx-pass-anim" key={`m${index}`}>
              <div className="fx-pass-top">
                {pass.cab ? (
                  <span className="fx-tag fx-tag-cab"><IconCab width={14} height={14} />Shared cab</span>
                ) : (
                  <span className={`fx-tag ${pass.instant ? 'fx-tag-brand' : ''}`}>
                    {pass.instant ? <IconBolt width={14} height={14} /> : <IconHand width={14} height={14} />}
                    {pass.instant ? 'Instant book' : 'Request to book'}
                  </span>
                )}
                <span>{pass.day}</span>
              </div>

              <div className="fx-pass-route">
                <div>
                  <strong>{pass.fromCode}</strong>
                  <b>{pass.depart}</b>
                  <span>{pass.from}</span>
                </div>
                <div className="fx-pass-line" aria-hidden="true">
                  <span className="fx-pass-track"><i /></span>
                  <em>{pass.duration}</em>
                </div>
                <div>
                  <strong>{pass.toCode}</strong>
                  <b>{pass.arrive}</b>
                  <span>{pass.to}</span>
                </div>
              </div>

              <div className="fx-pass-host">
                <span className="fx-avatar">{pass.host[0]}</span>
                <div>
                  <strong>
                    {pass.host}{' '}
                    <VerifiedMark kind={pass.cab ? 'partner' : 'member'} size={pass.cab ? 20 : 18} label={pass.cab ? 'Verified partner' : 'Verified'} />
                  </strong>
                  <small>{pass.vehicle}</small>
                </div>
                <div className="fx-pass-record">
                  <strong>★ {pass.rating}</strong>
                  <small>{pass.record}</small>
                </div>
              </div>
            </div>

            <div className="fx-pass-stub fx-pass-anim" key={`s${index}`}>
              <div><small>Seat</small><strong>{pass.seat}</strong></div>
              <div><small>Price per seat</small><strong>₹{pass.price}</strong></div>
              {pass.cab ? (
                <div><small>Boarding code</small><strong className="fx-pass-code">{pass.code}</strong></div>
              ) : (
                <div>
                  <small>Seats left</small>
                  <strong className="fx-pass-seats">
                    <span className="fx-seat-dots">
                      {Array.from({ length: pass.seats }).map((_, i) => <i key={i} className={i < pass.left ? 'is-free' : ''} />)}
                    </span>
                    {pass.left}
                  </strong>
                </div>
              )}
            </div>
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
