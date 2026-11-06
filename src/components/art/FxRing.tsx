"use client";

// Live effects drawn around a face: real fire for Wildfire, a running electric current for
// Live wire, twinkling sparkles for Gold rush. One shared animation loop drives every ring on
// the page; rings that are off screen (or in a hidden tab) sleep, and small faces get fewer
// particles. Players who turn off motion see a single still frame.

import { useEffect, useRef } from "react";

export type FxKind = "wildfire" | "livewire" | "goldrush";
export const CANVAS_FX = new Set<string>(["wildfire", "livewire", "goldrush"]);

/** The canvas is this many times the face's size, so effects can reach outside the circle. */
const SCALE = 1.9;

type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number };
type Ring = {
  kind: FxKind;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** CSS pixels: the face's diameter, and the device pixel ratio used. */
  face: number;
  dpr: number;
  visible: boolean;
  parts: P[];
  t: number;
  /** Electric bolts: where each one's head is on the circle, and its speed. */
  bolts: { a: number; v: number; len: number; seed: number }[];
};

const rings = new Set<Ring>();
let raf = 0;
let last = 0;
const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Soft round sprites for fire and sparkles, drawn once.
const sprites: Partial<Record<string, HTMLCanvasElement>> = {};
function sprite(color: string): HTMLCanvasElement {
  if (sprites[color]) return sprites[color]!;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, color);
  grd.addColorStop(0.35, color.replace(/[\d.]+\)$/, "0.55)"));
  grd.addColorStop(1, color.replace(/[\d.]+\)$/, "0)"));
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return (sprites[color] = c);
}

const FIRE = ["rgba(255,230,140,1)", "rgba(255,170,40,1)", "rgba(255,110,20,1)", "rgba(230,50,10,1)", "rgba(110,20,10,1)"];

function stepFire(r: Ring, dt: number) {
  const { face } = r;
  const R = face / 2;
  const density = Math.max(0.35, Math.min(1, face / 80));
  const spawn = Math.round(380 * density * dt);
  for (let i = 0; i < spawn; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = R + 1 + Math.random() * 2;
    const out = 4 + Math.random() * 8;
    r.parts.push({
      x: Math.cos(a) * rr,
      y: Math.sin(a) * rr,
      vx: Math.cos(a) * out + (Math.random() - 0.5) * 4,
      // Flames lean upward, and lick out from the ring.
      vy: Math.sin(a) * out - (12 + Math.random() * 18) * (face / 72),
      life: 0,
      max: 0.28 + Math.random() * 0.32,
      size: (5 + Math.random() * 7) * (face / 72),
    });
  }
  for (const p of r.parts) {
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx += (Math.random() - 0.5) * 40 * dt;
    p.size *= 1 - 0.9 * dt;
  }
  r.parts = r.parts.filter((p) => p.life < p.max).slice(-500);
}

function drawFire(r: Ring, g: CanvasRenderingContext2D) {
  const R = r.face / 2;
  // Fire burns around the face, never across it.
  const half = (r.face * SCALE) / 2;
  g.save();
  g.beginPath();
  g.rect(-half, -half, half * 2, half * 2);
  g.arc(0, 0, R - 1, 0, Math.PI * 2, true);
  g.clip();
  // Ember ring under the flames.
  g.lineWidth = Math.max(2.5, r.face * 0.06);
  const ring = g.createLinearGradient(0, -R, 0, R);
  ring.addColorStop(0, "#ffb020");
  ring.addColorStop(1, "#ff3a00");
  g.strokeStyle = ring;
  g.shadowColor = "rgba(255,90,0,0.9)";
  g.shadowBlur = r.face * 0.25;
  g.beginPath();
  g.arc(0, 0, R + 1, 0, Math.PI * 2);
  g.stroke();
  g.shadowBlur = 0;
  g.globalCompositeOperation = "lighter";
  for (const p of r.parts) {
    const k = p.life / p.max;
    const col = FIRE[Math.min(FIRE.length - 1, Math.floor(k * FIRE.length))];
    g.globalAlpha = Math.max(0, 1 - k * k) * 0.75;
    // Each particle is a tall, narrow tongue that stretches as it rises.
    const w = p.size * 1.6;
    const h = p.size * (2 + k * 1.8);
    g.drawImage(sprite(col), p.x - w / 2, p.y - h * 0.7, w, h);
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
  g.restore();
}

function stepWire(r: Ring, dt: number) {
  if (!r.bolts.length) {
    r.bolts = [
      { a: 0, v: 5.2, len: 1.5, seed: Math.random() },
      { a: Math.PI, v: 5.2, len: 1.1, seed: Math.random() },
      { a: Math.PI / 2, v: -3.6, len: 0.8, seed: Math.random() },
    ];
  }
  for (const b of r.bolts) {
    b.a += b.v * dt;
    // New jagged shape about 30 times a second: the current crackles.
    if (Math.random() < dt * 30) b.seed = Math.random();
  }
  // Sparks jump off the ring now and then.
  if (Math.random() < dt * 9) {
    const a = r.bolts[0].a + (Math.random() - 0.5) * 0.4;
    const R = r.face / 2;
    for (let i = 0; i < 4; i++) {
      const v = 30 + Math.random() * 60;
      const d = a + (Math.random() - 0.5) * 1.2;
      r.parts.push({ x: Math.cos(a) * R, y: Math.sin(a) * R, vx: Math.cos(d) * v, vy: Math.sin(d) * v, life: 0, max: 0.18 + Math.random() * 0.2, size: 1 });
    }
  }
  for (const p of r.parts) {
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  r.parts = r.parts.filter((p) => p.life < p.max).slice(-120);
}

function rand(seed: number) {
  let s = Math.floor(seed * 2 ** 31) || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function drawWire(r: Ring, g: CanvasRenderingContext2D) {
  const R = r.face / 2 + 1;
  // A faint charged ring.
  g.lineWidth = Math.max(1.5, r.face * 0.03);
  g.strokeStyle = "rgba(80,200,255,0.35)";
  g.beginPath();
  g.arc(0, 0, R, 0, Math.PI * 2);
  g.stroke();
  g.globalCompositeOperation = "lighter";
  for (const b of r.bolts) {
    const rnd = rand(b.seed);
    const steps = Math.max(10, Math.round(b.len * 16));
    const amp = Math.max(2, r.face * 0.07);
    const pts: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const a = b.a - Math.sign(b.v) * (b.len * i) / steps;
      const off = i === 0 || i === steps ? 0 : (rnd() - 0.5) * 2 * amp;
      pts.push([Math.cos(a) * (R + off), Math.sin(a) * (R + off)]);
    }
    for (const [w, col, blur] of [[Math.max(4, r.face * 0.09), "rgba(60,170,255,0.35)", r.face * 0.25], [Math.max(2, r.face * 0.04), "rgba(140,230,255,0.9)", r.face * 0.12], [Math.max(1, r.face * 0.015), "rgba(255,255,255,1)", 0]] as const) {
      g.lineWidth = w;
      g.strokeStyle = col;
      g.shadowColor = "rgba(90,200,255,1)";
      g.shadowBlur = blur;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
    }
  }
  g.shadowBlur = 0;
  g.strokeStyle = "rgba(200,245,255,0.95)";
  g.lineWidth = Math.max(1, r.face * 0.015);
  for (const p of r.parts) {
    g.globalAlpha = 1 - p.life / p.max;
    g.beginPath();
    g.moveTo(p.x, p.y);
    g.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
}

function stepGold(r: Ring, dt: number) {
  const R = r.face / 2;
  if (Math.random() < dt * (6 + r.face / 12)) {
    const a = Math.random() * Math.PI * 2;
    const rr = R + (Math.random() - 0.3) * r.face * 0.14;
    r.parts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, vx: 0, vy: -4, life: 0, max: 0.7 + Math.random() * 0.6, size: (4 + Math.random() * 5) * (r.face / 72) });
  }
  for (const p of r.parts) {
    p.life += dt;
    p.y += p.vy * dt;
  }
  r.parts = r.parts.filter((p) => p.life < p.max).slice(-40);
}

function drawGold(r: Ring, g: CanvasRenderingContext2D) {
  g.globalCompositeOperation = "lighter";
  for (const p of r.parts) {
    const k = p.life / p.max;
    const tw = Math.sin(k * Math.PI);
    const s = p.size * (0.4 + tw);
    g.globalAlpha = tw;
    g.drawImage(sprite("rgba(255,226,140,1)"), p.x - s, p.y - s, s * 2, s * 2);
    // A four-point star.
    g.fillStyle = "rgba(255,252,235,1)";
    g.beginPath();
    g.moveTo(p.x, p.y - s * 1.6);
    g.lineTo(p.x + s * 0.18, p.y - s * 0.18);
    g.lineTo(p.x + s * 1.6, p.y);
    g.lineTo(p.x + s * 0.18, p.y + s * 0.18);
    g.lineTo(p.x, p.y + s * 1.6);
    g.lineTo(p.x - s * 0.18, p.y + s * 0.18);
    g.lineTo(p.x - s * 1.6, p.y);
    g.lineTo(p.x - s * 0.18, p.y - s * 0.18);
    g.closePath();
    g.fill();
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
}

function step(r: Ring, dt: number) {
  if (r.kind === "wildfire") stepFire(r, dt);
  else if (r.kind === "livewire") stepWire(r, dt);
  else stepGold(r, dt);
}

function draw(r: Ring) {
  const g = r.ctx;
  const size = r.face * SCALE;
  g.setTransform(r.dpr, 0, 0, r.dpr, 0, 0);
  g.clearRect(0, 0, size, size);
  g.translate(size / 2, size / 2);
  if (r.kind === "wildfire") drawFire(r, g);
  else if (r.kind === "livewire") drawWire(r, g);
  else drawGold(r, g);
}

function loop(now: number) {
  const dt = Math.min(0.05, (now - (last || now)) / 1000);
  last = now;
  let any = false;
  if (document.visibilityState === "visible") {
    for (const r of rings) {
      if (!r.visible) continue;
      any = true;
      r.t += dt;
      step(r, dt);
      draw(r);
    }
  }
  raf = rings.size ? requestAnimationFrame(loop) : 0;
  if (!any && !rings.size) last = 0;
}

function start() {
  if (!raf && rings.size) raf = requestAnimationFrame(loop);
}

/** The effect layer for one face. `face` is the face's diameter in CSS pixels. */
export function FxRing({ kind }: { kind: FxKind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const img = host.querySelector("img");
    const face = Math.max(16, (img ?? host).getBoundingClientRect().width || 40);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = face * SCALE;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const r: Ring = { kind, canvas, ctx, face, dpr, visible: true, parts: [], t: 0, bolts: [] };
    if (reduced()) {
      // A still frame: run the effect for a moment, then draw it once.
      for (let i = 0; i < 40; i++) step(r, 1 / 30);
      draw(r);
      return;
    }
    rings.add(r);
    const io = new IntersectionObserver(([e]) => {
      r.visible = e.isIntersecting;
    });
    io.observe(canvas);
    start();
    return () => {
      io.disconnect();
      rings.delete(r);
    };
  }, [kind]);
  return <canvas ref={ref} className="fx-canvas" aria-hidden />;
}
