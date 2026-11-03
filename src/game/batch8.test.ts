import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { newCity } from "./city";
import { applyAction, createPlayer, issueGear, tick } from "./engine";
import { ceremonyBlock, crewJob, family, familyGate, FAMILY, makeMember } from "./family";
import { canUseForum, closeForum, createForum, FORUM, inviteToForum, removeFromForum } from "./forum";
import { runHeist } from "./heist";
import { standGuard } from "./military";
import { addMember, createCrew, joinCrew, leaveCrew } from "./social";
import { toView } from "./view";
import type { Player } from "./types";

const T0 = 1_800_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (id: string, name: string) => {
  const p = createPlayer(id, name, T0);
  tick(p, LATER);
  return p;
};
const mafia = (id: string, name: string, rank: number) => {
  const p = mk(id, name);
  p.path = "enforcer";
  p.rank = rank;
  return p;
};

describe("the family's rules for Mafia promotions", () => {
  it("you have to be made to become a Made Man, by Kozak's test or your crew leader", () => {
    const soldier = mafia("s", "Soldier Sal", 2);
    expect(familyGate(soldier, 3)).toMatch(/made/);
    // Kozak's test: a one-time contract.
    soldier.stats.nerve = soldier.stats.strength = 400;
    soldier.reputation = 30;
    const out = applyAction(soldier, { type: "job", jobId: "make_bones" }, LATER, always(0.01));
    expect(out.some((e) => /made man/.test(e.text))).toBe(true);
    expect(familyGate(soldier, 3)).toBeNull();
    expect(() => applyAction(soldier, { type: "job", jobId: "make_bones" }, LATER + 60_000, always(0.01))).toThrow(/already made/);
  });

  it("a crew leader can swear in a soldier who has done a crew job", () => {
    const boss = mafia("b", "Boss Bea", 4);
    boss.cash = 1000 + BALANCE.crew.createCost;
    const crew = createCrew(boss, "c", "Iron Row", "IRW", LATER);
    crew.vault = 500 + FAMILY.ceremonyCost;
    const sal = mafia("s", "Soldier Sal", 2);
    addMember(crew, sal, LATER);
    expect(ceremonyBlock(crew, boss, sal)).toMatch(/haven't done a job/);
    crewJob(sal, "war");
    makeMember(crew, boss, sal, LATER);
    expect(sal.family?.madeBy).toBe("Boss Bea");
    expect(crew.vault).toBe(500);
    expect(sal.inbox?.[0].text).toMatch(/swore you in/);
  });

  it("past Capo you need a crew and its organized crime; Boss and Don need to lead", () => {
    const capo = mafia("c", "Capo Cruz", 4);
    family(capo).madeAt = LATER;
    expect(familyGate(capo, 5)).toMatch(/loners/);
    capo.crewId = "x";
    expect(familyGate(capo, 5)).toMatch(/crew's work/);
    crewJob(capo, "heist", true);
    crewJob(capo, "war");
    expect(familyGate(capo, 5)).toBeNull();
    for (let i = 0; i < 10; i++) crewJob(capo, "breakout");
    expect(familyGate(capo, 7)).toMatch(/runs a crew/);
    family(capo).leads = true;
    expect(familyGate(capo, 7)).toBeNull();
    expect(familyGate(capo, 8)).toMatch(/district/);
    family(capo).turf = true;
    expect(familyGate(capo, 8)).toBeNull();
  });

  it("a blocked promotion waits, and the hint says what the family wants", () => {
    const sal = mafia("s", "Soldier Sal", 2);
    sal.stats.strength = sal.stats.nerve = sal.stats.toughness = 2000;
    sal.jobsSinceRank = 999;
    applyAction(sal, { type: "job", jobId: "collect_debt" }, LATER, always(0.01));
    expect(sal.rank).toBe(2);
    expect(toView(sal, LATER).path?.promotion).toMatch(/^The family:/);
  });

  it("only the Mafia joins crews, and leaving hands leadership on", () => {
    const boss = mafia("b", "Boss Bea", 4);
    boss.cash = 1000 + BALANCE.crew.createCost;
    const crew = createCrew(boss, "c", "Iron Row", "IRW", LATER, "open");
    expect(boss.family?.leads).toBe(true);
    expect(() => joinCrew(crew, mk("d", "Doctor Dee"), LATER)).toThrow(/Only the Mafia/);
    joinCrew(crew, mafia("m", "Member Max", 2), LATER);
    leaveCrew(crew, boss, LATER);
    expect(boss.family?.leads).toBe(false);
    expect(crew.leaderId).toBe("m");
  });
});

describe("the secret forum", () => {
  it("the leader opens it and invites anyone; guests can post without joining the crew", () => {
    const boss = mafia("b", "Boss Bea", 4);
    boss.cash = 1000 + BALANCE.crew.createCost;
    const crew = createCrew(boss, "c", "Iron Row", "IRW", LATER);
    expect(() => createForum(crew, boss, "Back Room", LATER)).toThrow(/vault/);
    crew.vault = FORUM.cost;
    createForum(crew, boss, "Back Room", LATER);
    const cop = mk("p", "Officer Pike");
    cop.path = "police";
    expect(canUseForum(crew, cop)).toBe(false);
    inviteToForum(crew, boss, cop, LATER);
    expect(canUseForum(crew, cop)).toBe(true);
    expect(cop.crewId ?? null).toBeNull();
    expect(cop.forums?.[0].name).toBe("Back Room");
    expect(canUseForum(crew, boss)).toBe(true);
    removeFromForum(crew, cop, cop, crew.id);
    expect(canUseForum(crew, cop)).toBe(false);
    inviteToForum(crew, boss, cop, LATER);
    closeForum(crew, boss, [cop], LATER);
    expect(crew.forum).toBeNull();
    expect(cop.forums).toEqual([]);
  });
});

describe("issued weapons", () => {
  it("police get a service pistol on graduation, and hand it back if they leave", () => {
    const cop = mk("c", "Cadet Cole");
    cop.path = "police";
    cop.rank = 1;
    issueGear(cop);
    expect(cop.inventory.service_pistol).toBeUndefined();
    cop.rank = 2;
    expect(issueGear(cop)).toEqual(["🔫 Service pistol"]);
    expect(cop.inventory.service_pistol).toBe(1);
    cop.path = null;
    issueGear(cop);
    expect(cop.inventory.service_pistol).toBeUndefined();
  });

  it("soldiers get heavier gear as they rise, and it's never for sale", () => {
    const sol = mk("s", "Private Pia");
    sol.path = "military";
    sol.rank = 6;
    tick(sol, LATER + 1);
    expect(Object.keys(sol.inventory)).toEqual(expect.arrayContaining(["service_rifle", "combat_armor", "machine_gun"]));
    expect(sol.inventory.heavy_armor).toBeUndefined();
    expect(toView(sol, LATER).shop.some((i) => i.id === "machine_gun")).toBe(false);
    expect(() => applyAction(sol, { type: "buy", itemId: "machine_gun" }, LATER, always(0.5))).toThrow(/isn't for sale/);
  });
});

describe("soldiers on guard", () => {
  it("guards at the bank make a heist harder", () => {
    const c = newCity("varrow", LATER);
    c.treasury = 100;
    const soldiers: Player[] = ["a", "b", "c"].map((id) => {
      const s = mk(id, `Soldier ${id}`);
      s.path = "military";
      s.rank = 2;
      return s;
    });
    for (const s of soldiers) standGuard(c, s, LATER);
    expect(c.guards).toHaveLength(3);
    expect(soldiers[0].cash).toBeGreaterThan(0);
    expect(() => standGuard(c, soldiers[0], LATER)).toThrow(/already on guard/);

    // The same rolls that would succeed without guards fail with three of them.
    const boss = mafia("b2", "Boss Bea", 4);
    boss.cash = 1000 + BALANCE.crew.createCost;
    const crew = createCrew(boss, "cr", "Iron Row", "IRW", LATER);
    const driver = mafia("d", "Driver Dan", 2);
    addMember(crew, driver, LATER);
    crew.heist = { country: "varrow", plannerId: boss.id, roles: { driver: { id: driver.id, name: driver.name }, safecracker: { id: boss.id, name: boss.name } }, createdAt: LATER };
    driver.stats.agility = boss.stats.wits = 2000;
    const out = runHeist(crew, boss, { driver, safecracker: boss }, c, LATER + 1, always(0.75));
    expect(out.some((e) => /soldiers on guard/.test(e.text))).toBe(true);
    expect(driver.family?.crewJobs).toBe(1);
  });
});
