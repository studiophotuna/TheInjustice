"use client";

import { Briefcase, Dumbbell, HeartPulse, Utensils, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { fmt, LAST_GYM, LAST_JOB, type GameApi } from "./useGame";

type Stat = "strength" | "toughness" | "agility";

const readKey = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

type Slot = { key: string; label: string; sub: string; cost?: string; tone: string; Icon: typeof Briefcase; block: string | null; run: () => void };

/**
 * The hotbar: the four things you do most, one tap (or one key) away, from any screen.
 * 1 repeat your last job · 2 the gym · 3 eat · 4 patch yourself up.
 */
export function QuickBar({ game }: { game: GameApi }) {
  const view = game.view!;
  const live = game.live!;
  const [lastJob, setLastJob] = useState<string | null>(null);
  const [lastGym, setLastGym] = useState<Stat>("strength");
  useEffect(() => {
    setLastJob(readKey(LAST_JOB));
    setLastGym((readKey(LAST_GYM) as Stat | null) ?? "strength");
  }, [game.view]);

  const away = view.jail ? "You're in a cell." : view.travel ? "You're on the road." : live.hospital > 0 ? `In the clinic for ${fmt(live.hospital)}.` : null;
  const job = view.jobs.find((j) => j.id === lastJob && !j.locked) ?? view.jobs.find((j) => j.id === view.recommendedJobId) ?? null;
  const food = view.shop
    .filter((i) => i.kind === "food" && i.price <= view.cash)
    .sort((a, b) => b.price - a.price)[0];
  const medkit = view.inventory.find((i) => i.id === "medkit");

  const slots: Slot[] = [
    {
      key: "1",
      label: job ? job.name : "Work",
      sub: job ? `$${job.pay[0]}–${job.pay[1]}` : "No work here",
      cost: job ? String(job.energy) : undefined,
      tone: "energy",
      Icon: Briefcase,
      block: away ?? (!job ? "No job you can do here." : live.energy < job.energy ? `Not enough energy. Full in ${fmt(live.fullIn)}.` : null),
      run: () => job && act({ type: "job", jobId: job.id }),
    },
    {
      key: "2",
      label: `Gym · ${lastGym}`,
      sub: `$${view.gym.fee}`,
      cost: String(view.gym.energy),
      tone: "rep",
      Icon: Dumbbell,
      block: away ?? (live.energy < view.gym.energy ? "Not enough energy." : view.cash < view.gym.fee ? `The gym costs $${view.gym.fee}.` : null),
      run: () => act({ type: "train", stat: lastGym }),
    },
    {
      key: "3",
      label: food ? food.name : "Eat",
      sub: food ? `$${food.price}` : "Can't afford food",
      tone: "cash",
      Icon: Utensils,
      block: away && !view.travel ? away : view.fullMs > 0 ? `Still full for ${fmt(view.fullMs)}.` : !food ? "You can't afford anything." : null,
      run: () => food && act({ type: "buy", itemId: food.id }),
    },
    {
      key: "4",
      label: "Medkit",
      sub: medkit ? `${medkit.count} left` : "None",
      tone: "health",
      Icon: HeartPulse,
      block: !medkit ? "Buy medkits in the Shop." : view.hp >= view.maxHp && live.hospital === 0 ? "You're not hurt." : null,
      run: () => act({ type: "use", itemId: "medkit" }),
    },
  ];

  const act = (body: Record<string, unknown>) => game.act(body);

  // Keys 1–4 on desktop (not while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const s = slots.find((x) => x.key === e.key);
      if (s && !s.block && !game.busy) {
        e.preventDefault();
        s.run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="quickbar" role="toolbar" aria-label="Quick actions">
      {slots.map((s) => (
        <button key={s.key} className={`qslot q-${s.tone}`} disabled={game.busy || !!s.block} title={s.block ?? `${s.label} (key ${s.key})`} onClick={s.run}>
          <span className="qkey">{s.key}</span>
          <s.Icon size={20} className="qicon" />
          <span className="qtext">
            <b>{s.label}</b>
            <small>{s.block && s.block.length < 24 ? s.block : s.sub}</small>
          </span>
          {s.cost && <span className="qcost"><Zap size={10} strokeWidth={3} />{s.cost}</span>}
        </button>
      ))}
    </div>
  );
}
