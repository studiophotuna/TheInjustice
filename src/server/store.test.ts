import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileStore } from "./store";

describe("FileStore action throttling", () => {
  let directory = "";

  afterEach(async () => {
    if (directory) await rm(directory, { recursive: true, force: true });
    directory = "";
  });

  it("rejects the sixteenth action inside the five-second burst window", async () => {
    directory = await mkdtemp(path.join(tmpdir(), "injustice-rate-limit-"));
    const store = new FileStore(path.join(directory, "players.json"));
    for (let i = 0; i < 15; i++) {
      await store.throttleAction("session:test", 1_000 + i, 15, 5_000, 120);
    }
    await expect(store.throttleAction("session:test", 2_000, 15, 5_000, 120)).rejects.toThrow(
      "You're going too fast. Give it a few seconds.",
    );
  });

  it("allows actions again after the rolling minute window expires", async () => {
    directory = await mkdtemp(path.join(tmpdir(), "injustice-rate-limit-"));
    const store = new FileStore(path.join(directory, "players.json"));
    for (let i = 0; i < 15; i++) {
      await store.throttleAction("session:test", 1_000 + i, 15, 5_000, 120);
    }
    await store.throttleAction("session:test", 62_000, 15, 5_000, 120);
  });
});
