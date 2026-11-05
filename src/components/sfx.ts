// Sound effects: short recorded clips (CC0, see public/sfx/CREDITS.txt), played through Web Audio
// so overlapping sounds don't cut each other off and phones play them after the first tap.
// Clips are fetched once, on first use, and kept in memory.

const KEY = "cns_sound";
let ctx: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();

export type Sfx = "coin" | "cash" | "fight" | "run" | "jail" | "busted" | "promo" | "story" | "bad" | "tap";
const VOLUME: Record<Sfx, number> = { coin: 0.7, cash: 0.7, fight: 0.8, run: 0.6, jail: 0.8, busted: 0.45, promo: 0.6, story: 0.7, bad: 0.6, tap: 0.4 };

export function soundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return false;
  }
}

export function setSound(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event("conspira:sound"));
}

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !soundOn()) return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function load(a: AudioContext, s: Sfx): Promise<AudioBuffer | null> {
  let b = buffers.get(s);
  if (!b) {
    b = fetch(`/sfx/${s}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
      .then((data) => a.decodeAudioData(data))
      .catch(() => null);
    buffers.set(s, b);
  }
  return b;
}

/** Plays a sound now (or as soon as it has loaded the first time). `delay` in seconds. */
export function play(s: Sfx, delay = 0) {
  const a = audio();
  if (!a) return;
  load(a, s).then((buf) => {
    if (!buf) return;
    const src = a.createBufferSource();
    src.buffer = buf;
    const g = a.createGain();
    g.gain.value = VOLUME[s];
    src.connect(g).connect(a.destination);
    src.start(a.currentTime + delay);
  });
}

/** Warms up the clips most actions use, so the first one isn't late. */
export function preloadSounds() {
  const a = audio();
  if (!a) return;
  for (const s of ["coin", "fight", "tap", "bad"] as Sfx[]) load(a, s);
}
