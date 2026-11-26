import { APPLE_APP_ID, appLinkPathsFor } from '../../../lib/app-links';

// The paths depend on the host (go.fluxgo.in adds /d/*), so this file is made for each request.
export const dynamic = 'force-dynamic';

/** iOS reads this file without redirects to decide which links open Fluxgo. */
export function GET(request) {
  const body = {
    applinks: {
      details: [
        {
          appIDs: [APPLE_APP_ID],
          components: appLinkPathsFor(request.headers.get('host') ?? '').map((path) => ({ '/': path }))
        }
      ]
    }
  };
  return Response.json(body, { headers: { 'Cache-Control': 'public, max-age=3600', Vary: 'Host' } });
}
