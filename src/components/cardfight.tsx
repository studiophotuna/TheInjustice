"use client";

// The fight scene as cards: every move the server worked out is dealt face-down, flipped and thrown
// at the other fighter. Cards show only the kind of move (strike, shot, block, dodge), never the
// weapon or armour behind it, so a fight can't be used to spy on someone's gear. Nothing here
// decides anything: it plays back the beats from combat.ts.

import { useEffect, useRef } from "react";
import type { FightBeat } from "@/game/combat";
import type { FightSummary } from "@/game/types";

type Side = "you" | "foe";
type Kind = "strike" | "shot" | "block" | "dodge";
const RESULT = ["hit", "crit", "block", "dodge"] as const;

/** At most this many moves are played; the rest of a long fight is folded into the health bars. */
const MAX_BEATS = 8;

/** Long fights keep their opening, their biggest moments and their ending. */
export function pickBeats(beats: FightBeat[]): FightBeat[] {
  if (beats.length <= MAX_BEATS) return beats;
  const keep = new Set<number>([0, 1, 2, beats.length - 3, beats.length - 2, beats.length - 1]);
  const swing = (i: number) => (i ? Math.abs(beats[i][3] - beats[i - 1][3]) + Math.abs(beats[i][4] - beats[i - 1][4]) : 0);
  const middle = beats.map((_, i) => i).filter((i) => !keep.has(i)).sort((x, y) => swing(y) - swing(x));
  for (const i of middle) { if (keep.size >= MAX_BEATS) break; keep.add(i); }
  return beats.filter((_, i) => keep.has(i));
}

const LINES: Record<Side, Record<(typeof RESULT)[number], string[]>> = {
  you: {
    hit: ["You land one.", "A clean hit.", "You catch them square."],
    crit: ["You put everything into it.", "That one lands hard."],
    block: ["They get their guard up.", "They take it on the guard."],
    dodge: ["They slip it.", "Too slow. They're gone."],
  },
  foe: {
    hit: ["They catch you.", "That one stings.", "They find an opening."],
    crit: ["That one rattles your teeth.", "They put you on your heels."],
    block: ["You take it on the guard.", "You block it."],
    dodge: ["You slip it.", "You're already moving."],
  },
};

const range = (n: number, f: (i: number) => string) => Array.from({ length: n }, (_, i) => f(i)).join("");
const SHOE = (fill: string) => `
  <path d="M6 38 C6 30 12 26 20 25 L40 22 C46 14 54 9 62 9 C68 9 71 14 75 18 C83 24 94 26 97 33 C99 39 96 44 88 45 L12 45 C8 45 6 42 6 38 Z" fill="${fill}"/>
  <path d="M8 40 L98 40 L95 47 L11 47 Z" fill="#4edea3"/>
  <path d="M44 21 L52 31 M52 17 L60 28 M60 14 L67 25" stroke="#20262f" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M70 30 C76 34 86 34 92 36" stroke="#4edea3" stroke-width="3" fill="none" stroke-linecap="round"/>`;

/** Card faces: drawn, so they match each other and give nothing away. */
const FACE: Record<Kind, { label: string; sub: string; svg: string }> = {
  strike: {
    label: "Strike", sub: "Close range", svg: `
    <defs><radialGradient id="cfBurst"><stop offset="0" stop-color="#fff"/><stop offset="0.45" stop-color="#ffd27a"/><stop offset="1" stop-color="#ff7a2f"/></radialGradient></defs>
    <g class="rays" stroke="#ffd27a" stroke-width="3" stroke-linecap="round" opacity="0.8">${range(14, (i) => { const a = (i / 14) * Math.PI * 2; return `<line x1="${(100 + Math.cos(a) * 40).toFixed(1)}" y1="${(110 + Math.sin(a) * 40).toFixed(1)}" x2="${(100 + Math.cos(a) * 96).toFixed(1)}" y2="${(110 + Math.sin(a) * 96).toFixed(1)}"/>`; })}</g>
    <polygon class="burst" fill="url(#cfBurst)" stroke="#fff3d6" stroke-width="2" points="${range(24, (i) => { const a = (i / 24) * Math.PI * 2, r = i % 2 ? 30 : 64 + (i % 4 ? 0 : 10); return `${(100 + Math.cos(a) * r).toFixed(1)},${(110 + Math.sin(a) * r).toFixed(1)} `; })}"/>
    <path class="claw" d="M40 60 L150 160" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path class="claw claw2" d="M58 46 L166 146" stroke="#ffe0a8" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path class="claw claw3" d="M30 80 L134 176" stroke="#ffe0a8" stroke-width="4" stroke-linecap="round" fill="none"/>`,
  },
  shot: {
    label: "Shot", sub: "Long range", svg: `
    <defs>
      <radialGradient id="cfHole"><stop offset="0" stop-color="#000"/><stop offset="0.5" stop-color="#120c08"/><stop offset="0.62" stop-color="#6b5440"/><stop offset="0.75" stop-color="#e8d2b0" stop-opacity="0.8"/><stop offset="1" stop-color="#e8d2b0" stop-opacity="0"/></radialGradient>
      <linearGradient id="cfPlate" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3f48"/><stop offset="1" stop-color="#1a1d23"/></linearGradient>
    </defs>
    <rect x="18" y="20" width="164" height="180" rx="8" fill="url(#cfPlate)" stroke="#59606b"/>
    <g fill="#59606b"><circle cx="30" cy="32" r="3"/><circle cx="170" cy="32" r="3"/><circle cx="30" cy="188" r="3"/><circle cx="170" cy="188" r="3"/></g>
    <path class="tracer" d="M-30 40 L230 150" stroke="#ffcf80" stroke-width="2.5" fill="none" opacity="0.9"/>
    ${[[78, 92, 1], [128, 120, 0.85], [96, 156, 0.7]].map(([x, y, s], n) => `<g class="bh bh${n + 1}"><g stroke="#cbb89c" stroke-width="1.4" opacity="0.8">${range(7, (i) => { const a = (i / 7) * Math.PI * 2 + x; const r = (16 + (i % 3) * 7) * s; return `<path d="M${(x + Math.cos(a) * 9 * s).toFixed(1)} ${(y + Math.sin(a) * 9 * s).toFixed(1)} L${(x + Math.cos(a + 0.12) * r).toFixed(1)} ${(y + Math.sin(a + 0.12) * r).toFixed(1)}" fill="none"/>`; })}</g><circle cx="${x}" cy="${y}" r="${12 * s}" fill="url(#cfHole)"/></g>`).join("")}
    <polygon class="muzzle" points="-4,40 -24,28 -12,42 -28,54 -4,46" fill="#ffd27a"/>`,
  },
  block: {
    label: "Block", sub: "Took it on the guard", svg: `
    <defs>
      <linearGradient id="cfSteel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8eef5"/><stop offset="0.45" stop-color="#8b9aab"/><stop offset="1" stop-color="#3c4654"/></linearGradient>
      <linearGradient id="cfRim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe2a6"/><stop offset="1" stop-color="#b8925a"/></linearGradient>
      <clipPath id="cfShield"><path d="M100 26 L168 50 Q170 140 100 204 Q30 140 32 50 Z"/></clipPath>
    </defs>
    <g class="shield">
      <path d="M100 26 L168 50 Q170 140 100 204 Q30 140 32 50 Z" fill="url(#cfSteel)" stroke="url(#cfRim)" stroke-width="7" stroke-linejoin="round"/>
      <path d="M100 44 L152 62 Q152 132 100 182 Q48 132 48 62 Z" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
      <path d="M100 44 V182 M48 92 H152" stroke="rgba(30,36,44,0.45)" stroke-width="5"/>
      <circle cx="100" cy="92" r="17" fill="url(#cfRim)" stroke="#6b5530" stroke-width="2"/>
      <circle cx="100" cy="92" r="6" fill="#fff6dc"/>
      <g fill="#ffe2a6">${[[52, 60], [148, 60], [100, 36], [70, 150], [130, 150]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2"/>`).join("")}</g>
      <g clip-path="url(#cfShield)"><rect class="glint" x="20" y="10" width="26" height="220" fill="rgba(255,255,255,0.5)"/></g>
    </g>`,
  },
  dodge: {
    label: "Dodge", sub: "Out of reach", svg: `
    <g class="wind" fill="none" stroke="#bff5df" stroke-linecap="round" stroke-width="3" opacity="0.85">
      <path d="M210 66 C150 60 110 70 50 66"/><path class="w2" d="M220 112 C160 104 120 116 30 110"/><path class="w3" d="M210 156 C160 150 130 160 70 156"/>
    </g>
    <circle class="puff" cx="38" cy="182" r="12" fill="rgba(220,235,240,0.5)"/>
    <circle class="puff puff2" cx="62" cy="190" r="9" fill="rgba(220,235,240,0.4)"/>
    <g class="feet"><g transform="translate(-22 -26) scale(1.28)">
      <g transform="translate(26 100) rotate(22)"><rect x="32" y="-52" width="24" height="56" rx="7" fill="#4a5668"/><rect x="34" y="-52" width="6" height="56" fill="rgba(255,255,255,0.12)"/>${SHOE("#e9edf1")}</g>
      <g transform="translate(84 66) rotate(-14)"><rect x="30" y="-46" width="24" height="50" rx="7" fill="#5a6a80"/><rect x="32" y="-46" width="6" height="50" fill="rgba(255,255,255,0.14)"/>${SHOE("#ffffff")}</g>
    </g></g>`,
  },
};

export function CardFight({
  fight, youName, youPhoto, foePhoto, scene, speed, skip, onDone,
}: {
  fight: FightSummary; youName: string; youPhoto: string; foePhoto: string; scene: string;
  speed: number; skip: boolean; onDone: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const ctl = useRef({ speed, skip });
  ctl.current.speed = speed;
  ctl.current.skip = skip;
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const stage = ref.current!;
    const q = <T extends Element = HTMLElement>(s: string) => stage.querySelector(s) as T;
    let alive = true;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (f: () => void, ms: number) => { const t = setTimeout(() => { timers.delete(t); f(); }, ms); timers.add(t); };
    const fast = () => ctl.current.skip || !alive;
    const wait = (ms: number) => new Promise<void>((r) => (fast() ? r() : later(r, ms / ctl.current.speed)));
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Particles on a canvas over the stage.
    const cv = q<HTMLCanvasElement>("canvas"), cx = cv.getContext("2d")!;
    type P = { x: number; y: number; vx: number; vy: number; life: number; t: number; dust: boolean; color: string; r: number };
    let parts: P[] = [];
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); cv.width = stage.clientWidth * d; cv.height = stage.clientHeight * d; cx.setTransform(d, 0, 0, d, 0, 0); };
    size();
    addEventListener("resize", size);
    const COLORS: Record<string, string[]> = { spark: ["#ffd27a", "#ffffff"], gold: ["#ffb020", "#fff3c4"], shard: ["#cfe6ff", "#ffffff"], ember: ["#ff7a40", "#ffd27a"], dust: ["rgba(210,225,235,0.5)"] };
    const emit = (x: number, y: number, n: number, kind: string) => {
      if (fast() || reduced) return;
      const dust = kind === "dust", c = COLORS[kind];
      for (let i = 0; i < n; i++) {
        const a = rnd(0, Math.PI * 2), v = dust ? rnd(20, 90) : rnd(160, 520);
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (dust ? 20 : 60), life: dust ? rnd(0.5, 0.9) : rnd(0.25, 0.6), t: 0, dust, color: c[i % c.length], r: dust ? rnd(6, 14) : rnd(1.2, 2.8) });
      }
    };
    let last = performance.now(), raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000) * (stage.classList.contains("slowmo") ? 0.4 : 1) * ctl.current.speed; last = now;
      cx.clearRect(0, 0, cv.width, cv.height);
      parts = parts.filter((p) => (p.t += dt) < p.life);
      for (const p of parts) {
        p.vy += (p.dust ? -10 : 520) * dt; p.vx *= p.dust ? 0.96 : 0.985;
        const px = p.x, py = p.y; p.x += p.vx * dt; p.y += p.vy * dt;
        const k = 1 - p.t / p.life;
        if (p.dust) { cx.fillStyle = p.color; cx.globalAlpha = k * 0.6; cx.beginPath(); cx.arc(p.x, p.y, p.r * (1.6 - k), 0, 7); cx.fill(); }
        else { cx.strokeStyle = p.color; cx.globalAlpha = k; cx.lineWidth = p.r; cx.lineCap = "round"; cx.beginPath(); cx.moveTo(px, py); cx.lineTo(p.x, p.y); cx.stroke(); }
      }
      cx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const box = (el: Element) => { const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect(); return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height, cx: r.left - s.left + r.width / 2, cy: r.top - s.top + r.height * 0.42 }; };
    const card = (kind: Kind, crit: boolean) => {
      const f = FACE[kind], el = document.createElement("div");
      el.className = `cf-move k-${kind}` + (crit ? " crit" : "");
      el.innerHTML = `<div class="cf-flip"><div class="cf-face cf-back"><img src="/brand/mark.webp" alt=""></div><div class="cf-face cf-front"><svg viewBox="0 0 200 220">${f.svg}</svg><div class="cf-tag">${crit ? "Critical" : f.label}<small>${f.sub}</small></div></div></div>`;
      stage.appendChild(el);
      return el;
    };
    const at = (el: HTMLElement, x: number, y: number, rot = 0, sc = 1) => `translate(${x - el.offsetWidth / 2}px, ${y - el.offsetHeight / 2}px) rotate(${rot}deg) scale(${sc})`;
    const anim = (el: HTMLElement, frames: Keyframe[], ms: number, easing = "cubic-bezier(.2,.9,.3,1)") =>
      el.animate(frames, { duration: fast() ? 1 : ms / ctl.current.speed, easing, fill: "forwards" }).finished.catch(() => undefined);
    const pop = (x: number, y: number, text: string, cls = "") => {
      if (fast()) return;
      const w = stage.clientWidth, d = document.createElement("div");
      d.className = "cf-pop " + cls; d.textContent = text; d.style.left = Math.max(110, Math.min(w - 110, x)) + "px"; d.style.top = y + "px";
      stage.appendChild(d); later(() => d.remove(), 1000);
    };
    const flash = (color = "") => { if (fast() || reduced) return; const f = q(".cf-flash"); f.className = "cf-flash"; void f.offsetWidth; f.className = "cf-flash fire " + color; };
    const shake = (big: boolean) => {
      if (fast() || reduced) return;
      const w = q(".cf-world"); w.classList.remove("shake", "big"); void w.offsetWidth; w.classList.add("shake"); if (big) w.classList.add("big");
      if (navigator.vibrate) try { navigator.vibrate(big ? 60 : 18); } catch { /* not allowed */ }
    };
    const hurt = (side: Side, from: { cx: number; cy: number }) => {
      const el = q(".cf-" + side), D = box(el);
      el.style.setProperty("--kx", Math.sign(D.cx - from.cx) * 14 + "px"); el.style.setProperty("--ky", Math.sign(D.cy - from.cy) * 8 + "px");
      el.classList.remove("hurt"); void el.offsetWidth; el.classList.add("hurt");
      later(() => el.classList.remove("hurt"), 450);
    };
    const setHp = (side: Side, pct: number) => {
      q(`.cf-hp-${side} .fill`).style.width = pct + "%"; q(`.cf-hp-${side} .lag`).style.width = pct + "%";
      const b = q(`.cf-hp-${side}`); b.classList.remove("ping"); void b.offsetWidth; b.classList.add("ping");
    };
    const decal = (side: Side, shot: boolean) => {
      if (fast()) return;
      const ph = q(`.cf-${side} .ph`);
      for (let i = 0; i < (shot ? 2 : 3); i++) {
        const d = document.createElement("div");
        d.className = "cf-decal " + (shot ? "hole" : "scratch");
        if (shot) { d.style.left = rnd(18, 62) + "%"; d.style.top = rnd(24, 64) + "%"; }
        else { d.style.transform = `rotate(${rnd(25, 45)}deg)`; d.style.left = 20 + i * 8 + "%"; d.style.top = 34 + i * 9 + "%"; }
        ph.appendChild(d);
        later(() => { d.style.opacity = "0"; }, 1200); later(() => d.remove(), 1900);
      }
    };
    const ghosts = (side: Side) => {
      if (fast() || reduced) return;
      const ph = q(`.cf-${side} .ph`), D = box(ph);
      for (let i = 0; i < 3; i++) {
        const g = document.createElement("div"); g.className = "cf-ghost";
        Object.assign(g.style, { left: D.x + "px", top: D.y + "px", width: D.w + "px", height: D.h + "px", backgroundImage: ph.style.backgroundImage });
        stage.appendChild(g);
        const dx = (side === "you" ? -1 : 1) * (18 + i * 16), dy = (side === "you" ? 1 : -1) * (10 + i * 8);
        g.animate([{ opacity: 0.45 - i * 0.1, transform: "none" }, { opacity: 0, transform: `translate(${dx}px, ${dy}px)` }], { duration: 380 / ctl.current.speed, delay: (i * 45) / ctl.current.speed, easing: "ease-out", fill: "forwards" });
        later(() => g.remove(), 700);
      }
    };
    const zoom = (x: number, y: number, s: number) => { const c = q(".cf-cam"); c.style.transformOrigin = `${x}px ${y}px`; c.style.transform = s === 1 ? "" : `scale(${s})`; };
    const say = (text: string) => { const b = q(".cf-beat"); b.classList.remove("show"); void b.offsetWidth; b.textContent = text; b.classList.add("show"); };

    async function exchange(bt: FightBeat, n: number, total: number) {
      const [by, kindN, resN, mePct, themPct] = bt;
      const atkSide: Side = by === 0 ? "you" : "foe", defSide: Side = by === 0 ? "foe" : "you";
      const kind: Kind = kindN ? "shot" : "strike", result = RESULT[resN], crit = result === "crit";
      const A = box(q(".cf-" + atkSide)), D = box(q(".cf-" + defSide));
      const W = stage.clientWidth, H = stage.clientHeight;
      q(".cf-round").textContent = `${n + 1} / ${total}`;
      say(pick(LINES[atkSide][result]));

      // Dealt face-down from the attacker, flipped mid-stage.
      const atk = card(kind, crit);
      const holdX = W / 2 + (atkSide === "you" ? -W * 0.06 : W * 0.06), holdY = H * 0.42;
      const tilt = atkSide === "you" ? -8 : 8, big = crit ? 1.14 : 1;
      stage.classList.add("focus");
      if (crit) { stage.classList.add("slowmo", "bars"); }
      await anim(atk, [{ transform: at(atk, A.cx, A.cy, -tilt * 2, 0.3), opacity: 0 }, { transform: at(atk, holdX, holdY, tilt, big), opacity: 1 }], 240);
      atk.classList.add("open");
      await wait(130);
      atk.classList.add("live");
      if (kind === "shot") emit(holdX - W * 0.18, holdY - 40, 10, "ember");
      await wait(crit ? 520 : 320);

      // The answer: a shield goes up, or the feet are already running.
      let def: HTMLElement | null = null;
      if (result === "dodge" || result === "block") {
        def = card(result, false);
        const dx = D.cx + (defSide === "you" ? W * 0.1 : -W * 0.1);
        await anim(def, [{ transform: at(def, D.cx, D.cy, 0, 0.3), opacity: 0 }, { transform: at(def, dx, D.cy, defSide === "you" ? 6 : -6, 0.82), opacity: 1 }], 170);
        def.classList.add("open");
        await wait(120);
        def.classList.add("live");
        await wait(220);
      }

      // The throw.
      if (result === "dodge") {
        ghosts(defSide);
        const el = q(".cf-" + defSide);
        el.style.translate = defSide === "you" ? "-54px 34px" : "44px -26px";
        emit(D.cx, D.y + D.h, 8, "dust");
        const past = { x: D.cx + (D.cx - holdX) * 1.7, y: D.cy + (D.cy - holdY) * 1.7 };
        await anim(atk, [{ transform: at(atk, holdX, holdY, tilt, 1), opacity: 1 }, { transform: at(atk, past.x, past.y, tilt * 5, 0.7), opacity: 0 }], 260, "cubic-bezier(.5,0,.9,.6)");
        pop(D.cx, D.y + 20, "Dodged", "word good");
        await wait(200);
        el.style.translate = "";
      } else {
        if (crit) zoom(D.cx, D.cy, 1.12);
        await anim(atk, [{ transform: at(atk, holdX, holdY, tilt, big), opacity: 1 }, { transform: at(atk, D.cx, D.cy, tilt * 2, 0.6), opacity: 1 }], crit ? 190 : 170, "cubic-bezier(.6,0,1,.8)");
        if (result === "block") {
          emit(D.cx + (defSide === "you" ? 30 : -30), D.cy, 24, "shard");
          def?.querySelector(".shield")?.classList.add("clang");
          flash(); shake(false);
          pop(D.cx, D.y + 20, "Blocked", "word steel");
          setHp("you", mePct); setHp("foe", themPct);
          await anim(atk, [{ transform: at(atk, D.cx, D.cy, tilt * 2, 0.6), opacity: 1 }, { transform: at(atk, D.cx + (holdX - D.cx) * 0.6, D.cy - 80, -tilt * 4, 0.45), opacity: 0 }], 280);
        } else {
          await wait(crit ? 120 : 50); // hit-stop
          hurt(defSide, A); shake(crit); flash(crit ? "gold" : kind === "shot" ? "red" : "");
          emit(D.cx, D.cy, crit ? 56 : 26, crit ? "gold" : kind === "shot" ? "ember" : "spark");
          decal(defSide, kind === "shot");
          setHp("you", mePct); setHp("foe", themPct);
          pop(D.cx, D.y + 20, crit ? "Crushing" : kind === "shot" ? "Hit" : "Hit", crit ? "crit" : "");
          await anim(atk, [{ transform: at(atk, D.cx, D.cy, tilt * 2, 0.6), opacity: 1 }, { transform: at(atk, D.cx, D.cy, tilt * 2, 0.35), opacity: 0 }], 200);
        }
      }
      stage.classList.remove("focus");
      if (def) await anim(def, [{ opacity: 1 }, { opacity: 0 }], 140);
      atk.remove(); def?.remove();
      if (crit) { stage.classList.remove("slowmo", "bars"); zoom(0, 0, 1); }
      await wait(crit ? 300 : 200);
    }

    (async () => {
      const beats = pickBeats(fight.beats ?? []);
      const [s0, s1] = fight.start ?? [100, 100];
      setHp("you", s0); setHp("foe", s1);
      await wait(400);
      for (let i = 0; i < beats.length && alive; i++) await exchange(beats[i], i, beats.length);
      if (!alive) return;
      const end = beats[beats.length - 1];
      if (end) { setHp("you", end[3]); setHp("foe", end[4]); }
      stage.classList.remove("slowmo", "bars", "focus"); zoom(0, 0, 1);
      // Whoever is out of the fight falls.
      if (fight.won) q(".cf-foe").classList.add("down"); else q(".cf-you").classList.add("down");
      say(fight.lines[fight.lines.length - 1] ?? "");
      await wait(500);
      if (alive) done.current();
    })();

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      removeEventListener("resize", size);
      stage.querySelectorAll(".cf-move, .cf-ghost, .cf-pop").forEach((e) => e.remove());
    };
    // The fight plays once; speed and skip are read live through the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fight]);

  return (
    <div className="cf-stage" ref={ref}>
      <div className="cf-cam">
        <div className="cf-bg" style={{ backgroundImage: `url("${scene}")` }} />
        <div className="cf-lamp" />
        <div className="cf-fog" />
        <div className="cf-rain" />
        <div className="cf-grade" />
        <div className="cf-world">
          <div className="cf-fighter cf-foe"><div className="ph" style={{ backgroundImage: `url("${foePhoto}")` }} /><b>{fight.opponent}</b></div>
          <div className="cf-fighter cf-you"><div className="ph" style={{ backgroundImage: `url("${youPhoto}")` }} /><b>{youName}</b></div>
        </div>
      </div>
      <canvas className="cf-fx" />
      <div className="cf-hud top">
        <div className="who"><span>{fight.opponent}</span><small className="cf-round" /></div>
        <div className="cf-bar cf-hp-foe"><i className="lag" /><i className="fill" /></div>
      </div>
      <div className="cf-hud bottom">
        <div className="who"><span>{youName}</span></div>
        <div className="cf-bar cf-hp-you"><i className="lag" /><i className="fill" /></div>
      </div>
      <div className="cf-beat" aria-live="polite" />
      <div className="cf-flash" />
    </div>
  );
}
