// ── CDE Logo ────────────────────────────────────────────────────────────────
// Inline SVG logo for CDE Manager — three arrows radiating from a center hub.
// Communication (up), Dissemination (bottom-right), Exploitation (bottom-left).
// Matches the favicon. Use everywhere the brand mark appears.

interface CdeLogoProps {
  size?: number;
  className?: string;
}

export default function CdeLogo({ size = 22, className = '' }: CdeLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-label="CDE Manager logo"
    >
      {/* Center hub */}
      <circle cx="16" cy="16" r="3" fill="currentColor" />
      {/* Communication: top */}
      <line x1="16" y1="12" x2="16" y2="5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <polyline points="12.5,8.5 16,5 19.5,8.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dissemination: bottom-right */}
      <line x1="19" y1="18" x2="24.5" y2="23.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <polyline points="24.5,20 25,24 21,23.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Exploitation: bottom-left */}
      <line x1="13" y1="18" x2="7.5" y2="23.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <polyline points="7.5,20 7,24 11,23.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
