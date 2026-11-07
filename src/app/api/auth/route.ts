import { cookies } from "next/headers";
import { reportError } from "@/server/errors";
import { NextResponse } from "next/server";
import { GameError } from "@/game/types";
import {
  accountPlayerId,
  assertJson,
  cookieOptions,
  dummyVerify,
  GUEST_COOKIE,
  hashPassword,
  hashToken,
  newSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  validatePassword,
  validateUsername,
  verifyPassword,
} from "@/server/auth";
import { getStore, StoreConfigError } from "@/server/store";
import { randomBytes, timingSafeEqual } from "node:crypto";

/** A human-friendly one-time code, e.g. "K7QM-2XRP-9WTD-4HNB". Only its hash is stored. */
function newRecoveryCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(16);
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
  return chars.match(/.{4}/g)!.join("-");
}

const normCode = (c: unknown) => (typeof c === "string" ? c.toUpperCase().replace(/[^A-Z0-9]/g, "") : "");

async function issueRecovery(accountId: string): Promise<string> {
  const code = newRecoveryCode();
  await getStore().setRecovery(accountId, hashToken(normCode(code)));
  return code;
}

export const dynamic = "force-dynamic";

const GENERIC_LOGIN_ERROR = "Wrong username or password.";

async function startSession(accountId: string) {
  const token = newSessionToken();
  await getStore().createSession(hashToken(token), accountId, Date.now() + SESSION_TTL_MS);
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_MS / 1000));
}

/** If this device played as a guest, move that character into the account (when it has none). */
async function claimGuest(accountId: string): Promise<boolean> {
  const jar = await cookies();
  const guest = jar.get(GUEST_COOKIE)?.value;
  if (!guest || !/^[a-f0-9]{48}$/.test(guest)) return false;
  const moved = await getStore().claimPlayer(guest, accountPlayerId(accountId));
  if (moved) jar.delete(GUEST_COOKIE);
  return moved;
}

export async function POST(req: Request) {
  try {
    assertJson(req);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const store = getStore();

    if (body.op === "new_recovery") {
      const token = (await cookies()).get(SESSION_COOKIE)?.value;
      const session = token ? await store.getSession(hashToken(token)) : null;
      if (!session) throw new GameError("Log in first.");
      return NextResponse.json({ ok: true, recoveryCode: await issueRecovery(session.accountId) });
    }

    if (body.op === "recover") {
      const username = validateUsername(body.username);
      const password = validatePassword(body.password);
      const account = await store.findAccount(username);
      const given = Buffer.from(hashToken(normCode(body.code)));
      const stored = Buffer.from(account?.recoveryHash ?? "x".repeat(64));
      if (account?.lockedUntil && account.lockedUntil > Date.now()) {
        throw new GameError("Too many failed attempts. Try again in 15 minutes.");
      }
      const ok = !!account?.recoveryHash && given.length === stored.length && timingSafeEqual(given, stored);
      if (!account || !ok) {
        if (account) await store.recordLogin(account.id, false);
        throw new GameError("That username and recovery code don't match.");
      }
      await store.setPassword(account.id, await hashPassword(password));
      await store.recordLogin(account.id, true);
      await startSession(account.id);
      // The old code is used up; hand out a fresh one.
      const recoveryCode = await issueRecovery(account.id);
      return NextResponse.json({ ok: true, username: account.username, recoveryCode });
    }

    if (body.op === "logout") {
      const jar = await cookies();
      const token = jar.get(SESSION_COOKIE)?.value;
      if (token) await store.deleteSession(hashToken(token));
      jar.delete(SESSION_COOKIE);
      return NextResponse.json({ ok: true });
    }

    if (body.op === "delete_account") {
      // Gone for good: the character, its login, its chat messages and uploads.
      const jar = await cookies();
      const token = jar.get(SESSION_COOKIE)?.value;
      const session = token ? await store.getSession(hashToken(token)) : null;
      const guest = jar.get(GUEST_COOKIE)?.value;
      let playerId: string;
      if (session) {
        const account = await store.findAccount(session.username);
        if (!account) throw new GameError("Log in first.");
        if (account.lockedUntil && account.lockedUntil > Date.now()) {
          throw new GameError("Too many failed attempts. Try again in 15 minutes.");
        }
        const ok = typeof body.password === "string" && (await verifyPassword(body.password, account.passwordHash));
        await store.recordLogin(account.id, ok);
        if (!ok) throw new GameError("That password isn't right.");
        playerId = accountPlayerId(account.id);
      } else if (guest && /^[a-f0-9]{48}$/.test(guest)) {
        if (body.confirm !== "DELETE") throw new GameError('Type DELETE to confirm.');
        playerId = guest;
      } else {
        throw new GameError("There's no character on this device.");
      }
      const player = await store.get(playerId);
      if (player?.crewId) throw new GameError("Leave your crew first, so it isn't left hanging.");
      await store.eraseCharacter(playerId, session?.accountId ?? null);
      jar.delete(SESSION_COOKIE);
      jar.delete(GUEST_COOKIE);
      return NextResponse.json({ ok: true });
    }

    const username = validateUsername(body.username);
    const password = validatePassword(body.password);

    if (body.op === "register") {
      const account = await store.createAccount(username, await hashPassword(password));
      if (!account) throw new GameError("That username is taken.");
      await startSession(account.id);
      const claimed = await claimGuest(account.id);
      const recoveryCode = await issueRecovery(account.id);
      return NextResponse.json({ ok: true, username: account.username, claimed, recoveryCode });
    }

    if (body.op === "login") {
      const account = await store.findAccount(username);
      if (!account) {
        await dummyVerify(password);
        throw new GameError(GENERIC_LOGIN_ERROR);
      }
      if (account.lockedUntil && account.lockedUntil > Date.now()) {
        throw new GameError("Too many failed attempts. Try again in 15 minutes.");
      }
      const ok = await verifyPassword(password, account.passwordHash);
      await store.recordLogin(account.id, ok);
      if (!ok) throw new GameError(GENERIC_LOGIN_ERROR);
      await startSession(account.id);
      const claimed = await claimGuest(account.id);
      return NextResponse.json({ ok: true, username: account.username, claimed });
    }

    throw new GameError("Bad request.");
  } catch (e) {
    if (e instanceof GameError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof StoreConfigError) return NextResponse.json({ error: e.message }, { status: 503 });
    reportError("api/auth", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
