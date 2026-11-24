'use client';

import { useEffect, useState } from 'react';

// Travelling / Driving switch for the carpool section.
// The header links /#find and /#offer open the matching side.
export default function CarpoolSwitch({ tabs, panels }) {
  const [side, setSide] = useState(0);

  useEffect(() => {
    const fromHash = () => {
      if (window.location.hash === '#offer') setSide(1);
      if (window.location.hash === '#find') setSide(0);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);

  const onKey = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = side === 0 ? 1 : 0;
    setSide(next);
    document.getElementById(`hx-carpool-tab-${next}`)?.focus();
  };

  return (
    <div className="hx-carpool">
      <div className="hx-switch" role="tablist" aria-label="Carpool" style={{ '--side': side }}>
        <span className="hx-switch-thumb" aria-hidden="true" />
        {tabs.map((label, i) => (
          <button
            key={label}
            id={`hx-carpool-tab-${i}`}
            type="button"
            role="tab"
            aria-selected={side === i}
            aria-controls={`hx-carpool-panel-${i}`}
            tabIndex={side === i ? 0 : -1}
            onClick={() => setSide(i)}
            onKeyDown={onKey}
          >
            {label}
          </button>
        ))}
      </div>
      {panels.map((panel, i) => (
        <div
          key={i}
          id={`hx-carpool-panel-${i}`}
          role="tabpanel"
          aria-labelledby={`hx-carpool-tab-${i}`}
          className="hx-carpool-panel"
          hidden={side !== i}
        >
          {panel}
        </div>
      ))}
    </div>
  );
}
