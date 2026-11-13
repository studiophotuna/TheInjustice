import { getStore } from "@/server/store";

export const dynamic = "force-dynamic";

const notFound = () => new Response("Not found", { status: 404 });

/**
 * A player's uploaded photo, as an image. Lists of other players link here instead of carrying
 * the photo inline, and the link changes when the photo does (?v=), so browsers and the CDN keep
 * it for a year. Photos are already shown to everyone in the game; nothing private is served.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(id)) return notFound();
  const photo = await getStore().facePhoto(id);
  const m = photo?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!m) return notFound();
  return new Response(Buffer.from(m[2], "base64"), {
    headers: {
      "content-type": m[1],
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'",
    },
  });
}
