import type { Panel } from "@/game/content/story";

// Hand-drawn-style inline SVG panels. Tiny, sharp at any size, no image downloads.
const INK = { stroke: "#111", strokeWidth: 4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

function Gavel() {
  return (
    <svg viewBox="0 0 200 140" aria-hidden>
      <rect width="200" height="140" fill="#ffd23f" />
      <g opacity=".25">{rays()}</g>
      <rect x="40" y="105" width="120" height="16" fill="#8b5a2b" {...INK} />
      <g transform="rotate(-30 100 70)">
        <rect x="95" y="40" width="12" height="80" fill="#a0522d" {...INK} />
        <rect x="70" y="25" width="62" height="28" rx="4" fill="#6b3e1f" {...INK} />
      </g>
      <text x="118" y="38" fontSize="22" fontWeight="900" fill="#e63946" stroke="#111" strokeWidth="1.5">
        BANG!
      </text>
    </svg>
  );
}

function Bars() {
  return (
    <svg viewBox="0 0 200 140" aria-hidden>
      <rect width="200" height="140" fill="#457b9d" />
      <circle cx="100" cy="78" r="26" fill="#f1c27d" {...INK} />
      <path d="M86 74h8M106 74h8M90 92q10 -6 20 0" fill="none" {...INK} />
      <rect x="60" y="104" width="80" height="40" fill="#f4a261" {...INK} />
      {[30, 60, 90, 120, 150, 180].map((x) => (
        <rect key={x} x={x - 4} y="0" width="8" height="140" fill="#9aa5ab" {...INK} strokeWidth={3} />
      ))}
    </svg>
  );
}

function Street() {
  return (
    <svg viewBox="0 0 200 140" aria-hidden>
      <rect width="200" height="140" fill="#2b2d42" />
      <path d="M0 40 Q100 10 200 40 L200 58 Q100 28 0 58Z" fill="#8d99ae" {...INK} />
      <rect x="20" y="56" width="14" height="70" fill="#8d99ae" {...INK} />
      <rect x="166" y="56" width="14" height="70" fill="#8d99ae" {...INK} />
      <rect x="0" y="120" width="200" height="20" fill="#555" {...INK} />
      <path d="M92 120v-30M108 120v-30M86 92q14 -14 28 0" fill="none" {...INK} stroke="#edf2f4" />
      <circle cx="100" cy="76" r="9" fill="#edf2f4" {...INK} strokeWidth={3} />
      {Array.from({ length: 22 }, (_, i) => (
        <line
          key={i}
          x1={(i * 37) % 200}
          y1={(i * 53) % 110}
          x2={((i * 37) % 200) - 4}
          y2={((i * 53) % 110) + 10}
          stroke="#a8dadc"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}

function Card() {
  return (
    <svg viewBox="0 0 200 140" aria-hidden>
      <rect width="200" height="140" fill="#e63946" />
      <g opacity=".25">{rays()}</g>
      <g transform="rotate(-8 100 70)">
        <rect x="45" y="35" width="110" height="70" rx="6" fill="#fffbea" {...INK} />
        <g transform="translate(100 70) rotate(-30) scale(.5)">
          <rect x="-6" y="-10" width="12" height="60" fill="#111" />
          <rect x="-30" y="-30" width="60" height="24" rx="4" fill="#111" />
        </g>
      </g>
      <text x="14" y="128" fontSize="16" fontWeight="900" fill="#fffbea" stroke="#111" strokeWidth="1">
        WHO?
      </text>
    </svg>
  );
}

function rays() {
  return Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return <line key={i} x1="100" y1="70" x2={100 + Math.cos(a) * 160} y2={70 + Math.sin(a) * 160} stroke="#fff" strokeWidth="8" />;
  });
}

const ART = { gavel: Gavel, bars: Bars, street: Street, card: Card };

export function ComicPanel({ panel }: { panel: Panel }) {
  const Art = ART[panel.art];
  return (
    <figure className="comic-panel">
      <Art />
      <figcaption>{panel.caption}</figcaption>
    </figure>
  );
}
