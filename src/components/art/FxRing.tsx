"use client";

// Live effects drawn around a face: real fire for Wildfire, a running electric current for
// Live wire, twinkling sparkles for Gold rush. One shared animation loop drives every ring on
// the page; rings that are off screen (or in a hidden tab) sleep, and small faces get fewer
// particles. Players who turn off motion see a single still frame.

import { motionReduced } from "../motion";
import { useEffect, useRef } from "react";

export type FxKind = "wildfire" | "livewire" | "goldrush" | "frostbite" | "bloodmoon" | "aurora";
export const CANVAS_FX = new Set<string>(["wildfire", "livewire", "goldrush", "frostbite", "bloodmoon", "aurora"]);

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
const reduced = motionReduced;

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

// ── Frostbite: ice crystals on the ring, snow drifting past, a glint going round ──

/** Fixed crystal shards for a ring (angle, length, width), the same every frame. */
function shards(r: Ring) {
  if (!r.bolts.length) {
    const rnd = rand(0.4242);
    r.bolts = Array.from({ length: 26 }, (_, i) => ({ a: (i / 26) * Math.PI * 2 + (rnd() - 0.5) * 0.18, v: 0.35 + rnd() * 0.65, len: 0.3 + rnd() * 0.7, seed: rnd() }));
  }
  return r.bolts;
}

function stepFrost(r: Ring, dt: number) {
  shards(r);
  const half = (r.face * SCALE) / 2;
  if (Math.random() < dt * (5 + r.face / 14)) {
    r.parts.push({ x: (Math.random() - 0.5) * half * 2, y: -half, vx: (Math.random() - 0.5) * 6, vy: 9 + Math.random() * 10, life: 0, max: 3 + Math.random() * 2, size: 0.45 + Math.random() * 0.7 });
  }
  for (const p of r.parts) {
    p.life += dt;
    p.x += (p.vx + Math.sin((r.t + p.max) * 2) * 6) * dt;
    p.y += p.vy * dt * (r.face / 72);
  }
  r.parts = r.parts.filter((p) => p.life < p.max && p.y < half).slice(-90);
}

function drawFrost(r: Ring, g: CanvasRenderingContext2D) {
  const R = r.face / 2 + 1;
  const u = r.face / 72;
  // The icy ring.
  const ring = g.createLinearGradient(-R, -R, R, R);
  ring.addColorStop(0, "#ffffff");
  ring.addColorStop(0.5, "#9fdcff");
  ring.addColorStop(1, "#e6f7ff");
  g.lineWidth = Math.max(2.5, r.face * 0.055);
  g.strokeStyle = ring;
  g.shadowColor = "rgba(150,215,255,0.9)";
  g.shadowBlur = r.face * 0.16;
  g.beginPath();
  g.arc(0, 0, R, 0, Math.PI * 2);
  g.stroke();
  g.shadowBlur = 0;
  // Crystals: thin shards that breathe a little, catching the light in turn.
  g.lineCap = "round";
  for (const s of shards(r)) {
    // Uneven lengths: a few long spikes among short ones, like real frost.
    const len = (2 + s.len * s.len * 14) * u;
    const ca = Math.cos(s.a), sa = Math.sin(s.a);
    const bx = ca * R, by = sa * R;
    const tx = ca * (R + len), ty = sa * (R + len);
    const shine = 0.5 + 0.5 * Math.max(0, Math.sin(r.t * 2.2 - s.a * 2));
    g.strokeStyle = `rgba(225,245,255,${0.55 + 0.45 * shine})`;
    g.lineWidth = Math.max(0.8, (0.8 + s.v * 1.2) * u);
    g.beginPath();
    g.moveTo(bx, by);
    g.lineTo(tx, ty);
    // Side branches on the longer crystals.
    if (len > 7 * u) {
      for (const f of [0.45, 0.72]) {
        const mx = ca * (R + len * f), my = sa * (R + len * f);
        const bl = len * (1 - f) * 0.55;
        for (const side of [-1, 1]) {
          const ba = s.a + side * 0.75;
          g.moveTo(mx, my);
          g.lineTo(mx + Math.cos(ba) * bl, my + Math.sin(ba) * bl);
        }
      }
    }
    g.stroke();
  }
  g.lineCap = "butt";
  // A glint that travels round the ring.
  const ga = r.t * 1.4;
  g.globalCompositeOperation = "lighter";
  const gs = r.face * 0.16;
  g.drawImage(sprite("rgba(230,248,255,1)"), Math.cos(ga) * R - gs, Math.sin(ga) * R - gs, gs * 2, gs * 2);
  // Snow.
  for (const p of r.parts) {
    g.globalAlpha = Math.min(1, (p.max - p.life) * 2) * 0.9;
    const s = Math.max(0.8, p.size * 2.2 * u);
    g.drawImage(sprite("rgba(255,255,255,1)"), p.x - s, p.y - s, s * 2, s * 2);
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
}

// ── Blood moon: an eclipse corona, embers rising, drops falling ──

function stepBlood(r: Ring, dt: number) {
  const R = r.face / 2;
  const u = r.face / 72;
  // Embers drift up from the ring.
  if (Math.random() < dt * (14 + r.face / 5)) {
    const a = Math.random() * Math.PI * 2;
    r.parts.push({ x: Math.cos(a) * (R + 2), y: Math.sin(a) * (R + 2), vx: Math.cos(a) * 6 + (Math.random() - 0.5) * 8, vy: Math.sin(a) * 6 - (10 + Math.random() * 16) * u, life: 0, max: 0.9 + Math.random() * 1.1, size: (1.5 + Math.random() * 2.5) * u });
  }
  // Now and then a drop gathers at the bottom of the ring and falls.
  if (Math.random() < dt * 0.9) {
    const a = Math.PI / 2 + (Math.random() - 0.5) * 1.1;
    r.parts.push({ x: Math.cos(a) * (R + 2), y: Math.sin(a) * (R + 2), vx: 0, vy: 0, life: 0, max: 2.2, size: -(2.4 + Math.random() * 1.6) * u });
  }
  for (const p of r.parts) {
    p.life += dt;
    if (p.size < 0) {
      // A drop: hangs, swells, then falls.
      if (p.life > 0.7) p.vy += 220 * u * dt;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  const half = (r.face * SCALE) / 2;
  r.parts = r.parts.filter((p) => p.life < p.max && p.y < half + 10).slice(-120);
}

function drawBlood(r: Ring, g: CanvasRenderingContext2D) {
  const R = r.face / 2 + 1;
  const pulse = 0.5 + 0.5 * Math.sin(r.t * 2.4);
  // The corona: slow-turning rays of red light behind the ring.
  g.save();
  g.rotate(r.t * 0.25);
  g.globalCompositeOperation = "lighter";
  const rays = 18;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const len = R * (0.32 + 0.22 * Math.sin(i * 1.7 + r.t * 1.3)) * (0.85 + 0.3 * pulse);
    const grd = g.createLinearGradient(Math.cos(a) * R, Math.sin(a) * R, Math.cos(a) * (R + len), Math.sin(a) * (R + len));
    grd.addColorStop(0, "rgba(255,40,40,0.55)");
    grd.addColorStop(1, "rgba(120,0,0,0)");
    g.strokeStyle = grd;
    g.lineWidth = Math.max(2, r.face * 0.05);
    g.beginPath();
    g.moveTo(Math.cos(a) * R, Math.sin(a) * R);
    g.lineTo(Math.cos(a) * (R + len), Math.sin(a) * (R + len));
    g.stroke();
  }
  g.restore();
  // The ring: dark red, breathing.
  const ring = g.createLinearGradient(0, -R, 0, R);
  ring.addColorStop(0, "#ff5a5a");
  ring.addColorStop(0.5, "#b3001b");
  ring.addColorStop(1, "#5a0010");
  g.lineWidth = Math.max(3, r.face * 0.07);
  g.strokeStyle = ring;
  g.shadowColor = `rgba(255,30,40,${0.6 + 0.4 * pulse})`;
  g.shadowBlur = r.face * (0.18 + 0.14 * pulse);
  g.beginPath();
  g.arc(0, 0, R, 0, Math.PI * 2);
  g.stroke();
  g.shadowBlur = 0;
  // Embers and drops.
  for (const p of r.parts) {
    if (p.size < 0) {
      const s = -p.size * (p.life < 0.7 ? 0.5 + p.life / 1.4 : 1);
      g.fillStyle = "#c4001a";
      g.beginPath();
      // A teardrop: round at the bottom, pointed at the top.
      g.moveTo(p.x, p.y - s * 2.2);
      g.bezierCurveTo(p.x + s, p.y - s * 0.6, p.x + s, p.y + s, p.x, p.y + s);
      g.bezierCurveTo(p.x - s, p.y + s, p.x - s, p.y - s * 0.6, p.x, p.y - s * 2.2);
      g.fill();
      g.fillStyle = "rgba(255,160,160,0.7)";
      g.beginPath();
      g.arc(p.x - s * 0.3, p.y, s * 0.25, 0, Math.PI * 2);
      g.fill();
    } else {
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = (1 - p.life / p.max) * 0.9;
      const s = p.size * 2.4;
      g.drawImage(sprite("rgba(255,70,40,1)"), p.x - s, p.y - s, s * 2, s * 2);
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
    }
  }
}

// ── Aurora: ribbons of light flowing round the ring, a few stars ──

function stepAurora(r: Ring, dt: number) {
  const half = (r.face * SCALE) / 2;
  if (Math.random() < dt * 4) {
    const a = Math.random() * Math.PI * 2;
    const d = r.face / 2 + 6 + Math.random() * (half - r.face / 2 - 6);
    r.parts.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, vx: 0, vy: 0, life: 0, max: 1.2 + Math.random() * 1.2, size: 1 + Math.random() * 1.4 });
  }
  for (const p of r.parts) p.life += dt;
  r.parts = r.parts.filter((p) => p.life < p.max).slice(-24);
}

function drawAurora(r: Ring, g: CanvasRenderingContext2D) {
  const R = r.face / 2 + 1;
  const u = r.face / 72;
  g.globalCompositeOperation = "lighter";
  g.lineCap = "round";
  g.lineJoin = "round";
  // Three ribbons: each a smooth wavy loop whose colours flow round as it drifts.
  for (let k = 0; k < 3; k++) {
    const phase = r.t * (0.7 + k * 0.22) + k * 2.1;
    const pts: [number, number][] = [];
    const steps = 120;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const wave = Math.sin(a * 3 + phase) * 0.6 + Math.sin(a * 5 - phase * 1.4) * 0.4;
      const rr = R + (4 + k * 3 + wave * 5) * u;
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    const grad = typeof g.createConicGradient === "function" ? g.createConicGradient(r.t * (0.5 + k * 0.2) + k, 0, 0) : null;
    const stops = ["46,240,176", "46,196,255", "155,123,255", "255,90,200", "46,240,176"];
    for (const [w, a, blur] of [[9 * u, 0.22, r.face * 0.22], [4 * u, 0.55, r.face * 0.1], [1.4 * u, 0.9, 0]] as const) {
      if (grad) {
        const gg = g.createConicGradient(r.t * (0.5 + k * 0.2) + k, 0, 0);
        stops.forEach((c, i) => gg.addColorStop(i / (stops.length - 1), `rgba(${c},${a * (0.45 + 0.55 * Math.abs(Math.sin(i + phase)))})`));
        g.strokeStyle = gg;
      } else {
        g.strokeStyle = `rgba(${stops[k]},${a})`;
      }
      g.lineWidth = Math.max(0.8, w);
      g.shadowColor = `rgba(${stops[k + 1]},0.8)`;
      g.shadowBlur = blur;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
    }
  }
  g.shadowBlur = 0;
  // A thin bright ring holds it together.
  g.lineWidth = Math.max(1.2, r.face * 0.025);
  g.strokeStyle = "rgba(220,255,245,0.8)";
  g.beginPath();
  g.arc(0, 0, R, 0, Math.PI * 2);
  g.stroke();
  // Stars that come and go.
  for (const p of r.parts) {
    g.globalAlpha = Math.sin((p.life / p.max) * Math.PI);
    const s = p.size * 2.2 * u;
    g.drawImage(sprite("rgba(255,255,255,1)"), p.x - s, p.y - s, s * 2, s * 2);
  }
  g.globalAlpha = 1;
  g.lineCap = "butt";
  g.globalCompositeOperation = "source-over";
}

function step(r: Ring, dt: number) {
  if (r.kind === "wildfire") stepFire(r, dt);
  else if (r.kind === "livewire") stepWire(r, dt);
  else if (r.kind === "frostbite") stepFrost(r, dt);
  else if (r.kind === "bloodmoon") stepBlood(r, dt);
  else if (r.kind === "aurora") stepAurora(r, dt);
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
  else if (r.kind === "frostbite") drawFrost(r, g);
  else if (r.kind === "bloodmoon") drawBlood(r, g);
  else if (r.kind === "aurora") drawAurora(r, g);
  else drawGold(r, g);
}

// ── Names: a few light touches over the letters (kept modest on purpose) ──

export type NameFxKind = "goldrush" | "wildfire" | "neon" | "chrome" | "frost" | "aurora";
export const NAME_FX = new Set<string>(["goldrush", "wildfire", "neon", "chrome", "frost", "aurora"]);

type Txt = { kind: NameFxKind; ctx: CanvasRenderingContext2D; w: number; h: number; pad: number; dpr: number; visible: boolean; parts: P[]; t: number; next: number };
const texts = new Set<Txt>();

function stepText(x: Txt, dt: number) {
  const { w, h } = x;
  const add = (p: Omit<P, "life">) => x.parts.push({ ...p, life: 0 });
  const chance = (perSec: number) => Math.random() < dt * perSec * Math.max(0.6, Math.min(1.6, w / 140));
  if (x.kind === "goldrush" && chance(3.2)) add({ x: Math.random() * w, y: h * (0.15 + Math.random() * 0.7), vx: 0, vy: 0, max: 0.7 + Math.random() * 0.5, size: 2.5 + Math.random() * 2.5 });
  if (x.kind === "wildfire" && chance(16)) add({ x: Math.random() * w, y: h * 0.25, vx: (Math.random() - 0.5) * 8, vy: -(14 + Math.random() * 18), max: 0.35 + Math.random() * 0.35, size: 2 + Math.random() * 3 });
  if (x.kind === "neon" && chance(1.2)) {
    const px = Math.random() * w, py = Math.random() * h;
    for (let i = 0; i < 4; i++) { const a = Math.random() * Math.PI * 2, v = 20 + Math.random() * 40; add({ x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v, max: 0.15 + Math.random() * 0.15, size: 1 }); }
  }
  if (x.kind === "chrome" && x.t > x.next) { x.next = x.t + 2.2 + Math.random() * 1.8; add({ x: -10, y: h * 0.35, vx: w * 0.9, vy: 0, max: (w + 20) / (w * 0.9), size: 4 }); }
  if (x.kind === "frost" && chance(2.5)) add({ x: Math.random() * w, y: -x.pad * 0.6, vx: (Math.random() - 0.5) * 4, vy: 10 + Math.random() * 8, max: 1.6 + Math.random(), size: 0.7 + Math.random() * 0.8 });
  if (x.kind === "frost" && chance(1.5)) add({ x: Math.random() * w, y: h * (0.2 + Math.random() * 0.6), vx: 0, vy: 0, max: 0.6, size: 3 });
  if (x.kind === "aurora" && chance(1.4)) add({ x: Math.random() * w, y: h * (0.1 + Math.random() * 0.8), vx: 0, vy: 0, max: 1 + Math.random(), size: 1.5 + Math.random() * 1.5 });
  for (const p of x.parts) {
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  x.parts = x.parts.filter((p) => p.life < p.max).slice(-40);
}

function star(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  g.beginPath();
  g.moveTo(x, y - s);
  g.lineTo(x + s * 0.15, y - s * 0.15);
  g.lineTo(x + s, y);
  g.lineTo(x + s * 0.15, y + s * 0.15);
  g.lineTo(x, y + s);
  g.lineTo(x - s * 0.15, y + s * 0.15);
  g.lineTo(x - s, y);
  g.lineTo(x - s * 0.15, y - s * 0.15);
  g.closePath();
  g.fill();
}

function drawText(x: Txt) {
  const g = x.ctx;
  g.setTransform(x.dpr, 0, 0, x.dpr, 0, 0);
  g.clearRect(0, 0, x.w + x.pad * 2, x.h + x.pad * 2);
  g.translate(x.pad, x.pad);
  g.globalCompositeOperation = "lighter";
  for (const p of x.parts) {
    const k = p.life / p.max;
    const tw = Math.sin(k * Math.PI);
    if (x.kind === "goldrush" || (x.kind === "frost" && p.vy === 0) || x.kind === "aurora") {
      g.globalAlpha = tw;
      const col = x.kind === "goldrush" ? "rgba(255,226,140,1)" : x.kind === "frost" ? "rgba(220,245,255,1)" : "rgba(255,255,255,1)";
      g.drawImage(sprite(col), p.x - p.size * 1.4, p.y - p.size * 1.4, p.size * 2.8, p.size * 2.8);
      g.fillStyle = x.kind === "aurora" ? "rgba(230,255,250,0.9)" : "rgba(255,252,235,1)";
      if (x.kind !== "aurora") star(g, p.x, p.y, p.size * (0.6 + tw));
    } else if (x.kind === "wildfire") {
      g.globalAlpha = (1 - k) * 0.8;
      const col = k < 0.3 ? "rgba(255,210,90,1)" : k < 0.6 ? "rgba(255,130,30,1)" : "rgba(220,50,10,1)";
      const s = p.size * (1 - k * 0.5);
      g.drawImage(sprite(col), p.x - s, p.y - s * 1.6, s * 2, s * 3);
    } else if (x.kind === "neon") {
      g.globalAlpha = 1 - k;
      g.strokeStyle = "rgba(255,170,230,1)";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
      g.stroke();
    } else if (x.kind === "chrome") {
      g.globalAlpha = Math.min(1, tw * 1.4);
      g.drawImage(sprite("rgba(255,255,255,1)"), p.x - 9, p.y - 9, 18, 18);
      g.fillStyle = "rgba(255,255,255,1)";
      star(g, p.x, p.y, 6);
    } else if (x.kind === "frost") {
      g.globalAlpha = Math.min(1, (p.max - p.life) * 2) * 0.9;
      g.drawImage(sprite("rgba(255,255,255,1)"), p.x - p.size * 1.6, p.y - p.size * 1.6, p.size * 3.2, p.size * 3.2);
    }
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
}

function loop(now: number) {
  const dt = Math.min(0.05, (now - (last || now)) / 1000);
  last = now;
  if (document.visibilityState === "visible") {
    for (const r of rings) {
      if (!r.visible) continue;
      r.t += dt;
      step(r, dt);
      draw(r);
    }
    for (const x of texts) {
      if (!x.visible) continue;
      x.t += dt;
      stepText(x, dt);
      drawText(x);
    }
  }
  raf = rings.size || texts.size ? requestAnimationFrame(loop) : 0;
  if (!raf) last = 0;
}

function start() {
  if (!raf && (rings.size || texts.size)) raf = requestAnimationFrame(loop);
}

/** Light effects over a name. Put it inside the element that shows the name. */
export function FxName({ kind }: { kind: NameFxKind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const x: Txt = { kind, ctx, w: 0, h: 0, pad: 0, dpr, visible: true, parts: [], t: 0, next: 1 };
    const size = () => {
      const b = host.getBoundingClientRect();
      x.w = Math.max(20, b.width);
      x.h = Math.max(10, b.height);
      x.pad = Math.max(6, x.h * 0.5);
      canvas.width = Math.round((x.w + x.pad * 2) * dpr);
      canvas.height = Math.round((x.h + x.pad * 2) * dpr);
      canvas.style.width = `${x.w + x.pad * 2}px`;
      canvas.style.height = `${x.h + x.pad * 2}px`;
      canvas.style.left = canvas.style.top = `${-x.pad}px`;
    };
    size();
    if (reduced()) return;
    const ro = new ResizeObserver(size);
    ro.observe(host);
    const io = new IntersectionObserver(([e]) => {
      x.visible = e.isIntersecting;
    });
    io.observe(host);
    texts.add(x);
    start();
    return () => {
      ro.disconnect();
      io.disconnect();
      texts.delete(x);
    };
  }, [kind]);
  return <canvas ref={ref} className="fx-name" aria-hidden />;
}

/** The effect layer for one face. `face` is the face's diameter in CSS pixels. */
export function FxRing({ kind }: { kind: FxKind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const img = host.querySelector("img");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const r: Ring = { kind, canvas, ctx, face: 40, dpr, visible: true, parts: [], t: 0, bolts: [] };
    // Fit the face: measured now and whenever it changes size (the top bar shrinks on scroll).
    const fit = () => {
      const face = Math.max(16, (img ?? host).getBoundingClientRect().width || 40);
      if (Math.abs(face - r.face) < 0.5 && canvas.width) return;
      r.face = face;
      r.parts = [];
      const size = face * SCALE;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      canvas.style.width = canvas.style.height = `${size}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(img ?? host);
    if (reduced()) {
      // A still frame: run the effect for a moment, then draw it once.
      for (let i = 0; i < 40; i++) step(r, 1 / 30);
      draw(r);
      return () => ro.disconnect();
    }
    rings.add(r);
    const io = new IntersectionObserver(([e]) => {
      r.visible = e.isIntersecting;
    });
    io.observe(canvas);
    start();
    return () => {
      io.disconnect();
      ro.disconnect();
      rings.delete(r);
    };
  }, [kind]);
  return <canvas ref={ref} className="fx-canvas" aria-hidden />;
}

/** The class for a name colour (empty when none). */
export const nameClass = (color?: string | null) => (color ? `name-${color}` : "");

/** A player's name in the colour they wear, with its live touches for animated colours. */
export function NameFx({ color }: { color?: string | null }) {
  return color && NAME_FX.has(color) ? <FxName key={color} kind={color as NameFxKind} /> : null;
}
