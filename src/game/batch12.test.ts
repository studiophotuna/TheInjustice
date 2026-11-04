import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { applyAction, createPlayer, tick } from "./engine";
import { PROFILE } from "./profile";
import { profileFor } from "./social";
import { toView } from "./view";

const T0 = 1_800_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (id: string, name: string) => {
  const p = createPlayer(id, name, T0);
  tick(p, LATER);
  return p;
};
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("player profiles", () => {
  it("a short intro and a photo, shown to other players", () => {
    const p = mk("p", "Pia");
    applyAction(p, { type: "profile", bio: "  Came up   from the Gutter.\nNever going back.  ", photo: PNG }, LATER, always(0.5));
    expect(toView(p, LATER).profile).toEqual({ bio: "Came up from the Gutter. Never going back.", photo: PNG });
    const other = mk("o", "Olly");
    expect(profileFor(other, p, LATER)).toMatchObject({ bio: "Came up from the Gutter. Never going back.", photo: PNG });
  });

  it("intros are capped, photos must be small images, and changes are rate-limited", () => {
    const p = mk("p", "Pia");
    applyAction(p, { type: "profile", bio: "x".repeat(500) }, LATER, always(0.5));
    expect(p.profile?.bio?.length).toBe(PROFILE.bioMax);
    expect(() => applyAction(p, { type: "profile", bio: "again" }, LATER + 1000, always(0.5))).toThrow(/moment/);
    const later = LATER + PROFILE.cooldownMs + 1;
    expect(() => applyAction(p, { type: "profile", photo: "javascript:alert(1)" }, later, always(0.5))).toThrow(/won't work/);
    expect(() => applyAction(p, { type: "profile", photo: "data:image/svg+xml;base64,PHN2Zz4=" }, later, always(0.5))).toThrow(/won't work/);
    expect(() => applyAction(p, { type: "profile", photo: "data:image/png;base64," + "A".repeat(PROFILE.photoMaxChars) }, later, always(0.5))).toThrow(/won't work/);
    // Removing a photo, keeping the intro.
    applyAction(p, { type: "profile", photo: PNG }, later, always(0.5));
    applyAction(p, { type: "profile", photo: null }, later + PROFILE.cooldownMs + 1, always(0.5));
    expect(p.profile?.photo).toBeNull();
    expect(p.profile?.bio?.length).toBe(PROFILE.bioMax);
  });
});
