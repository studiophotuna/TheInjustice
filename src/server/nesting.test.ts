import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FileStore, StoreNestingError, guarded, nestingLog } from "./store";

// Online, a transaction holds the only database connection. A store call made inside it (not
// through `tx`) would wait for that connection forever, so the guard fails it at once.

const fresh = (strict: boolean) => guarded(new FileStore(path.join(mkdtempSync(path.join(tmpdir(), "cns-")), "p.json")), strict);

describe("store calls inside a transaction", () => {
  it("strict (online): a nested call fails fast instead of hanging; tx calls are fine", async () => {
    const store = fresh(true);
    await expect(
      store.transaction(async (tx) => {
        await tx.getPlayers(["a"]);
        await store.get("a");
      }),
    ).rejects.toBeInstanceOf(StoreNestingError);
    // A nested transaction is caught too.
    await expect(store.transaction(async () => store.transaction(async () => 1))).rejects.toBeInstanceOf(StoreNestingError);
  });

  it("calls before and after a transaction are not affected", async () => {
    const store = fresh(true);
    expect(await store.get("a")).toBeNull();
    expect(await store.transaction(async (tx) => (await tx.getPlayers(["a"]))[0])).toBeNull();
    expect(await store.get("a")).toBeNull();
  });

  it("locally it logs the call (with where it came from) and lets it through", async () => {
    const store = fresh(false);
    const before = nestingLog.length;
    expect(await store.transaction(async () => store.get("a"))).toBeNull();
    expect(nestingLog.length).toBe(before + 1);
    expect(nestingLog.at(-1)!.method).toBe("get");
  });
});
