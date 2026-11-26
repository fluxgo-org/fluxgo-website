import { cache } from 'react';
import { normalizePosterCode } from '../../../../lib/link-tracking';

const API_BASE_URL = (process.env.FLUXGO_API_URL || process.env.NEXT_PUBLIC_FLUXGO_API_URL || 'https://api.fluxgo.in').replace(/\/+$/, '');

/**
 * Load the public view of a partner poster code. Returns `{ poster }`, `{ notFound: true }`, or
 * `{ unavailable: true, code }` when the API cannot answer now. Cached for one request, so the page and its
 * metadata share one call.
 */
export const loadPoster = cache(async (rawCode) => {
  const code = normalizePosterCode(rawCode);
  if (!code) return { notFound: true };
  try {
    const response = await fetch(`${API_BASE_URL}/v1/public/posters/${code}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 }
    });
    if (response.status === 404) return { notFound: true };
    if (!response.ok) return { unavailable: true, code };
    const body = await response.json();
    if (body?.state !== 'ACTIVE' && body?.state !== 'INACTIVE') return { unavailable: true, code };
    // An empty first name is shown as a code that is not active, so no title starts with a blank name.
    const firstName = typeof body.partner?.firstName === 'string' ? body.partner.firstName.trim() : '';
    const active = body.state === 'ACTIVE' && firstName.length > 0;
    return { poster: { code, active, firstName: active ? firstName : null } };
  } catch {
    return { unavailable: true, code };
  }
});

/** "482915" → "482 915". */
export function displayCode(code) {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}
