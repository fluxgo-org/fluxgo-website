'use client';

import { useEffect, useRef, useState } from 'react';
import StoreButtons from './StoreButtons';

const CYCLE_MS = 3200;

// Cities for the rotating headline. Hero copy by Gemini 4 Neon (2026-11-25).
const CITIES = ['Mysuru', 'Anantapur', 'Pune', 'Pondicherry', 'Vijayawada', 'Tirupati'];

export default function Hero() {
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);
  const video = useRef(null);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (reduced) return undefined;
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % CITIES.length), CYCLE_MS);
    return () => window.clearTimeout(timer);
  }, [index, reduced]);

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

      <div className="fx-wrap fx-hero-cine-copy">
        <h1 className="fx-hero-title" id="fx-hero-title">
          <span className="fx-sr">Heading to another city? Shared rides that show up.</span>
          <span aria-hidden="true">
            <span className="fx-hero-line">Heading to</span>
            <span className="fx-hero-slot">
              {CITIES.map((city, i) => (
                <span key={city} className={`fx-hero-city${i === index ? ' is-active' : ''}`}>{city}?</span>
              ))}
            </span>
            <span className="fx-hero-line fx-hero-line-soft">Shared rides that show up.</span>
          </span>
        </h1>

        <StoreButtons tone="dark" />
      </div>
    </section>
  );
}
