import { isAdmin, resolveIdentity } from "@/server/identity";
import { getStore } from "@/server/store";

export const dynamic = "force-dynamic";

const notFound = () => new Response("Not found", { status: 404 });

/**
 * Serves an uploaded frame or banner. Approved images are public and cached; anything still
 * waiting (or rejected) is shown only to its owner and to moderators.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{8,32}$/.test(id)) return notFound();
  const u = await getStore().getUpload(id);
  if (!u) return notFound();
  if (u.status !== "approved") {
    const who = await resolveIdentity(false);
    if (who.playerId !== u.playerId && !isAdmin(who)) return notFound();
  }
  const m = u.data.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!m) return notFound();
  return new Response(Buffer.from(m[2], "base64"), {
    headers: {
      "content-type": m[1],
      "cache-control": u.status === "approved" ? "public, max-age=86400, immutable" : "private, no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'",
    },
  });
}
