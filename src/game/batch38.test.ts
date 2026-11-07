import { describe, expect, it } from "vitest";
import { createPlayer } from "./engine";
import { addSub, dueAlerts, energyFullAt, PUSH } from "./push";
import { notify } from "./social";

const NOW = Date.UTC(2027, 1, 1, 12);
const SUB = { endpoint: "https://push.example.com/abc123456789", keys: { p256dh: "k".repeat(80), auth: "a".repeat(20) } };

describe("phone alerts", () => {
  it("says energy is full once, when it happens", () => {
    const p = createPlayer("p1", "Buzz", NOW - 86_400_000);
    p.seenAt = NOW - 3_600_000;
    p.energy = 0;
    p.tickAt = NOW - 3_600_000;
    const full = energyFullAt(p);
    expect(full).toBeGreaterThan(p.tickAt);
    expect(dueAlerts(p, full - 60_000, full + 60_000).map((a) => a.kind)).toContain("energy");
    expect(dueAlerts(p, full + 60_000, full + 120_000).map((a) => a.kind)).not.toContain("energy");
  });

  it("stays quiet while you're playing, and for kinds you turned off", () => {
    const p = createPlayer("p2", "Quiet", NOW - 86_400_000);
    p.hospitalUntil = NOW - 1000;
    p.seenAt = NOW - 30_000;
    expect(dueAlerts(p, NOW - 5 * 60_000, NOW)).toEqual([]);
    p.seenAt = NOW - 3_600_000;
    expect(dueAlerts(p, NOW - 5 * 60_000, NOW).map((a) => a.kind)).toEqual(["clinic"]);
    p.push = { subs: [], checkedAt: 0, off: ["clinic"] };
    expect(dueAlerts(p, NOW - 5 * 60_000, NOW)).toEqual([]);
  });

  it("passes on what other players did, and sums up a flood", () => {
    const p = createPlayer("p3", "Target", NOW - 86_400_000);
    p.seenAt = NOW - 3_600_000;
    for (let i = 0; i < 6; i++) notify(p, `Hit number ${i}`, "bad", undefined, NOW - 60_000 + i);
    const out = dueAlerts(p, NOW - 5 * 60_000, NOW);
    expect(out.length).toBe(PUSH.maxPerTick);
    expect(out[out.length - 1].body).toMatch(/more things happened/);
  });

  it("keeps a few devices and refuses junk", () => {
    const p = createPlayer("p4", "Phones", NOW);
    for (let i = 0; i < 6; i++) addSub(p, { ...SUB, endpoint: `${SUB.endpoint}${i}` }, NOW + i);
    expect(p.push!.subs.length).toBe(PUSH.maxSubs);
    expect(() => addSub(p, { endpoint: "javascript:alert(1)", keys: SUB.keys }, NOW)).toThrow();
  });
});
