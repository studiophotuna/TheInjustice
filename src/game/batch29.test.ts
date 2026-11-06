import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { applyAction, createPlayer, tick } from "./engine";
import { newCity } from "./city";
import { buyFront, collectFront, frontTorchBlock, FRONTS, launderAtFront, rebuildFront, rivalFronts, torchFront } from "./fronts";
import { FUGITIVE, huntBlock, huntFugitive, isFugitive } from "./fugitive";
import { INSIDE } from "./prisonlife";
import type { Crew, Player } from "./types";

const T0 = 1_800_000_000_000;
const NOW = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (id: string): Player => {
  const p = createPlayer(id, id.toUpperCase(), T0, "varrow");
  tick(p, NOW);
  p.energy = 100;
  p.heat = 0;
  p.cash = 50_000;
  return p;
};
const crewOf = (id: string, boss: Player, vault = 100_000): Crew =>
  ({ id, tag: id.toUpperCase(), name: id, leaderId: boss.id, members: [{ id: boss.id, name: boss.name }], log: [], vault }) as unknown as Crew;

describe("torching a rival's front", () => {
  const setup = () => {
    const boss = mk("boss");
    const target = crewOf("kz", boss);
    buyFront(target, boss, "trattoria", NOW);
    const arsonist = mk("ash");
    arsonist.path = "enforcer";
    arsonist.crewId = "rv";
    return { boss, target, arsonist };
  };

  it("only rival crew members in the same city can try", () => {
    const { target, arsonist } = setup();
    expect(frontTorchBlock(arsonist, target, NOW)).toBeNull();
    expect(rivalFronts([target], arsonist, NOW)).toHaveLength(1);
    arsonist.crewId = "kz";
    expect(frontTorchBlock(arsonist, target, NOW)).toMatch(/own crew/);
    arsonist.crewId = "rv";
    arsonist.country = "solmarra";
    expect(frontTorchBlock(arsonist, target, NOW)).toMatch(/another city/);
  });

  it("a burned front earns nothing and launders nothing until it's rebuilt", () => {
    const { boss, target, arsonist } = setup();
    const city = newCity("varrow", NOW);
    torchFront(arsonist, target, city, NOW, always(0));
    expect(target.front?.closedUntil).toBe(NOW + FRONTS.torch.closedMs);
    expect(() => collectFront(target, boss, NOW + 3_600_000)).toThrow(/Nothing in the register/);
    boss.dirty = 1_000;
    expect(() => launderAtFront(target, boss, 500, NOW + 1)).toThrow(/burned-out/);
    const vault = target.vault;
    rebuildFront(target, boss, NOW + 2);
    expect(target.vault).toBe(vault - Math.round(FRONTS.kinds.trattoria.price * FRONTS.rebuildShare));
    launderAtFront(target, boss, 500, NOW + 3);
    expect(boss.dirty).toBe(500);
  });

  it("a failed attempt can end in a cell", () => {
    const { target, arsonist } = setup();
    torchFront(arsonist, target, null, NOW, always(0.2 + 0.01));
    // rng 0.21: above the torch odds for an untrained arsonist, below the 40% caught chance.
    expect(arsonist.jailUntil ?? 0).toBeGreaterThan(NOW);
    expect(target.front?.closedUntil ?? 0).toBeLessThanOrEqual(NOW);
  });
});

describe("on the run", () => {
  const escapee = () => {
    const p = mk("rook");
    p.jailUntil = NOW + 60 * 60_000;
    p.jailReason = "Serving time.";
    p.inside = { respect: 0, stayAt: NOW, stayUntil: p.jailUntil, tunnel: 99 };
    applyAction(p, { type: "tunnel_dig" }, NOW, always(0.5));
    return p;
  };

  it("tunneling out makes you a fugitive: no flights, no bank", () => {
    const p = escapee();
    expect(isFugitive(p, NOW + 1)).toBe(true);
    expect(isFugitive(p, NOW + FUGITIVE.ms + 1)).toBe(false);
    expect(() => applyAction(p, { type: "travel", to: "solmarra", mode: "plane" }, NOW + 1, always(0.99))).toThrow(/Airports/);
    p.hasBankAccount = true;
    expect(() => applyAction(p, { type: "bank", op: "deposit", amount: 10 }, NOW + 1, always(0.5))).toThrow(/frozen/);
    expect(p.inside?.respect).toBe(INSIDE.respect.tunnel);
  });

  it("customs on duty can recognize you at the station", () => {
    const p = escapee();
    applyAction(p, { type: "travel", to: "solmarra", mode: "train" }, NOW + 1, always(0.1), { customs: [{ id: "c1", name: "Mercy", eye: 30 }] });
    expect(p.jailUntil).toBeGreaterThan(NOW + 30 * 60_000);
    expect(p.travel).toBeNull();
    expect(p.fugitive).toBeNull();
    expect(p.customsSeizure?.officerId).toBe("c1");
  });

  it("a detective can hunt you down for a reward", () => {
    const p = escapee();
    const d = mk("dana");
    d.path = "police";
    d.rank = BALANCE.crime.detectiveRank;
    expect(huntBlock(d, p, NOW + 1)).toBeNull();
    const city = newCity("varrow", NOW);
    city.treasury = 10_000;
    const cash = d.cash;
    huntFugitive(d, p, city, NOW + 1, always(0));
    expect(p.jailUntil).toBeGreaterThan(NOW + 30 * 60_000);
    expect(d.cash).toBe(cash + FUGITIVE.bounty);
    expect(city.treasury).toBe(10_000 - FUGITIVE.bounty);
    expect(p.inbox?.[0].text).toMatch(/found you/);
  });
});
