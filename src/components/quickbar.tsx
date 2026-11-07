"use client";

import { Briefcase, Dumbbell, HeartPulse, Utensils, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { ITEM_BY_ID } from "@/game/content/items";
import { fmt, LAST_GYM, LAST_JOB, type GameApi } from "./useGame";

type Stat = "strength" | "toughness" | "agility";

const readKey = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

type Slot = { key: string; label: string; sub: string; cost?: string; tone: string; Icon: typeof Briefcase; block: string | null; run: () => void; /** Nothing on you: the slot links to the Shop instead. */ shop?: boolean };
type Pocket = { id: string; name: string; count: number; energy: number };

const goShop = () => window.dispatchEvent(new CustomEvent("injustice:go", { detail: "tab:shop" }));

/**
 * The hotbar: the four things you do most, one tap (or one key) away, from any screen.
 * 1 repeat your last job · 2 the gym · 3 eat what you carry · 4 patch yourself up with what you carry.
 * Eating and healing use your own pockets; with nothing on you, the slot points to the Shop.
 */
export function QuickBar({ game }: { game: GameApi }) {
  const view = game.view!;
  const live = game.live!;
  const [lastJob, setLastJob] = useState<string | null>(null);
  const [lastGym, setLastGym] = useState<Stat>("strength");
  const [pick, setPick] = useState<"food" | "medical" | null>(null);
  useEffect(() => {
    setLastJob(readKey(LAST_JOB));
    setLastGym((readKey(LAST_GYM) as Stat | null) ?? "strength");
  }, [game.view]);

  const away = view.jail ? "You're in a cell." : view.travel ? "You're on the road." : live.hospital > 0 ? `In the clinic for ${fmt(live.hospital)}.` : null;
  const straight = !!view.careerRecord.exit?.started;
  const ok = (j: (typeof view.jobs)[number]) => !j.locked && (!straight || !j.crime);
  const job =
    view.jobs.find((j) => j.id === lastJob && ok(j)) ??
    view.jobs.find((j) => j.id === view.recommendedJobId && ok(j)) ??
    (straight ? [...view.jobs].filter(ok).sort((a, b) => b.pay[1] - a.pay[1])[0] : null) ??
    null;
  // What you're carrying, best first.
  const pocket = (kind: "food" | "medical"): Pocket[] =>
    view.inventory
      .filter((i) => i.count > 0 && ITEM_BY_ID[i.id]?.kind === kind)
      .map((i) => ({ id: i.id, name: i.name, count: i.count, energy: ITEM_BY_ID[i.id]?.energy ?? 0 }))
      .sort((a, b) => b.energy - a.energy);
  const foods = pocket("food");
  const meds = pocket("medical");
  const food = foods[0];
  const medkit = meds[0];
  const total = (l: Pocket[]) => l.reduce((s, x) => s + x.count, 0);
  const medic = view.specialties.find((s) => s.id === "combat_medic" && s.tier > 0);

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
      label: food ? (foods.length > 1 ? "Eat" : food.name) : "No food",
      sub: food ? (foods.length > 1 ? `${total(foods)} on you` : `${food.count} on you`) : "None on you · Shop",
      tone: "cash",
      Icon: Utensils,
      shop: !food,
      block: !food ? null : away && !view.travel ? away : view.fullMs > 0 ? `Still full for ${fmt(view.fullMs)}.` : null,
      run: () => (!food ? goShop() : foods.length > 1 ? setPick(pick === "food" ? null : "food") : act({ type: "use", itemId: food.id })),
    },
    {
      key: "4",
      label: !medkit && medic ? "Field dressing" : medkit ? (meds.length > 1 ? "Heal" : medkit.name) : "No medkit",
      sub: !medkit && medic ? (medic.ready ? "Field surgeon" : "Restocking") : medkit ? `${total(meds)} on you` : "None on you · Shop",
      shop: !medkit && !medic,
      tone: "health",
      Icon: HeartPulse,
      block:
        view.hp >= view.maxHp && live.hospital === 0
          ? "You're not hurt."
          : medkit
            ? null
            : medic
              ? medic.ready && live.hospital === 0 ? null : "Your kit needs restocking."
              : null,
      run: () => (medkit ? (meds.length > 1 ? setPick(pick === "medical" ? null : "medical") : act({ type: "use", itemId: medkit.id })) : medic ? act({ type: "field_dressing" }) : goShop()),
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
      if (s && (!s.block || s.shop) && !game.busy) {
        e.preventDefault();
        s.run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="quickbar" role="toolbar" aria-label="Quick actions">
      {pick && (
        <div className="qpick" role="menu" aria-label={pick === "food" ? "Eat something you carry" : "Use something you carry"}>
          {(pick === "food" ? foods : meds).map((i) => (
            <button
              key={i.id}
              role="menuitem"
              disabled={game.busy}
              onClick={() => {
                setPick(null);
                act({ type: "use", itemId: i.id });
              }}
            >
              <b>{i.name}</b>
              <small>×{i.count}{i.energy ? ` · +${i.energy} energy` : ""}</small>
            </button>
          ))}
          <button className="qpick-shop" onClick={() => { setPick(null); goShop(); }}>Get more in the Shop</button>
        </div>
      )}
      {slots.map((s) => (
        <button key={s.key} className={`qslot q-${s.tone}${s.shop ? " q-empty" : ""}`} disabled={game.busy || (!!s.block && !s.shop)} title={s.shop ? "Nothing on you. Tap to go to the Shop." : s.block ?? `${s.label} (key ${s.key})`} onClick={s.run}>
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
