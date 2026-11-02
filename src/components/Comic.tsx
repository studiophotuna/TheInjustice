import type { Panel } from "@/game/content/story";

// Cinematic noir panels: dark palette, rim light, halftone texture. Pure SVG, no downloads.

function Halftone({ id, color = "#fff", opacity = 0.08 }: { id: string; color?: string; opacity?: number }) {
  return (
    <>
      <defs>
        <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.2" fill={color} />
        </pattern>
      </defs>
      <rect width="400" height="260" fill={`url(#${id})`} opacity={opacity} />
    </>
  );
}

function Rays({ color, cx = 200, cy = 130 }: { color: string; cx?: number; cy?: number }) {
  return (
    <g opacity="0.18">
      {Array.from({ length: 20 }, (_, i) => {
        const a = (i / 20) * Math.PI * 2;
        return <path key={i} d={`M${cx} ${cy} L${cx + Math.cos(a) * 400} ${cy + Math.sin(a) * 400} L${cx + Math.cos(a + 0.08) * 400} ${cy + Math.sin(a + 0.08) * 400}Z`} fill={color} />;
      })}
    </g>
  );
}

export function Gavel() {
  return (
    <svg viewBox="0 0 400 260" aria-hidden>
      <rect width="400" height="260" fill="#1a0b10" />
      <Rays color="#ff3d5a" />
      <Halftone id="ht-gavel" color="#ff3d5a" opacity={0.25} />
      <rect x="90" y="196" width="220" height="26" rx="4" fill="#3a1d12" stroke="#ff3d5a" strokeWidth="2" />
      <g transform="rotate(-28 200 130)" className="gavel-swing">
        <rect x="192" y="80" width="18" height="140" rx="4" fill="#5a2e18" stroke="#ffb27a" strokeWidth="2" />
        <rect x="140" y="52" width="120" height="50" rx="8" fill="#4a2414" stroke="#ffb27a" strokeWidth="2.5" />
      </g>
      <text x="268" y="70" fontFamily="var(--font-sfx), Impact, sans-serif" fontSize="46" fill="#ffc24b" stroke="#000" strokeWidth="3" paintOrder="stroke" transform="rotate(-8 300 60)">
        BANG!
      </text>
    </svg>
  );
}

export function Bars() {
  return (
    <svg viewBox="0 0 400 260" aria-hidden>
      <rect width="400" height="260" fill="#0a1220" />
      <Halftone id="ht-bars" color="#38e1ff" opacity={0.18} />
      <ellipse cx="200" cy="120" rx="120" ry="90" fill="#38e1ff" opacity="0.08" />
      <path d="M120 260 Q124 190 200 182 Q276 190 280 260Z" fill="#05070c" stroke="#38e1ff" strokeWidth="2" />
      <ellipse cx="200" cy="140" rx="34" ry="42" fill="#05070c" stroke="#38e1ff" strokeWidth="2" />
      <rect x="182" y="136" width="10" height="3" rx="1.5" fill="#38e1ff" />
      <rect x="208" y="136" width="10" height="3" rx="1.5" fill="#38e1ff" />
      {[40, 100, 160, 240, 300, 360].map((x) => (
        <rect key={x} x={x - 7} y="0" width="14" height="260" fill="#1d2a3d" stroke="#5b7090" strokeWidth="1.5" />
      ))}
      <rect x="0" y="30" width="400" height="10" fill="#1d2a3d" />
    </svg>
  );
}

export function Street() {
  return (
    <svg viewBox="0 0 400 260" aria-hidden>
      <rect width="400" height="260" fill="#0c1220" />
      <Halftone id="ht-street" opacity={0.06} />
      <path d="M0 70 Q200 20 400 70 L400 96 Q200 46 0 96Z" fill="#141c2a" stroke="#2c3a52" strokeWidth="1.5" />
      <rect x="40" y="92" width="28" height="150" fill="#141c2a" />
      <rect x="332" y="92" width="28" height="150" fill="#141c2a" />
      <ellipse cx="200" cy="236" rx="120" ry="14" fill="#ffb84b" opacity="0.12" />
      <rect x="0" y="238" width="400" height="22" fill="#07090e" />
      {/* lone figure */}
      <path d="M188 238 L192 196 L208 196 L212 238Z" fill="#05070c" stroke="#ffb84b" strokeWidth="1.5" />
      <path d="M182 200 Q200 182 218 200 L214 210 Q200 196 186 210Z" fill="#05070c" stroke="#ffb84b" strokeWidth="1.5" />
      <circle cx="200" cy="180" r="12" fill="#05070c" stroke="#ffb84b" strokeWidth="1.5" />
      {Array.from({ length: 50 }, (_, i) => (
        <line key={i} x1={(i * 53) % 400} y1={(i * 37) % 230} x2={((i * 53) % 400) - 6} y2={((i * 37) % 230) + 16} stroke="#7fa7c9" strokeWidth="1.2" opacity="0.5" />
      ))}
    </svg>
  );
}

export function Card() {
  return (
    <svg viewBox="0 0 400 260" aria-hidden>
      <rect width="400" height="260" fill="#140a1e" />
      <Rays color="#ffc24b" />
      <Halftone id="ht-card" color="#ffc24b" opacity={0.2} />
      <g transform="rotate(-8 200 130)">
        <rect x="100" y="70" width="200" height="120" rx="10" fill="#f4ecd8" stroke="#000" strokeWidth="3" />
        <g transform="translate(200 130) rotate(-30)">
          <rect x="-7" y="-14" width="14" height="70" rx="3" fill="#111" />
          <rect x="-36" y="-40" width="72" height="30" rx="6" fill="#111" />
        </g>
      </g>
      <text x="26" y="236" fontFamily="var(--font-sfx), Impact, sans-serif" fontSize="40" fill="#f4ecd8" stroke="#000" strokeWidth="3" paintOrder="stroke">
        WHO?
      </text>
    </svg>
  );
}

export function LightsOut() {
  return (
    <svg viewBox="0 0 400 260" aria-hidden>
      <rect width="400" height="260" fill="#120306" />
      <Rays color="#ff3d5a" />
      <Halftone id="ht-death" color="#ff3d5a" opacity={0.3} />
      <rect x="0" y="200" width="400" height="60" fill="#070102" />
      {/* chalk outline */}
      <path
        d="M110 222 q10 -20 40 -18 l30 -16 q8 -14 22 -8 q14 6 6 20 l40 10 l40 -14 q10 2 6 12 l-38 18 l40 6 q10 6 0 12 l-60 -2 l-40 10 q-50 6 -86 -30z"
        fill="none"
        stroke="#f4ecd8"
        strokeWidth="3"
        strokeDasharray="6 5"
        opacity="0.9"
      />
      <text x="200" y="110" textAnchor="middle" fontFamily="var(--font-sfx), Impact, sans-serif" fontSize="58" fill="#ff3d5a" stroke="#000" strokeWidth="4" paintOrder="stroke" className="flicker-text">
        LIGHTS OUT
      </text>
    </svg>
  );
}

const ART = { gavel: Gavel, bars: Bars, street: Street, card: Card };

export function ComicPanel({ panel }: { panel: Panel }) {
  const Art = ART[panel.art];
  return (
    <figure className="comic-panel">
      <div className="comic-art">
        <Art />
      </div>
      <figcaption>{panel.caption}</figcaption>
    </figure>
  );
}
