"use client";

import { Footprints, Hand, Swords, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PATH_LOOKS, PlayerAvatar } from "./art/Portraits";
import type { FeedItem } from "./pulse";
import type { GameApi } from "./useGame";

type CrimeKind = "pickpocket" | "snatch" | "mug";
type Person = {
  id: string;
  name: string;
  title: string;
  path: string | null;
  photo?: string | null;
  status: string;
  canAttack: string | null;
  canCrime: Record<CrimeKind, string | null>;
  regular?: boolean;
  heavy?: boolean;
  tie?: { label: string; tone: string; memo: string } | null;
};

/** Each district gets its own tint on the board. */
const TINTS = ["#2b3a55", "#4a2f3a", "#2e4a3c", "#4a4130", "#3a2f52", "#283f4a", "#4a3427"];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

const GAP = 10;

/** Blocks laid out in a grid, with streets between them. Wide screens get a wider board. */
function layout(n: number, W: number, H: number) {
  const cols = n <= 3 ? n : n === 4 ? 2 : n <= 6 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const bw = (W - GAP * (cols + 1)) / cols;
  const bh = (H - GAP * (rows + 1)) / rows;
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols);
    // The last row is centred when it isn't full.
    const inRow = r === rows - 1 ? n - r * cols : cols;
    const offset = ((cols - inRow) * (bw + GAP)) / 2;
    const c = i % cols;
    return { x: GAP + offset + c * (bw + GAP), y: GAP + r * (bh + GAP), w: bw, h: bh };
  });
}

function layoutCols(n: number, cols: number, W: number, H: number) {
  const rows = Math.ceil(n / cols);
  const bw = (W - GAP * (cols + 1)) / cols;
  const bh = (H - GAP * (rows + 1)) / rows;
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols);
    const inRow = r === rows - 1 ? n - r * cols : cols;
    const offset = ((cols - inRow) * (bw + GAP)) / 2;
    return { x: GAP + offset + (i % cols) * (bw + GAP), y: GAP + r * (bh + GAP), w: bw, h: bh };
  });
}

/**
 * The live board: your city's districts with everyone who's out right now on it. Regulars and
 * players drift between districts through the day. Tap someone to act, tap a district to work it.
 * Districts flash where something happened in the last hour.
 */
export function CityMap({ game, go, feed }: { game: GameApi; go: (t: string) => void; feed: FeedItem[] | undefined }) {
  const view = game.view!;
  const [people, setPeople] = useState<Person[] | null>(null);
  const [sel, setSel] = useState<{ kind: "person"; id: string } | { kind: "district"; i: number } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/community?online=1", { cache: "no-store" });
    if (res.ok) setPeople((await res.json()).online);
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 45_000);
    window.addEventListener("conspira:changed", load);
    return () => {
      clearInterval(t);
      window.removeEventListener("conspira:changed", load);
    };
  }, [load, view.location.country]);

  const districts = view.districts;
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 700px)");
    const on = () => setWide(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  const W = wide ? 720 : 360;
  const H = wide ? 250 : 230;
  const cols = wide ? Math.min(districts.length, 4) : 0;
  const blocks = useMemo(() => (wide ? layoutCols(districts.length, cols, W, H) : layout(districts.length, W, H)), [districts.length, wide, cols, W, H]);
  const hour = Math.floor(Date.now() / 3_600_000);
  const placeOf = (id: string) => Math.floor(hash(id + hour) * districts.length);
  const mine = view.jobs.find((j) => j.id === view.recommendedJobId)?.district;
  const myIndex = Math.max(0, districts.findIndex((d) => d.id === mine));
  const hot = new Map<number, string>();
  for (const f of feed ?? []) {
    if (Date.now() - f.at > 60 * 60_000) continue;
    const i = districts.findIndex((d) => f.text.includes(d.name));
    if (i >= 0 && !hot.has(i)) hot.set(i, f.text);
  }

  const pins = (people ?? []).filter((p) => p.status === "ok").map((p) => {
    const i = placeOf(p.id);
    const b = blocks[i];
    return { p, i, x: b.x + 14 + hash(p.id + "x" + hour) * (b.w - 28), y: b.y + 26 + hash(p.id + "y" + hour) * (b.h - 40) };
  });
  const me = blocks[myIndex];
  const person = sel?.kind === "person" ? people?.find((p) => p.id === sel.id) ?? null : null;
  const district = sel?.kind === "district" ? districts[sel.i] : null;

  const act = async (op: "attack" | CrimeKind, targetId: string) => {
    const body = op === "attack" ? { op: "attack", targetId } : { op: "crime", kind: op, targetId };
    if (await game.social(body)) load();
  };

  return (
    <section className="citymap-wrap">
      <div className="sec-head"><h2>The map</h2><button className="link" onClick={() => go("tab:city")}>Open</button></div>
      <div className="card citymap">
      <div className="map-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="map-svg" role="img" aria-label={`Map of ${view.location.city}`}>
          <defs>
            <pattern id="map-grid" width="12" height="12" patternUnits="userSpaceOnUse">
              <path d="M12 0H0V12" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="#0d1016" />
          <rect width={W} height={H} fill="url(#map-grid)" />
          {blocks.map((b, i) => {
            const d = districts[i];
            const on = sel?.kind === "district" && sel.i === i;
            return (
              <g key={d.id} className={`map-block${d.locked ? " locked" : ""}${on ? " on" : ""}`} onClick={() => setSel({ kind: "district", i })}>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="8" fill={TINTS[i % TINTS.length]} />
                {hot.has(i) && <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="8" className="map-hot" />}
                <text x={b.x + 8} y={b.y + 16} className="map-label">{d.name}</text>
                {d.locked && <text x={b.x + 8} y={b.y + 28} className="map-sub">locked</text>}
              </g>
            );
          })}
        </svg>
        {/* People sit on top of the SVG as HTML so their portraits load like any image. */}
        <div className="map-pins">
          {me && (
            <span className="map-me" style={{ left: `${((me.x + me.w - 18) / W) * 100}%`, top: `${((me.y + me.h - 16) / H) * 100}%` }} title="You">
              <PlayerAvatar name={view.name} path={view.path?.id} photo={view.profile.photo} className="pin-avatar" />
              <span className="pin-name me">You</span>
            </span>
          )}
          {pins.map(({ p, x, y }, k) => (
            <span key={p.id} className="map-pos" style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}>
            <motion.button
              className={`map-pin${p.heavy ? " heavy" : ""}${sel?.kind === "person" && sel.id === p.id ? " on" : ""}`}
              style={{ ["--rim" as string]: p.path ? PATH_LOOKS[p.path]?.rim : "#8a93a6" }}
              initial={{ scale: 0 }}
              animate={{ scale: 1, y: [0, -2, 0] }}
              transition={{ scale: { delay: k * 0.04 }, y: { repeat: Infinity, duration: 3 + (k % 3), ease: "easeInOut" } }}
              onClick={() => setSel({ kind: "person", id: p.id })}
              aria-label={p.name}
            >
              <PlayerAvatar name={p.name} path={p.path} photo={p.photo} className="pin-avatar" />
            </motion.button>
            <span className="pin-name">{p.heavy ? `${p.name.split(" ").at(-1)} \u265B` : p.name.split(" ")[0]}</span>
            </span>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {person ? (
          <motion.div key={person.id} className="map-sheet" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <PlayerAvatar name={person.name} path={person.path} photo={person.photo} className="avatar-md" />
            <div className="map-sheet-body">
              <div className="row">
                <b className="map-name">{person.name}</b>
                {person.heavy ? <span className="chip chip-heavy">👑 Heavy</span> : person.regular && <span className="chip chip-regular">Regular</span>}
                {person.tie && <span className={`tie-badge tie-${person.tie.tone}`}>{person.tie.label}</span>}
              </div>
              <span className="muted fine">{person.title} · {districts[placeOf(person.id)]?.name}</span>
              {person.tie && <span className={`tie tie-${person.tie.tone} fine`}>{person.tie.memo}</span>}
              <div className="row map-actions">
                <button className="btn btn-danger btn-sm" disabled={game.busy || !!person.canAttack} title={person.canAttack ?? ""} onClick={() => act("attack", person.id)}><Swords size={14} /> Attack</button>
                {(["pickpocket", "snatch", "mug"] as const).map((k) => (
                  <button key={k} className="btn btn-ghost btn-sm" disabled={game.busy || !!person.canCrime[k]} title={person.canCrime[k] ?? ""} onClick={() => act(k, person.id)}>
                    {k === "pickpocket" ? <Hand size={13} /> : k === "snatch" ? <Footprints size={13} /> : <Zap size={13} />} {k}
                  </button>
                ))}
              </div>
              {person.canAttack && person.canCrime.pickpocket && <span className="fine muted">{person.canAttack}</span>}
            </div>
          </motion.div>
        ) : district ? (
          <motion.div key={district.id} className="map-sheet" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="map-sheet-body">
              <b className="map-name">{district.name}</b>
              <span className="muted fine">{district.locked ?? district.tagline}</span>
              {hot.has(sel!.kind === "district" ? sel!.i : -1) && <span className="fine map-news">● {hot.get((sel as { i: number }).i)}</span>}
              <div className="row map-actions">
                {(() => {
                  const job = view.jobs.find((j) => j.district === district.id && !j.locked);
                  return job ? (
                    <button className="btn btn-primary btn-sm" onClick={() => go(`job:${job.id}`)}>Work here · {job.name}</button>
                  ) : (
                    <span className="fine muted">No work for you here yet.</span>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.p key="hint" className="fine muted map-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {people === null ? "Scanning the streets…" : pins.length ? "Tap someone to act, or a district to work it." : `Nobody out in ${view.location.city} right now.`}
          </motion.p>
        )}
      </AnimatePresence>
      </div>
    </section>
  );
}
