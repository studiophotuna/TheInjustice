import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { textProblem } from "./textfilter";
import { createPlayer } from "./engine";
import { specialtiesView } from "./specialties";
import { RATE, resetThrottle, throttle } from "@/server/ratelimit";
import { FileStore } from "@/server/store";

describe("what players type for others", () => {
  it("blocks slurs, including disguised ones", () => {
    for (const s of ["you n1gg3r", "f a g g o t", "FAGGOT", "niiiigger", "what a fag", "dumb retard"]) {
      expect(textProblem(s, "chat"), s).toMatch(/isn't allowed/);
    }
  });

  it("lets ordinary words and swearing through", () => {
    for (const s of [
      "Niger and Nigeria are countries",
      "a raccoon in the bin",
      "spicy food at the Old Market",
      "Montenegro is nice",
      "the fire retardant held",
      "be a nerd about it",
      "this is fucking great",
      "Sheila and Nigel",
    ]) {
      expect(textProblem(s, "chat"), s).toBeNull();
    }
  });

  it("blocks self-harm taunts and links", () => {
    expect(textProblem("just kys", "chat")).toMatch(/hurt themselves/);
    expect(textProblem("go kill yourself", "chat")).toMatch(/hurt themselves/);
    expect(textProblem("join discord.gg/abc", "chat")).toMatch(/links/i);
    expect(textProblem("cheap gold at goldshop.com", "chat")).toMatch(/links/i);
    expect(textProblem("meet me at 5. ok", "chat")).toBeNull();
  });

  it("checks character names too", () => {
    expect(() => createPlayer("t1", "Big Nigga", Date.now())).toThrow(/isn't allowed/);
    expect(createPlayer("t2", "Rosa Vint", Date.now()).name).toBe("Rosa Vint");
  });
});

describe("speed limit", () => {
  it("allows a quick burst, stops a flood, and recovers", () => {
    resetThrottle();
    const t0 = 1_000_000;
    for (let i = 0; i < RATE.burst; i++) throttle("k", t0 + i * 10);
    expect(() => throttle("k", t0 + 200)).toThrow(/too fast/);
    // Another player isn't affected.
    expect(() => throttle("other", t0 + 200)).not.toThrow();
    expect(() => throttle("k", t0 + RATE.burstMs + 500)).not.toThrow();
  });

  it("caps a steady stream at the per-minute limit", () => {
    resetThrottle();
    const t0 = 5_000_000;
    let blocked = 0;
    for (let i = 0; i < RATE.perMinute + 20; i++) {
      try {
        throttle("steady", t0 + i * 400);
      } catch {
        blocked++;
      }
    }
    expect(blocked).toBeGreaterThan(0);
  });
});

describe("specialties show what you have, not how close you are", () => {
  it("sends no counts, thresholds or hints", () => {
    const p = createPlayer("s1", "Spec", Date.now());
    const v = specialtiesView(p, Date.now());
    for (const s of v) {
      expect(Object.keys(s)).not.toContain("progress");
      expect(Object.keys(s)).not.toContain("next");
      expect(Object.keys(s)).not.toContain("how");
      expect(Object.keys(s)).not.toContain("nextPerk");
    }
  });
});

describe("deleting a character", () => {
  it("removes the player, their messages and uploads, and the login", async () => {
    const store = new FileStore(join(mkdtempSync(join(tmpdir(), "cns-")), "data.json"));
    const acct = (await store.createAccount("gone_soon", "hash"))!;
    const id = "acct-player";
    await store.update(id, () => ({ player: createPlayer(id, "Gone Soon", Date.now()), result: null }));
    await store.update("other", () => ({ player: createPlayer("other", "Stays", Date.now()), result: null }));
    await store.postMessage({ channel: "global", authorId: id, authorName: "Gone Soon", body: "bye" });
    await store.postMessage({ channel: "global", authorId: "other", authorName: "Stays", body: "hi" });
    await store.createSession("tok", acct.id, Date.now() + 60_000);
    await store.eraseCharacter(id, acct.id);
    expect(await store.get(id)).toBeNull();
    expect(await store.get("other")).not.toBeNull();
    expect((await store.listMessages("global", 10)).map((m) => m.body)).toEqual(["hi"]);
    expect(await store.findAccount("gone_soon")).toBeNull();
    expect(await store.getSession("tok")).toBeNull();
  });

  it("keeps crash reports for moderators", async () => {
    const store = new FileStore(join(mkdtempSync(join(tmpdir(), "cns-")), "data.json"));
    await store.logError({ source: "client", message: "x is undefined", place: "/", stack: "", version: "6.1.0" });
    const [e] = await store.listErrors(5);
    expect(e.message).toBe("x is undefined");
    expect(e.source).toBe("client");
  });
});
