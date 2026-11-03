// The only shape of player data that ever leaves the server.
// Hidden stats are converted into words here and never included as numbers.

import { BALANCE, maxEnergy, regenMs } from "./balance";
import { DISTRICT_BY_ID, DISTRICTS } from "./content/districts";
import { ITEMS, ITEM_BY_ID } from "./content/items";
import { JOBS } from "./content/jobs";
import { NPCS } from "./content/npcs";
import { PATHS, promotionHint, rankTitle } from "./content/paths";
import { CHAPTERS } from "./content/story";
import { SCHOOL_BY_ID, SCHOOLS } from "./content/schools";
import { COUNTRIES, COUNTRY_BY_ID, TRAVEL_MODES, tripCost, tripMs } from "./content/world";
import type { Arrival, CountryId, TravelMode } from "./types";
import { GUT_READS } from "./combat";
import { PROPERTIES } from "./content/properties";
import { countryOf, dayKey, propertyIncome, FIGHT_ENERGY, inHospital, itemPrice, jobLock, scout } from "./engine";
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
  schools: {
    id: string;
    name: string;
    path: PathId;
    pathName: string;
    city: string;
    country: string;
    tuition: number;
    dean: string;
    description: string;
    /** Why the player can't apply right now, or null. */
    locked: string | null;
    /** Contact currently offering to vouch (free application). */
    vouchedBy: string | null;
  }[];
  application: {
    schoolName: string;
    dean: string;
    pathName: string;
    status: "pending" | "accepted" | "rejected";
    msLeft: number;
    vouchedBy: string | null;
    paid: number;
    reason: string | null;
  } | null;
  daily: {
    streak: number;
    canClaim: boolean;
    /** Day of the 7-day reward cycle the next claim would be. */
    nextDay: number;
    contracts: { id: string; label: string; target: number; progress: number; reward: number; claimed: boolean }[];
  };
  gym: { fee: number; energy: number };
  inbox: { items: import("./types").Notice[]; unread: number };
  /** Crimes the player witnessed and can still report. */
  sightings: { caseId: string; text: string; until: number }[];
  properties: {
    id: string;
    name: string;
    icon: string;
    description: string;
    price: number;
    incomePerHour: number;
    city: string;
    owned: boolean;
    /** Income waiting to be collected. */
    waiting: number;
    buyable: boolean;
  }[];
  crewId: string | null;
  location: { country: CountryId; countryName: string; city: string; color: string; laws: string };
  travel: { to: CountryId; city: string; mode: TravelMode; msLeft: number; totalMs: number } | null;
  arrival: Arrival | null;
  countries: {
    id: CountryId;
    name: string;
    capital: string;
    mood: string;
    laws: string;
    color: string;
    here: boolean;
    /** Your home in this country. */
    home: string;
    schools: { name: string; career: string; open: boolean }[];
    routes: { mode: TravelMode; name: string; cost: number; minutes: number; risk: string }[];
  }[];
  /** Rank progress for the career ladder. */
  ladder: { ranks: string[]; current: number; graduationRank: number | null } | null;
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

  const here = countryOf(p);
  const localDistrict = (id: DistrictId) => DISTRICT_BY_ID[id].country === here;
  const jobs: JobView[] = JOBS.filter((j) => (j.path ? j.path === p.path : localDistrict(j.district))).map((j) => ({
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
    bank: Math.floor(p.bank),
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
    daily: (() => {
      const d = p.daily;
      const today = dayKey(now);
      const yesterday = dayKey(now - 86_400_000);
      const streakAlive = d?.lastClaim === today || d?.lastClaim === yesterday;
      const next = (streakAlive ? (d?.streak ?? 0) : 0) + (d?.lastClaim === today ? 0 : 1);
      return {
        streak: streakAlive ? d?.streak ?? 0 : 0,
        canClaim: d?.lastClaim !== today,
        nextDay: ((Math.max(1, next) - 1) % 7) + 1,
        contracts: (d?.contracts ?? []).map(({ id, label, target, progress, reward, claimed }) => ({ id, label, target, progress, reward, claimed })),
      };
    })(),
    gym: { fee: itemPrice(p, BALANCE.gym.fee), energy: BALANCE.gym.energy },
    inbox: { items: p.inbox ?? [], unread: (p.inbox ?? []).filter((n) => !n.read).length },
    sightings: (p.sightings ?? []).filter((s) => s.until > now).map((s) => ({ caseId: s.caseId, text: s.text, until: s.until })),
    properties: PROPERTIES.filter((pr) => pr.country === here || p.properties?.[pr.id]).map((pr) => ({
      id: pr.id,
      name: pr.name,
      icon: pr.icon,
      description: pr.description,
      price: pr.price,
      incomePerHour: pr.incomePerHour,
      city: COUNTRY_BY_ID[pr.country].capital,
      owned: !!p.properties?.[pr.id],
      waiting: p.properties?.[pr.id] ? propertyIncome(pr.id, p.properties[pr.id], now) : 0,
      buyable: pr.country === here && !p.properties?.[pr.id],
    })),
    crewId: p.crewId ?? null,
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
    districts: DISTRICTS.filter((d) => d.country === here && (!d.visible || d.visible(p))).map((d) => ({
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
      price: itemPrice(p, i.price),
      description: i.description,
      kind: i.kind,
      owned:
        i.kind === "housing"
          ? p.housing >= (i.housing ?? 0)
          : (i.kind === "weapon" || i.kind === "armor") && !!p.inventory[i.id],
    })),
    fights: NPCS.filter((n) => localDistrict(n.district)).map((n) => ({
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
    schools: SCHOOLS.map((sc) => {
      const homeSchool = PATHS[sc.path].school === sc.id;
      const playerVouch = homeSchool ? p.vouches?.find((v) => v.path === sc.path) : undefined;
      const vouch = (p.offers.includes(sc.path) && homeSchool) || !!playerVouch;
      let locked = p.path
        ? "You already have a career."
        : p.application?.status === "pending"
          ? "You have an application under review."
          : (p.applyCooldownUntil ?? 0) > now
            ? "Admissions won't see you again so soon."
            : playerVouch
              ? (sc.requirements(p)?.startsWith("Tuition") ? null : sc.requirements(p))
              : vouch
                ? null
                : sc.requirements(p) ?? (p.bank < sc.tuition ? `Save $${sc.tuition} in the bank for tuition.` : null);
      if (p.path === sc.path) locked = "You're already in this career.";
      else if (!locked && sc.country !== here) locked = `In ${sc.city}, ${COUNTRY_BY_ID[sc.country].name}. Travel there to apply in person.`;
      return {
        id: sc.id,
        name: sc.name,
        path: sc.path,
        pathName: PATHS[sc.path].name,
        city: sc.city,
        country: COUNTRY_BY_ID[sc.country].name,
        tuition: sc.tuition,
        dean: sc.dean,
        description: sc.description,
        locked,
        vouchedBy: playerVouch ? playerVouch.by : vouch ? PATHS[sc.path].contact : null,
      };
    }),
    application: p.application
      ? {
          schoolName: SCHOOL_BY_ID[p.application.school].name,
          dean: SCHOOL_BY_ID[p.application.school].dean,
          pathName: PATHS[p.application.path].name,
          status: p.application.status,
          msLeft: Math.max(0, p.application.decideAt - now),
          vouchedBy: p.application.vouchedBy,
          paid: p.application.paid,
          reason: p.application.reason ?? null,
        }
      : null,
    location: {
      country: here,
      countryName: COUNTRY_BY_ID[here].name,
      city: COUNTRY_BY_ID[here].capital,
      color: COUNTRY_BY_ID[here].color,
      laws: COUNTRY_BY_ID[here].laws,
    },
    travel: p.travel
      ? {
          to: p.travel.to,
          city: COUNTRY_BY_ID[p.travel.to].capital,
          mode: p.travel.mode,
          msLeft: Math.max(0, p.travel.arriveAt - now),
          totalMs: p.travel.arriveAt - p.travel.departAt,
        }
      : null,
    // The incident stays secret until arrival.
    arrival: p.arrival ?? null,
    countries: COUNTRIES.map((c) => ({
      id: c.id,
      name: c.name,
      capital: c.capital,
      mood: c.mood,
      laws: c.laws,
      color: c.color,
      here: c.id === here,
      home: BALANCE.housing[c.id === here ? p.housing : (p.homes?.[c.id] ?? 0)].name,
      schools: [
        ...SCHOOLS.filter((sc) => sc.country === c.id).map((sc) => ({ name: sc.name, career: PATHS[sc.path].name, open: true })),
        ...c.plannedSchools.map((ps) => ({ ...ps, open: false })),
      ],
      routes:
        c.id === here
          ? []
          : TRAVEL_MODES.map((m) => ({
              mode: m.id,
              name: m.name,
              cost: tripCost(here, c.id, m.id),
              minutes: Math.round(tripMs(here, c.id, m.id) / 60_000),
              risk: m.risk,
            })),
    })),
    ladder: p.path
      ? { ranks: PATHS[p.path].ranks, current: p.rank, graduationRank: PATHS[p.path].graduationRank ?? null }
      : null,
    unreadChapter:
      CHAPTERS.find((c) => p.flags.includes(`story:${c.id}`) && !p.flags.includes(`read:${c.id}`))?.id ?? null,
  };
}
