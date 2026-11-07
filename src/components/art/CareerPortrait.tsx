"use client";

// A photo of a real person for each career and rank (cadet to commissioner, intern to medical
// director), used as the player's portrait on the home screen and in their profile.

import { useState } from "react";
import { rankPortrait } from "@/game/content/faces";
import { PATH_LOOKS, PlayerAvatar } from "./Portraits";

/** Every career has a different photo for each rank. Still images: no clips. */
export function CareerPortrait({ path, rank, name, className = "" }: { path: string | null | undefined; rank?: number | null; name: string; className?: string }) {
  const rim = (path && PATH_LOOKS[path]?.rim) || "#ffc24b";
  const [failed, setFailed] = useState(false);
  if (failed) return <PlayerAvatar name={name} path={path} className={className} />;
  return (
    <div className={`career-portrait ${className}`} style={{ ["--rim" as string]: rim }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={path ? rankPortrait(path, rank) : "/portraits/street.jpg"} alt="" aria-hidden onError={() => setFailed(true)} />
      <span className="career-portrait-shade" />
    </div>
  );
}
