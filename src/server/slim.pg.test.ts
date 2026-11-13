import { describe, expect, it } from "vitest";
import { createPlayer } from "@/game/engine";
import { getStore, PRIVATE_FIELDS } from "./store";

// The slim reads against a real Postgres. Runs only when TEST_DATABASE_URL points at a database
// with the migrations applied (never production): TEST_DATABASE_URL=postgres://... npx vitest run slim.pg
const url = process.env.TEST_DATABASE_URL;
const NOW = Date.UTC(2027, 10, 1, 12);
const PHOTO = "data:image/jpeg;base64," + "A".repeat(4000);

describe.skipIf(!url)("slim players in Postgres", () => {
  it("listPeople, getPeople and facePhoto build the slim player in the database", async () => {
    process.env.DATABASE_URL = url;
    const store = getStore();
    const p = createPlayer("pgslim" + Math.floor(NOW / 1000), "Pg Slim", NOW, "solmarra");
    p.profile = { ...p.profile, photo: PHOTO, updatedAt: 77 } as typeof p.profile;
    p.log = [{ at: NOW, tone: "info", text: "private" }] as typeof p.log;
    await store.update(p.id, () => ({ player: p, result: null }));

    const listed = (await store.listPeople("solmarra", 40)).find((x) => x.id === p.id)!;
    expect(listed.name).toBe("Pg Slim");
    for (const k of PRIVATE_FIELDS) expect(Object.prototype.hasOwnProperty.call(listed, k)).toBe(false);
    expect(listed.profile?.photo).toBe(`/api/face/${p.id}?v=77`);

    const [byId] = await store.getPeople([p.id, "nobody"]);
    expect(byId.id).toBe(p.id);
    expect(byId.profile?.photo).toBe(`/api/face/${p.id}?v=77`);
    expect(await store.facePhoto(p.id)).toBe(PHOTO);

    const face = (await store.listFaces("solmarra", 40)).find((x) => x.id === p.id)!;
    expect(face.name).toBe("Pg Slim");
    expect(face.profile?.photo).toBe(`/api/face/${p.id}?v=77`);
    expect(face.stats).toBeUndefined();
    const [face2] = await store.getFaces([p.id]);
    expect(face2.path ?? null).toBe(p.path ?? null);
    await expect(store.transaction(async (tx) => tx.putPlayer(byId))).rejects.toThrow(/slimmed/);
    expect((await store.get(p.id))?.log?.length).toBe(1);
  });
});
