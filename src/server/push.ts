// Sends phone alerts with Web Push. Keys come from the environment:
// NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (and optionally PUSH_CRON_SECRET).
import webpush from "web-push";
import { dueAlerts, removeSub } from "@/game/push";
import type { PushSub } from "@/game/types";
import type { PlayerStore } from "./store";

const SITE = "https://injustice-booking-cms.vercel.app";

let ready: boolean | null = null;
export function pushReady(): boolean {
  if (ready !== null) return ready;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  ready = !!(pub && priv);
  if (ready) webpush.setVapidDetails(SITE, pub!, priv!);
  return ready;
}

/** Sends one alert to one phone. Returns false if the phone has unsubscribed for good. */
async function send(sub: PushSub, payload: object): Promise<boolean> {
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload), { TTL: 60 * 60 });
    return true;
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) return false;
    console.error("push failed", code);
    return true;
  }
}

/** Works out and sends everything that's due. Called every few minutes. */
export async function pushTick(store: PlayerStore, now: number): Promise<{ players: number; sent: number }> {
  if (!pushReady()) return { players: 0, sent: 0 };
  const players = await store.listPushPlayers(2000);
  let sent = 0;
  for (const p of players) {
    if (now - (p.push!.checkedAt ?? 0) < 2 * 60_000) continue;
    // Never reach further back than half an hour: no flood after downtime.
    const since = Math.max(p.push!.checkedAt ?? 0, now - 30 * 60_000);
    const alerts = dueAlerts(p, since, now);
    const dead: string[] = [];
    for (const a of alerts) {
      for (const s of p.push!.subs) {
        if (dead.includes(s.endpoint)) continue;
        if (await send(s, { title: a.title, body: a.body, url: a.url, tag: a.kind })) sent++;
        else dead.push(s.endpoint);
      }
    }
    await store.update(p.id, (q) => {
      if (!q?.push) return { player: null, result: null };
      q.push.checkedAt = now;
      for (const d of dead) removeSub(q, d);
      return { player: q, result: null };
    });
  }
  return { players: players.length, sent };
}
