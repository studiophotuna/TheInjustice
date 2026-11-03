// Illustrated noir scenes and full-body characters. Pure SVG: sharp at any size, tiny to load.
// Scenes are 800×450; characters are 200×400 and can be layered over scenes.

import type { ReactNode } from "react";

export type SceneKind = "street" | "city" | "highrise" | "police" | "hospital";
export type CharacterKind = "bum" | "thug" | "detective" | "lawyer" | "doctor" | "banker" | "vigilante";

const rnd = (seed: number) => () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};

function Defs({ id, sky }: { id: string; sky: [string, string] }) {
  return (
    <defs>
      <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={sky[0]} />
        <stop offset="1" stopColor={sky[1]} />
      </linearGradient>
      <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${id}-wet`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.7" />
      </linearGradient>
      <pattern id={`${id}-dots`} width="5" height="5" patternUnits="userSpaceOnUse">
        <circle cx="2.5" cy="2.5" r="0.9" fill="#fff" />
      </pattern>
    </defs>
  );
}

function Windows({ x, y, w, h, color, seed, density = 0.35 }: { x: number; y: number; w: number; h: number; color: string; seed: number; density?: number }) {
  const r = rnd(seed);
  const out: ReactNode[] = [];
  for (let wy = y + 8; wy < y + h - 8; wy += 13) {
    for (let wx = x + 6; wx < x + w - 8; wx += 10) {
      const v = r();
      if (v < density) out.push(<rect key={`${wx}-${wy}`} x={wx} y={wy} width="5" height="7" fill={color} opacity={0.35 + v} className={v < 0.03 ? "win-flicker" : undefined} />);
    }
  }
  return <g>{out}</g>;
}

function Rain({ seed, color = "#9cc4e8", n = 70 }: { seed: number; color?: string; n?: number }) {
  const r = rnd(seed);
  return (
    <g className="scene-rain" opacity="0.45">
      {Array.from({ length: n }, (_, i) => {
        const x = r() * 820;
        const y = r() * 460;
        return <line key={i} x1={x} y1={y} x2={x - 6} y2={y + 18} stroke={color} strokeWidth="1" />;
      })}
    </g>
  );
}

// ─── Scenes ────────────────────────────────────────────────────────────────

function Street() {
  return (
    <g>
      <Defs id="st" sky={["#0a0d16", "#1d1a2c"]} />
      <rect width="800" height="450" fill="url(#st-sky)" />
      {/* Brick walls converging to a vanishing point */}
      <path d="M0 0 L300 120 L300 360 L0 450Z" fill="#1a1416" />
      <path d="M800 0 L500 120 L500 360 L800 450Z" fill="#161219" />
      {Array.from({ length: 14 }, (_, i) => (
        <path key={i} d={`M0 ${i * 32} L300 ${120 + i * 17}`} stroke="#2a2024" strokeWidth="1" />
      ))}
      {Array.from({ length: 14 }, (_, i) => (
        <path key={i} d={`M800 ${i * 32} L500 ${120 + i * 17}`} stroke="#241c26" strokeWidth="1" />
      ))}
      {/* Far end: a lit street */}
      <rect x="300" y="120" width="200" height="240" fill="#2a2440" />
      <rect x="300" y="300" width="200" height="60" fill="#ff8a3d" opacity="0.25" />
      {/* Fire escape */}
      <g stroke="#3a2c30" strokeWidth="3" fill="none">
        <path d="M560 90 h120 M560 160 h120 M560 230 h120" />
        <path d="M570 90 l40 70 M640 160 l-40 70" />
      </g>
      {/* Graffiti */}
      <text x="60" y="130" fontFamily="var(--font-sfx), Impact, sans-serif" fontSize="44" fill="#ff3d5a" opacity="0.85" transform="rotate(-8 60 130) skewY(4)">SOUTHSIDE</text>
      <text x="610" y="320" fontFamily="var(--font-sfx), Impact, sans-serif" fontSize="30" fill="#3ee08f" opacity="0.7" transform="rotate(6 610 320)">NO JUSTICE</text>
      {/* Streetlight cone */}
      <rect x="230" y="60" width="6" height="320" fill="#0e0c10" />
      <path d="M233 64 q30 -6 46 6" stroke="#0e0c10" strokeWidth="6" fill="none" />
      <path className="win-flicker" d="M276 72 L360 420 L180 420Z" fill="#ffcf7a" opacity="0.13" />
      <circle cx="276" cy="72" r="6" fill="#ffe7b0" />
      {/* Dumpster with a fire barrel */}
      <rect x="560" y="330" width="140" height="70" rx="4" fill="#1f3a2c" stroke="#0a120e" strokeWidth="3" />
      <rect x="140" y="350" width="40" height="52" rx="4" fill="#2a2222" />
      <ellipse className="fire-glow" cx="160" cy="352" rx="70" ry="24" fill="#ff8a3d" opacity="0.3" />
      <path className="fire" style={{ transformOrigin: "160px 352px" }} d="M146 352 Q152 322 160 336 Q166 316 174 352Z" fill="#ffb03b" />
      {/* Wet ground and puddle reflection */}
      <rect x="0" y="400" width="800" height="50" fill="#07070b" />
      <ellipse cx="400" cy="420" rx="180" ry="10" fill="#ff8a3d" opacity="0.12" />
      <Rain seed={3} />
    </g>
  );
}

function City() {
  const r = rnd(11);
  return (
    <g>
      <Defs id="ct" sky={["#0d0a22", "#3a1838"]} />
      <rect width="800" height="450" fill="url(#ct-sky)" />
      <circle cx="640" cy="90" r="90" fill="url(#ct-glow)" opacity="0.25" />
      <circle cx="640" cy="90" r="30" fill="#f4ecd8" opacity="0.9" />
      {Array.from({ length: 22 }, (_, i) => {
        const w = 30 + r() * 40;
        const h = 120 + r() * 200;
        const x = i * 38 - 10;
        return (
          <g key={i}>
            <rect x={x} y={330 - h} width={w} height={h + 20} fill="#170f26" />
            {r() > 0.6 && <rect x={x + w / 2} y={330 - h - 26} width="2" height="26" fill="#170f26" />}
            <Windows x={x} y={330 - h} w={w} h={h} color="#ffc24b" seed={i * 7 + 3} density={0.28} />
          </g>
        );
      })}
      {/* Suspension bridge */}
      <path d="M0 300 Q200 230 400 300 Q600 230 800 300" stroke="#ff3d5a" strokeWidth="2" fill="none" opacity="0.7" />
      <rect x="0" y="300" width="800" height="8" fill="#0a0814" />
      {[200, 600].map((x) => <rect key={x} x={x - 5} y="220" width="10" height="90" fill="#0a0814" />)}
      {Array.from({ length: 40 }, (_, i) => <line key={i} x1={i * 20} y1={300} x2={i * 20} y2={300 - 70 * Math.sin((i * 20 / 400) * Math.PI) ** 2} stroke="#ff3d5a" strokeWidth="0.6" opacity="0.5" />)}
      {/* River reflection */}
      <rect x="0" y="308" width="800" height="142" fill="#0a0818" />
      {Array.from({ length: 30 }, (_, i) => (
        <rect key={i} x={(i * 53) % 800} y={320 + (i % 8) * 14} width={20 + (i % 5) * 10} height="2" fill="#ffc24b" opacity="0.25" />
      ))}
    </g>
  );
}

function Highrise() {
  return (
    <g>
      <Defs id="hr" sky={["#060a24", "#2a2a6a"]} />
      <rect width="800" height="450" fill="url(#hr-sky)" />
      {/* Towers seen from street level, leaning in */}
      {[
        [0, 160, 200, "#121a44"],
        [170, 240, 120, "#16205a"],
        [330, 280, 150, "#1a2466"],
        [500, 220, 160, "#141c50"],
        [650, 160, 160, "#10173e"],
      ].map(([x, top, w, fill], i) => (
        <g key={i}>
          <path d={`M${x} 450 L${(x as number) + 20} 0 L${(x as number) + (w as number) - 20} 0 L${(x as number) + (w as number)} 450Z`} fill={fill as string} stroke="#9b7bff" strokeOpacity="0.35" />
          {Array.from({ length: 18 }, (_, r) => (
            <line key={r} x1={(x as number) + 6 + r * 0.6} y1={r * 26} x2={(x as number) + (w as number) - 6 - r * 0.6} y2={r * 26} stroke="#cfe0ff" strokeOpacity={0.12 + (r % 3) * 0.06} />
          ))}
          <path d={`M${(x as number) + 30} 0 L${(x as number) + 60} 0 L${(x as number) + 90} 450 L${(x as number) + 50} 450Z`} fill="#fff" opacity="0.05" />
        </g>
      ))}
      <text x="400" y="420" textAnchor="middle" fontSize="18" fontWeight="900" fill="#9b7bff" letterSpacing="8" className="neon">CRANE &amp; PARTNERS</text>
      {/* Helicopter light */}
      <circle cx="560" cy="60" r="4" fill="#ff3d5a" className="neon" />
    </g>
  );
}

function Police() {
  return (
    <g>
      <Defs id="pd" sky={["#050c22", "#13254a"]} />
      <rect width="800" height="450" fill="url(#pd-sky)" />
      {/* Building */}
      <rect x="120" y="110" width="560" height="260" fill="#0d1834" />
      <rect x="100" y="96" width="600" height="20" fill="#112040" />
      {Array.from({ length: 3 }, (_, r) => Array.from({ length: 9 }, (_, c) => (
        <rect key={`${r}-${c}`} x={150 + c * 58} y={140 + r * 52} width="34" height="30" fill="#a8d8ff" opacity={(r + c) % 4 ? 0.45 : 0.1} />
      )))}
      <rect x="350" y="290" width="100" height="80" fill="#08101f" />
      <rect x="330" y="250" width="140" height="28" fill="#0a1428" stroke="#a8d8ff" strokeOpacity="0.6" />
      <text x="400" y="270" textAnchor="middle" fontSize="16" fontWeight="900" fill="#a8d8ff" letterSpacing="6">POLICE</text>
      {/* Lamps by the door */}
      {[320, 480].map((x) => <circle key={x} cx={x} cy="300" r="8" fill="#38e1ff" className="neon" />)}
      {/* Flagpole */}
      <rect x="700" y="60" width="4" height="310" fill="#22304a" />
      <path d="M704 64 h50 l-8 14 l8 14 h-50z" fill="#38e1ff" opacity="0.6" />
      {/* Steps and street */}
      {[0, 1, 2].map((k) => <rect key={k} x={320 - k * 12} y={370 + k * 8} width={160 + k * 24} height="8" fill="#0f1a30" />)}
      <rect x="0" y="394" width="800" height="56" fill="#060a14" />
      {/* Patrol car with lightbar */}
      <g transform="translate(520 360)">
        <path d="M0 30 Q4 10 30 8 L60 -8 H120 L150 8 Q176 10 180 30 V44 H0Z" fill="#e8eef2" stroke="#000" strokeWidth="2" />
        <path d="M66 -4 H116 L138 10 H50Z" fill="#1d2a3d" />
        <rect x="0" y="22" width="180" height="8" fill="#13254a" />
        <rect x="76" y="-16" width="14" height="8" rx="2" fill="#ff3d5a" className="siren-red" />
        <rect x="92" y="-16" width="14" height="8" rx="2" fill="#38e1ff" className="siren-blue" />
        <circle cx="38" cy="46" r="13" fill="#0a0a0a" />
        <circle cx="142" cy="46" r="13" fill="#0a0a0a" />
      </g>
      <circle className="siren-red" cx="603" cy="350" r="70" fill="#ff3d5a" opacity="0.18" />
      <circle className="siren-blue" cx="620" cy="350" r="70" fill="#38e1ff" opacity="0.18" />
      <Rain seed={7} color="#a8d8ff" n={50} />
    </g>
  );
}

function Hospital() {
  return (
    <g>
      <Defs id="hs" sky={["#04121a", "#0f3a40"]} />
      <rect width="800" height="450" fill="url(#hs-sky)" />
      <rect x="200" y="80" width="400" height="300" fill="#0b2228" />
      <Windows x={200} y={80} w={400} h={260} color="#c8fff4" seed={41} density={0.5} />
      <g className="neon">
        <rect x="380" y="30" width="40" height="90" fill="#ff5470" />
        <rect x="355" y="55" width="90" height="40" fill="#ff5470" />
      </g>
      <rect x="320" y="330" width="160" height="50" fill="#e8f0f0" opacity="0.9" />
      <text x="400" y="362" textAnchor="middle" fontSize="16" fontWeight="900" fill="#ff5470" letterSpacing="4">EMERGENCY</text>
      <rect x="0" y="380" width="800" height="70" fill="#041014" />
      <g transform="translate(560 340)">
        <rect x="0" y="0" width="150" height="50" rx="6" fill="#f4f8ff" stroke="#000" strokeWidth="2" />
        <rect x="100" y="8" width="40" height="22" rx="3" fill="#1d2a3d" />
        <path d="M30 14 h12 v-8 h8 v8 h12 v8 h-12 v8 h-8 v-8 h-12z" fill="#ff5470" />
        <rect x="56" y="-10" width="30" height="8" rx="2" fill="#ff5470" className="siren-red" />
        <circle cx="30" cy="52" r="11" fill="#0a0a0a" />
        <circle cx="122" cy="52" r="11" fill="#0a0a0a" />
      </g>
    </g>
  );
}

const SCENES: Record<SceneKind, () => ReactNode> = { street: Street, city: City, highrise: Highrise, police: Police, hospital: Hospital };

// ─── Characters ────────────────────────────────────────────────────────────

const LOOK: Record<CharacterKind, { rim: string; body: ReactNode }> = {
  bum: {
    rim: "#ffb84b",
    body: (
      <g>
        {/* Blanket over the shoulders, beanie, cup */}
        <path d="M60 140 Q100 118 140 140 L160 330 Q100 350 40 330Z" fill="#2a2216" />
        <path d="M74 92 Q100 60 126 92Z" fill="#3a1414" />
        <rect x="128" y="250" width="22" height="26" rx="3" fill="#cfcfcf" opacity="0.8" />
      </g>
    ),
  },
  thug: {
    rim: "#ff3d5a",
    body: (
      <g>
        {/* Hoodie, hands in pockets, baseball bat leaning */}
        <path d="M56 150 Q100 122 144 150 L152 300 H48Z" fill="#14141a" />
        <path d="M70 100 Q100 50 130 100 L128 128 Q100 112 72 128Z" fill="#14141a" />
        <rect x="80" y="230" width="40" height="18" rx="6" fill="#0c0c10" />
        <path d="M162 330 L178 168" stroke="#7a4a2a" strokeWidth="9" strokeLinecap="round" />
      </g>
    ),
  },
  detective: {
    rim: "#38e1ff",
    body: (
      <g>
        {/* Trench coat, fedora, collar up */}
        <path d="M52 146 Q100 124 148 146 L162 330 H38Z" fill="#2a2418" />
        <path d="M100 150 L84 330 M100 150 L116 330" stroke="#1a160e" strokeWidth="3" />
        <path d="M60 86 Q100 74 140 86 L136 92 Q100 82 64 92Z" fill="#141414" />
        <path d="M76 86 Q78 56 100 56 Q122 56 124 86Z" fill="#141414" />
        <rect x="128" y="196" width="22" height="14" rx="2" fill="#ffc24b" opacity="0.8" />
      </g>
    ),
  },
  lawyer: {
    rim: "#9b7bff",
    body: (
      <g>
        <path d="M58 148 Q100 128 142 148 L148 330 H52Z" fill="#1a1830" />
        <path d="M92 148 L100 200 L108 148Z" fill="#e8e8f8" />
        <path d="M97 160 h6 l2 30 l-5 6 l-5 -6z" fill="#9b7bff" />
        <rect x="132" y="250" width="40" height="30" rx="3" fill="#3a2414" stroke="#000" />
      </g>
    ),
  },
  doctor: {
    rim: "#ff7eb6",
    body: (
      <g>
        <path d="M56 148 Q100 126 144 148 L152 330 H48Z" fill="#e8eef0" />
        <path d="M100 150 V330" stroke="#c8d0d4" strokeWidth="2" />
        <path d="M78 160 Q70 220 92 230 Q110 232 112 210" stroke="#1d2a3d" strokeWidth="4" fill="none" />
        <circle cx="112" cy="206" r="6" fill="#9aa5ab" />
      </g>
    ),
  },
  banker: {
    rim: "#7ee0a8",
    body: (
      <g>
        <path d="M58 148 Q100 128 142 148 L148 330 H52Z" fill="#0f241c" />
        <path d="M92 148 L100 196 L108 148Z" fill="#f4f8ff" />
        <path d="M97 158 h6 l2 34 l-5 6 l-5 -6z" fill="#7ee0a8" />
        <rect x="128" y="236" width="44" height="32" rx="3" fill="#1a1a1a" stroke="#7ee0a8" strokeWidth="1.2" />
      </g>
    ),
  },
  vigilante: {
    rim: "#3ee08f",
    body: (
      <g>
        <path d="M56 148 Q100 124 144 148 L156 330 H44Z" fill="#0a140e" />
        <path d="M74 112 Q100 128 126 112 L126 132 Q100 148 74 132Z" fill="#14321f" />
        <path className="scarf-wave" style={{ transformOrigin: "120px 128px" }} d="M120 126 Q160 130 182 118 Q164 140 124 140Z" fill="#14321f" stroke="#3ee08f" strokeWidth="1" />
        <path d="M44 330 L20 200 L56 148Z" fill="#0a140e" opacity="0.9" />
      </g>
    ),
  },
};

export function Character({ kind, className = "" }: { kind: CharacterKind; className?: string }) {
  const { rim, body } = LOOK[kind];
  return (
    <svg viewBox="0 0 200 400" className={`character ${className}`} aria-hidden>
      <ellipse cx="100" cy="380" rx="70" ry="10" fill="#000" opacity="0.5" />
      {/* Legs */}
      <path d="M70 300 L76 378 H94 L98 300Z M102 300 L106 378 H124 L130 300Z" fill="#0b0b10" stroke={rim} strokeOpacity="0.5" />
      {/* Torso and head silhouette with rim light */}
      <path d="M54 150 Q100 124 146 150 L150 310 H50Z" fill="#0b0b10" stroke={rim} strokeWidth="2" />
      <ellipse cx="100" cy="98" rx="24" ry="28" fill="#0b0b10" stroke={rim} strokeWidth="2" />
      {body}
      {/* Eyes catching the light */}
      <rect x="88" y="96" width="8" height="2.5" rx="1" fill={rim} className="char-eyes" />
      <rect x="104" y="96" width="8" height="2.5" rx="1" fill={rim} className="char-eyes" />
    </svg>
  );
}

export function Scene({ kind, characters = [], className = "", children }: {
  kind: SceneKind;
  characters?: { kind: CharacterKind; x: number; scale?: number }[];
  className?: string;
  children?: ReactNode;
}) {
  const Art = SCENES[kind];
  return (
    <div className={`scene ${className}`}>
      <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <Art />
      </svg>
      {characters.map((c, i) => (
        <div key={i} className="scene-char" style={{ left: `${c.x}%`, height: `${(c.scale ?? 1) * 78}%` }}>
          <Character kind={c.kind} />
        </div>
      ))}
      <div className="scene-fade" />
      {children && <div className="scene-content">{children}</div>}
    </div>
  );
}
