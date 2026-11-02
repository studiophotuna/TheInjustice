import { cookies } from "next/headers";
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

    if (body.op === "logout") {
      const jar = await cookies();
      const token = jar.get(SESSION_COOKIE)?.value;
      if (token) await store.deleteSession(hashToken(token));
      jar.delete(SESSION_COOKIE);
      return NextResponse.json({ ok: true });
    }

    const username = validateUsername(body.username);
    const password = validatePassword(body.password);

    if (body.op === "register") {
      const account = await store.createAccount(username, await hashPassword(password));
      if (!account) throw new GameError("That username is taken.");
      await startSession(account.id);
      const claimed = await claimGuest(account.id);
      return NextResponse.json({ ok: true, username: account.username, claimed });
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
    console.error(e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
