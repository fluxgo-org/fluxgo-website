'use client';

import { useEffect, useRef, useState } from 'react';
import { STATS } from './stats';

function useCountUp(target, run) {
  const [value, setValue] = useState(target);

  useEffect(() => {
    // The server renders the final number, so it shows without JavaScript.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setValue(target); return undefined; }
    if (!run) { setValue(0); return undefined; }
    let frame = 0;
    const start = performance.now();
    const duration = 1100;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [target, run]);

  return value;
}

function Stat({ stat, run, index }) {
  const value = useCountUp(stat.value, run);
  return (
    <li className="fx-stat" style={{ '--d': `${index * 80}ms` }}>
      <strong aria-hidden="true">{value}{stat.suffix}</strong>
      <span className="fx-sr">{stat.value}{stat.suffix} {stat.label}</span>
      <span className="fx-stat-label" aria-hidden="true">{stat.label}</span>
      <small>{stat.note}</small>
    </li>
  );
}

// The numbers band under the hero. Values come from stats.js.
export default function Stats() {
  const ref = useRef(null);
  const [run, setRun] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || !('IntersectionObserver' in window)) { setRun(true); return undefined; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setRun(true); observer.disconnect(); }
    }, { threshold: 0.4 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="fx-stats" aria-label="Fluxgo in numbers" ref={ref}>
      <div className="fx-wrap">
        <ul className="fx-stats-row">
          {STATS.map((stat, i) => <Stat key={stat.label} stat={stat} run={run} index={i} />)}
        </ul>
      </div>
    </section>
  );
}
