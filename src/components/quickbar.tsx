"use client";

import { Briefcase, ChevronUp, Dumbbell, HeartPulse, Utensils, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { ITEM_BY_ID } from "@/game/content/items";
import { PATHS } from "@/game/content/paths";
import { fmt, LAST_GYM, LAST_JOB, type GameApi } from "./useGame";

type Stat = "strength" | "toughness" | "agility";

const readKey = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

type Slot = { key: string; label: string; /** What a phone shows: one short word that fits the slot. */ short: string; sub: string; cost?: string; tone: string; Icon: typeof Briefcase; block: string | null; run: () => void; /** Nothing on you: the slot links to the Shop instead. */ shop?: boolean; /** An arrow opens a list to choose from. */ more?: "job" | "gym" | "food" | "medical" };
type Pocket = { id: string; name: string; count: number; energy: number };

/** The gym's activities by name; the stats they train stay unseen, as on the Fight tab. */
const GYM_NAME: Record<Stat, string> = { strength: "Lift weights", toughness: "Spar & condition", agility: "Footwork drills" };
const GYM_SHORT: Record<Stat, string> = { strength: "Lift", toughness: "Spar", agility: "Drills" };

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
  const [pick, setPick] = useState<"food" | "medical" | "job" | "gym" | null>(null);
  // Phones: the four slots fold into a sheet behind the Go button.
  const [sheet, setSheet] = useState(false);
  useEffect(() => {
    setLastJob(readKey(LAST_JOB));
    setLastGym((readKey(LAST_GYM) as Stat | null) ?? "strength");
  }, [game.view]);

  const away = view.jail ? "You're in a cell." : view.travel ? "You're on the road." : live.hospital > 0 ? `In the clinic for ${fmt(live.hospital)}.` : null;
  const straight = !!view.careerRecord.exit?.started;
  const ok = (j: (typeof view.jobs)[number]) => !j.locked && (!straight || !j.crime);
  // Your career's work comes first: the career job you did last, else the best-paying career job
  // you can do now. Without a career (or none open here), the job you did last or the suggested one.
  const careerJobs = view.jobs.filter((j) => j.pathJob && ok(j));
  const affordable = careerJobs.filter((j) => j.energy <= live.energy);
  const bestCareer = [...(affordable.length ? affordable : careerJobs)].sort((a, b) => (b.pay[0] + b.pay[1]) / b.energy - (a.pay[0] + a.pay[1]) / a.energy)[0];
  const job =
    careerJobs.find((j) => j.id === lastJob) ??
    bestCareer ??
    view.jobs.find((j) => j.id === lastJob && ok(j)) ??
    view.jobs.find((j) => j.id === view.recommendedJobId && ok(j)) ??
    (straight ? [...view.jobs].filter(ok).sort((a, b) => b.pay[1] - a.pay[1])[0] : null) ??
    null;
  // The gym trains what your career leans on; careers that don't lean on the body keep your last choice.
  const keyGym = view.path ? (PATHS[view.path.id as keyof typeof PATHS]?.keyStats ?? []).filter((s): s is Stat => s === "strength" || s === "toughness" || s === "agility") : [];
  const gymStat: Stat = keyGym.includes(lastGym) ? lastGym : keyGym[0] ?? lastGym;
  // What you're carrying, best first.
  const pocket = (kind: "food" | "medical"): Pocket[] =>
    view.inventory
      .filter((i) => i.count > 0 && ITEM_BY_ID[i.id]?.kind === kind)
      .map((i) => ({ id: i.id, name: i.name, count: i.count, energy: ITEM_BY_ID[i.id]?.energy ?? 0 }))
      .sort((a, b) => b.energy - a.energy);
  // A meal waits for you to be hungry again; a boost (coffee, energy drink) has its own timer.
  const notReady = (id: string): string | null =>
    ITEM_BY_ID[id]?.boost
      ? view.boostsLeft <= 0 ? "That's enough caffeine for today." : view.boostMs > 0 ? `Next one in ${fmt(view.boostMs)}.` : null
      : view.fullMs > 0 ? `Still full for ${fmt(view.fullMs)}.` : null;
  // The slot offers what you can have now, best first.
  const foods = [...pocket("food")].sort((a, b) => Number(!!notReady(a.id)) - Number(!!notReady(b.id)));
  const meds = pocket("medical");
  const food = foods[0];
  const medkit = meds[0];
  const total = (l: Pocket[]) => l.reduce((s, x) => s + x.count, 0);
  const medic = view.specialties.find((s) => s.id === "combat_medic" && s.tier > 0);

  const slots: Slot[] = [
    {
      key: "1",
      label: job ? job.name : "Work",
      short: "Work",
      sub: job ? `$${job.pay[0]}–${job.pay[1]}` : "No work here",
      cost: job ? String(job.energy) : undefined,
      tone: "energy",
      Icon: Briefcase,
      block: away ?? (!job ? "No job you can do here." : live.energy < job.energy ? `Not enough energy. Full in ${fmt(live.fullIn)}.` : null),
      run: () => job && act({ type: "job", jobId: job.id }),
      more: "job",
    },
    {
      key: "2",
      label: GYM_NAME[gymStat],
      short: GYM_SHORT[gymStat],
      sub: `$${view.gym.fee}`,
      cost: String(view.gym.energy),
      tone: "rep",
      Icon: Dumbbell,
      block: away ?? (live.energy < view.gym.energy ? "Not enough energy." : view.cash < view.gym.fee ? `The gym costs $${view.gym.fee}.` : null),
      run: () => act({ type: "train", stat: gymStat }),
      more: "gym",
    },
    {
      key: "3",
      label: food ? food.name : "No food",
      short: food ? "Eat" : "No food",
      sub: food ? `${total(foods)} on you` : "None on you · Shop",
      tone: "cash",
      Icon: Utensils,
      shop: !food,
      block: !food ? null : away && !view.travel ? away : notReady(food.id),
      run: () => (!food ? goShop() : act({ type: "use", itemId: food.id })),
      more: "food",
    },
    {
      key: "4",
      label: !medkit && medic ? "Field dressing" : medkit ? medkit.name : "No medkit",
      short: medkit || medic ? "Patch up" : "No meds",
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
      run: () => (medkit ? act({ type: "use", itemId: medkit.id }) : medic ? act({ type: "field_dressing" }) : goShop()),
      more: "medical",
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

  const rate = (j: (typeof view.jobs)[number]) => (j.pay[0] + j.pay[1]) / j.energy;
  const otherJobs = view.jobs
    .filter((j) => !j.pathJob && ok(j))
    .sort((a, b) => Number(b.id === view.recommendedJobId) - Number(a.id === view.recommendedJobId) || rate(b) - rate(a))
    .slice(0, 5);
  const jobRow = (j: (typeof view.jobs)[number]) => {
    const short = away ?? (live.energy < j.energy ? "Not enough energy" : null);
    return (
      <button
        key={j.id}
        role="menuitem"
        className={j.id === job?.id ? "on" : ""}
        disabled={game.busy || !!short}
        onClick={() => {
          setPick(null);
          act({ type: "job", jobId: j.id });
        }}
      >
        <b>{j.name}</b>
        <small>{short ?? `$${j.pay[0]}–${j.pay[1]} · ${j.energy} energy`}</small>
      </button>
    );
  };
  const GYM = (["strength", "toughness", "agility"] as const).map((id) => ({ id, name: GYM_NAME[id] }));

  return (
    <div className={`quickbar${sheet ? " open" : ""}`} role="toolbar" aria-label="Quick actions">
      {/* Phones: Go does your work in one tap; the arrow opens the gym, food and first aid. */}
      <button
        className="qorb"
        disabled={game.busy || !!slots[0].block}
        title={slots[0].block ?? `${slots[0].label}: ${slots[0].cost ?? ""} energy`}
        aria-label={slots[0].block ? `Work: ${slots[0].block}` : `Do ${slots[0].label}, ${slots[0].cost} energy`}
        onClick={() => { setSheet(false); slots[0].run(); }}
      >
        <span className="qorb-disc"><Zap size={22} strokeWidth={2.6} fill="currentColor" /><small>Go</small></span>
        <span className="qorb-label">{slots[0].block && slots[0].block.length < 22 ? slots[0].block : job ? `${job.name} · ${job.energy}` : "No work here"}</span>
      </button>
      <button className={`qorb-more${sheet ? " on" : ""}`} aria-label={sheet ? "Close quick actions" : "Gym, food and first aid"} aria-expanded={sheet} onClick={() => { setPick(null); setSheet(!sheet); }}>
        <ChevronUp size={14} strokeWidth={3} />
      </button>
      {pick === "job" && (
        <div className="qpick" role="menu" aria-label="Choose your work">
          {careerJobs.length > 0 && <span className="qpick-head">Your career</span>}
          {[...careerJobs].sort((a, b) => rate(b) - rate(a)).map(jobRow)}
          {otherJobs.length > 0 && <span className="qpick-head">Other work</span>}
          {otherJobs.map(jobRow)}
          <button className="qpick-shop" onClick={() => { setPick(null); window.dispatchEvent(new CustomEvent("injustice:go", { detail: "tab:jobs" })); }}>All jobs</button>
        </div>
      )}
      {pick === "gym" && (
        <div className="qpick" role="menu" aria-label="Choose what to train">
          {GYM.map((s) => (
            <button
              key={s.id}
              role="menuitem"
              className={s.id === gymStat ? "on" : ""}
              disabled={game.busy || !!away || live.energy < view.gym.energy || view.cash < view.gym.fee}
              onClick={() => {
                setPick(null);
                act({ type: "train", stat: s.id });
              }}
            >
              <b>{s.name}</b>
              <small>${view.gym.fee}</small>
            </button>
          ))}
        </div>
      )}
      {(pick === "food" || pick === "medical") && (
        <div className="qpick" role="menu" aria-label={pick === "food" ? "Eat something you carry" : "Use something you carry"}>
          {(pick === "food" ? foods : meds).length === 0 && !(pick === "medical" && medic) && <span className="qpick-head">Nothing on you</span>}
          {pick === "medical" && medic && (
            <button
              role="menuitem"
              disabled={game.busy || !medic.ready || (view.hp >= view.maxHp && live.hospital === 0)}
              onClick={() => {
                setPick(null);
                act({ type: "field_dressing" });
              }}
            >
              <b>Field dressing</b>
              <small>{!medic.ready ? "Restocking" : view.hp >= view.maxHp ? "You're not hurt" : "Field surgeon"}</small>
            </button>
          )}
          {(pick === "food" ? foods : meds).map((i) => (
            <button
              key={i.id}
              role="menuitem"
              disabled={game.busy || (pick === "food" ? !!notReady(i.id) : view.hp >= view.maxHp && live.hospital === 0)}
              onClick={() => {
                setPick(null);
                act({ type: "use", itemId: i.id });
              }}
            >
              <b>{i.name}</b>
              <small>×{i.count}{i.energy ? ` · +${i.energy} energy` : ""}</small>
            </button>
          ))}
          <button className="qpick-shop" onClick={() => { setPick(null); goShop(); }}>{(pick === "food" ? foods : meds).length ? "Get more in the Shop" : "Go to the Shop"}</button>
        </div>
      )}
      {slots.map((s) => (
        <div key={s.key} className="qwrap">
        {s.more && (
          <button className={`qmore q-${s.tone}${pick === s.more ? " open" : ""}`} aria-label={s.more === "job" ? "Choose your work" : s.more === "gym" ? "Choose what to train" : s.more === "food" ? "Choose what to eat" : "Choose what to use"} aria-expanded={pick === s.more} onClick={() => setPick(pick === s.more ? null : s.more!)}>
            <ChevronUp size={12} strokeWidth={3} />
          </button>
        )}
        <button className={`qslot q-${s.tone}${s.shop ? " q-empty" : ""}`} disabled={game.busy || (!!s.block && !s.shop)} title={s.shop ? "Nothing on you. Tap to go to the Shop." : s.block ?? `${s.label} (key ${s.key})`} onClick={() => { s.run(); setSheet(false); }}>
          <span className="qkey">{s.key}</span>
          <s.Icon size={20} className="qicon" />
          <span className="qtext">
            <b><span className="q-long">{s.label}</span><span className="q-short">{s.short}</span></b>
            <small>{s.block && s.block.length < 24 ? s.block : s.sub}</small>
          </span>
          {s.cost && <span className="qcost"><Zap size={10} strokeWidth={3} />{s.cost}</span>}
        </button>
        </div>
      ))}
    </div>
  );
}
