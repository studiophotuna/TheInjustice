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
  look?: { frame: string | null; color: string | null; banner: string | null } | null;
};



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
  // A street map: blocks with streets between them and the water along the bottom.
  const W = wide ? 440 : 360;
  const H = wide ? 300 : 280;
  const WATER = 46;
  const cols = 0;
  const blocks = useMemo(() => (cols ? layoutCols(districts.length, cols, W, H - WATER) : layout(districts.length, W, H - WATER)), [districts.length, cols, W, H]);
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

  // Spots inside a block, clear of its name and of each other. You take the first one in yours.
  // Two faces fit in a block; anyone else there shows as "+N".
  const SPOTS: [number, number][] = [[0.72, 0.6], [0.27, 0.6]];
  const used = new Map<number, number>([[myIndex, 1]]);
  const spot = (i: number) => {
    const n = used.get(i) ?? 0;
    used.set(i, n + 1);
    const [fx, fy] = SPOTS[n % SPOTS.length];
    const b = blocks[i];
    return { x: b.x + fx * b.w, y: b.y + 34 + fy * (b.h - 64) };
  };
  const extra = new Map<number, number>();
  const pins = (people ?? [])
    .filter((p) => p.status === "ok")
    .sort((a, b) => Number(!!b.heavy) - Number(!!a.heavy))
    .flatMap((p) => {
      const i = placeOf(p.id);
      if ((used.get(i) ?? 0) >= SPOTS.length) {
        extra.set(i, (extra.get(i) ?? 0) + 1);
        return [];
      }
      return [{ p, i, ...spot(i) }];
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
          <rect width={W} height={H} className="map-street" />
          {blocks.map((b, i) => {
            const d = districts[i];
            const on = sel?.kind === "district" && sel.i === i;
            return (
              <g key={d.id} className={`map-block${d.locked ? " locked" : ""}${on ? " on" : ""}`} onClick={() => setSel({ kind: "district", i })}>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} className="map-lot" />
              </g>
            );
          })}
          {/* Two avenues cutting across the grid. */}
          <path d={`M ${W * 0.12} 0 L ${W * 0.38} ${H - WATER}`} className="map-avenue" />
          <path d={`M ${W * 0.7} ${H - WATER} L ${W * 0.78} 0`} className="map-avenue" />
          <rect x="0" y={H - WATER} width={W} height={WATER} className="map-water" />
          <path d={`M 0 ${H - WATER + 16} q ${W / 8} -6 ${W / 4} 0 t ${W / 4} 0 t ${W / 4} 0 t ${W / 4} 0`} className="map-wave" />
          <path d={`M 0 ${H - WATER + 32} q ${W / 8} -6 ${W / 4} 0 t ${W / 4} 0 t ${W / 4} 0 t ${W / 4} 0`} className="map-wave" />
          {blocks.map((b, i) => (
            <g key={`l${i}`} className="map-names">
              <rect x={b.x + 6} y={b.y + 8} width={Math.min(b.w - 12, districts[i].name.replace(/^The /, "").length * 8.6 + 14)} height="20" rx="4" className="map-label-bg" />
              <text x={b.x + 13} y={b.y + 22} className="map-label">{districts[i].name.replace(/^The /, "")}</text>
              {districts[i].locked && <text x={b.x + 13} y={b.y + 40} className="map-sub">locked</text>}
              {extra.get(i) ? <text x={b.x + 6 + Math.min(b.w - 12, districts[i].name.replace(/^The /, "").length * 8.6 + 14) + 6} y={b.y + 22} className="map-more">+{extra.get(i)} more</text> : null}
            </g>
          ))}
          {[...hot.keys()].map((i) => {
            const b = blocks[i];
            return b ? (
              <g key={`hot${i}`} className="map-hot-dot">
                <circle cx={b.x + b.w - 18} cy={b.y + 18} r="11" className="ring" />
                <circle cx={b.x + b.w - 18} cy={b.y + 18} r="6" />
              </g>
            ) : null;
          })}
        </svg>
        {/* People sit on top of the SVG as HTML so their portraits load like any image. */}
        <div className="map-pins">
          {me && (
            <span className="map-me" style={{ left: `${((me.x + SPOTS[0][0] * me.w) / W) * 100}%`, top: `${((me.y + 34 + SPOTS[0][1] * (me.h - 64)) / H) * 100}%` }} title="You">
              <PlayerAvatar name={view.name} path={view.path?.id} photo={view.profile.photo} look={view.look} className="pin-avatar" />
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
              <PlayerAvatar name={p.name} path={p.path} photo={p.photo} look={p.look} className="pin-avatar" />
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
                {person.heavy ? <span className="chip chip-heavy">Heavy</span> : person.regular && <span className="chip chip-regular">Regular</span>}
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
