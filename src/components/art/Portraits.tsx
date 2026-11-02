// Vector character portraits: a lit silhouette bust plus a signature prop per character.

type Prop = "hood" | "cap" | "gloves" | "bandana" | "hardhat" | "mask" | "none";

const NPC_LOOKS: Record<string, { rim: string; bg: string; prop: Prop }> = {
  alley_rat: { rim: "#9bff6a", bg: "#14200f", prop: "hood" },
  drunk_sailor: { rim: "#38e1ff", bg: "#0c1a24", prop: "cap" },
  dock_brawler: { rim: "#ffc24b", bg: "#241a0a", prop: "gloves" },
  southside_bruiser: { rim: "#ff3d5a", bg: "#260c12", prop: "bandana" },
  iron_foreman: { rim: "#ff8a3d", bg: "#24140a", prop: "hardhat" },
  mugger: { rim: "#c9c9c9", bg: "#141414", prop: "mask" },
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

const PLAYER_RIMS = ["#ffc24b", "#38e1ff", "#ff3d5a", "#3ee08f", "#9b7bff", "#ff8a3d"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** The player's avatar. Its color comes from the name; police get a cap, enforcers a scar-red rim. */
export function PlayerAvatar({ name, path, className = "" }: { name: string; path?: string | null; className?: string }) {
  const rim = path === "police" ? "#38e1ff" : path === "enforcer" ? "#ff3d5a" : PLAYER_RIMS[hash(name) % PLAYER_RIMS.length];
  return (
    <div className={`portrait ${className}`} style={{ ["--rim" as string]: rim }}>
      <Bust rim={rim} bg="#0b0d12" prop={path === "police" ? "cap" : "none"} />
    </div>
  );
}
