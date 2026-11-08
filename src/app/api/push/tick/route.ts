// The database's timer calls this every few minutes to send phone alerts that are due.
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { reportError } from "@/server/errors";
import { pushTick } from "@/server/push";
import { getStore } from "@/server/store";
import { allCityIncidents } from "@/server/incidents";

export const maxDuration = 60;

/** With PUSH_CRON_SECRET set, only callers that send it get through. Without it the timer is
 *  open: calling it often only re-checks players, and each player is checked at most every two
 *  minutes, so nothing is sent twice. */
function allowed(req: Request): boolean {
  const want = process.env.PUSH_CRON_SECRET;
  if (!want) return true;
  const got = req.headers.get("x-cron-secret") ?? "";
  if (got.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

export async function GET(req: Request) {
  if (!allowed(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  try {
    const store = getStore();
    const now = Date.now();
    // The same timer keeps the cities alive: their own people get into trouble now and then.
    const incidents = await allCityIncidents(store, now);
    return NextResponse.json({ ...(await pushTick(store, now)), incidents });
  } catch (e) {
    reportError("api/push/tick", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
