import { describe, expect, it } from "vitest";
import { cityEvent, eventEffects } from "./events";

describe("city events explain themselves", () => {
  it("a blackout says what it changes, in words (no odds)", () => {
    let now = Date.UTC(2027, 0, 1);
    let e = cityEvent("solmarra", now);
    for (let i = 0; i < 500 && e?.id !== "blackout"; i++) e = cityEvent("solmarra", (now += 3_600_000));
    expect(e?.id).toBe("blackout");
    const fx = eventEffects(e!);
    expect(fx).toContain("Jobs pay 10% less");
    expect(fx.some((x) => /witness/.test(x))).toBe(true);
    expect(fx.join(" ")).not.toMatch(/%.*(chance|odds)|odds/i);
  });

});
