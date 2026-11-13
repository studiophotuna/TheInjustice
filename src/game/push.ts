// Phone alerts while the game is closed. Pure: given a player and a stretch of time, what should
// their phone say? The server sends them every few minutes (see /api/push/tick).
import { maxEnergy, regenMs } from "./balance";
import { COUNTRY_BY_ID } from "./content/world";
import type { Player, PushSub } from "./types";

export const PUSH = {
  /** Most subscriptions kept per player (phone, tablet, laptop...). */
  maxSubs: 4,
  /** No alerts while they're looking at the game. */
  activeMs: 2 * 60_000,
  /** At most this many alerts in one go; the rest are summed up. */
  maxPerTick: 3,
};

export const PUSH_KINDS = [
  { id: "energy", label: "Energy full" },
  { id: "clinic", label: "Out of the clinic" },
  { id: "jail", label: "Out of jail" },
  { id: "travel", label: "Arrived" },
  { id: "school", label: "School decisions" },
  { id: "street", label: "Attacks, hits and messages" },
] as const;
export type PushKind = (typeof PUSH_KINDS)[number]["id"];

export interface Alert {
  kind: PushKind;
  title: string;
  body: string;
  url: string;
  at: number;
}

/** When energy will be full, given what was saved at the last tick. */
export function energyFullAt(p: Player): number {
  const max = maxEnergy(p.housing);
  if (p.energy >= max) return 0;
  return p.tickAt + (max - p.energy) * regenMs(p.housing);
}

/** What happened to this player between `since` and `now` that's worth a buzz. */
export function dueAlerts(p: Player, since: number, now: number): Alert[] {
  if (now - (p.seenAt ?? 0) < PUSH.activeMs) return [];
  const off = new Set(p.push?.off ?? []);
  const out: Alert[] = [];
  const within = (t: number | undefined | null) => !!t && t > since && t <= now;
  const add = (a: Alert) => {
    if (!off.has(a.kind)) out.push(a);
  };

  const full = energyFullAt(p);
  if (within(full) && !p.hospitalUntil && !p.jailUntil) add({ kind: "energy", title: "Energy full", body: "You're rested. The streets are waiting.", url: "/?go=tab:jobs", at: full });
  if (within(p.hospitalUntil)) add({ kind: "clinic", title: "Discharged", body: "You're out of the clinic. Back to the streets.", url: "/?go=tab:jobs", at: p.hospitalUntil });
  if (within(p.jailUntil) && !p.custodyCase) add({ kind: "jail", title: "Released", body: "Your time is up. You walk out of the cell.", url: "/", at: p.jailUntil! });
  if (p.travel && within(p.travel.arriveAt)) {
    const city = COUNTRY_BY_ID[p.travel.to]?.capital ?? "the city";
    add({ kind: "travel", title: `Arrived in ${city}`, body: "Your trip is over. See what happened on the way.", url: "/", at: p.travel.arriveAt });
  }
  if (p.application?.status === "pending" && within(p.application.decideAt)) {
    add({ kind: "school", title: "A letter from the dean", body: "The school has made a decision about you.", url: "/?go=tab:profile", at: p.application.decideAt });
  }
  const news = (p.inbox ?? []).filter((n) => !n.read && within(n.at)).sort((a, b) => a.at - b.at);
  for (const n of news) add({ kind: "street", title: n.fromName ?? "Crookvale", body: n.text, url: "/?go=tab:people", at: n.at });

  out.sort((a, b) => a.at - b.at);
  if (out.length <= PUSH.maxPerTick) return out;
  const keep = out.slice(0, PUSH.maxPerTick - 1);
  const rest = out.length - keep.length;
  return [...keep, { kind: "street", title: "Crookvale", body: `${rest} more things happened while you were away.`, url: "/", at: now }];
}

/** Adds (or refreshes) a phone's subscription. */
export function addSub(p: Player, sub: unknown, now: number): void {
  const s = sub as PushSub | null;
  const ok =
    !!s &&
    typeof s.endpoint === "string" &&
    /^https:\/\/[^\s]{10,500}$/.test(s.endpoint) &&
    typeof s.keys?.p256dh === "string" &&
    typeof s.keys?.auth === "string" &&
    s.keys.p256dh.length < 200 &&
    s.keys.auth.length < 100;
  if (!ok) throw new Error("bad subscription");
  const subs = (p.push?.subs ?? []).filter((x) => x.endpoint !== s!.endpoint);
  p.push = {
    ...(p.push ?? { checkedAt: now }),
    subs: [{ endpoint: s!.endpoint, keys: { p256dh: s!.keys.p256dh, auth: s!.keys.auth }, at: now }, ...subs].slice(0, PUSH.maxSubs),
    checkedAt: p.push?.checkedAt ?? now,
  };
}

export function removeSub(p: Player, endpoint: string): void {
  if (!p.push) return;
  p.push.subs = p.push.subs.filter((s) => s.endpoint !== endpoint);
}
