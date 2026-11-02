import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { accountPlayerId, cookieOptions, GUEST_COOKIE, hashToken, SESSION_COOKIE } from "./auth";
import { getStore } from "./store";

const SID_RE = /^[a-f0-9]{48}$/;

export interface Identity {
  /** Key of the character this request plays. */
  playerId: string | null;
  account: { id: string; username: string } | null;
  guestId: string | null;
}

/** Logged-in account first; otherwise the anonymous guest cookie (created on demand). */
export async function resolveIdentity(createGuest: boolean): Promise<Identity> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const guest = jar.get(GUEST_COOKIE)?.value;
  const guestId = guest && SID_RE.test(guest) ? guest : null;

  if (token && token.length <= 100) {
    const session = await getStore().getSession(hashToken(token));
    if (session) {
      return {
        playerId: accountPlayerId(session.accountId),
        account: { id: session.accountId, username: session.username },
        guestId,
      };
    }
  }
  if (guestId) return { playerId: guestId, account: null, guestId };
  if (!createGuest) return { playerId: null, account: null, guestId: null };
  const fresh = randomBytes(24).toString("hex");
  jar.set(GUEST_COOKIE, fresh, cookieOptions(60 * 60 * 24 * 365));
  return { playerId: fresh, account: null, guestId: fresh };
}
