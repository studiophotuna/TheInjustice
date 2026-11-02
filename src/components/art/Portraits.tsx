// Vector character portraits: a lit silhouette bust plus a signature prop per character.

type Prop = "hood" | "cap" | "gloves" | "bandana" | "hardhat" | "mask" | "fedora" | "glasses" | "scarf" | "bun" | "headmirror" | "helmet" | "visor" | "none";

const NPC_LOOKS: Record<string, { rim: string; bg: string; prop: Prop }> = {
  alley_rat: { rim: "#9bff6a", bg: "#14200f", prop: "hood" },
  drunk_sailor: { rim: "#38e1ff", bg: "#0c1a24", prop: "cap" },
  dock_brawler: { rim: "#ffc24b", bg: "#241a0a", prop: "gloves" },
  southside_bruiser: { rim: "#ff3d5a", bg: "#260c12", prop: "bandana" },
  iron_foreman: { rim: "#ff8a3d", bg: "#24140a", prop: "hardhat" },
  mugger: { rim: "#c9c9c9", bg: "#141414", prop: "mask" },
  // Career contacts
  reyes: { rim: "#38e1ff", bg: "#071a2a", prop: "cap" },
  kozak: { rim: "#ff3d5a", bg: "#220810", prop: "fedora" },
  marsh: { rim: "#9b7bff", bg: "#140f2a", prop: "bun" },
  silas: { rim: "#3ee08f", bg: "#08201a", prop: "scarf" },
  mercy: { rim: "#ff7eb6", bg: "#2a0c1c", prop: "headmirror" },
  // Other countries
  beach_hustler: { rim: "#ffd27a", bg: "#2a1a0a", prop: "glasses" },
  casino_bouncer: { rim: "#ff3df2", bg: "#22062a", prop: "none" },
  rail_rat: { rim: "#ff8a3d", bg: "#1a120a", prop: "cap" },
  state_enforcer: { rim: "#d8e6ff", bg: "#101626", prop: "helmet" },
  undercity_scav: { rim: "#3ee08f", bg: "#061a12", prop: "hood" },
  corp_security: { rim: "#9b7bff", bg: "#120f2a", prop: "visor" },
  road_gang: { rim: "#ffc24b", bg: "#1e1606", prop: "bandana" },
};

function PropShape({ prop, rim }: { prop: Prop; rim: string }) {
  switch (prop) {
    case "hood":
      return <path d="M30 52 Q50 8 70 52 L66 60 Q50 30 34 60Z" fill="#0b0b0b" stroke={rim} strokeWidth="1.2" />;
    case "cap":
      return (
        <g>
          <rect x="36" y="22" width="28" height="9" rx="3" fill="#f2f2f2" />
          <rect x="33" y="29" width="34" height="4" rx="2" fill="#1b1b1b" />
        </g>
      );
    case "gloves":
      return (
        <g>
          <circle cx="24" cy="80" r="11" fill="#c0392b" stroke={rim} strokeWidth="1" />
          <circle cx="76" cy="80" r="11" fill="#c0392b" stroke={rim} strokeWidth="1" />
        </g>
      );
    case "bandana":
      return <path d="M36 48 L64 48 L60 58 Q50 64 40 58Z" fill="#b3001b" />;
    case "hardhat":
      return (
        <g>
          <path d="M34 34 Q50 14 66 34Z" fill="#f2b705" />
          <rect x="30" y="32" width="40" height="4" rx="2" fill="#f2b705" />
        </g>
      );
    case "fedora":
      return (
        <g>
          <path d="M28 34 Q50 28 72 34 L70 37 Q50 32 30 37Z" fill="#1b1b1b" stroke={rim} strokeWidth="0.8" />
          <path d="M37 33 Q38 16 50 16 Q62 16 63 33Z" fill="#1b1b1b" stroke={rim} strokeWidth="0.8" />
          <rect x="37" y="28" width="26" height="3" fill={rim} opacity="0.7" />
        </g>
      );
    case "glasses":
      return (
        <g stroke={rim} strokeWidth="1.4" fill="rgba(255,255,255,0.08)">
          <circle cx="44" cy="43" r="5" />
          <circle cx="56" cy="43" r="5" />
          <path d="M49 43h2" />
        </g>
      );
    case "scarf":
      return (
        <g>
          <path d="M34 48 Q50 56 66 48 L66 58 Q50 66 34 58Z" fill="#14321f" stroke={rim} strokeWidth="1" />
          <path d="M60 58 l10 18 l-6 2 l-8 -16z" fill="#14321f" stroke={rim} strokeWidth="1" />
        </g>
      );
    case "bun":
      return (
        <g>
          <circle cx="50" cy="24" r="8" fill="#050507" stroke={rim} strokeWidth="1.2" />
          <g stroke={rim} strokeWidth="1.2" fill="rgba(255,255,255,0.08)">
            <rect x="39" y="40" width="9" height="6" rx="2" />
            <rect x="52" y="40" width="9" height="6" rx="2" />
          </g>
        </g>
      );
    case "headmirror":
      return (
        <g>
          <path d="M35 34 Q50 26 65 34" stroke={rim} strokeWidth="2" fill="none" />
          <circle cx="50" cy="31" r="6" fill="#dfe9ea" stroke={rim} strokeWidth="1.5" />
          <circle cx="50" cy="31" r="2" fill="#050507" />
        </g>
      );
    case "helmet":
      return <path d="M33 40 Q34 20 50 20 Q66 20 67 40 L70 42 H30Z" fill="#2a3448" stroke={rim} strokeWidth="1.2" />;
    case "visor":
      return <rect x="35" y="38" width="30" height="9" rx="4" fill={rim} opacity="0.6" />;
    case "mask":
      return <rect x="36" y="38" width="28" height="8" rx="3" fill="#0b0b0b" stroke={rim} strokeWidth="0.8" />;
    default:
      return null;
  }
}

function Bust({ rim, bg, prop, eyes = true }: { rim: string; bg: string; prop: Prop; eyes?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className="portrait-svg" aria-hidden>
      <defs>
        <radialGradient id={`pg-${rim}`} cx="0.5" cy="0.35" r="0.7">
          <stop offset="0" stopColor={rim} stopOpacity="0.35" />
          <stop offset="1" stopColor={bg} stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#pg-${rim})`} />
      {/* shoulders + head */}
      <path d="M12 100 Q14 70 50 66 Q86 70 88 100Z" fill="#050507" stroke={rim} strokeWidth="1.5" />
      <ellipse cx="50" cy="44" rx="15" ry="18" fill="#050507" stroke={rim} strokeWidth="1.5" />
      {eyes && (
        <g className="eyes">
          <rect x="42" y="42" width="5" height="2" rx="1" fill={rim} />
          <rect x="53" y="42" width="5" height="2" rx="1" fill={rim} />
        </g>
      )}
      <PropShape prop={prop} rim={rim} />
    </svg>
  );
}

export function NpcPortrait({ id, className = "" }: { id: string; className?: string }) {
  const look = NPC_LOOKS[id] ?? NPC_LOOKS.mugger;
  return (
    <div className={`portrait ${className}`} style={{ ["--rim" as string]: look.rim }}>
      <Bust {...look} />
    </div>
  );
}

/** Career colors, also used for badges across the UI. */
export const PATH_LOOKS: Record<string, { rim: string; prop: Prop }> = {
  police: { rim: "#38e1ff", prop: "cap" },
  enforcer: { rim: "#ff3d5a", prop: "none" },
  courts: { rim: "#9b7bff", prop: "glasses" },
  vigilante: { rim: "#3ee08f", prop: "scarf" },
  medicine: { rim: "#ff7eb6", prop: "headmirror" },
};

const PLAYER_RIMS = ["#ffc24b", "#38e1ff", "#ff3d5a", "#3ee08f", "#9b7bff", "#ff8a3d"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** The player's avatar. Its color comes from the name; police get a cap, enforcers a scar-red rim. */
export function PlayerAvatar({ name, path, className = "" }: { name: string; path?: string | null; className?: string }) {
  const look = path ? PATH_LOOKS[path] : undefined;
  const rim = look?.rim ?? PLAYER_RIMS[hash(name) % PLAYER_RIMS.length];
  return (
    <div className={`portrait ${className}`} style={{ ["--rim" as string]: rim }}>
      <Bust rim={rim} bg="#0b0d12" prop={look?.prop ?? "none"} />
    </div>
  );
}
