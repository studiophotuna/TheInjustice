// The only shape of player data that ever leaves the server.
// Hidden stats are converted into words here and never included as numbers.

import { BALANCE, maxEnergy, regenMs } from "./balance";
import { DISTRICTS } from "./content/districts";
import { ITEMS, ITEM_BY_ID } from "./content/items";
import { JOBS } from "./content/jobs";
import { NPCS } from "./content/npcs";
import { PATHS, promotionHint, rankTitle } from "./content/paths";
import { CHAPTERS } from "./content/story";
import { GUT_READS } from "./combat";
import { FIGHT_ENERGY, inHospital, jobLock, scout } from "./engine";
import { describe, integrityHint } from "./stats";
import type { DistrictId, LogEntry, PathId, Player } from "./types";

export interface JobView {
  id: string;
  name: string;
  district: DistrictId;
  tag: string;
  energy: number;
  pay: [number, number];
  risky: boolean;
  crime: boolean;
  locked: string | null;
  pathJob: boolean;
}

export interface PublicView {
  id: string;
  name: string;
  now: number;
  cash: number;
  bank: number;
  hasBankAccount: boolean;
  energy: number;
  maxEnergy: number;
  /** ms until the next energy point, or 0 when full */
  nextEnergyMs: number;
  /** ms until energy is full */
  energyFullMs: number;
  energyRegenMs: number;
  hp: number;
  maxHp: number;
  hospitalMs: number;
  fullMs: number;
  heatLabel: "Clean" | "Noticed" | "Wanted" | "Most wanted";
  reputation: number;
  housing: string;
  inventory: { id: string; name: string; icon: string; count: number; usable: boolean }[];
  feel: ReturnType<typeof describe> & { conscience: string };
  path: {
    id: PathId;
    name: string;
    side: string;
    rank: string;
    contact: string;
    contactId: string;
    promotion: string | null;
  } | null;
  offers: { id: PathId; name: string; side: string; blurb: string; contact: string; contactId: string; lines: string[] }[];
  districts: { id: DistrictId; name: string; tagline: string; locked: string | null }[];
  jobs: JobView[];
  recommendedJobId: string | null;
  shop: { id: string; name: string; icon: string; price: number; description: string; kind: string; owned: boolean }[];
  fights: {
    id: string;
    name: string;
    icon: string;
    description: string;
    district: DistrictId;
    read: string;
    /** 0 (easy) … 4 (deadly), from the noisy gut read, not the true odds. */
    danger: number;
    locked: string | null;
  }[];
  fightEnergy: number;
  assessment: { available: boolean; reason: string };
  flags: string[];
  log: LogEntry[];
  dead: { at: number; cause: string } | null;
  deaths: number;
  chapters: { id: string; title: string; teaser: string; unlocked: boolean; read: boolean }[];
  /** First unlocked chapter the player hasn't read yet. */
  unreadChapter: string | null;
}

function heatLabel(heat: number): PublicView["heatLabel"] {
  if (heat < BALANCE.cleanRecordHeat) return "Clean";
  if (heat < 25) return "Noticed";
  if (heat < 50) return "Wanted";
  return "Most wanted";
}

export function toView(p: Player, now: number): PublicView {
  const maxE = maxEnergy(p.housing);
  const rMs = regenMs(p.housing);
  const missing = maxE - p.energy;
  const nextEnergyMs = missing > 0 ? Math.ceil((1 - (p.energy % 1)) * rMs) : 0;
  const lockedDistrict = Object.fromEntries(DISTRICTS.map((d) => [d.id, d.locked(p)]));

  const jobs: JobView[] = JOBS.filter((j) => !j.path || j.path === p.path).map((j) => ({
    id: j.id,
    name: j.name,
    district: j.district,
    tag: j.tag,
    energy: j.energy,
    pay: j.pay,
    risky: !!j.risk,
    crime: (j.integrity ?? 0) < 0 || (j.heat ?? 0) > 0,
    locked: jobLock(p, j),
    pathJob: !!j.path,
  }));

  // Best honest-ish money per energy among jobs doable now; path jobs first.
  const doable = jobs.filter((j) => !j.locked && j.energy <= p.energy && !j.risky && !j.crime);
  doable.sort(
    (a, b) =>
      Number(b.pathJob) - Number(a.pathJob) ||
      (b.pay[0] + b.pay[1]) / b.energy - (a.pay[0] + a.pay[1]) / a.energy,
  );

  const hospital = inHospital(p, now);
  const cooldownLeft = BALANCE.assessmentCooldownMs - (now - p.lastAssessmentAt);

  return {
    id: p.id,
    name: p.name,
    now,
    cash: p.cash,
    bank: p.bank,
    hasBankAccount: p.hasBankAccount,
    energy: Math.floor(p.energy),
    maxEnergy: maxE,
    nextEnergyMs,
    energyFullMs: Math.ceil(Math.max(0, missing) * rMs),
    energyRegenMs: rMs,
    hp: Math.floor(p.hp),
    maxHp: BALANCE.hp.max,
    hospitalMs: hospital ? p.hospitalUntil - now : 0,
    fullMs: Math.max(0, p.fullUntil - now),
    heatLabel: heatLabel(p.heat),
    reputation: p.reputation,
    housing: BALANCE.housing[p.housing].name,
    inventory: Object.entries(p.inventory)
      .filter(([, n]) => n > 0)
      .map(([id, count]) => {
        const it = ITEM_BY_ID[id];
        return { id, name: it.name, icon: it.icon, count, usable: it.kind === "food" || it.kind === "medical" };
      }),
    feel: { ...describe(p), conscience: integrityHint(p.stats.integrity) },
    path: p.path
      ? {
          id: p.path,
          name: PATHS[p.path].name,
          side: PATHS[p.path].side,
          rank: rankTitle(p) ?? "",
          contact: PATHS[p.path].contact,
          contactId: PATHS[p.path].contactId,
          promotion: promotionHint(p),
        }
      : null,
    offers: p.offers.map((o) => ({
      id: o,
      name: PATHS[o].name,
      side: PATHS[o].side,
      blurb: PATHS[o].blurb,
      contact: PATHS[o].contact,
      contactId: PATHS[o].contactId,
      lines: PATHS[o].offer,
    })),
    districts: DISTRICTS.filter((d) => d.id !== "precinct_square" || p.path === "police").map((d) => ({
      id: d.id,
      name: d.name,
      tagline: d.tagline,
      locked: lockedDistrict[d.id],
    })),
    jobs,
    recommendedJobId: doable[0]?.id ?? null,
    shop: ITEMS.map((i) => ({
      id: i.id,
      name: i.name,
      icon: i.icon,
      price: i.price,
      description: i.description,
      kind: i.kind,
      owned:
        i.kind === "housing"
          ? p.housing >= (i.housing ?? 0)
          : (i.kind === "weapon" || i.kind === "armor") && !!p.inventory[i.id],
    })),
    fights: NPCS.map((n) => ({
      id: n.id,
      name: n.name,
      icon: n.icon,
      description: n.description,
      district: n.district,
      read: scout(p, n.id, now),
      danger: GUT_READS.indexOf(scout(p, n.id, now) as (typeof GUT_READS)[number]),
      locked: lockedDistrict[n.district],
    })),
    fightEnergy: FIGHT_ENERGY,
    assessment: {
      available: p.assessmentReady && cooldownLeft <= 0,
      reason: !p.assessmentReady
        ? "Doc Mercy only sees patients who've been through the clinic."
        : cooldownLeft > 0
          ? "Doc Mercy is busy. Come back next week."
          : "Doc Mercy will see you now.",
    },
    flags: p.flags.filter((f) => !f.startsWith("declined_")),
    log: p.log,
    dead: p.dead ?? null,
    deaths: p.deaths ?? 0,
    chapters: CHAPTERS.map((c) => ({
      id: c.id,
      title: c.title,
      teaser: c.teaser,
      unlocked: p.flags.includes(`story:${c.id}`),
      read: p.flags.includes(`read:${c.id}`),
    })),
    unreadChapter:
      CHAPTERS.find((c) => p.flags.includes(`story:${c.id}`) && !p.flags.includes(`read:${c.id}`))?.id ?? null,
  };
}
