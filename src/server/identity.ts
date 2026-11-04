import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { accountPlayerId, cookieOptions, GUEST_COOKIE, hashToken, SESSION_COOKIE } from "./auth";
import { getStore } from "./store";

const SID_RE = /^[a-f0-9]{48}$/;

export interface Identity {
  /** Key of the character this request plays. */
  playerId: string | null;
  account: { id: string; username: string } | null;
  guestId: string | null;
}

const DEVICE_COOKIE = "cns_dev";

/**
 * Anti-cheat: a long-lived random id for this browser, and a salted hash of the IP address
 * (the address itself is never stored). Characters played from the same device are linked.
 */
export async function deviceInfo(): Promise<{ deviceId: string | null; ipHash: string | null }> {
  const jar = await cookies();
  let deviceId = jar.get(DEVICE_COOKIE)?.value ?? null;
  if (!deviceId || !SID_RE.test(deviceId)) {
    deviceId = randomBytes(24).toString("hex");
    try {
      jar.set(DEVICE_COOKIE, deviceId, cookieOptions(60 * 60 * 24 * 730));
    } catch {
      deviceId = null; // Cookies can't be set while rendering; the next action sets it.
    }
  }
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim();
  const ipHash = ip ? createHash("sha256").update(`${process.env.IP_HASH_SALT ?? "conspira"}:${ip}`).digest("hex").slice(0, 16) : null;
  return { deviceId, ipHash };
}

/** Moderators: accounts listed in ADMIN_USERNAMES (comma-separated, case-insensitive). */
export function isAdmin(identity: Identity): boolean {
  const list = (process.env.ADMIN_USERNAMES ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!identity.account && list.includes(identity.account.username.toLowerCase());
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
