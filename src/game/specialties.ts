// Specialties: lasting skills earned by what you've done, across every career you've had.
//
// Each has three tiers. Progress comes from your real history (jobs worked in a career, arrests,
// trips, nights in the clinic), so it carries over when you change careers: a cop who later
// joins the Mafia keeps the detective's eye. That's the point: the most capable characters are
// the ones who've lived more than one life.

import { JOB_BY_ID } from "./content/jobs";
import { GameError, type GameEvent, type PathId, type Player } from "./types";

export type SpecId = "private_eye" | "devils_advocate" | "combat_medic" | "wheelman" | "money_mind" | "hard_as_nails" | "globetrotter";

export const SPECIALTY = {
  /** Field dressing: health per tier, and how often. */
  dressingHp: [15, 30, 45],
  dressingCooldownMs: 30 * 60_000,
  /** Devil's advocate: share of the remaining sentence argued away, per tier. */
  appeal: [0.3, 0.45, 0.6],
  /** Wheelman / lookout bonus to an ambush role's odds, per tier. */
  roleBonus: [0.1, 0.2, 0.3],
  /** Money on my mind: laundering fees cut by this share, per tier. */
  launderCut: [0.15, 0.3, 0.45],
  /** Hard as nails: clinic stays cut by this share, per tier. */
  clinicCut: [0.15, 0.3, 0.45],
  /** Globetrotter: travel time cut by this share, per tier. */
  travelCut: [0.1, 0.2, 0.3],
};

/** Jobs done in a career, ever (including careers you've since left). */
export function careerWork(p: Player, path: PathId): number {
  let n = 0;
  for (const [id, count] of Object.entries(p.jobCounts)) if (JOB_BY_ID[id]?.path === path) n += count;
  return n;
}

const c = (p: Player, key: string) => p.jobCounts[key] ?? 0;

interface SpecDef {
  id: SpecId;
  name: string;
  /** How you earn it. */
  how: string;
  tiers: [number, number, number];
  progress: (p: Player) => number;
  /** What each tier does. */
  perks: [string, string, string];
}

export const SPECIALTIES: SpecDef[] = [
  {
    id: "private_eye",
    name: "Private eye",
    how: "Police work: every shift counts, arrests and manhunts count triple.",
    tiers: [100, 300, 700],
    progress: (p) => careerWork(p, "police") + 3 * (c(p, "arrest") + c(p, "hunt")),
    perks: [
      "When you're robbed, you work out the first letter of who did it. Lookouts see more.",
      "You work out the first three letters of whoever robbed you.",
      "You know exactly who robbed you.",
    ],
  },
  {
    id: "devils_advocate",
    name: "Devil's advocate",
    how: "Work in the Courts: every case you work teaches you the law.",
    tiers: [100, 300, 700],
    progress: (p) => careerWork(p, "courts"),
    perks: [
      "Once per sentence, argue your own case: 30% of the time left is cut.",
      "Your appeal cuts 45% of the time left.",
      "Your appeal cuts 60% of the time left.",
    ],
  },
  {
    id: "combat_medic",
    name: "Combat medic",
    how: "Work as both a doctor and a soldier: the lesser of the two counts, twice.",
    tiers: [60, 200, 500],
    progress: (p) => 2 * Math.min(careerWork(p, "medicine"), careerWork(p, "military")),
    perks: [
      "Field dressing: patch yourself up for 15 health, every half hour, no medkit needed.",
      "Your field dressing heals 30.",
      "Your field dressing heals 45.",
    ],
  },
  {
    id: "wheelman",
    name: "Wheelman",
    how: "Military and Vigilante work, and every successful snatch.",
    tiers: [80, 250, 600],
    progress: (p) => careerWork(p, "military") + careerWork(p, "vigilante") + c(p, "crime:snatch"),
    perks: [
      "As an ambush driver, your getaway is 10% more likely to go clean.",
      "Your getaways are 20% more likely to go clean.",
      "Your getaways are 30% more likely to go clean.",
    ],
  },
  {
    id: "money_mind",
    name: "Money on my mind",
    how: "Work in Banking.",
    tiers: [100, 300, 700],
    progress: (p) => careerWork(p, "banking"),
    perks: ["Laundering fees cost you 15% less.", "Laundering fees cost you 30% less.", "Laundering fees cost you 45% less."],
  },
  {
    id: "hard_as_nails",
    name: "Hard as nails",
    how: "Wake up in the clinic. Every time teaches your body something.",
    tiers: [5, 15, 40],
    progress: (p) => p.jsnap?.clinics ?? 0,
    perks: ["Your clinic stays are 15% shorter.", "Your clinic stays are 30% shorter.", "Your clinic stays are 45% shorter."],
  },
  {
    id: "globetrotter",
    name: "Globetrotter",
    how: "Travel between cities.",
    tiers: [5, 20, 50],
    progress: (p) => c(p, "trip"),
    perks: ["Your trips are 10% shorter.", "Your trips are 20% shorter.", "Your trips are 30% shorter."],
  },
];

const BY_ID = Object.fromEntries(SPECIALTIES.map((s) => [s.id, s])) as Record<SpecId, SpecDef>;

/** 0 (not yet) to 3. */
export function specTier(p: Player, id: SpecId): number {
  const s = BY_ID[id];
  const v = s.progress(p);
  return s.tiers.filter((t) => v >= t).length;
}

/** For the Me tab: every specialty, where you are, and what's next. */
export function specialtiesView(p: Player, now: number) {
  return SPECIALTIES.map((s) => {
    const tier = specTier(p, s.id);
    const progress = s.progress(p);
    return {
      id: s.id,
      name: s.name,
      how: s.how,
      tier,
      progress: Math.floor(progress),
      next: tier < 3 ? s.tiers[tier] : null,
      from: tier > 0 ? s.tiers[tier - 1] : 0,
      perk: tier > 0 ? s.perks[tier - 1] : null,
      nextPerk: tier < 3 ? s.perks[tier] : null,
      ready:
        s.id === "combat_medic" && tier > 0
          ? now - (p.dressingAt ?? 0) >= SPECIALTY.dressingCooldownMs
          : s.id === "devils_advocate" && tier > 0
            ? !!p.jailUntil && p.jailUntil > now && !p.custodyCase && p.appealedFor !== p.jailUntil
            : null,
    };
  });
}

/** Writes down newly reached tiers and announces them. Called after every action. */
export function specialtyUps(p: Player): GameEvent[] {
  const events: GameEvent[] = [];
  const known = p.specs ?? {};
  const next: Record<string, number> = { ...known };
  for (const s of SPECIALTIES) {
    const t = specTier(p, s.id);
    if (t > (known[s.id] ?? 0)) {
      next[s.id] = t;
      events.push({ tone: "story", text: `Specialty: ${s.name} ${"I".repeat(t)}. ${s.perks[t - 1]}`, action: { label: "See", target: "tab:profile" } });
    }
  }
  if (events.length) p.specs = next;
  return events;
}

// ── The active ones ────────────────────────────────────────────────────────

/** Combat medic: patch yourself up, no medkit needed. */
export function fieldDressing(p: Player, maxHp: number, inClinic: boolean, now: number): GameEvent[] {
  const t = specTier(p, "combat_medic");
  if (!t) throw new GameError("You don't know how. Work as a doctor and as a soldier.");
  if (inClinic) throw new GameError("The clinic is already looking after you.");
  if (p.hp >= maxHp) throw new GameError("You're not hurt.");
  const wait = SPECIALTY.dressingCooldownMs - (now - (p.dressingAt ?? 0));
  if (wait > 0) throw new GameError(`Your kit needs restocking. Try again in ${Math.ceil(wait / 60_000)} minutes.`);
  const heal = SPECIALTY.dressingHp[t - 1];
  p.hp = Math.min(maxHp, p.hp + heal);
  p.dressingAt = now;
  return [{ tone: "good", text: `You clean the wound and strap it tight, the way the army taught you. +${heal} health.` }];
}

/** Devil's advocate: argue your own sentence down, once per sentence. */
export function argueSentence(p: Player, now: number): GameEvent[] {
  const t = specTier(p, "devils_advocate");
  if (!t) throw new GameError("You don't know the law well enough. Work in the Courts.");
  if (!p.jailUntil || p.jailUntil <= now) throw new GameError("You're not serving a sentence.");
  if (p.custodyCase) throw new GameError("You haven't been sentenced yet. Your trial comes first.");
  if (p.appealedFor === p.jailUntil) throw new GameError("You've already argued this one.");
  const cut = SPECIALTY.appeal[t - 1];
  const left = p.jailUntil - now;
  p.jailUntil = now + Math.round(left * (1 - cut));
  p.appealedFor = p.jailUntil;
  return [{ tone: "good", text: `You file your own appeal and quote the statute back at the judge. ${Math.round(cut * 100)}% of your time is cut.` }];
}

/** Multipliers other systems apply. */
export const clinicFactor = (p: Player) => 1 - (specTier(p, "hard_as_nails") ? SPECIALTY.clinicCut[specTier(p, "hard_as_nails") - 1] : 0);
export const travelFactor = (p: Player) => 1 - (specTier(p, "globetrotter") ? SPECIALTY.travelCut[specTier(p, "globetrotter") - 1] : 0);
export const launderFactor = (p: Player) => 1 - (specTier(p, "money_mind") ? SPECIALTY.launderCut[specTier(p, "money_mind") - 1] : 0);
export const roleBonus = (p: Player, id: "wheelman" | "private_eye") => (specTier(p, id) ? SPECIALTY.roleBonus[specTier(p, id) - 1] : 0);

/** Private eye: how much of the robber's name you've worked out. */
export function robberLead(p: Player, name: string): string | null {
  const t = specTier(p, "private_eye");
  if (!t || !name) return null;
  if (t >= 3) return name;
  const shown = t === 1 ? 1 : 3;
  return `${name.slice(0, shown)}${"•".repeat(Math.max(0, name.length - shown))}`;
}
