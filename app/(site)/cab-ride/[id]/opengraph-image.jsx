import { ImageResponse } from 'next/og';
import { TYPE_LABELS, cabDate, cabTime, cabWindow, closedCopy, loadCabRide, rupees } from './cab-data';

export const alt = 'Fluxgo Cab ride';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 60;

const HERO = '#102A1B';
const MINT = '#B4E2AE';
const ON_DARK = '#E9F0EA';
const MUTED = 'rgba(233, 240, 234, 0.7)';
const LINE = 'rgba(233, 240, 234, 0.18)';

/** The WhatsApp preview card: route, day, start window, pickups, seats left, and price. Same layout as the partner app card. */
export default async function Image({ params }) {
  const { id } = await params;
  const { ride } = await loadCabRide(id);

  if (!ride) {
    return new ImageResponse(
      (<div style={{ display: 'flex', width: '100%', height: '100%', background: HERO, color: ON_DARK, alignItems: 'center', justifyContent: 'center', fontSize: 84, fontWeight: 700 }}>fluxgo<span style={{ color: MINT }}>.</span></div>),
      size
    );
  }

  const closed = closedCopy(ride);
  const first = ride.pickups[0];
  const pickups = ride.pickups.slice(0, 3).map((point) => `${cabTime(point.windowStart)} ${point.name}`).join('  ·  ');
  const car = ride.vehicle ? [ride.vehicle.model, TYPE_LABELS[ride.vehicle.type]].filter(Boolean).join(' · ') : null;
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: HERO, color: ON_DARK, padding: '56px 72px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>fluxgo<span style={{ color: MINT }}>.</span></div>
            <div style={{ display: 'flex', marginLeft: 20, padding: '8px 18px', borderRadius: 999, border: `2px solid ${MINT}`, color: MINT, fontSize: 26, fontWeight: 700, letterSpacing: 2 }}>CAB</div>
          </div>
          <div style={{ display: 'flex', fontSize: 32, color: ON_DARK, fontWeight: 600 }}>{cabDate(ride.slotStart)}{first ? ` · ${cabWindow(first.windowStart, first.windowEnd)}` : ''}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 96, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05 }}>
            <span>{ride.from}</span><span style={{ color: MINT, margin: '0 28px' }}>→</span><span>{ride.to}</span>
          </div>
          <div style={{ display: 'flex', marginTop: 22, fontSize: 32, color: MUTED }}>Pickup  {pickups}</div>
          {car ? <div style={{ display: 'flex', marginTop: 10, fontSize: 30, color: MUTED }}>{car}</div> : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `2px solid ${LINE}`, paddingTop: 28 }}>
          {closed ? (
            <div style={{ display: 'flex', fontSize: 40, fontWeight: 600, color: MINT }}>{closed.title}</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', background: MINT, color: HERO, borderRadius: 999, padding: '14px 30px', fontSize: 42, fontWeight: 700 }}>{rupees(ride.price)} a seat</div>
              <div style={{ display: 'flex', marginLeft: 28, fontSize: 38, color: ON_DARK, fontWeight: 600 }}>{ride.seatsLeft} {ride.seatsLeft === 1 ? 'seat' : 'seats'} left</div>
            </div>
          )}
          <div style={{ display: 'flex', fontSize: 28, color: MUTED }}>Verified driver · Pay in cash</div>
        </div>
      </div>
    ),
    size
  );
}
