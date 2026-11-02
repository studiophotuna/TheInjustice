import type { DistrictId } from "@/game/types";

// Layered vector skyline for Grayhaven. Each district gets its own palette and landmark.
// Animations (rain, neon flicker, lit windows, smoke, sirens) are CSS, see globals.css.

type Theme = { sky: [string, string]; far: string; mid: string; near: string; glow: string; window: string };

const THEMES: Record<DistrictId | "title", Theme> = {
  title: { sky: ["#140d24", "#3a1430"], far: "#1b1430", mid: "#120e1f", near: "#08070d", glow: "#ff3d5a", window: "#ffc24b" },
  gutter: { sky: ["#0c1220", "#1d2a3a"], far: "#141c2a", mid: "#0e141f", near: "#07090e", glow: "#ff8a3d", window: "#ffb84b" },
  old_market: { sky: ["#1a0f1f", "#4a2030"], far: "#26162a", mid: "#1a0f1e", near: "#0b070d", glow: "#ffc24b", window: "#ffd27a" },
  southside: { sky: ["#170c18", "#3b1626"], far: "#221222", mid: "#170c17", near: "#0a050a", glow: "#3ee08f", window: "#ffcf7a" },
  courthouse_hill: { sky: ["#0d0f1c", "#2a2440"], far: "#1a1a2c", mid: "#12121f", near: "#08080f", glow: "#9b7bff", window: "#e7dcff" },
  iron_row: { sky: ["#141414", "#3a2a1a"], far: "#211d19", mid: "#161310", near: "#0a0907", glow: "#ff6a2b", window: "#ff9f43" },
  precinct_square: { sky: ["#07112a", "#14264a"], far: "#0f1a33", mid: "#0a1226", near: "#050a16", glow: "#38e1ff", window: "#a8d8ff" },
};

/** Deterministic pseudo-random so the skyline is identical on server and client. */
function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function Buildings({ seed, y, minH, maxH, color, windows, windowColor }: {
  seed: number; y: number; minH: number; maxH: number; color: string; windows: boolean; windowColor: string;
}) {
  const r = rand(seed);
  const out: React.ReactNode[] = [];
  let x = -10;
  let i = 0;
  while (x < 820) {
    const w = 40 + r() * 60;
    const h = minH + r() * (maxH - minH);
    const top = y - h;
    out.push(<rect key={`b${i}`} x={x} y={top} width={w} height={h + 40} fill={color} />);
    if (r() > 0.6) out.push(<rect key={`a${i}`} x={x + w / 2 - 1} y={top - 18} width={2} height={18} fill={color} />);
    if (windows) {
      for (let wy = top + 10; wy < y - 8; wy += 14) {
        for (let wx = x + 7; wx < x + w - 8; wx += 11) {
          const v = r();
          if (v > 0.72) {
            out.push(
              <rect
                key={`w${i}-${wx}-${wy}`}
                className={v > 0.95 ? "win-flicker" : undefined}
                style={v > 0.95 ? { animationDelay: `${(v * 9).toFixed(1)}s` } : undefined}
                x={wx}
                y={wy}
                width={4}
                height={6}
                fill={windowColor}
                opacity={0.35 + v * 0.5}
              />,
            );
          }
        }
      }
    }
    x += w + 2 + r() * 6;
    i++;
  }
  return <g>{out}</g>;
}

function Landmark({ district, t }: { district: DistrictId | "title"; t: Theme }) {
  switch (district) {
    case "gutter":
      return (
        <g>
          {/* Overpass */}
          <path d="M0 250 Q400 205 800 250 L800 268 Q400 223 0 268Z" fill="#0c111a" />
          <rect x="120" y="258" width="22" height="120" fill="#0c111a" />
          <rect x="640" y="258" width="22" height="120" fill="#0c111a" />
          {/* Trash-can fire */}
          <ellipse className="fire-glow" cx="400" cy="345" rx="90" ry="30" fill={t.glow} opacity="0.25" />
          <rect x="386" y="330" width="28" height="30" rx="3" fill="#1a1a1a" />
          <path className="fire" d="M392 332 Q396 312 400 322 Q404 306 408 332Z" fill="#ffb03b" />
        </g>
      );
    case "old_market":
      return (
        <g>
          {[[90, "#c0392b"], [250, "#d4a017"], [420, "#2e86ab"], [590, "#8e44ad"]].map(([x, c]) => (
            <g key={x as number}>
              <path d={`M${x} 300 l70 0 l-10 -22 l-50 0z`} fill={c as string} opacity="0.85" />
              <rect x={(x as number) + 6} y="300" width="58" height="60" fill="#120b12" />
            </g>
          ))}
          <path d="M0 230 Q200 260 400 232 T800 236" stroke="#3a2a2a" strokeWidth="1.5" fill="none" />
          {Array.from({ length: 16 }, (_, k) => (
            <circle key={k} className="bulb" style={{ animationDelay: `${k * 0.2}s` }} cx={k * 52 + 10} cy={246 + Math.sin(k) * 8} r="3" fill={t.window} />
          ))}
        </g>
      );
    case "iron_row":
      return (
        <g>
          {[160, 260, 560].map((x, k) => (
            <g key={x}>
              <rect x={x} y={140 + k * 10} width="26" height="160" fill="#100d0a" />
              <circle className="smoke" style={{ animationDelay: `${k * 1.3}s` }} cx={x + 13} cy={130 + k * 10} r="18" fill="#5a4a3a" opacity="0.35" />
            </g>
          ))}
          <path d="M0 300 L120 300 L120 260 L200 280 L200 260 L280 280 L280 260 L360 280 L360 300 L800 300 L800 400 L0 400Z" fill="#0d0b09" />
          <rect x="0" y="296" width="800" height="3" fill={t.glow} opacity="0.4" />
        </g>
      );
    case "southside":
      return (
        <g>
          {/* Tenements with fire escapes */}
          {[40, 250, 520].map((x, k) => (
            <g key={x}>
              <rect x={x} y={170 + k * 15} width="150" height="200" fill="#120a12" />
              {[0, 1, 2, 3].map((f) => (
                <g key={f} stroke="#3a2632" strokeWidth="2" fill="none">
                  <path d={`M${x + 20} ${200 + k * 15 + f * 40} h60 v12 h-60z`} />
                  <path d={`M${x + 30} ${212 + k * 15 + f * 40} l40 28`} />
                </g>
              ))}
            </g>
          ))}
          {/* Graffiti and a chalk scarf */}
          <text x="600" y="240" fontSize="22" fontWeight="900" fill={t.glow} opacity="0.7" transform="rotate(-6 600 240)" className="neon">WATCHING</text>
          {/* Streetlight */}
          <rect x="460" y="250" width="5" height="110" fill="#222" />
          <path d="M462 252 q20 -8 30 2" stroke="#222" strokeWidth="5" fill="none" />
          <path className="win-flicker" d="M486 258 L520 360 L452 360Z" fill="#ffcf7a" opacity="0.12" />
        </g>
      );
    case "courthouse_hill":
      return (
        <g>
          {/* Courthouse with dome, columns and steps */}
          <ellipse cx="400" cy="150" rx="70" ry="50" fill="#16162a" />
          <rect x="396" y="88" width="8" height="18" fill="#16162a" />
          <path d="M240 200 L400 150 L560 200Z" fill="#191930" stroke={t.glow} strokeOpacity="0.4" />
          <rect x="250" y="200" width="300" height="12" fill="#1c1c34" />
          {[268, 312, 356, 400, 444, 488, 532].map((x) => (
            <rect key={x} x={x - 8} y="212" width="16" height="110" fill="#22223c" />
          ))}
          {[0, 1, 2, 3].map((k) => (
            <rect key={k} x={230 - k * 12} y={322 + k * 10} width={340 + k * 24} height="10" fill="#1a1a30" />
          ))}
          {/* Statue of Justice with scales */}
          <rect x="128" y="262" width="20" height="98" fill="#16162a" />
          <circle cx="138" cy="252" r="8" fill="#16162a" />
          <path d="M112 270 h52 M112 270 l-8 16 h16z M164 270 l-8 16 h16z" stroke={t.glow} strokeWidth="2" fill="none" className="neon" />
        </g>
      );
    case "precinct_square":
      return (
        <g>
          <rect x="280" y="180" width="240" height="180" fill="#0b1428" />
          <path d="M270 180 L400 130 L530 180Z" fill="#0b1428" />
          {[310, 360, 410, 460].map((x) => (
            <rect key={x} x={x} y="200" width="14" height="140" fill="#13213f" />
          ))}
          <rect x="350" y="150" width="100" height="18" fill="#0f1c38" />
          <text x="400" y="164" textAnchor="middle" fontSize="12" fontWeight="700" fill="#a8d8ff" letterSpacing="3">POLICE</text>
          <circle className="siren-red" cx="330" cy="352" r="40" fill="#ff3d5a" opacity="0.3" />
          <circle className="siren-blue" cx="470" cy="352" r="40" fill="#38e1ff" opacity="0.3" />
        </g>
      );
    default:
      return (
        <g>
          <rect x="560" y="120" width="70" height="28" rx="3" fill="#0b0710" stroke={t.glow} strokeWidth="2" className="neon" />
          <text x="595" y="139" textAnchor="middle" fontSize="13" fontWeight="800" fill={t.glow} className="neon" letterSpacing="2">BAR</text>
        </g>
      );
  }
}

export function Skyline({ district = "title", className = "", rain = true }: {
  district?: DistrictId | "title";
  className?: string;
  rain?: boolean;
}) {
  const t = THEMES[district];
  const id = `sky-${district}`;
  return (
    <div className={`skyline ${className}`} aria-hidden>
      <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={t.sky[0]} />
            <stop offset="1" stopColor={t.sky[1]} />
          </linearGradient>
          <radialGradient id={`${id}-moon`}>
            <stop offset="0" stopColor="#fff6e0" stopOpacity="0.9" />
            <stop offset="1" stopColor="#fff6e0" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="800" height="400" fill={`url(#${id})`} />
        <circle cx="660" cy="70" r="70" fill={`url(#${id}-moon)`} opacity="0.35" />
        <circle cx="660" cy="70" r="22" fill="#f4ecd8" opacity="0.85" />
        <Buildings seed={7} y={300} minH={90} maxH={210} color={t.far} windows={false} windowColor={t.window} />
        <Buildings seed={21} y={330} minH={60} maxH={170} color={t.mid} windows windowColor={t.window} />
        <Landmark district={district} t={t} />
        <rect x="0" y="360" width="800" height="40" fill={t.near} />
        <rect x="0" y="358" width="800" height="2" fill={t.glow} opacity="0.25" />
      </svg>
      {rain && <div className="rain" />}
      <div className="skyline-fade" />
    </div>
  );
}
