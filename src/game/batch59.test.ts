import { describe, expect, it } from "vitest";
import { createPlayer, tick } from "./engine";
import { chatLine, REGULARS, ROSTER } from "./regulars";
import { toView } from "./view";
import { makeRegular } from "@/server/regulars";

// 7.19: layout tidy-up. Regulars don't repeat themselves in chat; spent jobs leave the list.

const NOW = Date.UTC(2027, 10, 1, 12);

describe("regulars in city chat", () => {
  const regs = ROSTER.varrow.filter((d) => !d.heavy).map((d) => makeRegular("varrow", d.key, NOW));

  it("never repeat a line that's still in the channel, and don't speak twice running", () => {
    const recent: { authorId: string; body: string }[] = [];
    for (let i = 1; i <= 12; i++) {
      const at = NOW + i * REGULARS.chatGapMs;
      const line = chatLine(regs, 0, at, recent)!;
      expect(line).not.toBeNull();
      expect(recent.map((m) => m.body)).not.toContain(line.text);
      expect(line.who.id).not.toBe(recent[recent.length - 1]?.authorId);
      recent.push({ authorId: line.who.id, body: line.text });
    }
  });

  it("a lone regular with every line already said stays quiet", () => {
    const one = regs.slice(0, 1);
    const recent: { authorId: string; body: string }[] = [];
    for (let i = 1; i <= 10; i++) {
      const line = chatLine(one, 0, NOW + i * REGULARS.chatGapMs, recent);
      if (!line) return;
      recent.push({ authorId: line.who.id, body: line.text });
    }
    throw new Error("kept talking after running out of lines");
  });
});

describe("jobs done for good", () => {
  it("drop off the list instead of showing locked", () => {
    const p = createPlayer("m", "Test Made", NOW - 30 * 86_400_000, "varrow");
    tick(p, NOW);
    p.path = "enforcer";
    p.rank = 3;
    expect(toView(p, NOW).jobs.some((j) => j.id === "make_bones")).toBe(true);
    p.family = { ...(p.family ?? {}), madeAt: NOW } as typeof p.family;
    const after = toView(p, NOW).jobs;
    expect(after.some((j) => j.id === "make_bones")).toBe(false);
  });
});
