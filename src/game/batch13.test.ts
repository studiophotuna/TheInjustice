import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { linkedGroups, sameOwner, trackDevice } from "./anticheat";
import { CITY_EPOCH, newCity, vote } from "./city";
import { applyAction, createPlayer, tick } from "./engine";
import { applyModAction, assertActive, assertCanSpeak, checkReport } from "./moderation";
import { attackBlock, postBounty, vouchFor } from "./social";

const T0 = 1_800_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (id: string, name: string) => {
  const p = createPlayer(id, name, T0);
  tick(p, LATER);
  return p;
};

describe("anti-cheat: characters on the same device", () => {
  it("can't fight, rob, vouch for or put bounties on each other", () => {
    const main = mk("m", "Main Max");
    const alt = mk("a", "Alt Al");
    trackDevice(main, "dev-1", "ip-1");
    trackDevice(alt, "dev-1", "ip-1");
    expect(sameOwner(main, alt)).toBe(true);
    main.reputation = alt.reputation = 20;
    expect(attackBlock(main, alt, LATER)).toMatch(/your own characters/);
    main.path = "police";
    main.rank = 6;
    expect(() => vouchFor(main, alt, LATER)).toThrow(/your own characters/);
    main.bank = 1000;
    main.hasBankAccount = true;
    expect(() => postBounty(main, alt, 200, LATER)).toThrow(/your own characters/);
    // A different device is fine, even on the same network.
    const sibling = mk("s", "Sibling Sue");
    trackDevice(sibling, "dev-2", "ip-1");
    expect(sameOwner(main, sibling)).toBe(false);
    const groups = linkedGroups([main, alt, sibling]);
    expect(groups[0].names).toEqual(expect.arrayContaining(["Main Max", "Alt Al", "Sibling Sue"]));
    expect(groups[0].device).toBe(true);
  });

  it("only one vote per device in an election", () => {
    // Same clock as the city tests: an election is open shortly after the epoch.
    const t0 = CITY_EPOCH + 1000;
    const later = t0 + BALANCE.pvp.protectionMs + 1;
    const c = newCity("varrow", later);
    c.candidates.push({ id: "c", name: "Candidate Cara", title: "Nobody", reputation: 30, pitch: "Vote", at: later });
    const voter = (id: string) => {
      const p = createPlayer(id, `Voter ${id}`, t0);
      tick(p, later);
      trackDevice(p, "dev-1", null);
      return p;
    };
    vote(c, voter("a"), "c", later);
    expect(() => vote(c, voter("b"), "c", later)).toThrow(/One vote per person/);
  });
});

describe("moderation", () => {
  it("suspended characters can't play; muted ones can't talk or edit their profile", () => {
    const p = mk("p", "Pia");
    applyModAction(p, "mute", 24, "", LATER);
    expect(() => assertCanSpeak(p, LATER + 1)).toThrow(/muted/);
    expect(() => applyAction(p, { type: "profile", bio: "hi" }, LATER + 1, always(0.5))).toThrow(/muted/);
    applyModAction(p, "ban", 24 * 7, "Hate speech", LATER);
    expect(() => assertActive(p, LATER + 1)).toThrow(/suspended until .*Hate speech/);
    applyModAction(p, "unban", 0, "", LATER + 2);
    expect(() => assertActive(p, LATER + 3)).not.toThrow();
    applyModAction(p, "ban", 0, "", LATER + 4);
    expect(() => assertActive(p, LATER + 5)).toThrow(/permanently/);
  });

  it("moderators can strip a photo or an intro", () => {
    const p = mk("p", "Pia");
    p.profile = { bio: "something nasty", photo: "data:image/png;base64,AAAA" };
    applyModAction(p, "remove_photo", 0, "", LATER);
    applyModAction(p, "clear_bio", 0, "", LATER);
    expect(p.profile).toMatchObject({ bio: "", photo: null });
  });

  it("reports need a reason, can't target yourself, and are limited to one a minute", () => {
    const p = mk("p", "Pia");
    expect(() => checkReport(p, "p", "x", LATER)).toThrow(/yourself/);
    expect(() => checkReport(p, "o", "  ", LATER)).toThrow(/what's wrong/);
    expect(checkReport(p, "o", "Offensive photo", LATER)).toBe("Offensive photo");
    expect(() => checkReport(p, "o", "again", LATER + 1000)).toThrow(/one report a minute/i);
  });
});
