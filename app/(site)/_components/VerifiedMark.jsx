// The 3D verified marks used in the Fluxgo apps.
// member: green rosette (work email verified). partner: shield with a cab light.
const SRC = {
  member: '/assets/work-email-verified.png',
  partner: '/assets/verified-partner-3d.png'
};

export default function VerifiedMark({ kind = 'member', size = 16, label = '' }) {
  return (
    <img
      className="fx-vmark"
      src={SRC[kind]}
      alt={label}
      aria-hidden={label ? undefined : 'true'}
      width={size}
      height={size}
    />
  );
}
