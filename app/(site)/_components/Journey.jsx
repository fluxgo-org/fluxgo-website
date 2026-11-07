'use client';

import { useEffect, useRef } from 'react';

// The route rail that runs down the page. Scroll position drives the fill and the car.
export default function Journey({ children }) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const anchor = window.innerHeight * 0.55;
      const progress = Math.min(1, Math.max(0, (anchor - rect.top) / rect.height));
      node.style.setProperty('--p', progress.toFixed(4));
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="fx-journey" ref={ref}>
      <div className="fx-rail" aria-hidden="true">
        <span className="fx-rail-track" />
        <span className="fx-rail-fill" />
        <span className="fx-rail-car">
          <svg viewBox="0 0 24 40" width="20" height="34">
            <rect x="2" y="2" width="20" height="36" rx="8" fill="#102A1B" />
            <rect x="5" y="9" width="14" height="8" rx="3" fill="#B4E2AE" />
            <rect x="5" y="26" width="14" height="6" rx="2.5" fill="#B4E2AE" opacity="0.6" />
          </svg>
        </span>
      </div>
      {children}
    </div>
  );
}

export function Stop({ id, number, label, children, className = '' }) {
  return (
    <section className={`fx-stop ${className}`} id={id} aria-labelledby={`${id}-title`}>
      <div className="fx-stop-node" data-reveal aria-hidden="true">
        <span className="fx-stop-dot" />
      </div>
      <p className="fx-stop-label fx-mono" data-reveal>
        {label}
      </p>
      {children}
    </section>
  );
}
