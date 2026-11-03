import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { buildLab, flagLaundering, frisk, friskBlock, labCook, labHeat, labTips, launderWithBanker, probeLaundering, raidLab, setLaunderService } from "./batch6";
import { newCity } from "./city";
import { createPlayer, inJail, tick } from "./engine";
import { audit } from "./racket";
import { addMember, createCrew } from "./social";
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

describe("bankers launder for clients", () => {
  it("the banker sets the fee, keeps it, and internal affairs can find the books", () => {
    const banker = career(mk("b", "Quell"), "banking", 2);
    expect(() => setLaunderService(banker, true, 0.9)).toThrow(/between/);
    setLaunderService(banker, true, 0.2);
    const client = mk("c", "Client");
    client.dirty = 1000;
    const out = launderWithBanker(client, banker, 600, LATER);
    expect(client.dirty).toBe(400);
    expect(client.cash).toBe(480);
    expect(banker.cash).toBe(120);
    expect(out.flag).toBe(true); // $500+ gets flagged
    const ia = career(mk("i", "Ines"), "police", BALANCE.racket.audit.minRank);
    const res = audit(ia, banker, [], LATER);
    expect(res.events[0].text).toMatch(/laundering/);
    expect(banker.launderService).toBeNull();
  });
});

describe("money-laundering investigations", () => {
  it("a detective follows the money: fine and a cell for the launderer", () => {
    const c = newCity("varrow", LATER);
    const launderer = mk("l", "Lou");
    launderer.cash = 1000;
    flagLaundering(c, launderer.id, 800, "the laundromat", LATER);
    const det = career(mk("d", "Dana"), "police", 4);
    const id = c.launderFlags![0].id;
    probeLaundering(det, c, id, launderer, LATER, always(0));
    expect(launderer.cash).toBe(600);
    expect(inJail(launderer, LATER + 1)).toBe(true);
    expect(c.launderFlags![0].solved).toBe(true);
    expect(() => probeLaundering(det, c, id, launderer, LATER, always(0))).toThrow(/closed|already/);
  });
});

describe("drug busts", () => {
  it("police frisk people drawing attention; drugs found mean seizure and a cell", () => {
    const cop = career(mk("c", "Cop"), "police", 2);
    const dealer = mk("d", "Dealer");
    dealer.drugs = { pills: 6 };
    expect(friskBlock(cop, dealer, LATER)).toMatch(/clean/);
    dealer.heat = 20;
    frisk(cop, dealer, LATER, always(0));
    expect(dealer.drugs).toEqual({});
    expect(inJail(dealer, LATER + 1)).toBe(true);
    expect(cop.reputation).toBe(2);
    expect(friskBlock(cop, dealer, LATER + 1000)).toMatch(/behind bars|just searched/);
  });

  it("frisking someone clean costs the officer", () => {
    const cop = career(mk("c", "Cop"), "police", 2);
    cop.reputation = 5;
    const citizen = mk("z", "Zed");
    citizen.heat = 15;
    frisk(cop, citizen, LATER, always(0));
    expect(cop.reputation).toBe(4);
    expect(citizen.reputation).toBe(1);
  });
});

describe("crew labs", () => {
  it("cooks double, gets hotter, and hot labs can be raided", () => {
    const boss = career(mk("b", "Boss"), "enforcer", 4);
    boss.cash = 1000;
    const crew = createCrew(boss, "c1", "Iron Row", "IR", LATER);
    crew.vault = 5000;
    buildLab(crew, boss, LATER, always(0));
    expect(crew.vault).toBe(3000);
    const doc = career(mk("m", "Mercy"), "medicine", 4);
    addMember(crew, doc, LATER);
    doc.supplies = 20;
    doc.energy = 200;
    labCook(crew, doc, "pills", LATER, always(0.99));
    expect(doc.drugs?.pills).toBe(4); // (1 + floor(science/30)) × 2
    for (let i = 0; i < 5; i++) labCook(crew, doc, "pills", LATER, always(0.99));
    expect(labHeat(crew, LATER)).toBeGreaterThanOrEqual(BALANCE.lab.tipHeat);
    expect(labTips([crew], "varrow", LATER)).toHaveLength(1);
    const det = career(mk("d", "Dana"), "police", 4);
    raidLab(det, crew, LATER, always(0));
    expect(crew.lab).toBeNull();
    expect(crew.vault).toBe(1500);
  });
});
