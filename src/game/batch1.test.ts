import { describe, expect, it } from "vitest";
import { applyAction, createPlayer, tick } from "./engine";
import { cityEvent } from "./events";
import { bumpSeason, seasonBoard, seasonId } from "./season";
import { streetTitle } from "./titles";
import { toView } from "./view";

const T0 = 1_800_000_000_000;
const H = 3_600_000;

describe("city events", () => {
  it("are the same for everyone in a city for the hour, and happen about a third of the time", () => {
    expect(cityEvent("varrow", T0)).toEqual(cityEvent("varrow", T0 + 1000));
    let count = 0;
    for (let h = 0; h < 300; h++) if (cityEvent("varrow", T0 + h * H)) count++;
    expect(count).toBeGreaterThan(60);
    expect(count).toBeLessThan(140);
  });

  it("a festival raises job pay", () => {
    let h = 0;
    while (cityEvent("varrow", T0 + h * H)?.id !== "festival") h++;
    let calm = 0;
    while (cityEvent("varrow", T0 + calm * H)) calm++;
    const run = (at: number) => {
      const p = createPlayer("p", "Pat", at);
      applyAction(p, { type: "job", jobId: "cans" }, at, () => 0.5);
      return p.cash;
    };
    expect(run(T0 + h * H)).toBeGreaterThanOrEqual(run(T0 + calm * H));
    expect(toView(createPlayer("x", "Xavi", T0 + h * H), T0 + h * H).event?.name).toBe("Street festival");
  });
});

describe("street titles", () => {
  it("come from what you've done", () => {
    const p = createPlayer("p", "Pat", T0);
    expect(streetTitle(p)).toBeNull();
    p.reputation = 6;
    expect(streetTitle(p)).toBe("Known in the gutter");
    p.jobCounts["crime:snatch"] = 12;
    expect(streetTitle(p)).toBe("Known to the police");
    p.path = "enforcer";
    p.jobCounts["crime:mug"] = 20;
    expect(streetTitle(p)).toMatch(/Feared in Grayhaven/);
  });
});

describe("season leaderboards", () => {
  it("never show names; you only see your own place", () => {
    const players = ["Ace", "Bea", "Cid"].map((n, i) => {
      const p = createPlayer(n, n, T0);
      tick(p, T0);
      bumpSeason(p, "earned", (i + 1) * 100, T0);
      return p;
    });
    players[0].path = "enforcer";
    const boards = seasonBoard(players, players[1], T0);
    const earned = boards.find((b) => b.id === "earned")!;
    expect(earned.top.map((x) => x.value)).toEqual([300, 200, 100]);
    expect(earned.you).toEqual({ place: 2, value: 200 });
    const json = JSON.stringify(boards);
    expect(json).not.toMatch(/Ace|Cid/);
    expect(earned.top[1].who).toBe("You");
    expect(earned.top[2].who).toBe("Someone in the Mafia");
  });

  it("counters reset with a new month", () => {
    const p = createPlayer("p", "Pat", T0);
    bumpSeason(p, "wins", 5, T0);
    const nextMonth = T0 + 32 * 24 * H;
    expect(seasonId(nextMonth)).not.toBe(seasonId(T0));
    bumpSeason(p, "wins", 1, nextMonth);
    expect(p.season?.wins).toBe(1);
  });
});
