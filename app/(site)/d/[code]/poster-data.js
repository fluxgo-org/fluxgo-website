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
    const active = body.state === 'ACTIVE' && typeof body.partner?.firstName === 'string';
    return {
      poster: {
        code,
        active,
        firstName: active ? body.partner.firstName.trim() : null,
        verified: active && body.verified === true,
        vehicles: active && Array.isArray(body.vehicles) ? body.vehicles.slice(0, 6).map(vehicleLine).filter(Boolean) : []
      }
    };
  } catch {
    return { unavailable: true, code };
  }
});

/** "Make Model •• 1234". */
function vehicleLine(vehicle) {
  const name = [vehicle?.make, vehicle?.model].filter((part) => typeof part === 'string' && part.trim()).map((part) => part.trim()).join(' ');
  const plate = typeof vehicle?.plateLast4 === 'string' ? vehicle.plateLast4.trim().toUpperCase() : '';
  if (!name && !plate) return null;
  return plate ? `${name} •• ${plate}`.trim() : name;
}

/** "482915" → "482 915". */
export function displayCode(code) {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}
