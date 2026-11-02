import "server-only";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { GameError } from "@/game/types";

const scrypt = (pw: string, salt: Buffer, len: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(pw, salt, len, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

export const SESSION_COOKIE = "inj_session";
export const GUEST_COOKIE = "inj_sid";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

export function validateUsername(raw: unknown): string {
  const u = typeof raw === "string" ? raw.trim() : "";
  if (!/^[A-Za-z0-9_]{3,20}$/.test(u)) {
    throw new GameError("Username: 3–20 letters, numbers or underscores.");
  }
  return u;
}

export function validatePassword(raw: unknown): string {
  const pw = typeof raw === "string" ? raw : "";
  if (pw.length < 8 || pw.length > 128) throw new GameError("Password: at least 8 characters.");
  return pw;
}

/** Format: scrypt$N$r$p$salt$hash (base64). */
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, KEYLEN, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, saltB64, keyB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await scrypt(pw, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Burns the same time as a real check, so unknown usernames can't be detected by timing. */
const DUMMY_HASH = hashPassword("not-a-real-password");
export async function dummyVerify(pw: string): Promise<void> {
  await verifyPassword(pw, await DUMMY_HASH);
}

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only token hashes are stored, so a database leak doesn't hand out live sessions. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function accountPlayerId(accountId: string): string {
  return `acct_${accountId}`;
}

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Rejects cross-site form posts: browsers can't send JSON cross-origin without a preflight. */
export function assertJson(req: Request): void {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new GameError("Bad request.");
  }
}
