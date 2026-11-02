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
  st_brigids: { sky: ["#071318", "#123a40"], far: "#10242a", mid: "#0b1a1f", near: "#050c0f", glow: "#ff5470", window: "#c8fff4" },
  boardwalk: { sky: ["#2a0f3a", "#ff7a59"], far: "#3a1a3a", mid: "#24102a", near: "#12081a", glow: "#ffd27a", window: "#ffe7b0" },
  casino_strip: { sky: ["#12051e", "#3a0a3a"], far: "#1e0a26", mid: "#14061c", near: "#08030c", glow: "#ff3df2", window: "#ffd27a" },
  marina: { sky: ["#0a1430", "#2a4a7a"], far: "#13203a", mid: "#0c162a", near: "#060b18", glow: "#ffc24b", window: "#ffe7b0" },
  exchange: { sky: ["#061a14", "#1a5a46"], far: "#0e2a22", mid: "#0a1e18", near: "#040e0b", glow: "#7ee0a8", window: "#e8fff4" },
  rail_yards: { sky: ["#141820", "#3a3f4a"], far: "#20242c", mid: "#15181f", near: "#0a0c10", glow: "#ff6a2b", window: "#ffd08a" },
  checkpoint_row: { sky: ["#0c1018", "#2a3242"], far: "#181e2a", mid: "#10141e", near: "#080a10", glow: "#f4f8ff", window: "#d8e6ff" },
  foundry: { sky: ["#1a0c06", "#5a2410"], far: "#2a140a", mid: "#1a0c06", near: "#0c0604", glow: "#ff7a1a", window: "#ffb060" },
  undercity: { sky: ["#05060a", "#141a24"], far: "#0e121a", mid: "#0a0d14", near: "#04060a", glow: "#3ee08f", window: "#9bffcf" },
  glass_quarter: { sky: ["#0a0f2a", "#3a3a8a"], far: "#1a1e44", mid: "#12163a", near: "#080a1e", glow: "#9b7bff", window: "#cfe0ff" },
  tech_park: { sky: ["#040a1a", "#0a2a4a"], far: "#0c1a30", mid: "#081426", near: "#040a16", glow: "#38e1ff", window: "#9be8ff" },
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
    case "st_brigids":
      return (
        <g>
          <rect x="250" y="150" width="300" height="210" fill="#0d1f24" />
          <rect x="360" y="110" width="80" height="50" fill="#0d1f24" />
          <g className="neon">
            <rect x="388" y="118" width="24" height="34" fill={t.glow} />
            <rect x="383" y="123" width="34" height="24" fill={t.glow} />
          </g>
          {Array.from({ length: 6 }, (_, r) => Array.from({ length: 8 }, (_, c) => (
            <rect key={`${r}-${c}`} x={266 + c * 35} y={170 + r * 28} width="18" height="12" fill={t.window} opacity={(r + c) % 3 ? 0.55 : 0.15} />
          )))}
          <rect x="120" y="330" width="80" height="30" rx="4" fill="#e8f0f0" />
          <circle className="siren-red" cx="160" cy="326" r="20" fill={t.glow} opacity="0.35" />
        </g>
      );
    case "boardwalk":
      return (
        <g>
          <rect x="0" y="310" width="800" height="60" fill="#1a3a5a" opacity="0.7" />
          <path d="M60 300 h420 v8 h-420z" fill="#2a1420" />
          {[80, 140, 200, 260, 320, 380, 440].map((x) => <rect key={x} x={x} y="308" width="6" height="50" fill="#2a1420" />)}
          <g className="wheel" style={{ transformOrigin: "620px 210px" }}>
            <circle cx="620" cy="210" r="80" fill="none" stroke={t.glow} strokeWidth="3" />
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return <line key={i} x1="620" y1="210" x2={620 + Math.cos(a) * 80} y2={210 + Math.sin(a) * 80} stroke={t.glow} strokeWidth="1.5" opacity="0.7" />;
            })}
          </g>
          <path d="M580 300 L620 210 L660 300" stroke="#2a1420" strokeWidth="6" fill="none" />
        </g>
      );
    case "casino_strip":
      return (
        <g>
          <path d="M300 360 V200 Q400 120 500 200 V360Z" fill="#1e0a26" stroke={t.glow} strokeWidth="2" className="neon" />
          {Array.from({ length: 14 }, (_, i) => (
            <circle key={i} className="bulb" style={{ animationDelay: `${i * 0.12}s` }} cx={310 + i * 13.5} cy={204 - Math.sin((i / 13) * Math.PI) * 70} r="3" fill={t.window} />
          ))}
          <rect x="80" y="200" width="120" height="40" rx="6" fill="#140616" stroke="#3df2ff" strokeWidth="2" className="neon" />
          <text x="140" y="228" textAnchor="middle" fontSize="20" fontWeight="900" fill="#3df2ff" className="neon">LUCKY</text>
          <rect x="590" y="230" width="140" height="40" rx="6" fill="#140616" stroke={t.glow} strokeWidth="2" />
          <text x="660" y="258" textAnchor="middle" fontSize="20" fontWeight="900" fill={t.glow} className="neon">777</text>
        </g>
      );
    case "marina":
      return (
        <g>
          <rect x="0" y="320" width="800" height="50" fill="#0e2a4a" />
          {[[120, 1], [330, 1.3], [560, 0.9]].map(([x, k]) => (
            <g key={x} transform={`translate(${x} 320) scale(${k})`}>
              <path d="M-60 0 h120 l-14 18 h-92z" fill="#e8eef2" />
              <rect x="-2" y="-90" width="3" height="90" fill="#c8d0d8" />
              <path d="M2 -88 L50 -8 H2Z" fill="#f4f8ff" opacity="0.85" />
            </g>
          ))}
          <path d="M680 320 V140 h60 v14 h-48 v166" fill="none" stroke="#3a4a5a" strokeWidth="6" />
          <rect x="736" y="150" width="6" height="60" fill="#3a4a5a" />
          {Array.from({ length: 12 }, (_, i) => <rect key={i} x={i * 70} y={340 + (i % 3) * 8} width="40" height="2" fill={t.glow} opacity="0.4" />)}
        </g>
      );
    case "exchange":
      return (
        <g>
          <rect x="220" y="150" width="360" height="210" fill="#0c241c" />
          <path d="M200 150 L400 90 L600 150Z" fill="#0e2a22" stroke={t.glow} strokeOpacity="0.5" />
          {[250, 310, 370, 430, 490, 550].map((x) => <rect key={x} x={x - 9} y="160" width="18" height="170" fill="#123a2e" />)}
          <rect x="200" y="330" width="400" height="30" fill="#0e2a22" />
          <text x="400" y="138" textAnchor="middle" fontSize="16" fontWeight="900" fill={t.glow} letterSpacing="4" className="neon">EXCHANGE</text>
          <rect x="40" y="190" width="150" height="46" rx="4" fill="#020806" stroke={t.glow} strokeWidth="1.5" />
          <g className="ticker">
            <text x="50" y="219" fontSize="14" fontWeight="800" fill={t.glow} fontFamily="monospace">C&amp;P ▲ 4.71 · VAR ▼ 1.2 · SOL ▲ 0.8</text>
          </g>
        </g>
      );
    case "rail_yards":
      return (
        <g>
          {[0, 1].map((r) => <rect key={r} x="0" y={330 + r * 18} width="800" height="3" fill="#4a4a50" />)}
          {[30, 180, 330, 480].map((x, i) => (
            <g key={x}>
              <rect x={x} y={280 - (i % 2) * 18} width="140" height="54" fill={["#3a1a14", "#1e2a3a", "#2a2a1a", "#3a1a14"][i]} stroke="#000" />
              <circle cx={x + 25} cy={336 - (i % 2) * 18} r="8" fill="#111" />
              <circle cx={x + 115} cy={336 - (i % 2) * 18} r="8" fill="#111" />
            </g>
          ))}
          <rect x="680" y="200" width="8" height="130" fill="#222" />
          <circle cx="684" cy="196" r="9" fill={t.glow} className="neon" />
          <circle className="smoke" cx="620" cy="250" r="22" fill="#5a5a60" opacity="0.35" />
        </g>
      );
    case "checkpoint_row":
      return (
        <g>
          <rect x="0" y="280" width="800" height="80" fill="#141822" />
          {Array.from({ length: 20 }, (_, i) => <rect key={i} x={i * 40} y="270" width="22" height="12" fill="#141822" />)}
          <rect x="360" y="140" width="40" height="140" fill="#10141c" />
          <rect x="344" y="120" width="72" height="30" fill="#10141c" />
          <path className="searchlight" d="M380 140 L120 360 L240 360Z" fill={t.glow} opacity="0.12" style={{ transformOrigin: "380px 140px" }} />
          <circle cx="380" cy="140" r="6" fill={t.glow} />
          <rect x="560" y="300" width="60" height="60" fill="#1a2030" />
          <rect x="570" y="292" width="100" height="6" fill="#ff3d5a" />
        </g>
      );
    case "foundry":
      return (
        <g>
          {[120, 220, 600, 680].map((x, k) => (
            <g key={x}>
              <rect x={x} y={120 + k * 12} width="30" height="200" fill="#120804" />
              <circle className="smoke" style={{ animationDelay: `${k}s` }} cx={x + 15} cy={110 + k * 12} r="20" fill="#4a3020" opacity="0.4" />
            </g>
          ))}
          <path d="M260 360 V230 h280 v130Z" fill="#160a04" />
          <rect className="fire-glow" x="320" y="270" width="160" height="90" fill={t.glow} opacity="0.35" />
          <rect x="340" y="290" width="120" height="70" fill="#ffb060" opacity="0.5" />
        </g>
      );
    case "undercity":
      return (
        <g>
          {[60, 300, 560].map((x) => <rect key={x} x={x} y="0" width="140" height="360" fill="#0b0f16" />)}
          {[100, 180, 260].map((y, i) => <path key={y} d={`M0 ${y} H800`} stroke="#1e2a2a" strokeWidth={10 - i * 2} />)}
          <path d="M200 0 V360 M460 0 V360" stroke="#24302e" strokeWidth="8" />
          <circle className="smoke" cx="470" cy="200" r="24" fill="#8fd8b8" opacity="0.15" />
          {Array.from({ length: 10 }, (_, i) => <rect key={i} className="win-flicker" style={{ animationDelay: `${i * 0.4}s` }} x={80 + (i * 73) % 640} y={300 + (i % 3) * 14} width="10" height="4" fill={t.glow} />)}
        </g>
      );
    case "glass_quarter":
      return (
        <g>
          {[[80, 40, 90], [200, 10, 110], [340, 60, 80], [450, 0, 130], [610, 30, 100]].map(([x, y, w]) => (
            <g key={x}>
              <rect x={x} y={y} width={w} height={360 - y} fill="#16204a" stroke={t.glow} strokeOpacity="0.3" />
              <path d={`M${x} ${y} L${x + w} ${y + 120} V${y + 160} L${x} ${y + 40}Z`} fill="#ffffff" opacity="0.06" />
              {Array.from({ length: 10 }, (_, r) => <rect key={r} x={x + 6} y={y + 20 + r * 30} width={w - 12} height="2" fill={t.window} opacity="0.25" />)}
            </g>
          ))}
        </g>
      );
    case "tech_park":
      return (
        <g>
          <rect x="120" y="230" width="560" height="130" fill="#081426" stroke={t.glow} strokeOpacity="0.3" />
          {Array.from({ length: 8 }, (_, c) => Array.from({ length: 4 }, (_, r) => (
            <rect key={`${c}-${r}`} className="bulb" style={{ animationDelay: `${(c + r) * 0.15}s` }} x={150 + c * 66} y={250 + r * 26} width="40" height="6" fill={(c + r) % 2 ? t.glow : "#3ee08f"} opacity="0.7" />
          )))}
          <path d="M600 230 L640 160 L680 230" stroke="#2a3a5a" strokeWidth="4" fill="none" />
          <path d="M610 170 Q640 120 670 170" fill="none" stroke={t.glow} strokeWidth="3" />
          <path d="M0 360 L800 360" stroke={t.glow} strokeOpacity="0.4" />
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
