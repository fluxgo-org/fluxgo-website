'use client';

import { useEffect, useRef, useState } from 'react';
import StoreButtons from './StoreButtons';
import VerifiedMark from './VerifiedMark';
import { IconBolt, IconCab, IconHand } from './Icons';

const CYCLE_MS = 4200;

// Example seats for the pass. They are not live data. Hero copy by Gemini 4 Neon (2026-11-25).
const PASSES = [
  { from: 'Bengaluru', fromCode: 'BLR', to: 'Mysuru', toCode: 'MYS', day: 'Sat, 29 Nov', time: '07:15', host: 'Meera', vehicle: 'Tata Nexon', seat: '2', price: 280, left: '1 of 3', instant: false },
  { from: 'Bengaluru', fromCode: 'BLR', to: 'Anantapur', toCode: 'ATP', day: 'Fri, 28 Nov', time: '6–7 AM', host: 'Ravi', vehicle: 'Toyota Innova Crysta', seat: '4', price: 600, code: '7310', cab: true },
  { from: 'Hyderabad', fromCode: 'HYD', to: 'Vijayawada', toCode: 'VGA', day: 'Sun, 30 Nov', time: '09:30', host: 'Sneha', vehicle: 'Toyota Glanza', seat: '1', price: 550, left: '2 of 3', instant: true },
  { from: 'Chennai', fromCode: 'MAA', to: 'Pondicherry', toCode: 'PNY', day: 'Sat, 29 Nov', time: '08:00', host: 'Karthik', vehicle: 'Maruti Baleno', seat: '3', price: 350, left: '2 of 4', instant: false }
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
          <h1 className="fx-hero-title" id="fx-hero-title">Intercity rides, held to account.</h1>
          <p className="fx-hero-sub">Fixed seat prices, checked operators. Every profile lists a work badge, reviews, and no-shows.</p>
          <StoreButtons tone="dark" />
        </div>

        <div
          className="fx-pass-stage"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <p className="fx-pass-label">Sample seat pass</p>
          <article className="fx-pass" key={index} aria-label={`Example seat from ${pass.from} to ${pass.to}`}>
            <div className="fx-pass-main">
              <div className="fx-pass-top">
                {pass.cab ? (
                  <span className="fx-tag fx-tag-cab"><IconCab width={14} height={14} />Shared cab</span>
                ) : (
                  <span className={`fx-tag ${pass.instant ? 'fx-tag-brand' : ''}`}>
                    {pass.instant ? <IconBolt width={14} height={14} /> : <IconHand width={14} height={14} />}
                    {pass.instant ? 'Instant book' : 'Request to book'}
                  </span>
                )}
                <span>{pass.day}, {pass.time}</span>
              </div>
              <div className="fx-pass-route">
                <div><strong>{pass.fromCode}</strong><span>{pass.from}</span></div>
                <span className="fx-pass-line" aria-hidden="true"><i /></span>
                <div><strong>{pass.toCode}</strong><span>{pass.to}</span></div>
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
              </div>
            </div>
            <div className="fx-pass-stub">
              <div><small>Seat</small><strong>{pass.seat}</strong></div>
              <div><small>Price per seat</small><strong>₹{pass.price}</strong></div>
              {pass.cab ? (
                <div><small>Boarding code</small><strong className="fx-pass-code">{pass.code}</strong></div>
              ) : (
                <div><small>Seats left</small><strong>{pass.left}</strong></div>
              )}
            </div>
          </article>
          <div className="fx-pass-dots" aria-hidden="true">
            {PASSES.map((p, i) => <span key={p.toCode} className={i === index ? 'is-on' : ''} />)}
          </div>
        </div>
      </div>

      <div className="fx-hero-road" aria-hidden="true"><span /></div>
    </section>
  );
}
