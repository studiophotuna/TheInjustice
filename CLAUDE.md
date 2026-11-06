# Conspira (TheInjustice)

Web crime RPG: Next.js App Router, React, TypeScript. Game logic is pure modules in `src/game`,
API routes in `src/app/api`, UI in `src/components`, styles in `src/app/globals.css` and
`src/app/game.css`.

## Before changing how anything looks

Read `docs/DESIGN_LESSONS.md` first. The short version:

- Characters break the frame; scale contrast; cover art for everything; color-coded tiles; live
  widgets; faces everywhere; one strict kit.
- No explainer paragraph on every card, no icon in front of every title, no emoji in UI text,
  no chip clutter, no mixed art styles, no casino styling, no generic AI character art.
- Never show win odds or success percentages to players.
- Paid features follow `docs/MONETIZATION.md`: Favors buy looks, never power.
- Mock up two screens with real data before rolling a visual change into the game, and check your
  own screenshots before sending them.

## Working rules

- Check before shipping: `npx tsc --noEmit`, `npx vitest run`, `npm run build`, then a browser
  check of the changed screens at phone (390px) and desktop widths.
- Bump the version in `package.json` and `package-lock.json` and add a `CHANGELOG.md` entry for
  each release.
- Don't copy other games' names, rank titles or text; take ideas only.
