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
- **Promotion is earned, not counted.** Harder work counts more toward your next review
  (higher-rank jobs, risky jobs, demanding jobs); easy work well below your rank barely counts,
  and casework counts too (arrests, verdicts, exams, bank reports, hunts, rackets). Your key
  hidden stats must also be good enough. No numbers are shown: your boss's attitude tells you
  how close you are. Work above your rank stays hidden until you get there, and actions your
  rank or career can't do aren't shown.
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
  - **Street crime and witnesses**: pickpocket, snatch or mug another player. It's anonymous:
    the victim only gets a case number. Players active nearby get a pop-up to **report it or
    look away**. A report gives the police one clue (body type, how they moved, part of their
    name like "…esk", crew patch) and some clues are wrong. Stand-in bystanders leave tips when
    the streets are empty. The criminal hears that "someone talked", never who.
  - **Case files**: police (Patrol Officer and up) read the city's cases; Detectives can work
    a scene once for a reliable clue, see which players fit the clues, and **arrest** one.
  - **Courthouse**: an arrest puts the suspect in custody and opens a trial. Attorneys (Courts
    rank 2+) prosecute or defend, which moves the case strength. A Judge (Courts rank 7+)
    rules guilty or not guilty; if no judge rules within 30 minutes, the court clerk decides on
    the evidence. Guilty means jail time (no jobs, crimes or travel) and paying the victim back.
    Suspects can send the judge an envelope from their bank; a judge who takes it lets them
    walk and loses integrity. Wrongful convictions are possible, and only the real criminal
    ever knows. Every verdict goes on the public court record.
  - **Every career helps**: Doctors (Intern+) examine victims of snatches and muggings for a
    reliable clue about the attacker's build or speed, and speed up their recovery. Bankers
    (Loan Officer+) see cash deposited within 2 hours of a crime by account number only: report
    it (bank records give a name clue) or bury it for a 10% fee and lose integrity. Vigilantes
    (Night Patroller+) hunt suspects on cold cases: win and the victim is paid back, lose and
    you're hurt; either way you draw heat.
  - **The Mafia fights back**: in "Your jobs", Mafia Soldiers+ see their own open cases and how
    many witnesses talked, and can lean on them once: a scared witness takes back their
    statement, a brave one gives the police another clue. Capos+ can leave an envelope on a
    police officer's desk to lose the file: taking it buries the case for everyone; refusing
    returns the money and puts a solid clue about the briber in the file.
  - **Internal affairs**: Police Sergeants+ audit officials (police, bankers, judges) once a
    day each. Hidden records of taken envelopes, buried deposits and lost files come out: a
    fine of twice the money, a demotion and 20 minutes held. Clean officials gain reputation.
    Every exposure goes on the public court record.
  - **Crews**: only street bosses (Mafia at Capo, rank 4, or higher) can found one,
    for $500. The leader picks who can join: **Open** (anyone joins), **On request** (the
    leader approves) or **Invite only** (the leader invites from the People list). Shared
    vault, crew chat, +5% job pay.
- **City hall**: every country elects a mayor for a two-week term. The ballot opens for the
  last three days of each term (right away if the office is empty). Running costs $500 and
  needs 25 reputation; every resident who isn't brand new gets one secret vote. The mayor:
  sets the city tax (0–10%, withheld from job pay and business income into the treasury),
  pays police a bounty per conviction from the treasury, orders a one-hour crackdown once a
  day (crime is harder, hotter and draws more bystanders), pardons one prisoner per term, and
  draws a daily salary. Mayors can also quietly skim the treasury; internal affairs can audit
  the mayor, and a caught mayor is fined, held and removed from office. Lives in the Map tab.
- **Reputation** is your public standing, separate from career rank: it unlocks districts and
  schools, protects weaker players from you, decides who can run for mayor, and ranks the
  leaderboard. Promotions don't use it.
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
