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

/** A standing silhouette with rim light, used across story panels. */
function Figure({ x, y, scale = 1, rim, coat = false }: { x: number; y: number; scale?: number; rim: string; coat?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d={coat ? "M-22 0 L-16 -70 Q0 -82 16 -70 L22 0Z" : "M-14 0 L-12 -64 Q0 -74 12 -64 L14 0Z"} fill="#05070c" stroke={rim} strokeWidth="1.5" />
      <circle cx="0" cy="-86" r="13" fill="#05070c" stroke={rim} strokeWidth="1.5" />
    </g>
  );
}

function Frame({ bg, children, dots = "#fff", dotOpacity = 0.06, id }: { bg: string; children: React.ReactNode; dots?: string; dotOpacity?: number; id: string }) {
  return (
    <svg viewBox="0 0 400 260" aria-hidden>
      <rect width="400" height="260" fill={bg} />
      {children}
      <Halftone id={id} color={dots} opacity={dotOpacity} />
    </svg>
  );
}

function MarketChase() {
  return (
    <Frame bg="#1c0f16" id="ht-mc" dots="#ffc24b" dotOpacity={0.12}>
      {[30, 130, 230, 330].map((x, i) => (
        <path key={x} d={`M${x} 110 l70 0 l-10 -24 l-50 0z`} fill={["#a33", "#b8860b", "#2e6f95", "#7b3f99"][i]} opacity="0.8" />
      ))}
      {[50, 90, 150, 300, 350].map((x, i) => <Figure key={x} x={x} y={250} scale={0.8 + (i % 2) * 0.1} rim="#3a2a30" />)}
      <Figure x={230} y={252} scale={1.15} rim="#ffc24b" coat />
      <path d="M262 150 l40 -6 M266 170 l46 0 M262 190 l40 6" stroke="#ffc24b" strokeWidth="3" strokeLinecap="round" />
      <circle cx="120" cy="150" r="5" fill="#ff8a3d" /><circle cx="128" cy="160" r="5" fill="#ff8a3d" />
    </Frame>
  );
}

function Matchbook() {
  return (
    <Frame bg="#140a1e" id="ht-mb" dots="#ffc24b" dotOpacity={0.2}>
      <Rays color="#ffc24b" />
      <g transform="rotate(6 200 130)">
        <rect x="120" y="60" width="160" height="140" rx="8" fill="#5a0f1c" stroke="#000" strokeWidth="3" />
        <rect x="120" y="60" width="160" height="40" rx="8" fill="#3f0a14" />
        <text x="200" y="140" textAnchor="middle" fontSize="15" fontWeight="800" fill="#ffc24b" letterSpacing="2">CRANE &amp; PARTNERS</text>
        <g transform="translate(200 172) rotate(-30) scale(0.35)" fill="#ffc24b">
          <rect x="-7" y="-14" width="14" height="70" rx="3" />
          <rect x="-36" y="-40" width="72" height="30" rx="6" />
        </g>
      </g>
    </Frame>
  );
}

function EvidenceLocker() {
  return (
    <Frame bg="#08121f" id="ht-el" dots="#38e1ff" dotOpacity={0.12}>
      {[0, 1, 2].map((r) => (
        <g key={r}>
          <rect x="20" y={40 + r * 70} width="360" height="6" fill="#1d2d44" />
          {[30, 110, 270, 330].map((x) => <rect key={x} x={x} y={8 + r * 70} width="56" height="32" fill="#2a3b55" stroke="#0b1424" />)}
        </g>
      ))}
      <path d="M150 260 L200 120 L250 260Z" fill="#38e1ff" opacity="0.1" />
      <g transform="translate(160 150)">
        <path d="M0 20 h80 v50 h-80z" fill="#3a2e1f" stroke="#ffc24b" strokeWidth="1.5" />
        <path d="M0 20 l-12 -16 h80 l12 16" fill="#4a3b26" stroke="#ffc24b" strokeWidth="1.5" />
        <text x="40" y="52" textAnchor="middle" fontSize="13" fontWeight="800" fill="#ffc24b">4471</text>
      </g>
      <text x="300" y="235" fontFamily="var(--font-sfx), Impact, sans-serif" fontSize="34" fill="#38e1ff" stroke="#000" strokeWidth="3" paintOrder="stroke">EMPTY?!</text>
    </Frame>
  );
}

function Photo() {
  return (
    <Frame bg="#16110c" id="ht-ph" dots="#f4ecd8" dotOpacity={0.08}>
      <g transform="rotate(-5 200 130)">
        <rect x="110" y="30" width="180" height="200" fill="#f4ecd8" stroke="#000" strokeWidth="2" />
        <rect x="124" y="44" width="152" height="140" fill="#3a4a5a" />
        <Figure x={200} y={184} scale={0.95} rim="#a8d8ff" />
        <rect x="190" y="118" width="20" height="5" fill="#ffc24b" />
        <path d="M130 205 q40 -6 70 4 t70 -2" stroke="#3a2a1a" strokeWidth="2" fill="none" />
      </g>
      <path d="M300 40 l40 30 M320 30 l20 50" stroke="#ff3d5a" strokeWidth="3" opacity="0.5" />
    </Frame>
  );
}

function Envelope() {
  return (
    <Frame bg="#1a0b0b" id="ht-en" dots="#ff3d5a" dotOpacity={0.15}>
      <Rays color="#ff3d5a" />
      <g transform="rotate(-6 200 130)">
        <rect x="100" y="70" width="200" height="120" rx="6" fill="#d8c8a0" stroke="#000" strokeWidth="3" />
        <path d="M100 70 L200 140 L300 70" fill="none" stroke="#8a7650" strokeWidth="3" />
        {[0, 1, 2].map((i) => <rect key={i} x={140 + i * 10} y={52 - i * 6} width="90" height="40" fill="#3e8e5a" stroke="#1d4a2c" transform={`rotate(${-10 + i * 6} 185 70)`} />)}
      </g>
      <text x="22" y="236" fontFamily="var(--font-sfx), Impact, sans-serif" fontSize="30" fill="#ffc24b" stroke="#000" strokeWidth="3" paintOrder="stroke">FRIDAY. AGAIN.</text>
    </Frame>
  );
}

function LedgerBook() {
  return (
    <Frame bg="#120c08" id="ht-lb" dots="#ffc24b" dotOpacity={0.08}>
      <defs>
        <radialGradient id="lb-lamp" cx="0.5" cy="0" r="0.8"><stop offset="0" stopColor="#ffc24b" stopOpacity="0.35" /><stop offset="1" stopColor="#ffc24b" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="400" height="260" fill="url(#lb-lamp)" />
      <path d="M60 80 L200 100 L340 80 L340 230 L200 250 L60 230Z" fill="#efe3c5" stroke="#000" strokeWidth="3" />
      <path d="M200 100 V250" stroke="#8a7650" strokeWidth="2" />
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i}>
          <path d={`M80 ${120 + i * 16} h100`} stroke="#6b5a40" strokeWidth="2" opacity="0.6" />
          <path d={`M220 ${120 + i * 16} h${i === 3 ? 0 : 100}`} stroke="#6b5a40" strokeWidth="2" opacity="0.6" />
        </g>
      ))}
      <rect x="214" y="160" width="112" height="16" fill="#ff3d5a" opacity="0.25" />
      <text x="220" y="173" fontSize="11" fontWeight="800" fill="#7a0d1e">PAID IN FULL · C&amp;P</text>
    </Frame>
  );
}

function CaseFile() {
  return (
    <Frame bg="#0f0d1c" id="ht-cf" dots="#9b7bff" dotOpacity={0.12}>
      <path d="M90 60 h90 l14 14 h116 v150 h-220z" fill="#c9a86a" stroke="#000" strokeWidth="3" />
      <rect x="110" y="88" width="180" height="120" fill="#f4ecd8" transform="rotate(-3 200 150)" />
      {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M124 ${108 + i * 16} h${120 - (i % 3) * 20}`} stroke="#2e8b57" strokeWidth="2.5" transform="rotate(-3 200 150)" />)}
      <text x="200" y="52" textAnchor="middle" fontSize="16" fontWeight="900" fill="#9b7bff" letterSpacing="3">CASE 4471</text>
      <circle cx="300" cy="200" r="34" fill="none" stroke="#e7dcff" strokeWidth="5" />
      <path d="M324 224 l34 30" stroke="#e7dcff" strokeWidth="8" strokeLinecap="round" />
    </Frame>
  );
}

function Courtroom() {
  return (
    <Frame bg="#0c0b18" id="ht-ct" dots="#9b7bff" dotOpacity={0.1}>
      <rect x="0" y="0" width="400" height="260" fill="url(#ct-light)" />
      <defs>
        <radialGradient id="ct-light" cx="0.5" cy="0.1" r="0.8"><stop offset="0" stopColor="#9b7bff" stopOpacity="0.35" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="200" cy="50" r="26" fill="none" stroke="#e7dcff" strokeWidth="3" opacity="0.6" />
      <path d="M190 50 h20 M200 40 v20" stroke="#e7dcff" strokeWidth="3" opacity="0.6" />
      <Figure x={200} y={150} scale={0.9} rim="#9b7bff" coat />
      <rect x="100" y="120" width="200" height="90" fill="#2a1d14" stroke="#9b7bff" strokeWidth="1.5" />
      <g transform="translate(250 112) rotate(-25) scale(0.3)" fill="#c9a86a">
        <rect x="-7" y="-14" width="14" height="70" rx="3" />
        <rect x="-36" y="-40" width="72" height="30" rx="6" />
      </g>
      {[40, 80, 320, 360].map((x) => <rect key={x} x={x - 10} y="40" width="20" height="200" fill="#16142a" />)}
      <rect x="0" y="230" width="400" height="30" fill="#07060e" />
    </Frame>
  );
}

function JudgeRing() {
  return (
    <Frame bg="#140c06" id="ht-jr" dots="#ffc24b" dotOpacity={0.15}>
      <Rays color="#ffc24b" cx={220} cy={120} />
      <path d="M0 260 L60 150 Q140 110 220 120 L300 150 L320 200 L240 230 L0 260Z" fill="#1e1410" stroke="#ffc24b" strokeWidth="1.5" />
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M${230 + i * 6} ${128 + i * 16} q30 4 46 22`} stroke="#ffc24b" strokeWidth="1.2" fill="none" opacity="0.5" />)}
      <circle cx="248" cy="160" r="18" fill="none" stroke="#ffc24b" strokeWidth="7" />
      <g transform="translate(248 140) rotate(-30) scale(0.22)" fill="#ffd27a">
        <rect x="-7" y="-14" width="14" height="70" rx="3" />
        <rect x="-36" y="-40" width="72" height="30" rx="6" />
      </g>
      <text x="24" y="56" fontFamily="var(--font-sfx), Impact, sans-serif" fontSize="30" fill="#ffc24b" stroke="#000" strokeWidth="3" paintOrder="stroke">SMALL WORLD...</text>
    </Frame>
  );
}

function StringWall() {
  const pins = [[70, 60], [160, 50], [260, 70], [340, 50], [90, 170], [200, 130], [300, 170], [140, 220], [330, 225], [50, 230]];
  return (
    <Frame bg="#1a1410" id="ht-sw" dots="#f4ecd8" dotOpacity={0.05}>
      {pins.map(([x, y], i) => pins.slice(i + 1, i + 3).map(([x2, y2], j) => (
        <line key={`${i}-${j}`} x1={x} y1={y} x2={x2} y2={y2} stroke="#ff3d5a" strokeWidth="1.5" opacity="0.8" />
      )))}
      {pins.map(([x, y], i) => (
        <g key={i} transform={`rotate(${(i % 3) * 4 - 4} ${x} ${y})`}>
          <rect x={x - 22} y={y - 26} width="44" height="52" fill="#e8dfc8" stroke="#000" />
          <circle cx={x} cy={y - 6} r="7" fill="#3a3a3a" />
          <path d={`M${x - 12} ${y + 18} q12 -16 24 0`} fill="#3a3a3a" />
          <circle cx={x} cy={y - 26} r="3" fill="#ff3d5a" />
        </g>
      ))}
      <rect x="176" y="100" width="48" height="58" fill="none" stroke="#3ee08f" strokeWidth="3" />
    </Frame>
  );
}

function Alley() {
  return (
    <Frame bg="#0a0c12" id="ht-al" dots="#3ee08f" dotOpacity={0.08}>
      <path d="M0 0 L120 40 L120 260 L0 260Z" fill="#11151e" />
      <path d="M400 0 L280 40 L280 260 L400 260Z" fill="#11151e" />
      <rect x="120" y="40" width="160" height="220" fill="#0d1018" />
      <path d="M200 0 L120 260 L280 260Z" fill="#3ee08f" opacity="0.06" />
      <Figure x={150} y={250} scale={1.25} rim="#3ee08f" coat />
      <Figure x={258} y={250} scale={0.95} rim="#ffc24b" coat />
      <text x="268" y="120" fontSize="34" fill="#ffc24b" fontWeight="900">!</text>
      {Array.from({ length: 40 }, (_, i) => (
        <line key={i} x1={(i * 53) % 400} y1={(i * 37) % 240} x2={((i * 53) % 400) - 5} y2={((i * 37) % 240) + 14} stroke="#7fa7c9" strokeWidth="1" opacity="0.4" />
      ))}
    </Frame>
  );
}

function Rooftop() {
  return (
    <Frame bg="#0b0f1d" id="ht-rt" dots="#fff" dotOpacity={0.05}>
      <circle cx="320" cy="60" r="34" fill="#f4ecd8" opacity="0.85" />
      {Array.from({ length: 14 }, (_, i) => (
        <rect key={i} x={i * 30} y={150 + ((i * 37) % 60)} width="28" height="120" fill="#141a2c" />
      ))}
      {Array.from({ length: 40 }, (_, i) => (
        <rect key={i} x={(i * 47) % 400} y={170 + ((i * 29) % 80)} width="3" height="5" fill="#ffc24b" opacity="0.6" />
      ))}
      <path d="M0 210 h180 v50 h-180z" fill="#05070c" />
      <g transform="translate(110 210)">
        <path d="M-16 0 L-12 -60 Q0 -70 12 -60 L16 0Z" fill="#05070c" stroke="#3ee08f" strokeWidth="1.5" />
        <circle cx="0" cy="-78" r="12" fill="#05070c" stroke="#3ee08f" strokeWidth="1.5" />
        <path d="M8 -62 q30 6 46 -2 q-14 12 -42 12z" fill="#14321f" stroke="#3ee08f" strokeWidth="1" className="scarf-wave" />
      </g>
    </Frame>
  );
}

const ART = {
  gavel: Gavel,
  bars: Bars,
  street: Street,
  card: Card,
  market_chase: MarketChase,
  matchbook: Matchbook,
  evidence_locker: EvidenceLocker,
  photo: Photo,
  envelope: Envelope,
  ledger_book: LedgerBook,
  case_file: CaseFile,
  courtroom: Courtroom,
  judge_ring: JudgeRing,
  string_wall: StringWall,
  alley: Alley,
  rooftop: Rooftop,
};

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
