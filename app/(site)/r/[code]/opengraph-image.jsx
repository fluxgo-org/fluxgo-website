import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { normalizeInviteCode } from '../../../../lib/app-links';

export const alt = 'Your friend invited you to Fluxgo';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const HERO = '#0F2A1A';
const GLOW = '#2F7A4E';
const MINT = '#B4E2AE';
const ON_DARK = '#F1F5F1';
const MUTED = 'rgba(241, 245, 241, 0.72)';
const PASS = '#FBFAF6';
const INK = '#13261A';
const INK_SOFT = '#5C6B60';
const DEEP = '#1B412A';

const here = join(process.cwd(), 'app/(site)/r/[code]');

/** Codes are 3 to 12 characters. Longer codes get a smaller size and tighter spacing, so they stay inside the pass. */
function codeStyle(code) {
  const length = code.length;
  if (length <= 6) return { fontSize: 68, letterSpacing: 6 };
  if (length <= 8) return { fontSize: 54, letterSpacing: 4 };
  if (length <= 10) return { fontSize: 44, letterSpacing: 3 };
  return { fontSize: 37, letterSpacing: 2 };
}

async function file(path) {
  try {
    return await readFile(path);
  } catch {
    return null;
  }
}

/**
 * Link preview for an invite link (www.fluxgo.in/r/CODE) in WhatsApp and other apps.
 * It shows the code and the reward only. No member name or photo.
 * Inter 600 and 700 ship next to this file (Google Fonts, SIL Open Font License), so the image needs no network.
 */
export default async function Image({ params }) {
  const { code: raw } = await params;
  const code = normalizeInviteCode(raw);
  const [bold, semibold, coinData] = await Promise.all([
    file(join(here, 'inter-700.ttf')),
    file(join(here, 'inter-600.ttf')),
    file(join(process.cwd(), 'public/assets/fluxgo-credits-coin-3d.png'))
  ]);
  const coin = coinData ? `data:image/png;base64,${coinData.toString('base64')}` : null;
  const fonts = [
    ...(bold ? [{ name: 'Inter', data: bold, weight: 700, style: 'normal' }] : []),
    ...(semibold ? [{ name: 'Inter', data: semibold, weight: 600, style: 'normal' }] : [])
  ];

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: HERO, color: ON_DARK, fontFamily: 'Inter', position: 'relative', overflow: 'hidden' }}>
        {/* Soft brand glow behind the pass. */}
        <div style={{ position: 'absolute', right: -160, top: -120, width: 820, height: 820, borderRadius: 410, background: `radial-gradient(circle, ${GLOW} 0%, rgba(47,122,78,0.35) 38%, rgba(15,42,26,0) 70%)` }} />

        {/* Left: brand and message. */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 640, padding: '64px 0 64px 76px' }}>
          <div style={{ display: 'flex', fontSize: 46, fontWeight: 700, letterSpacing: -1.5 }}>fluxgo<span style={{ color: MINT }}>.</span></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, color: MINT, marginBottom: 18 }}>You have an invite</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: 72, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1.04 }}>Your friend invited you to Fluxgo</div>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, color: MUTED, marginTop: 26, lineHeight: 1.35 }}>Intercity rides with verified members.</div>
          </div>
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 600, color: MUTED }}>www.fluxgo.in</div>
        </div>

        {/* Right: the invite pass. */}
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', paddingRight: 64 }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: 420, background: PASS, color: INK, borderRadius: 36, padding: '38px 40px 34px', transform: 'rotate(-4deg)', boxShadow: '0 30px 60px rgba(0,0,0,0.35)' }}>
            <div style={{ display: 'flex', fontSize: 22, fontWeight: 600, color: INK_SOFT, letterSpacing: 3 }}>INVITE CODE</div>
            <div style={{ display: 'flex', ...codeStyle(code ?? 'FLUXGO'), fontWeight: 700, color: DEEP, marginTop: 10 }}>{code ?? 'FLUXGO'}</div>
            <div style={{ display: 'flex', width: '100%', height: 0, borderTop: '3px dashed #D8DDD5', margin: '30px 0 28px' }} />
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {coin ? <img src={coin} width={84} height={84} alt="" style={{ marginRight: 18 }} /> : null}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, letterSpacing: -1.2, color: INK, lineHeight: 1 }}>100 credits</div>
                <div style={{ display: 'flex', fontSize: 20, fontWeight: 600, color: INK_SOFT, marginTop: 8 }}>each, after your first ride</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
