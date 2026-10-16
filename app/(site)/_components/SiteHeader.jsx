'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Wordmark from './Wordmark';

const NAV = [
  { href: '/#find', label: 'Find a ride' },
  { href: '/#trust', label: 'Safety' },
  { href: '/#offer', label: 'Offer a ride' },
  { href: '/support', label: 'Support' }
];

export default function SiteHeader({ current, solid = false }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const close = () => setOpen(false);

  return (
    <header className={`fx-header${scrolled || solid ? ' is-scrolled' : ''}${open ? ' is-open' : ''}`} id="top">
      <div className="fx-header-bar">
        <Link className="fx-header-brand" href="/" aria-label="Fluxgo home" onClick={close}>
          <Wordmark />
        </Link>

        <nav className="fx-header-nav" aria-label="Primary">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} aria-current={current === item.href ? 'page' : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>

        <a className="fx-header-cta" href="/#download">
          Get the app
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3 9 9 3M4 3h5v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>

        <button
          className="fx-header-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="fx-mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          <span /><span />
        </button>
      </div>

      <nav className="fx-mobile-nav" id="fx-mobile-nav" aria-label="Mobile" hidden={!open}>
        {NAV.map((item, index) => (
          <Link key={item.href} href={item.href} onClick={close} style={{ '--i': index }}>
            <span className="fx-mono">0{index + 1}</span>
            {item.label}
          </Link>
        ))}
        <a className="fx-mobile-cta" href="/#download" onClick={close}>
          Get the app
        </a>
      </nav>
    </header>
  );
}
