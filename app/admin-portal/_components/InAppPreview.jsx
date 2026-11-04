'use client';

import { fitBanner, PHONE, posterHeight } from '../_lib/inAppMessages';

/*
 * A copy of the member app popup, in app points on an iPhone 14 (390 × 844).
 * Every size here comes from fluxgo-frontend src/components/inAppMessage/InAppMessagePopup.tsx
 * and src/components/ui/Buttons.tsx. Change both together.
 */
const C = {
  ink: '#1B1B19', ink2: '#55554E', ink3: '#86867D', bg: '#FFFFFF', bg2: '#F6F6F3', fill: '#EDEDE7',
  lineHard: '#C9C9C1', brand: '#2F6B46', brandDeep: '#1B412A', brandHero: '#102A1B',
  scrim: 'rgba(24, 24, 20, 0.44)',
};
// The app popup text uses the phone system font (no custom font is loaded): SF Pro on iOS, Roboto on Android.
const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, Roboto, "Segoe UI", sans-serif';
const RADIUS = 28;
const INSET = 8;
const CARD_WIDTH = Math.min(360, PHONE.width - 40);

const primaryButton = {
  height: 50, borderRadius: 999, background: C.brand, color: '#FFFFFF', border: 0, width: '100%', padding: '0 18px',
  font: `600 16px/22px ${FONT}`, boxShadow: '0px 2px 5px rgba(20, 20, 15, 0.1), inset 0px -1px 0px rgba(20, 20, 15, 0.10)',
  textShadow: '0 1px 1.5px rgba(20, 20, 15, 0.12)', cursor: 'default',
};
const ghostButton = { ...primaryButton, background: 'transparent', color: C.brandDeep, boxShadow: 'none', textShadow: 'none' };

function X({ color, size = 17, stroke = 2.4 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function Close({ onImage }) {
  return (
    <span style={{ width: 32, height: 32, borderRadius: 999, display: 'grid', placeItems: 'center', background: onImage ? 'rgba(20,20,18,0.42)' : C.fill }}>
      <X color={onImage ? '#FFFFFF' : C.ink} />
    </span>
  );
}

function Handle({ onImage }) {
  return <span style={{ display: 'block', width: 36, height: 5, borderRadius: 999, background: onImage ? 'rgba(255,255,255,0.72)' : C.lineHard }} />;
}

function Img({ src, style }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', ...style }} />;
}

function Actions({ message, tone = 'light', top = 24 }) {
  if (!message.primaryLabel) return <div style={{ height: 16 }} />;
  return (
    <div style={{ marginTop: top, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <button type="button" tabIndex={-1} style={primaryButton}>{message.primaryLabel}</button>
      {message.secondaryLabel ? (
        tone === 'dark'
          ? <button type="button" tabIndex={-1} style={{ ...ghostButton, height: 44, color: '#FFFFFF', font: `600 15px/20px ${FONT}` }}>{message.secondaryLabel}</button>
          : <button type="button" tabIndex={-1} style={ghostButton}>{message.secondaryLabel}</button>
      ) : null}
    </div>
  );
}

const titleStyle = { margin: 0, font: `600 22px/28px ${FONT}`, letterSpacing: -0.3, color: C.ink };
const subtitleStyle = { margin: '8px 0 0', font: `400 15px/22px ${FONT}`, color: C.ink2 };

/** The app screen behind the popup: a plain Home outline, so the popup reads as it will on a phone. */
function AppBackdrop() {
  const block = (height, extra = {}) => <div style={{ height, borderRadius: 20, background: C.bg, boxShadow: '0 1px 3px rgba(20,20,15,0.06)', ...extra }} />;
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg2, padding: `${PHONE.top + 16}px 16px 0`, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ font: `800 34px/40px ${FONT}`, color: C.brandDeep, letterSpacing: -1 }}>fluxgo<span style={{ color: C.ink3 }}>.</span></div>
      {block(58, { borderRadius: 999 })}
      {block(64, { background: '#1B1B19' })}
      {block(300)}
      {block(120, { background: 'transparent', boxShadow: 'none' })}
    </div>
  );
}

function Body({ message, layout, aspect, hasImage }) {
  const isSheet = layout === 'SHEET';
  const frame = isSheet ? PHONE.width - INSET * 2 : CARD_WIDTH - INSET * 2;
  const ratio = fitBanner(aspect, frame, PHONE.height, isSheet ? 'SHEET' : 'MODAL');
  return (
    <>
      {hasImage ? (
        <div style={{ padding: INSET }}>
          <div style={{ position: 'relative', width: '100%', aspectRatio: String(ratio), borderRadius: RADIUS - INSET, overflow: 'hidden', background: C.bg2 }}>
            <Img src={message.imageUrl} />
            {isSheet ? <span style={{ position: 'absolute', left: 0, right: 0, top: 8, display: 'flex', justifyContent: 'center' }}><Handle onImage /></span> : null}
            <span style={{ position: 'absolute', right: 12, top: 12 }}><Close onImage /></span>
          </div>
        </div>
      ) : (
        <>
          {isSheet ? <span style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}><Handle /></span> : null}
          <span style={{ position: 'absolute', right: 16, top: isSheet ? 20 : 16, zIndex: 1 }}><Close /></span>
        </>
      )}
      <div style={{ padding: `${hasImage ? 12 : isSheet ? 18 : 22}px 20px 0` }}>
        <h4 style={{ ...titleStyle, paddingRight: hasImage ? 0 : 40 }}>{message.title || 'Title'}</h4>
        {message.subtitle ? <p style={subtitleStyle}>{message.subtitle}</p> : null}
        <Actions message={message} />
      </div>
    </>
  );
}

function Popup({ message, aspect }) {
  const layout = message.layout;
  const hasImage = Boolean(message.imageUrl);

  if (layout === 'TOP_BANNER') {
    return (
      <div style={{ position: 'absolute', left: 12, right: 12, top: PHONE.top + 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', background: C.bg, borderRadius: 22, padding: '10px 12px 10px 10px', boxShadow: '0 8px 18px rgba(20,20,18,0.16)' }}>
          {hasImage ? <div style={{ width: 60, height: 60, borderRadius: 14, overflow: 'hidden', flex: 'none', background: C.bg2 }}><Img src={message.imageUrl} /></div> : null}
          <div style={{ flex: 1, minWidth: 0, marginLeft: hasImage ? 12 : 6 }}>
            <div style={{ font: `600 15px/20px ${FONT}`, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{message.title || 'Title'}</div>
            {message.subtitle ? <div style={{ marginTop: 2, font: `400 13px/18px ${FONT}`, color: C.ink2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{message.subtitle}</div> : null}
            {message.primaryLabel ? <div style={{ marginTop: 4, font: `600 13px/18px ${FONT}`, color: C.brand }}>{message.primaryLabel}</div> : null}
          </div>
          <span style={{ marginLeft: 8, alignSelf: 'flex-start', width: 28, height: 28, display: 'grid', placeItems: 'center' }}><X color={C.ink3} size={16} /></span>
        </div>
      </div>
    );
  }

  if (layout === 'FULLSCREEN') {
    return (
      <div style={{ position: 'absolute', inset: 0, background: C.bg, display: 'flex', flexDirection: 'column' }}>
        {hasImage
          ? <div style={{ height: Math.round(PHONE.height * 0.54), borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden', background: C.bg2, flex: 'none' }}><Img src={message.imageUrl} /></div>
          : <div style={{ height: PHONE.top + 56, flex: 'none' }} />}
        <span style={{ position: 'absolute', right: 16, top: PHONE.top + 8 }}><Close onImage={hasImage} /></span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: `28px 24px ${PHONE.bottom + 4}px` }}>
          <h4 style={{ margin: 0, font: `700 30px/36px ${FONT}`, letterSpacing: -0.6, color: C.ink }}>{message.title || 'Title'}</h4>
          {message.subtitle ? <p style={{ margin: '12px 0 0', font: `400 16px/24px ${FONT}`, color: C.ink2 }}>{message.subtitle}</p> : null}
          <div style={{ flex: 1 }} />
          <Actions message={message} top={0} />
        </div>
      </div>
    );
  }

  const scrim = <div style={{ position: 'absolute', inset: 0, background: C.scrim }} />;

  if (layout === 'POSTER') {
    const height = posterHeight(aspect, CARD_WIDTH, PHONE.height - PHONE.top - PHONE.bottom - 48);
    return (
      <>
        {scrim}
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <div style={{ position: 'relative', width: CARD_WIDTH, height, borderRadius: RADIUS, overflow: 'hidden', background: C.brandHero, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            {hasImage ? <div style={{ position: 'absolute', inset: 0 }}><Img src={message.imageUrl} /></div> : null}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,20,18,0) 30%, rgba(20,20,18,0.55) 62%, rgba(20,20,18,0.92) 100%)' }} />
            <span style={{ position: 'absolute', right: 12, top: 12 }}><Close onImage /></span>
            <div style={{ position: 'relative', padding: '0 20px 16px' }}>
              <h4 style={{ margin: 0, font: `700 26px/31px ${FONT}`, letterSpacing: -0.5, color: '#FFFFFF' }}>{message.title || 'Title'}</h4>
              {message.subtitle ? <p style={{ margin: '8px 0 0', font: `400 15px/21px ${FONT}`, color: 'rgba(255,255,255,0.82)' }}>{message.subtitle}</p> : null}
              <Actions message={message} tone="dark" top={20} />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (layout === 'MODAL_EDGE') {
    const ratio = fitBanner(aspect, CARD_WIDTH, PHONE.height, 'MODAL_EDGE');
    return (
      <>
        {scrim}
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <div style={{ position: 'relative', width: CARD_WIDTH, borderRadius: RADIUS, overflow: 'hidden', background: C.bg, paddingBottom: 12 }}>
            {hasImage ? <div style={{ width: '100%', aspectRatio: String(ratio), background: C.bg2 }}><Img src={message.imageUrl} /></div> : null}
            <span style={{ position: 'absolute', right: 12, top: 12 }}><Close onImage={hasImage} /></span>
            <div style={{ padding: `${hasImage ? 22 : 44}px 24px 0`, textAlign: 'center' }}>
              <h4 style={titleStyle}>{message.title || 'Title'}</h4>
              {message.subtitle ? <p style={subtitleStyle}>{message.subtitle}</p> : null}
            </div>
            <div style={{ padding: '0 20px' }}><Actions message={message} /></div>
          </div>
        </div>
      </>
    );
  }

  if (layout === 'MODAL') {
    return (
      <>
        {scrim}
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <div style={{ position: 'relative', width: CARD_WIDTH, borderRadius: RADIUS, overflow: 'hidden', background: C.bg, paddingBottom: 12 }}>
            <Body message={message} layout="MODAL" aspect={aspect} hasImage={hasImage} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {scrim}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: C.bg, borderTopLeftRadius: RADIUS, borderTopRightRadius: RADIUS, paddingBottom: Math.max(16, PHONE.bottom + 4) }}>
        <Body message={message} layout="SHEET" aspect={aspect} hasImage={hasImage} />
      </div>
    </>
  );
}

/** Phone preview at the given scale. 1 = real app points. */
export function InAppPreview({ message, aspect, scale = 0.8 }) {
  return (
    <div className="ax-iam-phone" style={{ width: PHONE.width * scale + 16, height: PHONE.height * scale + 16 }}>
      <div style={{ position: 'relative', width: PHONE.width, height: PHONE.height, transform: `scale(${scale})`, transformOrigin: 'top left', overflow: 'hidden', borderRadius: 40, fontFamily: FONT, textAlign: 'left' }}>
        <AppBackdrop />
        <Popup message={message} aspect={aspect} />
      </div>
    </div>
  );
}
