import { describe, expect, it } from "vitest";
import { createPlayer, tick } from "./engine";
import { commitCrime } from "./crime";
import { runHeist } from "./heist";
import type { Crew, Player } from "./types";

// 8.7: crimes and heists record their steps for the card scene.

const NOW = Date.UTC(2027, 10, 1, 12);
const make = (id: string, name: string): Player => { const p = createPlayer(id, name, NOW, "varrow"); tick(p, NOW); p.energy = 100; p.cash = 1000; p.immuneUntil = 0; return p; };
const always = (v: number) => () => v;

describe("caper scenes", () => {
  it("a pickpocketing plays as cards: case it, the lift, the getaway", () => {
    const a = make("a", "Ash"), t = make("t", "Tess");
    const ok = commitCrime(a, t, "pickpocket", NOW + 10 * 86_400_000, always(0), { caseId: "c1", district: "Old Market", crewTag: null, witnesses: [], crackdown: false });
    const scene = ok.events.find((e) => e.fight?.caper)!.fight!.caper!;
    expect(scene.steps.map((s) => s.card)).toEqual(["case", "lift", "getaway"]);
    expect(scene.result).toBe("clean");

    const b = make("b", "Bo"), u = make("u", "Uma");
    const bad = commitCrime(b, u, "pickpocket", NOW + 10 * 86_400_000, always(0.999), { caseId: "c2", district: "Old Market", crewTag: null, witnesses: [], crackdown: false });
    const caught = bad.events.find((e) => e.fight?.caper)!.fight!.caper!;
    expect(caught.result).toBe("caught");
    expect(caught.steps[1].ok).toBe(false);
  });

  it("a bank job plays each role in order, and names who did it", () => {
    const lead = make("l", "Lena"), drv = make("d", "Dex");
    const crew = { id: "cr", name: "Crew", tag: "CR", leaderId: "l", members: [{ id: "l" }, { id: "d" }], log: [], heist: { country: "varrow", plannerId: "l", roles: {}, createdAt: NOW, target: null } } as unknown as Crew;
    const events = runHeist(crew, lead, { driver: drv, safecracker: lead }, null, NOW, always(0));
    const scene = events[0].fight!.caper!;
    expect(scene.steps.map((s) => s.card)).toEqual(["vault", "getaway"]);
    expect(scene.steps[0].who).toBe("Lena");
    // No lookout means nobody watched the street: away with the money, but seen.
    expect(scene.result).toBe("seen");
    // Nothing in a scene names gear or shows odds.
    expect(JSON.stringify(scene)).not.toMatch(/%|chance|odds/i);
  });
});
