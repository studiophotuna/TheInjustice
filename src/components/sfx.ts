// Tiny synthesized sound effects: no audio files, nothing to download. Each is a few
// oscillator notes shaped to feel like the moment (coins, a punch, a door slamming shut).
// Off when the player mutes it; browsers only allow sound after a tap, which every action is.

const KEY = "cns_sound";
let ctx: AudioContext | null = null;

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

function tone(a: AudioContext, freq: number, at: number, dur: number, type: OscillatorType = "sine", vol = 0.12, slideTo?: number) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime + at);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + at + dur);
  g.gain.setValueAtTime(0.0001, a.currentTime + at);
  g.gain.exponentialRampToValueAtTime(vol, a.currentTime + at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + at + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + at);
  o.stop(a.currentTime + at + dur + 0.02);
}

function noise(a: AudioContext, at: number, dur: number, vol = 0.25, lowpass = 900) {
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = lowpass;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start(a.currentTime + at);
}

export type Sfx = "cash" | "hit" | "bad" | "promo" | "story" | "tap";

export function play(s: Sfx) {
  const a = audio();
  if (!a) return;
  switch (s) {
    case "cash": // two bright coins
      tone(a, 1318, 0, 0.09, "triangle", 0.09);
      tone(a, 1760, 0.07, 0.14, "triangle", 0.08);
      break;
    case "hit": // a thud
      noise(a, 0, 0.18, 0.35, 500);
      tone(a, 120, 0, 0.16, "sine", 0.2, 50);
      break;
    case "bad": // a short falling buzz
      tone(a, 330, 0, 0.18, "sawtooth", 0.05, 160);
      break;
    case "promo": // a rising arpeggio
      [523, 659, 784, 1046].forEach((f, i) => tone(a, f, i * 0.08, 0.22, "triangle", 0.08));
      break;
    case "story": // a low, curious chord
      tone(a, 220, 0, 0.6, "sine", 0.06);
      tone(a, 277, 0.05, 0.6, "sine", 0.05);
      tone(a, 330, 0.1, 0.7, "sine", 0.05);
      break;
    case "tap":
      tone(a, 880, 0, 0.04, "square", 0.025);
      break;
  }
}
