"use client";

import { CornerDownLeft, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { setSound, soundOn } from "./sfx";
import { useScrollLock } from "./scrollLock";
import { fmt, type GameApi } from "./useGame";

type Cmd = { id: string; group: string; label: string; hint?: string; keywords?: string; run: () => unknown; block?: string | null };
type Online = { id: string; name: string; canAttack: string | null; canCrime: Record<string, string | null>; regular?: boolean };

const PLACES: [string, string, string][] = [
  ["police", "Police station", "cops report case files arrest"],
  ["court", "Courthouse", "trial bail lawyer judge"],
  ["hospital", "Hospital", "doctor heal surgery clinic"],
  ["bank", "Bank", "deposit withdraw loan launder money"],
  ["academy", "Academy", "school career apply enroll"],
  ["cityhall", "City Hall", "mayor vote election seats newspaper"],
  ["prison", "Prison", "jail cell yard breakout"],
  ["street", "The Street", "dealers rackets contracts cold cases drugs"],
  ["station", "Station", "travel bus train plane country drive"],
  ["directory", "The Directory", "services banker lawyer doctor mechanic shop find hire"],
  ["home", "Your Place", "home stash hide dirty money drugs safe"],
  ["docks", "The Docks", "car garage vehicle smuggle cargo fence drive"],
];

/** Scores how well `q` matches `text`: words must all appear; earlier and tighter is better. */
function score(q: string, text: string): number {
  const t = text.toLowerCase();
  let total = 0;
  for (const w of q.toLowerCase().split(/\s+/).filter(Boolean)) {
    const i = t.indexOf(w);
    if (i < 0) return -1;
    total += i === 0 ? 3 : t[i - 1] === " " ? 2 : 1;
  }
  return total;
}

/**
 * Ctrl/⌘+K (or the search button): type what you want and press Enter. Every screen, every job,
 * every place, the shop and everyone out on the street.
 */
export function CommandPalette({ game, go, open, setOpen }: { game: GameApi; go: (t: string) => void; open: boolean; setOpen: (v: boolean) => void }) {
  const view = game.view!;
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const [online, setOnline] = useState<Online[]>([]);
  const input = useRef<HTMLInputElement>(null);
  useScrollLock(open);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      } else if (e.key === "/" && !open && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setI(0);
    setTimeout(() => input.current?.focus(), 30);
    fetch("/api/community?online=1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { online: [] }))
      .then((d) => setOnline(d.online ?? []))
      .catch(() => {});
  }, [open]);

  const cmds = useMemo<Cmd[]>(() => {
    const away = view.jail ? "You're in a cell." : view.travel ? "You're on the road." : view.hospitalMs > 0 ? "You're in the clinic." : null;
    const list: Cmd[] = [
      ...([["home", "Home"], ["jobs", "Jobs"], ["fight", "Fight"], ["shop", "Shop"], ["people", "People"], ["city", "City"], ["profile", "Me · profile"]] as const).map(([id, label]) => ({
        id: `tab-${id}`, group: "Go to", label, run: () => go(`tab:${id}`),
      })),
      { id: "chat", group: "Go to", label: "Chat", keywords: "messages talk", run: () => go("people:chat") },
      { id: "crew", group: "Go to", label: "Crew", keywords: "family gang heist ambush", run: () => go("people:crew") },
      { id: "inbox", group: "Go to", label: "Inbox", hint: view.inbox.unread ? `${view.inbox.unread} new` : undefined, run: () => go("people:inbox") },
      ...PLACES.map(([id, label, kw]) => ({ id: `place-${id}`, group: "Places", label, keywords: kw, run: () => go(`place:${id}`) })),
      ...view.jobs.filter((j) => !j.locked).map((j) => ({
        id: `job-${j.id}`, group: "Work", label: j.name, hint: `$${j.pay[0]}–${j.pay[1]} · ⚡${j.energy}`, keywords: `job work ${j.tag}`,
        block: away ?? (view.energy < j.energy ? "Not enough energy." : null),
        run: () => game.act({ type: "job", jobId: j.id }),
      })),
      ...(["strength", "toughness", "agility"] as const).map((stat) => ({
        id: `gym-${stat}`, group: "Gym", label: `Train ${stat}`, hint: `$${view.gym.fee} · ⚡${view.gym.energy}`, keywords: "gym train exercise",
        block: away ?? (view.energy < view.gym.energy ? "Not enough energy." : null),
        run: () => game.act({ type: "train", stat }),
      })),
      ...view.shop.filter((s) => !s.owned).map((s) => ({
        id: `buy-${s.id}`, group: "Shop", label: `Buy ${s.name}`, hint: `$${s.price}`, keywords: `${s.kind} buy`,
        block: view.cash < s.price ? "Not enough cash." : null,
        run: () => game.act({ type: "buy", itemId: s.id }),
      })),
      { id: "daily", group: "Quick", label: "Collect daily reward", block: view.daily.canClaim ? null : "Already collected today.", run: () => game.act({ type: "claim_daily" }) },
      { id: "sound", group: "Settings", label: soundOn() ? "Turn sound off" : "Turn sound on", keywords: "mute audio volume sfx", run: () => setSound(!soundOn()) },
      { id: "medkit", group: "Quick", label: "Use a medkit", block: view.inventory.some((x) => x.id === "medkit") ? null : "You have no medkits.", run: () => game.act({ type: "use", itemId: "medkit" }) },
      ...online.flatMap((o) => [
        { id: `atk-${o.id}`, group: "People out now", label: `Attack ${o.name}`, hint: o.regular ? "Regular" : undefined, keywords: "fight", block: o.canAttack, run: () => game.social({ op: "attack", targetId: o.id }) },
        ...(["pickpocket", "snatch", "mug"] as const).map((k) => ({
          id: `${k}-${o.id}`, group: "People out now", label: `${k[0].toUpperCase()}${k.slice(1)} ${o.name}`, keywords: "crime rob steal", block: o.canCrime?.[k] ?? null,
          run: () => game.social({ op: "crime", kind: k, targetId: o.id }),
        })),
      ]),
    ];
    return list;
  }, [view, online, go, game]);

  const shown = useMemo(() => {
    if (!q.trim()) return cmds.filter((c) => c.group !== "People out now" && c.group !== "Shop").slice(0, 40);
    return cmds
      .map((c) => ({ c, s: score(q, `${c.label} ${c.keywords ?? ""} ${c.group}`) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s || Number(!!a.c.block) - Number(!!b.c.block))
      .slice(0, 40)
      .map((x) => x.c);
  }, [q, cmds]);

  const run = (c: Cmd | undefined) => {
    if (!c || c.block) return;
    setOpen(false);
    c.run();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="palette-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.div className="palette" initial={{ y: -14, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -8, opacity: 0 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Command palette">
            <div className="palette-input">
              <Search size={18} />
              <input
                ref={input}
                value={q}
                placeholder="Do anything… try “mug”, “bank”, “steak”, a name"
                onChange={(e) => { setQ(e.target.value); setI(0); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(shown.length - 1, x + 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(0, x - 1)); }
                  else if (e.key === "Enter") { e.preventDefault(); run(shown[i]); }
                  else if (e.key === "Escape") setOpen(false);
                }}
              />
              <kbd>esc</kbd>
            </div>
            <ul className="palette-list">
              {shown.map((c, k) => (
                <li key={c.id}>
                  <button className={`${k === i ? "on" : ""}${c.block ? " blocked" : ""}`} onMouseEnter={() => setI(k)} onClick={() => run(c)} title={c.block ?? ""}>
                    <span className="pal-group">{c.group}</span>
                    <span className="pal-label">{c.label}</span>
                    <span className="pal-hint">{c.block ?? c.hint ?? ""}</span>
                    {k === i && !c.block && <CornerDownLeft size={14} className="pal-enter" />}
                  </button>
                </li>
              ))}
              {!shown.length && <li className="palette-empty">Nothing matches “{q}”.</li>}
            </ul>
            <div className="palette-foot">
              <span>↑↓ choose · enter do it · esc close</span>
              <span>Energy {Math.floor(game.live?.energy ?? view.energy)}/{view.maxEnergy}{game.live && game.live.fullIn > 0 ? ` · full in ${fmt(game.live.fullIn)}` : ""}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
