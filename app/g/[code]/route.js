import { marketingCode, marketingTarget } from '../../../lib/marketing-links';

const API_BASE_URL = (process.env.FLUXGO_API_URL || process.env.NEXT_PUBLIC_FLUXGO_API_URL || 'https://api.fluxgo.in').replace(/\/+$/, '');

/**
 * www.fluxgo.in/g/<code>: a marketing link from the admin portal. Sends the visitor to the target page with the
 * link's share ID and tags. An unknown, archived, or broken link goes to the home page.
 */
export async function GET(request, { params }) {
  const { code: raw } = await params;
  const code = marketingCode(raw);
  let target = null;
  if (code) {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/public/marketing-links/${code}`, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) target = marketingTarget(await response.json());
    } catch {
      target = null;
    }
  }
  return new Response(null, {
    status: 302,
    headers: { Location: new URL(target ?? '/', request.url).toString(), 'Cache-Control': 'no-store' }
  });
}
