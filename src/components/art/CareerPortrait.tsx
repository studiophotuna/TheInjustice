"use client";

// A short looping clip of a real person for each career (police officer, doctor, soldier…), used
// as the player's portrait on the home screen and in their profile. Falls back to the poster
// image when motion is reduced or data saving is on, and to the drawn avatar if it can't load.

import { useEffect, useRef, useState } from "react";
import { PATH_LOOKS, PlayerAvatar } from "./Portraits";

const CLIPS = new Set(["police", "enforcer", "courts", "medicine", "banking", "military", "vigilante"]);

export function CareerPortrait({ path, name, className = "" }: { path: string | null | undefined; name: string; className?: string }) {
  const clip = path && CLIPS.has(path) ? path : "street";
  const rim = (path && PATH_LOOKS[path]?.rim) || "#ffc24b";
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [still, setStill] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduce || saveData) setStill(true);
  }, []);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => undefined);
  }, [still, clip]);
  if (failed) return <PlayerAvatar name={name} path={path} className={className} />;
  return (
    <div className={`career-portrait ${className}`} style={{ ["--rim" as string]: rim }}>
      {still ? (
        <img src={`/portraits/${clip}.jpg`} alt="" aria-hidden />
      ) : (
        <video key={clip} ref={ref} poster={`/portraits/${clip}.jpg`} autoPlay muted loop playsInline preload="metadata" aria-hidden onError={() => setFailed(true)}>
          <source src={`/portraits/${clip}.webm`} type="video/webm" />
          <source src={`/portraits/${clip}.mp4`} type="video/mp4" />
        </video>
      )}
      <span className="career-portrait-shade" />
    </div>
  );
}
