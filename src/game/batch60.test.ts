import { describe, expect, it } from "vitest";
import { applyAction, createPlayer, tick } from "./engine";
import { BALANCE } from "./balance";
import { buildWord, toView } from "./view";

// 7.22: the Fight screen. Opponents are described (build, what they carry, your record against
// them), never given odds; and the screen knows painkillers let you fight while badly hurt.

const NOW = Date.UTC(2027, 10, 1, 12);

describe("street opponents on the Fight screen", () => {
  const mk = () => {
    const p = createPlayer("f", "Test Fighter", NOW - 30 * 86_400_000, "solmarra");
    tick(p, NOW);
    p.energy = 100;
    return p;
  };

  it("are described by build, from scrawny to built like a door", () => {
    expect(buildWord(16)).toBe("Scrawny");
    expect(buildWord(46)).toBe("Solid");
    expect(buildWord(88)).toBe("Built like a door");
  });

  it("show a word, what they carry and how often you've beaten them, never a number for their strength", () => {
    const f = toView(mk(), NOW).fights.find((n) => n.id === "beach_hustler")!;
    expect(f.build).toBe("Scrawny");
    expect(f.carries).toBeGreaterThan(0);
    expect(f.beaten).toBe(0);
    expect(JSON.stringify(f)).not.toMatch(/strength|toughness|odds|chance/i);
  });

  it("count each win against that opponent", () => {
    const p = mk();
    p.stats.strength = 200;
    p.stats.toughness = 200;
    for (let i = 0; i < 3; i++) applyAction(p, { type: "fight", npcId: "beach_hustler" }, NOW + i * 1000, () => 0.5);
    const v = toView(p, NOW + 5000);
    expect(v.fights.find((n) => n.id === "beach_hustler")!.beaten).toBe(3);
    expect(v.fightRecord.wins).toBe(3);
  });

  it("lower the too-hurt line while painkillers last", () => {
    const p = mk();
    expect(toView(p, NOW).hurtLimit).toBe(BALANCE.hurt.limit);
    p.numbUntil = NOW + 60_000;
    expect(toView(p, NOW).hurtLimit).toBe(BALANCE.hurt.numbed);
  });
});
