import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createPlayer } from "@/game/engine";
import { FileStore, PRIVATE_FIELDS, guarded } from "./store";

// 8.1: lists of other players (the city pulse, People, chat authors) read slim copies. They leave
// out what only the owner sees, link to uploaded photos instead of carrying them, and can never be
// saved over the full player.

const NOW = Date.UTC(2027, 10, 1, 12);
const PHOTO = "data:image/jpeg;base64," + "A".repeat(4000);

async function setup() {
  const store = guarded(new FileStore(path.join(mkdtempSync(path.join(tmpdir(), "cns-")), "p.json")), true);
  const p = createPlayer("slimtest01", "Test Slim", NOW, "solmarra");
  p.profile = { ...p.profile, photo: PHOTO, updatedAt: 123 } as typeof p.profile;
  p.log = [{ at: NOW, tone: "info", text: "private" }] as typeof p.log;
  p.inbox = [{ id: "n1", at: NOW, text: "private", read: false }] as unknown as typeof p.inbox;
  await store.update(p.id, () => ({ player: p, result: null }));
  return { store, p };
}

describe("slim players", () => {
  it("leave out the private parts and link to the photo", async () => {
    const { store, p } = await setup();
    const [s] = await store.listPeople("solmarra", 10);
    expect(s.id).toBe(p.id);
    expect(s.name).toBe("Test Slim");
    for (const k of PRIVATE_FIELDS) expect(Object.prototype.hasOwnProperty.call(s, k)).toBe(false);
    expect(s.profile?.photo).toBe(`/api/face/${p.id}?v=123`);
    expect(JSON.stringify(s).length).toBeLessThan(JSON.stringify(p).length - 3000);
    // The full player is untouched.
    const full = await store.get(p.id);
    expect(full?.profile?.photo).toBe(PHOTO);
    expect(full?.log?.length).toBe(1);
  });

  it("the face link serves the real photo", async () => {
    const { store, p } = await setup();
    expect(await store.facePhoto(p.id)).toBe(PHOTO);
    expect(await store.facePhoto("nobody")).toBeNull();
  });

  it("getPeople fetches several at once and skips unknown ids", async () => {
    const { store, p } = await setup();
    const got = await store.getPeople([p.id, "nobody", p.id]);
    expect(got.map((x) => x.id)).toEqual([p.id]);
  });

  it("faces carry only what the street feed, chat and city tiles use", async () => {
    const { store, p } = await setup();
    const full = (await store.get(p.id))!;
    full.crewId = "crew1";
    full.fugitive = { until: NOW + 60_000 } as typeof full.fugitive;
    full.seenAt = NOW;
    await store.update(p.id, () => ({ player: full, result: null }));
    const [f] = await store.listFaces("solmarra", 10);
    expect(f.name).toBe("Test Slim");
    expect(f.profile?.photo).toBe(`/api/face/${p.id}?v=123`);
    expect(f.crewId).toBe("crew1");
    expect(f.fugitive?.until).toBe(NOW + 60_000);
    expect(f.seenAt).toBe(NOW);
    expect(f.stats).toBeUndefined();
    expect(JSON.stringify(f).length).toBeLessThan(600);
    const [g] = await store.getFaces([p.id]);
    expect(g.id).toBe(p.id);
    await expect(store.transaction(async (tx) => tx.putPlayer(g))).rejects.toThrow(/slimmed/);
  });

  it("can never be saved over the full player", async () => {
    const { store, p } = await setup();
    const [s] = await store.getPeople([p.id]);
    await expect(store.transaction(async (tx) => tx.putPlayer(s))).rejects.toThrow(/slimmed/);
    expect((await store.get(p.id))?.log?.length).toBe(1);
  });
});
