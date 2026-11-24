'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Wordmark from './Wordmark';

// What visitors come to do. Always visible on wide screens.
const PRIMARY = [
  { href: '/#find', label: 'Find a ride' },
  { href: '/#offer', label: 'Offer a ride' },
  { href: '/#cab', label: 'Shared cabs' }
];

// Why Fluxgo is dependable, and help. Inside the menu on wide screens.
const MORE_LABEL = 'Safety';
const MORE = [
  { href: '/#reliability', label: 'Reliability' },
  { href: '/#trust', label: 'Trust' },
  { href: '/support', label: 'Support' }
];

const NAV = [...PRIMARY, ...MORE];

export default function SiteHeader({ current, solid = false }) {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const more = useRef(null);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const onDown = (event) => { if (!more.current?.contains(event.target)) setMoreOpen(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [moreOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    const onKey = (event) => { if (event.key === 'Escape') { setOpen(false); setMoreOpen(false); } };
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
          {PRIMARY.map((item) => (
            <Link key={item.href} href={item.href} aria-current={current === item.href ? 'page' : undefined}>
              {item.label}
            </Link>
          ))}
          <div
            className={`fx-header-more${moreOpen ? ' is-open' : ''}`}
            ref={more}
            onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setMoreOpen(false); }}
          >
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-controls="fx-header-more-menu"
              data-current={MORE.some((item) => item.href === current) ? 'true' : undefined}
              onClick={() => setMoreOpen((value) => !value)}
            >
              {MORE_LABEL}
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="fx-header-more-menu" id="fx-header-more-menu" hidden={!moreOpen}>
              {MORE.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={current === item.href ? 'page' : undefined}
                  onClick={() => setMoreOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
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
