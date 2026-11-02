import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { hashPassword, hashToken, MAX_FAILED_LOGINS, validatePassword, validateUsername, verifyPassword } from "./auth";
import { FileStore } from "./store";
import { createPlayer } from "@/game/engine";

describe("passwords", () => {
  it("verify only the right password and never store it in plain text", async () => {
    const h = await hashPassword("correct horse");
    expect(h).not.toContain("correct horse");
    expect(await verifyPassword("correct horse", h)).toBe(true);
    expect(await verifyPassword("wrong horse", h)).toBe(false);
    expect(await hashPassword("correct horse")).not.toBe(h); // salted
  });

  it("validates usernames and passwords", () => {
    expect(validateUsername(" Rook_99 ")).toBe("Rook_99");
    expect(() => validateUsername("ab")).toThrow();
    expect(() => validateUsername("no spaces")).toThrow();
    expect(() => validatePassword("short")).toThrow();
    expect(validatePassword("long enough")).toBe("long enough");
  });

  it("hashes session tokens", () => {
    expect(hashToken("abc")).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });
});

describe("account store (file)", () => {
  const fresh = () => new FileStore(path.join(mkdtempSync(path.join(tmpdir(), "inj-")), "db.json"));

  it("rejects duplicate usernames regardless of case", async () => {
    const s = fresh();
    expect(await s.createAccount("Rook", "h")).not.toBeNull();
    expect(await s.createAccount("rook", "h")).toBeNull();
    expect((await s.findAccount("ROOK"))?.username).toBe("Rook");
  });

  it("locks an account after too many failed logins", async () => {
    const s = fresh();
    const a = (await s.createAccount("Rook", "h"))!;
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) await s.recordLogin(a.id, false);
    expect((await s.findAccount("Rook"))!.lockedUntil).toBeGreaterThan(Date.now());
    await s.recordLogin(a.id, true);
    expect((await s.findAccount("Rook"))!.lockedUntil).toBeNull();
  });

  it("sessions expire and can be revoked", async () => {
    const s = fresh();
    const a = (await s.createAccount("Rook", "h"))!;
    await s.createSession("live", a.id, Date.now() + 60_000);
    await s.createSession("old", a.id, Date.now() - 1);
    expect(await s.getSession("live")).toEqual({ accountId: a.id, username: "Rook" });
    expect(await s.getSession("old")).toBeNull();
    await s.deleteSession("live");
    expect(await s.getSession("live")).toBeNull();
  });

  it("moves a guest character into an account only if the account has none", async () => {
    const s = fresh();
    await s.update("guest1", () => ({ player: createPlayer("guest1", "Rook", 0), result: null }));
    expect(await s.claimPlayer("guest1", "acct_1")).toBe(true);
    expect((await s.get("acct_1"))?.id).toBe("acct_1");
    expect(await s.get("guest1")).toBeNull();
    await s.update("guest2", () => ({ player: createPlayer("guest2", "Other", 0), result: null }));
    expect(await s.claimPlayer("guest2", "acct_1")).toBe(false);
    expect((await s.get("acct_1"))?.name).toBe("Rook");
  });
});
