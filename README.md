# Injustice

A modern take on the classic text-based crime RPG. You were framed, jailed, and released
with nothing. Start as a bum with $0 in **The Gutter** of Grayhaven, work your way up, and
grow hidden stats that decide whether you survive.

**Play online:** https://injustice-booking-cms.vercel.app

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

- Play as a guest right away, or **sign up / log in** (username + password) to keep your
  character on any device. Signing up keeps the guest character you already have.
- Read the opening comic, **Chapter 0 · The Verdict**.
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
- **Schools**: Police and Courts are entered through the Grayhaven Police Academy and the
  Halloway School of Law. Pay tuition from the bank, or get vouched for by a contact for
  free; the dean reviews every application. Rank 1 is the student rank, rank 2 is graduation.
- Six career paths with **8 ranks** each: **Police**, **Courts** and **Vigilante** (law),
  **Medicine**, **Banking**, and **Mafia** (street: Associate, Soldier, Made Man, Capo, Consigliere, Underboss, Boss, Don). Each has a contact who approaches you when your hidden stats and
  habits fit, its own jobs, and a corrupt option that quietly lowers Integrity.
- **Four countries, all open**: choose where to live when you create your character —
  Grayhaven (Varrow), Port Solace (Solmarra), Ironmoor (Kestrova) or Halcyon (Meridian).
  Each has its own districts, jobs, enemies and laws (pay, heat and prices differ).
- **Travel** by bus, train or airplane: slower is cheaper, and each has a danger — planned
  gang ambushes on buses, pickpockets on trains, customs stops on planes if you're wanted.
  Career work goes with you; everything else is local.
- **Housing per country**: each country keeps its own home. Move abroad and you're sleeping
  rough until you rent there; your old place is still waiting when you come back.
- **Banking** career in Port Solace (The Exchange district, Solace Institute of Finance,
  Isadora Quell vouches). Bankers earn interest on their savings.
- **Community** (People tab): see who's in your city, chat (global, city, crew), and an inbox
  for what other players do to you.
  - **Attack other players** in the same country: the winner takes 10% of the loser's cash on
    hand (the bank is safe). Never fatal. Newcomers are protected for their first hours, you
    can't bully much weaker players, and there's a cooldown per target. Revenge in one tap.
  - **Players vouch for players**: rank 5+ in a school career can vouch once a day; the dean
    still decides.
  - **Crews**: only street bosses (Mafia at Capo, rank 4, or higher) can found one,
    for $500. The leader picks who can join: **Open** (anyone joins), **On request** (the
    leader approves) or **Invite only** (the leader invites from the People list). Shared
    vault, crew chat, +5% job pay.
- **Businesses**: buy one in any country (paid from the bank) and collect hourly income.
- **Account recovery**: a one-time recovery code is shown at sign-up; use it with
  "Forgot password?" to set a new password. Players can generate a new code in the Me tab.
- **Daily**: a login reward with a 7-day streak, three daily contracts, and a boxing gym in
  every city to train the stat you choose.
- **Medicine** career (8 ranks, Doc Mercy vouches) at St. Brigid's in Grayhaven or Halcyon
  University of Medicine; medics heal twice as fast. Kestrova also has its own Police college.
- **Story**: the mystery of who framed you, told in comic chapters that unlock as you play
  (one for everyone, two per career), replayable from the Map tab. Story progress survives
  death.
- **Death**: being knocked out by someone far stronger can kill you. Hidden stats are halved,
  cash, gear, housing and career are lost, bank savings survive. You continue as a new life,
  keeping your name or choosing a new one, and the game tells you that you feel weak.
- **Doc Mercy** assessment after a hospital stay (rough comparison, never numbers).
- **Layout**: a Home tab (greeting scene, your next move, career progress, daily reward, story,
  inbox), Jobs grouped by district chips, Fight, Shop, People and Map. Illustrated comic
  scenes (streets, city, high rises, police station, hospital) and characters (bum, thug,
  detective, lawyer, doctor, banker, vigilante) are drawn as SVG in `src/components/art/`.
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
