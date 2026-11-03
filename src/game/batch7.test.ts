import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import {
  acceptAlliance,
  appointEditor,
  breakAlliance,
  buryStory,
  claimTrophies,
  lastSeasonFinish,
  proposeAlliance,
  setBuryPrice,
  setTrophiesPublic,
  toggleStory,
  TROPHY_PRIZES,
  writeEditorial,
} from "./batch7";
import { newCity } from "./city";
import { applyAction, createPlayer, tick } from "./engine";
import { frontPage, weekStories } from "./paper";
import { bumpSeason, ensureSeason } from "./season";
import { createCrew, profileFor } from "./social";
import { claimTurf, declareWar, joinWar, joinWarBlock, turfCuts } from "./turf";

const T0 = 1_800_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (id: string, name: string) => {
  const p = createPlayer(id, name, T0);
  tick(p, LATER);
  return p;
};
const boss = (id: string, name: string, tag: string) => {
  const b = mk(id, name);
  b.path = "enforcer";
  b.rank = 4;
  b.cash = 1000 + BALANCE.crew.createCost;
  const crew = createCrew(b, `crew-${id}`, `${name} Crew`, tag, LATER);
  crew.vault = 50000;
  return { b, crew };
};
/** The first moment of the month after `t`. */
const nextMonth = (t: number) => {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) + 60_000;
};

describe("season trophies", () => {
  it("the top three claim a trophy and a prize once; the rest get nothing", () => {
    const players = ["a", "b", "c", "d"].map((id) => mk(id, `Player ${id}`));
    players.forEach((p, i) => bumpSeason(p, "wins", 10 - i, LATER));
    const next = nextMonth(LATER);
    // A new month starts for some of them; their numbers are kept as last season.
    ensureSeason(players[0], next);
    expect(players[0].lastSeason?.wins).toBe(10);
    expect(players[0].season?.wins).toBe(0);

    const [first, , third, fourth] = players;
    first.hasBankAccount = true;
    expect(lastSeasonFinish(first, players, next)).toEqual([expect.objectContaining({ stat: "wins", place: 1 })]);
    claimTrophies(first, players, next);
    expect(first.bank).toBe(TROPHY_PRIZES[0]);
    expect(first.trophies?.[0].place).toBe(1);
    expect(() => claimTrophies(first, players, next)).toThrow(/already claimed/);

    claimTrophies(third, players, next);
    expect(third.trophies?.[0].place).toBe(3);
    const out = claimTrophies(fourth, players, next);
    expect(out[0].text).toMatch(/didn't finish/);
    expect(fourth.trophies ?? []).toHaveLength(0);
  });

  it("trophies stay private unless the winner shows them", () => {
    const champ = mk("a", "Champ");
    bumpSeason(champ, "arrests", 5, LATER);
    const next = nextMonth(LATER);
    claimTrophies(champ, [champ], next);
    const viewer = mk("v", "Viewer");
    expect(profileFor(viewer, champ, next).trophies).toHaveLength(0);
    setTrophiesPublic(champ, true);
    expect(profileFor(viewer, champ, next).trophies[0]).toMatchObject({ place: 1, label: "Arrests made" });
  });
});

describe("crew alliances", () => {
  it("two crews ally, fight in each other's wars, and don't charge each other protection", () => {
    const { b: alma, crew: almaCrew } = boss("a", "Alma", "ALM");
    const { b: bruno, crew: brunoCrew } = boss("b", "Bruno", "BRU");
    const { b: cruz, crew: cruzCrew } = boss("c", "Cruz", "CRZ");
    proposeAlliance(almaCrew, brunoCrew, alma, bruno, LATER);
    expect(bruno.inbox?.[0].text).toMatch(/proposes an alliance/);
    acceptAlliance(brunoCrew, almaCrew, bruno, alma, LATER);
    expect(almaCrew.allies?.map((a) => a.id)).toEqual([brunoCrew.id]);
    expect(brunoCrew.allies?.map((a) => a.id)).toEqual([almaCrew.id]);

    const c = newCity("varrow", LATER);
    claimTurf(c, almaCrew, alma, "gutter", LATER);
    // Allies can't go to war with each other.
    expect(() => declareWar(c, brunoCrew, bruno, "gutter", LATER)).toThrow(/allies/);
    // Bruno's crew works Alma's turf without paying protection.
    applyAction(bruno, { type: "job", jobId: "cans" }, LATER, always(0.99), { turf: turfCuts(c), allies: [almaCrew.id] });
    expect(bruno.turfOwed ?? null).toBeNull();

    // A third crew attacks: Bruno can defend his ally's district.
    declareWar(c, cruzCrew, cruz, "gutter", LATER);
    expect(joinWarBlock(c, bruno, "gutter", LATER)).toMatch(/isn't your crew's fight/);
    joinWar(c, bruno, "gutter", LATER, [almaCrew.id]);
    expect(c.turf?.gutter?.war?.defenders.map((d) => d.id)).toContain(bruno.id);

    breakAlliance(almaCrew, brunoCrew, alma, brunoCrew.id, bruno, LATER);
    expect(almaCrew.allies).toHaveLength(0);
    expect(brunoCrew.allies).toHaveLength(0);
  });

  it("only leaders make alliances, and a crew has at most two allies", () => {
    const { b: a, crew: ca } = boss("a", "Boss a", "AAA");
    const others = ["b", "c", "d"].map((id) => boss(id, `Boss ${id}`, id.toUpperCase().repeat(3)));
    const nobody = mk("n", "Nobody");
    expect(() => proposeAlliance(ca, others[0].crew, nobody, others[0].b, LATER)).toThrow(/leader/);
    for (const o of others.slice(0, 2)) {
      proposeAlliance(ca, o.crew, a, o.b, LATER);
      acceptAlliance(o.crew, ca, o.b, a, LATER);
    }
    expect(() => proposeAlliance(ca, others[2].crew, a, others[2].b, LATER)).toThrow(/at most 2/);
  });
});

describe("the newspaper editor", () => {
  it("the mayor appoints an editor, who can pull stories and take money to bury them", () => {
    const c = newCity("varrow", LATER);
    const mayor = mk("m", "Mayor");
    c.mayor = { id: mayor.id, name: mayor.name, since: LATER };
    const ed = mk("e", "Edna");
    expect(() => appointEditor(c, mayor, ed, LATER)).toThrow(/reputation/);
    ed.reputation = 20;
    appointEditor(c, mayor, ed, LATER);
    expect(c.editor?.id).toBe(ed.id);
    expect(ed.inbox?.[0].text).toMatch(/editor/);

    c.log = [{ at: LATER, text: "Something embarrassing happened at city hall." }, ...c.log];
    const ids = weekStories("varrow", c, [], LATER + 1).stories.map((s) => s.id);
    const target = ids.find((id) => id === `city:${LATER}`)!;
    expect(frontPage("varrow", c, [], LATER + 1).lead).toMatch(/embarrassing|Mayor/);

    // Someone pays the editor's price; the story vanishes and the editor gets dirty money.
    setBuryPrice(c, ed, 200);
    const payer = mk("p", "Payer");
    payer.dirty = 150;
    payer.cash = 100;
    buryStory(c, payer, ed, target, ids, LATER + 2);
    expect(payer.dirty).toBe(0);
    expect(payer.cash).toBe(50);
    expect(ed.dirty).toBe(200);
    const page = frontPage("varrow", c, [], LATER + 3);
    expect([page.lead, ...page.stories.map((s) => s.headline)].join(" ")).not.toMatch(/embarrassing/);
    expect(() => buryStory(c, payer, ed, target, ids, LATER + 4)).toThrow(/already buried/);

    // The editor sees pulled stories and can run them again.
    expect(frontPage("varrow", c, [], LATER + 3, { editor: true }).buried[0].id).toBe(target);
    toggleStory(c, ed, target);
    expect(frontPage("varrow", c, [], LATER + 3).stories.concat([{ id: "", headline: frontPage("varrow", c, [], LATER + 3).lead, kind: "", at: 0 }]).some((s) => /embarrassing/.test(s.headline))).toBe(true);

    writeEditorial(c, ed, "  Read   all about it  ", LATER);
    expect(frontPage("varrow", c, [], LATER + 3).editorial?.text).toBe("Read all about it");
    expect(() => writeEditorial(c, payer, "hi", LATER)).toThrow(/Only the editor/);
  });
});
