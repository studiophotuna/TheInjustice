import { defaultFace, rankPortrait } from "@/game/content/faces";
// Characters are shown as framed photos: one photo per career rank. (Background-removed
// cut-outs were dropped: the removal was never clean enough.)

/** No cut-outs: every card shows the framed photo. Kept so callers stay simple. */
export function cutoutFor(path: string | null | undefined, rank: number | null | undefined): string | null {
  void path;
  void rank;
  return null;
}

/** No cut-outs for faces either. */
export function faceCutout(photo: string | null | undefined): string | null {
  void photo;
  return null;
}

/** The photo for a career at a rank, for small avatars of yourself. */
export function careerStill(path: string | null | undefined, rank: number | null | undefined): string | null {
  return path ? rankPortrait(path, rank) : null;
}

/** A photo face for a player without an uploaded photo: always the same one for the same name. */
export function facePhoto(name: string, path?: string | null): string {
  void path;
  return defaultFace(name).src;
}
