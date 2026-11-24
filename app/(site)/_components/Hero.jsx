'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import StoreButtons from './StoreButtons';

const CYCLE_MS = 3000;

// Hero copy by Gemini 4 Neon (2026-11-25).
const CITIES = ['Mysuru', 'Anantapur', 'Pune', 'Pondicherry', 'Vijayawada', 'Tirupati'];

export default function Hero() {
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [slotWidth, setSlotWidth] = useState(null);
  const video = useRef(null);
  const cityRefs = useRef([]);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (reduced) return undefined;
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % CITIES.length), CYCLE_MS);
    return () => window.clearTimeout(timer);
  }, [index, reduced]);

  // The city slot takes the width of the city on show, so the line stays centred.
  useLayoutEffect(() => {
    const measure = () => setSlotWidth(cityRefs.current[index]?.offsetWidth ?? null);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [index]);

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

  return (
    <section className="fx-hero fx-hero-cine" aria-labelledby="fx-hero-title">
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

      <div className="fx-wrap fx-hero-block">
        <h1 className="fx-hero-title" id="fx-hero-title">Intercity ride sharing.</h1>

        <p className="fx-hero-sub">
          <span className="fx-sr">Heading to another city? Book a fixed-price seat with verified travellers.</span>
          <span aria-hidden="true">
            Heading to{' '}
            <span className="fx-hero-slot" style={slotWidth ? { width: `${slotWidth}px` } : undefined}>
              {CITIES.map((city, i) => (
                <span
                  key={city}
                  ref={(el) => { cityRefs.current[i] = el; }}
                  className={`fx-hero-city${i === index ? ' is-active' : ''}`}
                >
                  {city}
                </span>
              ))}
            </span>
            ? Book a fixed-price seat with verified travellers.
          </span>
        </p>

        <StoreButtons tone="dark" />
      </div>

      <div className="fx-hero-road" aria-hidden="true"><span /></div>
    </section>
  );
}
