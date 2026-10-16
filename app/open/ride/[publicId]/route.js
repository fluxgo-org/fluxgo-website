import { deviceKind, normalizeRideId } from '../../../../lib/app-links';
import { APP_STORE_URL, PLAY_STORE_URL, WEB_APP_URL } from '../../../(site)/_components/links';

/**
 * Target of the "Open in app" button. When the app is installed, the phone
 * opens Fluxgo before this runs. Otherwise send the visitor to the right store.
 * A computer has no app, so it goes to the web app.
 */
export async function GET(request, { params }) {
  const { publicId } = await params;
  const id = normalizeRideId(publicId);
  const kind = deviceKind(request.headers.get('user-agent') ?? '');
  const target = kind === 'ios'
    ? APP_STORE_URL
    : kind === 'android'
      ? PLAY_STORE_URL
      : id ? `${WEB_APP_URL}/trip/${id}` : WEB_APP_URL;
  return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'no-store' } });
}
