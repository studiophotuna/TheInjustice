// How fast one person can send actions. Generous for a human tapping quickly, tight enough that
// a script can't hammer the server or farm faster than people play.
//
// Kept in memory on each server instance: a burst from one client lands on the same warm
// instance, which is what this guards against. Energy and timers already cap what anyone can
// earn; this caps the load and the spam.
import { GameError } from "@/game/types";

export const RATE = {
  /** At most this many actions in any `burstMs` window... */
  burst: 15,
  burstMs: 5_000,
  /** ...and this many in any minute. */
  perMinute: 120,
};

const hits = new Map<string, number[]>();
let sweptAt = 0;

/** Records one action for `key`; throws if it's over the limit. */
export function throttle(key: string, now = Date.now()): void {
  if (now - sweptAt > 60_000) {
    for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > 60_000) hits.delete(k);
    sweptAt = now;
  }
  const list = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  const recent = list.filter((t) => now - t < RATE.burstMs).length;
  if (recent >= RATE.burst || list.length >= RATE.perMinute) {
    hits.set(key, list);
    throw new GameError("You're going too fast. Give it a few seconds.");
  }
  list.push(now);
  hits.set(key, list);
}

/** Who is asking: their session or guest cookie, else their address. */
export function requester(req: Request): string {
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)(inj_session|inj_sid)=([^;]+)/);
  if (m) return `${m[1]}:${m[2].slice(0, 64)}`;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return `ip:${ip}`;
}

/** Test helper. */
export function resetThrottle(): void {
  hits.clear();
}
