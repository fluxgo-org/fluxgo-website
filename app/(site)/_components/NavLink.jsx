'use client';

// A plain link. When it points to the page you are on (no #section), it scrolls
// to the top in place of a reload, which would keep the old scroll position.
export default function NavLink({ href, onClick, ...rest }) {
  const handleClick = (event) => {
    onClick?.(event);
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    const url = new URL(href, window.location.href);
    if (url.origin === window.location.origin && url.pathname === window.location.pathname && !url.hash) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  return <a {...rest} href={href} onClick={handleClick} />;
}
