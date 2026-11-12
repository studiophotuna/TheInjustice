import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { applyAction, createPlayer, tick } from "./engine";
import { parseAction } from "../server/actions";
import { LEAD_BY_ID, LEADS, leadState, leadsView } from "./leads";
import type { Player } from "./types";

const T0 = 1_800_000_000_000;
const NOW = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (country: "varrow" | "solmarra" = "varrow"): Player => {
  const p = createPlayer("acct_lead", "Lead Tester", T0, country);
  tick(p, NOW);
  p.cash = 5_000;
  p.energy = 500;
  return p;
};
const doJobs = (p: Player, n: number) => {
  p.jobCounts.beg = (p.jobCounts.beg ?? 0) + n;
};

describe("leads", () => {
  it("every lead's prerequisites exist, and the chains end at Crane", () => {
    for (const l of LEADS) for (const a of l.after) expect(LEAD_BY_ID[a], `${l.id} after ${a}`).toBeTruthy();
    expect(LEADS.filter((l) => l.after.length === 0).map((l) => l.id)).toEqual(["benny_seen"]);
    expect(LEADS.at(-1)?.suspect).toBe("crane");
  });

  it("a new player arrives already following the first lead, and closes it within a first session", () => {
    const p = mk();
    // The first lead starts with the character, so the first session's jobs count toward it.
    expect(leadState(p, LEAD_BY_ID.benny_seen)).toBe("active");
    expect(leadState(p, LEAD_BY_ID.benny_minder)).toBe("locked");
    expect(() => applyAction(p, { type: "lead_close", id: "benny_seen" }, NOW, always(0.5))).toThrow(/Not yet/);
    doJobs(p, 3);
    const cash = p.cash;
    applyAction(p, { type: "lead_pay", id: "benny_seen" }, NOW, always(0.5));
    expect(p.cash).toBe(cash - 50);
    const ev = applyAction(p, { type: "lead_close", id: "benny_seen" }, NOW, always(0.5));
    expect(ev.some((e) => /New evidence/.test(e.text))).toBe(true);
    expect(leadState(p, LEAD_BY_ID.benny_seen)).toBe("closed");
    expect(leadState(p, LEAD_BY_ID.benny_minder)).toBe("open");
    expect(leadState(p, LEAD_BY_ID.kozak_books)).toBe("open");
  });

  it("a lead that names a city must be finished (and paid) there", () => {
    const p = mk("varrow");
    p.leads = { benny_seen: { startedAt: NOW, base: { jobs: 0, careerJobs: 0, fights: 0 }, closedAt: NOW }, kozak_books: { startedAt: NOW, base: { jobs: 0, careerJobs: 0, fights: 0 }, closedAt: NOW } };
    applyAction(p, { type: "lead_start", id: "cp_money" }, NOW, always(0.5));
    expect(() => applyAction(p, { type: "lead_pay", id: "cp_money" }, NOW, always(0.5))).toThrow(/Port Solace/);
    p.country = "solmarra";
    applyAction(p, { type: "lead_pay", id: "cp_money" }, NOW, always(0.5));
    applyAction(p, { type: "lead_close", id: "cp_money" }, NOW, always(0.5));
    expect(leadState(p, LEAD_BY_ID.cp_money)).toBe("closed");
  });

  it("nothing on a lead can be done from a cell or on the road", () => {
    const p = mk();
    p.jailUntil = NOW + 60_000;
    expect(() => applyAction(p, { type: "lead_pay", id: "benny_seen" }, NOW, always(0.5))).toThrow();
  });

  it("the view never shows odds, and the request parser accepts lead actions", () => {
    const p = mk();
    const v = leadsView(p);
    expect(JSON.stringify(v)).not.toMatch(/%/);
    expect(v.find((l) => l.id === "benny_seen")?.steps[0].count).toBe("0 of 3");
    expect(parseAction({ type: "lead_close", id: "benny_seen" })).toEqual({ type: "lead_close", id: "benny_seen" });
  });
});
