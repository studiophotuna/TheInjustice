# Injustice

A modern take on the classic text-based crime RPG. You were framed, jailed, and released
with nothing. Start as a bum with $0 in **The Gutter** of Grayhaven, work your way up, and
grow hidden stats that decide whether you survive.

## Play it locally

Needs Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
```

Other commands:

```bash
npm test           # game rule tests
npm run lint       # type check
npm run build && npm start   # production build
```

Locally, game saves are stored in `.data/players.json` (set `INJUSTICE_DATA_FILE` to change
it). Delete that file to wipe all characters.

## Online (Supabase + Vercel)

When `DATABASE_URL` or `POSTGRES_URL` is set, saves go to Postgres instead. Online, that's
the Supabase project **injustice** (Singapore), table `injustice.players` in a private
schema the public Supabase API can't reach. Setup SQL: `supabase/migrations/`.

On Vercel, `POSTGRES_URL` is provided automatically by the Supabase integration once the
Supabase project is connected to the Vercel project. Without it, the deployed game shows
"The game database isn't connected yet" instead of losing saves.

## What's in the first playable version

- Create a character and read the opening comic, **Chapter 0 · The Verdict**.
- 11 street jobs across The Gutter, Old Market and Iron Row, unlocked as you progress.
- **Hidden stats** (strength, toughness, agility, wits, nerve, charisma, perception,
  integrity). They are never sent to the browser. You see words ("Scrawny", "Lean"…),
  flavor messages when you improve, and a "gut read" before fights.
- **Timers**: energy and health refill over time; hospital stays after a knockout; heat
  (how wanted you are) cools down.
- **Smart pop-ups**: when energy is full you get a pop-up with a **Go to job →** button,
  plus a phone/desktop notification if alerts are on.
- Shop (food, housing, weapons, armor, medkits), bank (muggers can't steal banked money),
  fights against street NPCs, random muggings.
- Two career paths with 3 ranks each: **Police** (law) and **Enforcer** (street).
  Offers appear when your hidden stats are high enough. Police can also take bribes, which
  quietly lowers Integrity.
- **Doc Mercy** assessment after a hospital stay (rough comparison, never numbers).
- Leaderboard and event log.
- Installable as a web app on phones (Add to Home Screen).

## How the code is organized

| Folder | What it holds |
|---|---|
| `src/game/` | Game rules: pure functions, no I/O. `engine.ts` (actions), `combat.ts`, `stats.ts`, `view.ts` (the only data sent to players) |
| `src/game/content/` | Jobs, items, NPCs, districts, paths, story. Adding content is mostly editing these |
| `src/game/balance.ts` | All tunable numbers (timers are shortened for testing) |
| `src/server/` | Storage and request validation |
| `src/app/api/game/` | The single game API (`GET` state, `POST` action) |
| `src/components/` | The comic-style UI |

All rules run on the server, so the game is ready for multiplayer. Storage sits behind a
small `PlayerStore` interface (`src/server/store.ts`) with a Postgres version for Supabase and a JSON file version
for local development.

## Design docs

- [Game study & decisions](docs/GAME_STUDY.md)
- [Law path](docs/LAW_PATH.md)
- [World: countries & cities](docs/WORLD.md)
- [Timers, pop-ups & monetization](docs/TIMERS_AND_MONETIZATION.md)
