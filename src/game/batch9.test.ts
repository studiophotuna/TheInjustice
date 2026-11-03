import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { newCity } from "./city";
import { applyAction, createPlayer, tick } from "./engine";
import { family, familyGate, ratOf } from "./family";
import { bringCharges, buyGun, courtMartial, declareMartialLaw, joinPeacekeepers, offerGun, peaceSettle } from "./military";
import { audit } from "./racket";
import { addMember, attackBlock, createCrew, leaveCrew, profileFor } from "./social";
import { claimTurf, declareWar, joinWar } from "./turf";
import type { Player } from "./types";

const T0 = 1_800_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (id: string, name: string) => {
  const p = createPlayer(id, name, T0);
  tick(p, LATER);
  return p;
};
const career = (p: Player, path: Player["path"], rank: number) => {
  p.path = path;
  p.rank = rank;
  return p;
};
const boss = (id: string, name: string, tag: string) => {
  const b = career(mk(id, name), "enforcer", 4);
  b.cash = 1000 + BALANCE.crew.createCost;
  const crew = createCrew(b, `crew-${id}`, `${name} Crew`, tag, LATER);
  crew.vault = 50000;
  return { b, crew };
};

describe("omertà", () => {
  it("a made man who walks out becomes a rat: unmade, unpromotable, and fair game for the old crew", () => {
    const { b, crew } = boss("b", "Boss Bea", "BEA");
    const sal = career(mk("s", "Soldier Sal"), "enforcer", 3);
    addMember(crew, sal, LATER);
    family(sal).madeAt = LATER;
    const mate = career(mk("m", "Mate Max"), "enforcer", 2);
    addMember(crew, mate, LATER);

    leaveCrew(crew, sal, LATER + 1000);
    expect(sal.family?.madeAt).toBeUndefined();
    expect(ratOf(sal, LATER + 2000)?.crewName).toBe("Boss Bea Crew");
    expect(familyGate(sal, 4)).toMatch(/rat/);
    expect(crew.log.some((l) => /Omertà/.test(l.text))).toBe(true);
    expect(profileFor(b, sal, LATER + 2000).rat).toBe(true);

    // Fight protection doesn't apply to the old crew.
    sal.immuneUntil = LATER + 10 * 60_000;
    expect(attackBlock(mk("x", "Stranger"), sal, LATER + 2000)).toMatch(/survived a fight/);
    mate.reputation = 200;
    expect(attackBlock(mate, sal, LATER + 2000)).toBeNull();

    // It blows over after a week.
    expect(ratOf(sal, LATER + 8 * 24 * 60 * 60_000)).toBeNull();
  });

  it("an unmade member or the last one out is no rat", () => {
    const { b, crew } = boss("b", "Boss Bea", "BEA");
    const sal = career(mk("s", "Soldier Sal"), "enforcer", 2);
    addMember(crew, sal, LATER);
    leaveCrew(crew, sal, LATER);
    expect(ratOf(sal, LATER)).toBeNull();
    family(b).madeAt = LATER;
    leaveCrew(crew, b, LATER);
    expect(ratOf(b, LATER)).toBeNull();
  });
});

describe("martial law", () => {
  it("the mayor calls in the army; soldiers who outgun both crews break the war up and arrest everyone", () => {
    const c = newCity("varrow", LATER);
    c.treasury = 1000;
    const mayor = mk("mayor", "Mayor May");
    c.mayor = { id: mayor.id, name: mayor.name, since: LATER };
    const { b: alma, crew: almaCrew } = boss("a", "Alma", "ALM");
    const { b: bruno, crew: brunoCrew } = boss("z", "Bruno", "BRU");
    claimTurf(c, almaCrew, alma, "gutter", LATER);
    declareWar(c, brunoCrew, bruno, "gutter", LATER);
    joinWar(c, alma, "gutter", LATER);

    const soldier = career(mk("s", "Captain Sol"), "military", 6);
    expect(() => joinPeacekeepers(c, soldier, "gutter", LATER)).toThrow(/martial law/);
    declareMartialLaw(c, mayor, LATER);
    expect(c.treasury).toBe(700);
    expect(() => declareMartialLaw(c, mayor, LATER + 1)).toThrow(/already/);
    soldier.stats.strength = soldier.stats.toughness = soldier.stats.agility = 2000;
    joinPeacekeepers(c, soldier, "gutter", LATER);

    const end = LATER + BALANCE.turf.warMs;
    const out = peaceSettle(c, "gutter", [bruno], [alma], [soldier], end);
    expect(out?.[0].text).toMatch(/army moves in/);
    expect(c.turf?.gutter?.crewId).toBe(almaCrew.id); // nobody won
    expect(c.turf?.gutter?.war).toBeNull();
    expect(alma.jailReason).toMatch(/military police/);
    expect(bruno.jailUntil).toBeGreaterThan(end);
    expect(soldier.cash).toBeGreaterThan(0);
  });

  it("a squad that's outgunned changes nothing", () => {
    const c = newCity("varrow", LATER);
    const { b: alma, crew: almaCrew } = boss("a", "Alma", "ALM");
    const { b: bruno, crew: brunoCrew } = boss("z", "Bruno", "BRU");
    claimTurf(c, almaCrew, alma, "gutter", LATER);
    declareWar(c, brunoCrew, bruno, "gutter", LATER);
    bruno.stats.strength = bruno.stats.toughness = 4000;
    const weak = career(mk("s", "Private Pip"), "military", 3);
    expect(peaceSettle(c, "gutter", [bruno], [alma], [weak], LATER + BALANCE.turf.warMs)).toBeNull();
    expect(c.turf?.gutter?.war).not.toBeNull();
  });
});

describe("court-martial", () => {
  it("a soldier convicted in court is busted down two ranks and loses the gear they no longer rate", () => {
    const s = career(mk("s", "Captain Sol"), "military", 6);
    tick(s, LATER + 1);
    expect(s.inventory.machine_gun).toBe(1);
    courtMartial(s, "convicted of mugging", LATER);
    expect(s.rank).toBe(4);
    expect(s.inventory.machine_gun).toBeUndefined();
    expect(s.inventory.combat_armor).toBe(1);
  });

  it("at the bottom it's a dishonorable discharge", () => {
    const s = career(mk("s", "Private Pip"), "military", 2);
    tick(s, LATER + 1);
    courtMartial(s, "conduct unbecoming", LATER);
    expect(s.path).toBeNull();
    expect(s.inventory.service_rifle).toBeUndefined();
  });

  it("an officer's charges stick only if the record is dirty or there are gun sales", () => {
    const officer = career(mk("o", "Lt. Olga"), "military", 5);
    const clean = career(mk("c", "Corporal Clean"), "military", 3);
    const out = bringCharges(officer, clean, LATER);
    expect(out[0].text).toMatch(/throws the charges out/);
    expect(clean.rank).toBe(3);
    const dirty = career(mk("d", "Corporal Dirty"), "military", 3);
    dirty.heat = BALANCE.cleanRecordHeat + 5;
    bringCharges(officer, dirty, LATER);
    expect(dirty.path).toBe("military");
    expect(dirty.rank).toBe(1);
  });
});

describe("army gear on the black market", () => {
  it("a corrupt soldier sells a stolen rifle to the Mafia; internal affairs finds the sale", () => {
    const seller = career(mk("s", "Corporal Crook"), "military", 3);
    const buyer = career(mk("b", "Soldier Sal"), "enforcer", 2);
    buyer.dirty = 500;
    expect(() => offerGun(seller, career(mk("d", "Doc Dee"), "medicine", 3), "army_rifle", 400, LATER)).toThrow(/Only the Mafia/);
    expect(() => offerGun(seller, buyer, "army_lmg", 400, LATER)).toThrow(/access/);
    offerGun(seller, buyer, "army_rifle", 400, LATER);
    expect(buyer.inbox?.[0].text).toMatch(/army rifle/i);
    buyGun(buyer, seller, buyer.gunOffers![0].id, LATER + 1);
    expect(buyer.inventory.army_rifle).toBe(1);
    expect(buyer.dirty).toBe(100);
    expect(seller.dirty).toBe(400);
    expect(seller.gunSales).toHaveLength(1);
    // It's not in the shop.
    expect(() => applyAction(buyer, { type: "buy", itemId: "army_rifle" }, LATER, always(0.5))).toThrow(/isn't for sale/);

    const ia = career(mk("i", "Ines"), "police", BALANCE.racket.audit.minRank);
    const res = audit(ia, seller, [], LATER + 2);
    expect(res.events[0].text).toMatch(/army weapons|caught/i);
    expect(seller.gunSales?.[0].exposed).toBe(true);
  });
});
