import type { TravelMode } from "@/game/types";

// Small side-view vehicles for the travel screens.

export function Vehicle({ mode, className = "", color = "#ff9f43" }: { mode: TravelMode; className?: string; color?: string }) {
  if (mode === "car") {
    return (
      <svg viewBox="0 0 120 50" className={`vehicle ${className}`} aria-hidden>
        <path d="M6 34 V27 Q6 23 12 22 L30 19 L44 8 H78 Q84 8 88 13 L96 20 L110 22 Q116 23 116 28 V34 Z" fill={color} stroke="#000" strokeWidth="2" />
        <path d="M47 11 H62 V20 H36Z" fill="#1d2a3d" />
        <path d="M66 11 H78 Q81 11 84 14 L89 20 H66Z" fill="#1d2a3d" />
        <rect x="108" y="25" width="7" height="4" rx="1" fill="#ffe08a" />
        <rect x="6" y="26" width="5" height="4" rx="1" fill="#ff5a5a" />
        <circle className="wheel-turn" cx="30" cy="36" r="8" fill="#111" stroke="#666" strokeWidth="2" />
        <circle className="wheel-turn" cx="92" cy="36" r="8" fill="#111" stroke="#666" strokeWidth="2" />
      </svg>
    );
  }
  if (mode === "bus") {
    return (
      <svg viewBox="0 0 120 50" className={`vehicle ${className}`} aria-hidden>
        <rect x="4" y="8" width="108" height="30" rx="6" fill="#ffc24b" stroke="#000" strokeWidth="2" />
        {[14, 32, 50, 68, 86].map((x) => <rect key={x} x={x} y="13" width="14" height="10" rx="2" fill="#1d2a3d" />)}
        <rect x="100" y="13" width="9" height="16" rx="2" fill="#1d2a3d" />
        <rect x="4" y="27" width="108" height="3" fill="#d4900f" />
        <circle className="wheel-turn" cx="26" cy="40" r="7" fill="#111" stroke="#666" strokeWidth="2" />
        <circle className="wheel-turn" cx="92" cy="40" r="7" fill="#111" stroke="#666" strokeWidth="2" />
      </svg>
    );
  }
  if (mode === "train") {
    return (
      <svg viewBox="0 0 160 50" className={`vehicle ${className}`} aria-hidden>
        <path d="M120 10 h28 q8 0 8 10 v18 h-36z" fill="#38e1ff" stroke="#000" strokeWidth="2" />
        {[4, 62].map((x) => (
          <g key={x}>
            <rect x={x} y="10" width="54" height="28" rx="4" fill="#e8eef2" stroke="#000" strokeWidth="2" />
            {[0, 1, 2].map((i) => <rect key={i} x={x + 6 + i * 16} y="15" width="12" height="9" rx="2" fill="#1d2a3d" />)}
            <rect x={x} y="30" width="54" height="3" fill="#38e1ff" />
          </g>
        ))}
        <rect x="134" y="15" width="14" height="9" rx="2" fill="#1d2a3d" />
        {[16, 46, 74, 104, 132, 148].map((x) => <circle key={x} className="wheel-turn" cx={x} cy="42" r="5" fill="#111" />)}
        <rect x="0" y="47" width="160" height="2" fill="#555" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 50" className={`vehicle ${className}`} aria-hidden>
      <path d="M8 26 Q10 18 30 18 H96 Q114 18 116 26 Q114 32 96 32 H30 Q10 32 8 26Z" fill="#f4f8ff" stroke="#000" strokeWidth="2" />
      <path d="M50 22 L70 4 H80 L72 22Z" fill="#9b7bff" stroke="#000" strokeWidth="1.5" />
      <path d="M50 30 L66 46 H76 L70 30Z" fill="#9b7bff" stroke="#000" strokeWidth="1.5" />
      <path d="M12 22 L6 10 H14 L22 20Z" fill="#9b7bff" stroke="#000" strokeWidth="1.5" />
      {[34, 44, 54, 64, 74, 84].map((x) => <circle key={x} cx={x} cy="24" r="2" fill="#1d2a3d" />)}
      <path d="M104 22 Q110 22 112 25 H102Z" fill="#1d2a3d" />
    </svg>
  );
}
