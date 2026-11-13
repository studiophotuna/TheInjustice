import { favorsView, lookOf } from "./favors";
import { leadsView } from "./leads";
import { casinoView } from "./casino";
import { passView } from "./pass";
import { disposalView, promoProgress } from "./daily_life";
import { veteranFactor } from "./career";
import { specialtiesView } from "./specialties";
import { promoChoiceView } from "./career";
import { encounterView } from "./encounters";
import { playerMaxHp, woundHint } from "./wounds";
import { careerGapBlock, careerRecordView } from "./career";
import { publicProfile } from "./profile";
import { threatView } from "./hit";
import { GEAR, gearView, usesLeft } from "./gear";
import { marketView } from "./drugs";
import { tutorialView } from "./tutorial";
import { launderOptions } from "./money";
import { cityEvent, eventEffects } from "./events";
import { streetTitle } from "./titles";
// The only shape of player data that ever leaves the server.
// Hidden stats are converted into words here and never included as numbers.

import { BALANCE, maxEnergy, regenMs } from "./balance";
import { DISTRICT_BY_ID, DISTRICTS } from "./content/districts";
import { ITEMS, ITEM_BY_ID } from "./content/items";
import { JOBS, revealed } from "./content/jobs";
import { GRADE_WORDS } from "./content/ladders";
import { NPCS } from "./content/npcs";
import { PATHS, promotionHint, rankTitle } from "./content/paths";
import { familyGate, ratOf } from "./family";
import { sellableGear } from "./military";
import { CHAPTERS, ENDING_CHAPTERS } from "./content/story";
import { SCHOOL_BY_ID, SCHOOLS } from "./content/schools";
import { COUNTRIES, COUNTRY_BY_ID, TRAVEL_MODES, tripCost, tripMs } from "./content/world";
import { docksView, driveRoutes } from "./vehicles";
import { stashView } from "./stash";
import { dogView } from "./dogs";
import { MECH, servicesFor } from "./mechanic";
import { backgroundView } from "./backgrounds";
import { insideView } from "./prisonlife";
import { fugitiveView } from "./fugitive";
import type { Arrival, CountryId, TravelMode } from "./types";
import { PROPERTIES } from "./content/properties";
import { countryOf, dayKey, propertyIncome, FIGHT_ENERGY, hurtLimit, inHospital, itemPrice, jobLock } from "./engine";
import { describe, integrityHint } from "./stats";
import type { DistrictId, LogEntry, PathId, Player } from "./types";
import { canInspect, canWatch, INSPECT, WATCH } from "./protect";
import { endingView } from "./ending";

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
  /** The rank a career job belongs to (cover art shows that level of the career). */
  level: number;
  /** How hard a hidden job is, in words. */
  grade?: string;
  /** Turned up recently and not tried yet. */
  fresh?: boolean;
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
  /** Time until the next quick boost, and boosts left today. */
  boostMs: number;
  boostsLeft: number;
  heatLabel: "Clean" | "Noticed" | "Wanted" | "Most wanted";
  reputation: number;
  housing: string;
  /** Your home tier in this city: 0 means you haven't bought a place here. */
  homeHere: number;
  inventory: { id: string; name: string; icon: string; count: number; usable: boolean }[];
  gear: ReturnType<typeof import("./gear").gearView>;
  feel: ReturnType<typeof describe> & { conscience: string };
  path: {
    id: PathId;
    name: string;
    side: string;
    rank: string;
    contact: string;
    contactId: string;
    promotion: string | null;
    family: { made: boolean; madeBy: string | null; rat: { crewName: string; until: number } | null } | null;
  } | null;
  offers: { id: PathId; name: string; side: string; blurb: string; contact: string; contactId: string; lines: string[]; wait: string | null }[];
  districts: { id: DistrictId; name: string; tagline: string; locked: string | null }[];
  jobs: JobView[];
  recommendedJobId: string | null;
  shop: { id: string; name: string; icon: string; price: number; description: string; kind: string; owned: boolean; have: number }[];
  fights: {
    id: string;
    name: string;
    icon: string;
    description: string;
    district: DistrictId;
    locked: string | null;
    /** How they look: a word for their build, never a number or your odds. */
    build: string;
    /** The most cash they might have on them. */
    carries: number;
    /** How many times you've beaten them. */
    beaten: number;
  }[];
  fightEnergy: number;
  /** Your street-fight record: every win, and this season's. */
  fightRecord: { wins: number; season: number };
  /** Below this much health you're too hurt to fight (lower on painkillers). */
  hurtLimit: number;
  assessment: { available: boolean; reason: string };
  flags: string[];
  log: LogEntry[];
  dead: { at: number; cause: string } | null;
  deaths: number;
  chapters: { id: string; title: string; teaser: string; unlocked: boolean; read: boolean }[];
  /** Leads: optional missions that add evidence to the board. */
  leads: ReturnType<typeof leadsView>;
  /** What you did with the case, once it's whole (see ending.ts). */
  ending: ReturnType<typeof endingView>;
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
    /** In the city the player is in. */
    here: boolean;
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
  /** Past careers, legacies, and whether you can leave the current one. */
  careerRecord: ReturnType<typeof import("./career").careerRecordView>;
  woundHint: string | null;
  /** Work done toward your next rank (stats stay words). */
  promo: ReturnType<typeof promoProgress>;
  /** Your contacts' ids (details come with People). */
  contacts: string[];
  /** Bank statement, newest first. */
  ledger: NonNullable<Player["ledger"]>;
  /** After a hit: what to do with the body. */
  disposal: ReturnType<typeof disposalView>;
  /** Lasting skills earned across careers. */
  specialties: ReturnType<typeof specialtiesView>;
  /** A promotion waiting for you to choose how it changed you. */
  promoChoice: ReturnType<typeof promoChoiceView>;
  /** Your life so far, oldest first, and when it started. */
  journal: { at: number; kind: string; text: string }[];
  startedAt: number;
  /** A regular who stopped you with a choice. */
  encounter: ReturnType<typeof encounterView>;
  /** Doctors: your surgery fee, if you're operating. */
  surgeryFee: number | null;
  /** Alert kinds the player turned off. */
  pushOff: string[];
  /** Your intro and photo. */
  profile: { bio: string | null; photo: string | null };
  /** Favors and the looks bought with them. */
  favors: ReturnType<typeof favorsView>;
  pass: ReturnType<typeof passView>;
  casino: ReturnType<typeof casinoView>;
  /** Ask for a date of birth before playing on. */
  needsBirthDate: boolean;
  ageBlocked: boolean;
  look: ReturnType<typeof lookOf>;
  /** Someone casing you, your bodyguards, safe house and morgue time (never who). */
  threat: ReturnType<typeof import("./hit").threatView>;
  /** Army gear offered to you on the black market. */
  gunOffers: { id: string; sellerId: string; sellerName: string; itemId: string; itemName: string; icon: string; price: number }[];
  /** Soldiers: army gear you could sell. */
  sellableGear: { id: string; name: string; icon: string }[];
  /** Crimes the player witnessed and can still report. */
  sightings: { caseId: string; text: string; until: number }[];
  /** Held for trial or serving a sentence. */
  jail: { until: number; reason: string; custodyCase: string | null; bail: number } | null;
  /** Out on bail: the case still waiting for a verdict. */
  onBail: string | null;
  /** Nobody can attack or mug you until then (survived a fight). */
  immuneUntil: number;
  /** The drug market here (prices, what you carry, what you can cook). */
  market: ReturnType<typeof marketView>;
  /** First-day checklist, until it's finished or hidden. */
  tutorial: ReturnType<typeof tutorialView>;
  /** Dirty money on hand (from crime) and ways to clean it. */
  dirty: number;
  launder: ReturnType<typeof launderOptions>;
  /** What's going on in your city this hour. */
  event: { id: string; name: string; text: string; endsAt: number; effects: string[] } | null;
  /** What the street calls you. */
  streetTitle: string | null;
  /** Your lawyer on retainer, if any. */
  retainer: { name: string; until: number } | null;
  /** Doctors: taking back-alley patients. */
  backAlley: boolean;
  loans: import("./types").Loan[];
  loanOffers: NonNullable<Player["loanOffers"]>;
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
    closedUntil: number | null;
    /** Passed a fire inspection, good until. */
    inspectedUntil: number | null;
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
    drives: ReturnType<typeof driveRoutes>;
  }[];
  /** Your cars, the lot, and the smuggling fences in this city. */
  docks: ReturnType<typeof docksView>;
  /** What's hidden at home here. */
  stash: ReturnType<typeof stashView>;
  /** Your guard dog here, and the breeds for sale. */
  dog: ReturnType<typeof dogView>;
  /** On the run after an escape. */
  fugitive: ReturnType<typeof fugitiveView>;
  /** Life inside, while behind bars. */
  inside: ReturnType<typeof insideView>;
  /** Who you were before prison, and the career it points to. */
  background: ReturnType<typeof backgroundView>;
  /** Hackers: your record-scrub service. */
  scrub: { open: boolean; fee: number; jobs: number } | null;
  /** Vigilantes: watching homes. Firefighters: inspecting businesses. */
  watchService: { open: boolean; fee: number; jobs: number } | null;
  inspectService: { open: boolean; fee: number; jobs: number } | null;
  /** Your home here is watched until. */
  homeWatchedUntil: number | null;
  /** Mechanics: your garage for customers. */
  garage: { open: boolean; rate: number; earned: number; jobs: number; services: string[]; next: { name: string; rank: string } | null } | null;
  /** Rank progress for the career ladder. */
  ladder: { ranks: string[]; current: number; graduationRank: number | null } | null;
}

function heatLabel(heat: number): PublicView["heatLabel"] {
  if (heat < BALANCE.cleanRecordHeat) return "Clean";
  if (heat < 25) return "Noticed";
  if (heat < 50) return "Wanted";
  return "Most wanted";
}

/** What a street opponent's build looks like, from muscle and bulk. A description, not odds. */
export function buildWord(bulk: number): string {
  if (bulk < 25) return "Scrawny";
  if (bulk < 40) return "Rough";
  if (bulk < 55) return "Solid";
  if (bulk < 70) return "Heavy";
  return "Built like a door";
}

export function toView(p: Player, now: number): PublicView {
  const maxE = maxEnergy(p.housing);
  const rMs = regenMs(p.housing);
  const missing = maxE - p.energy;
  const nextEnergyMs = missing > 0 ? Math.ceil((1 - (p.energy % 1)) * rMs) : 0;
  const lockedDistrict = Object.fromEntries(DISTRICTS.map((d) => [d.id, d.locked(p)]));

  const here = countryOf(p);
  const localDistrict = (id: DistrictId) => DISTRICT_BY_ID[id].country === here;
  // Work above your rank isn't shown at all: you find out about it when you get there.
  const jobs: JobView[] = JOBS.filter(
    (j) => (j.path ? j.path === p.path && (j.minRank ?? 1) <= p.rank : localDistrict(j.district)) && revealed(p, j),
  ).filter((j) => !j.spent?.(p)).map((j) => ({
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
    level: j.minRank ?? 1,
    ...(j.grade ? { grade: GRADE_WORDS[j.grade] } : {}),
    ...(j.reveal && !p.jobCounts[j.id] ? { fresh: true } : {}),
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
    maxHp: playerMaxHp(p),
    woundHint: woundHint(p),
    encounter: encounterView(p, now),
    journal: p.journal ?? [],
    specialties: specialtiesView(p, now),
    promo: promoProgress(p, veteranFactor(p)),
    contacts: p.contacts ?? [],
    ledger: p.ledger ?? [],
    disposal: disposalView(p, now),
    promoChoice: promoChoiceView(p),
    startedAt: p.createdAt,
    surgeryFee: p.surgeryFee ?? null,
    pushOff: p.push?.off ?? [],
    hospitalMs: hospital ? p.hospitalUntil - now : 0,
    fullMs: Math.max(0, p.fullUntil - now),
    boostMs: Math.max(0, (p.boostUntil ?? 0) - now),
    boostsLeft: Math.max(0, BALANCE.boost.perDay - (p.boosts?.day === new Date(now).toISOString().slice(0, 10) ? p.boosts.n : 0)),
    heatLabel: heatLabel(p.heat),
    reputation: p.reputation,
    housing: BALANCE.housing[p.housing].name,
    homeHere: p.housing,
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
    threat: threatView(p, null, now),
    profile: publicProfile(p),
    favors: favorsView(p),
    pass: passView(p, now),
    casino: casinoView(p, now),
    needsBirthDate: !p.birthDate && !p.regular,
    ageBlocked: !!p.ageBlocked,
    look: lookOf(p),
    careerRecord: careerRecordView(p, now),
    gunOffers: (p.gunOffers ?? []).map((o) => ({ ...o, itemName: ITEM_BY_ID[o.itemId]?.name ?? o.itemId, icon: ITEM_BY_ID[o.itemId]?.icon ?? "" })),
    sellableGear: sellableGear(p).map((i) => ({ id: i.id, name: i.name, icon: i.icon })),
    jail:
      p.custodyCase || (p.jailUntil ?? 0) > now
        ? { until: p.jailUntil ?? now, reason: p.jailReason ?? "Behind bars.", custodyCase: p.custodyCase ?? null, bail: p.bailAmount ?? 0 }
        : null,
    onBail: p.onBail ?? null,
    dirty: p.dirty ?? 0,
    market: marketView(p, now),
    tutorial: tutorialView(p),
    launder: launderOptions(p, now),
    event: (() => {
      const e = cityEvent(countryOf(p), now);
      return e ? { id: e.id, name: e.name, text: e.text, endsAt: e.endsAt, effects: eventEffects(e) } : null;
    })(),
    streetTitle: streetTitle(p),
    retainer: p.retainer && p.retainer.until > now ? { name: p.retainer.name, until: p.retainer.until } : null,
    backAlley: !!p.backAlley,
    loans: (p.loans ?? []).filter((l) => l.status === "active"),
    loanOffers: p.loanOffers ?? [],
    immuneUntil: (p.immuneUntil ?? 0) > now ? p.immuneUntil! : 0,
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
      closedUntil: (p.closed?.[pr.id] ?? 0) > now ? p.closed![pr.id] : null,
      inspectedUntil: (p.inspected?.[pr.id] ?? 0) > now ? p.inspected![pr.id] : null,
      buyable: pr.country === here && !p.properties?.[pr.id],
    })),
    crewId: p.crewId ?? null,
    gear: gearView(p, now),
    inventory: Object.entries(p.inventory)
      .filter(([id, n]) => n > 0 && ITEM_BY_ID[id].kind !== "weapon" && ITEM_BY_ID[id].kind !== "armor")
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
          promotion: familyGate(p, p.rank + 1) && p.rank < PATHS[p.path].ranks.length ? `The family: ${familyGate(p, p.rank + 1)}` : promotionHint(p),
          family:
            p.path === "enforcer"
              ? { made: !!p.family?.madeAt, madeBy: p.family?.madeBy ?? null, rat: ratOf(p, now) ? { crewName: p.family!.rat!.crewName, until: p.family!.rat!.until } : null }
              : null,
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
      wait: careerGapBlock(p, now),
    })),
    districts: DISTRICTS.filter((d) => d.country === here && (!d.visible || d.visible(p))).map((d) => ({
      id: d.id,
      name: d.name,
      tagline: d.tagline,
      locked: lockedDistrict[d.id],
    })),
    jobs,
    recommendedJobId: doable[0]?.id ?? null,
    shop: ITEMS.filter((i) => !i.issued && !i.contraband).map((i) => ({
      id: i.id,
      name: i.name,
      icon: i.icon,
      price: itemPrice(p, i.price),
      description: i.description,
      kind: i.kind,
      owned:
        i.kind === "housing"
          ? p.housing >= (i.housing ?? 0)
          : (i.kind === "weapon" || i.kind === "armor") && (p.inventory[i.id] ?? 0) >= GEAR.maxOwned,
      /** Weapons and armor: how many the player owns (the one in use plus spares). */
      have: i.kind === "weapon" || i.kind === "armor" ? (p.inventory[i.id] ?? 0) : 0,
    })),
    fights: NPCS.filter((n) => localDistrict(n.district)).map((n) => ({
      id: n.id,
      name: n.name,
      icon: n.icon,
      description: n.description,
      district: n.district,
      locked: lockedDistrict[n.district],
      build: buildWord(n.strength + n.toughness),
      carries: n.cash[1],
      beaten: p.jobCounts[`beat:${n.id}`] ?? 0,
    })),
    fightEnergy: FIGHT_ENERGY,
    fightRecord: { wins: p.jobCounts["fight:win"] ?? 0, season: p.season?.wins ?? 0 },
    hurtLimit: hurtLimit(p, now),
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
    leads: leadsView(p),
    ending: endingView(p, now),
    chapters: [...CHAPTERS, ...ENDING_CHAPTERS.filter((c) => p.caseEnding && c.id === `ending_${p.caseEnding.choice}`)].map((c) => ({
      id: c.id,
      title: c.title,
      teaser: c.teaser,
      unlocked: p.flags.includes(`story:${c.id}`),
      read: p.flags.includes(`read:${c.id}`),
    })),
    schools: SCHOOLS.map((sc) => {
      const playerVouch = p.vouches?.find((v) => v.path === sc.path);
      const vouch = p.offers.includes(sc.path) || !!playerVouch;
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
        here: sc.country === here,
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
          : TRAVEL_MODES.filter((m) => m.id !== "car").map((m) => ({
              mode: m.id,
              name: m.name,
              cost: tripCost(here, c.id, m.id),
              minutes: Math.round(tripMs(here, c.id, m.id) / 60_000),
              risk: m.risk,
            })),
      drives: c.id === here ? [] : driveRoutes(p, here, c.id),
    })),
    docks: docksView(p, here, now),
    stash: stashView(p),
    dog: dogView(p, now),
    background: backgroundView(p),
    inside: insideView(p, now),
    fugitive: fugitiveView(p, now),
    scrub: p.path === "hacker" && p.rank >= 3 ? { open: !!p.scrubService?.open, fee: p.scrubService?.fee ?? 500, jobs: p.scrubService?.jobs ?? 0 } : null,
    watchService: canWatch(p) ? { open: !!p.watchService?.open, fee: p.watchService?.fee ?? WATCH.defaultFee, jobs: p.watchService?.jobs ?? 0 } : null,
    inspectService: canInspect(p) ? { open: !!p.inspectService?.open, fee: p.inspectService?.fee ?? INSPECT.defaultFee, jobs: p.inspectService?.jobs ?? 0 } : null,
    homeWatchedUntil: (p.homeWatchUntil ?? 0) > now ? p.homeWatchUntil! : null,
    garage:
      p.path === "mechanic" && p.rank >= 1
        ? {
            open: !!p.garageService?.open,
            rate: p.garageService?.rate ?? 1,
            earned: p.garageService?.earned ?? 0,
            jobs: p.garageService?.jobs ?? 0,
            services: servicesFor(p).map((s) => MECH.services[s].name),
            next: (() => {
              const n = Object.values(MECH.services).find((s) => s.rank > p.rank);
              return n ? { name: n.name, rank: PATHS.mechanic.ranks[n.rank - 1] } : null;
            })(),
          }
        : null,
    ladder: p.path
      ? { ranks: PATHS[p.path].ranks, current: p.rank, graduationRank: PATHS[p.path].graduationRank ?? null }
      : null,
    unreadChapter:
      CHAPTERS.find((c) => p.flags.includes(`story:${c.id}`) && !p.flags.includes(`read:${c.id}`))?.id ?? null,
  };
}
