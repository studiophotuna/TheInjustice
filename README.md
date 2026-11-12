# Conspira

*Every move has an agenda.*

(Formerly "Injustice". The repository, data files and environment variables keep their old names.)

A modern take on the classic text-based crime RPG. You were framed, jailed, and released
with nothing. Start as a bum with $0 in **The Gutter** of Grayhaven, work your way up, and
grow hidden stats that decide whether you survive.

**Play online:** https://injustice-booking-cms.vercel.app

**Current version:** 7.12.0. Every release is listed in [CHANGELOG.md](CHANGELOG.md); the
[latest changes](#where-the-game-is-now) are summed up at the end of this page.

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
- **Careers make you better at them.** Joining a career and every promotion quietly raise
  that career's key hidden stats, more at higher ranks. It's never shown.
- **Practice**: repeating the same job or exercise teaches less and less, but the effect fades
  with rest (half every 12 hours), so mixing work and coming back tomorrow both pay off.
- **Random muggings never kill**: they can put you in the clinic and take half your cash, but
  death only comes from fights you choose.
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
  - **Witness protection**: the mayor or the police chief can read the case files and put a
  case's witnesses under police protection ($50 from the treasury). Protected witnesses can't
  be leaned on; the Mafia sees "there are cops outside their doors".
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
  the mayor, and a caught mayor is fined, held and removed from office. Lives in City Hall (City tab).
- **Reputation** is your public standing, separate from career rank: it unlocks districts and
  schools, protects weaker players from you, decides who can run for mayor, and ranks the
  leaderboard. Promotions don't use it.
- **Online now**: Home and People show who in your city has the game open right now. Tap a
  name to attack, pickpocket, snatch or mug them in one more tap.
- **Police chief and soup kitchen**: the mayor appoints a Detective+ as police chief (can
  order crackdowns, paid daily from the treasury) and pays for free meals that feed players
  with almost nothing (+energy, once every 6 hours).
- **Prison breaks**: when a crew member is serving a sentence, any crewmate can plan a
  breakout, others join (up to 5), and the planner gives the signal. The odds depend on the
  team (more people; bolder, quicker, sharper, stronger members) and drop in strict countries
  and during crackdowns. The crew only hears the odds as words ("slim", "decent"…). Success
  frees the prisoner (everyone gains heat); failure puts the whole team in cells and adds time
  to the sentence.
- **The prison yard**: everyone behind bars in a country shares a yard (People → Yard while
  you're locked up). Inmates get a yard-only chat, can fight each other for respect (no cash,
  no hospital: the guards break it up), work prison shifts ($3–6, hard labor, and 2 minutes
  off a sentence for good behavior), and crew leaders doing time can recruit fellow inmates.
- **Protection after a fight**: survive an attack or a mugging and nobody can attack or mug you
  for 4 hours (the HUD shows "Protected"). Attacking someone ends your own protection.
- **Bail**: anyone (the suspect too) can post bail for someone held for trial: 3× what was
  stolen, at least $100, from the bank. The suspect waits outside; the trial still happens,
  and the money goes back to whoever paid it at the verdict.
- **Recall**: residents can sign a petition against the mayor; enough signatures (half the
  last election's turnout, at least 3) remove them and open a special election.
- **Crew wars**: crew leaders claim districts ($1,000 from the vault) and take 5% of what
  outsiders earn there. A rival leader can declare war: for 30 minutes members of both crews
  join their side, then team strength (with a home advantage) decides who holds it.
- **Bounties**: put money on anyone's head; whoever beats them in a fight collects. "Wanted"
  shows on people lists.
- **Revenge contracts**: robbery victims post a reward; a Mafia player tracks the robber from
  the clues and, if they find and beat them, returns the money and takes the reward.
- **Loans**: Bankers lend at up to 20% and seize an overdue borrower's savings; Mafia loan
  sharks lend at any rate and collect overdue debts by force.
- **Search warrants**: a detective searches a suspect's home (warrant granted only if they fit
  the clues); stolen goods found make the case airtight at the arrest.
- **Lawyers on retainer**: a week of an attorney's time; if you're arrested, they defend you.
- **Back-alley doctors**: doctors can take cash to get patients out of the clinic today, with
  no paperwork except a secret ledger internal affairs can find.
- **Campaigns and vote buying**: candidates spend on posters and rallies (shown on the ballot,
  breaks ties) or quietly pay residents for votes, which internal affairs can catch.
- **The newspaper**: each city's paper prints the week's verdicts, scandals, wars and city news,
  plus crime numbers, never who did an unsolved crime.
- **City events**: a heat wave, festival, blackout, storm or payday changes pay, crime odds and
  witnesses for an hour.
- **Street titles** earned by what you do, and **anonymous season leaderboards** each month:
  entries never show names ("Someone in the Mafia"); you only learn your own place.
- **Dirty and clean money**: crime pays dirty money (loot, criminal jobs, drug sales, heist
  shares, bribes and payoffs taken). Dirty money pays for anything illegal (dealers, bribes,
  bought votes, bounties, back-alley doctors) and is spent first, but the bank and the shops
  won't take it. Launder it in the Shop: the laundromat (30% fee), your own business in this
  country (10%, limited per day), or, for bank officers, their own back office (5%).
- **Drugs**: buy and sell on the street (Shop tab); prices differ by city and change every hour,
  so smuggling pays, but a trip can get your stash seized (planes most, buses least). People
  with science (Doctors most, sharp minds a little) cook drugs from lab supplies; better
  chemists make more and blow up the lab less.
- **Bank heists**: a crew leader plans a bank job; members take the roles of driver
  (agility), safecracker (wits), lookout (perception) and muscle (strength). Each role rolls
  on its member: no driver means everyone is caught, no safecracker means no money, no
  lookout means double heat, no muscle means everyone gets hurt. The take is dirty money.
- **Your first day**: a checklist on Home walks new players through jobs, food, the daily
  reward, the bank, the gym, fights, the story, People, city hall and careers, with $15 a
  step and a bonus at the end.
- **Bankers launder for clients**: Bank Tellers and up open a laundering service at a fee they
  set (5–50%); clients see them in the Shop. The banker keeps the fee and a ledger internal
  affairs can find.
- **Money-laundering investigations**: launderings of $500+ (any method) are flagged
  anonymously; detectives follow the money, and if they find who, it's a fine and a cell.
- **Drug busts**: police can frisk anyone with heat; drugs found are seized and mean a cell
  (longer for more). Frisking someone clean costs the officer reputation.
- **Crew drug labs**: a crew leader sets one up ($2,000 from the vault) in a random district;
  members with chemistry cook twice as much there, but every batch makes the neighbors more
  suspicious. Hot labs show up as tips for detectives, who can raid them (lab gone, half the
  vault fined).
- **Real footage**: scenes (Home, districts, case files, courthouse, prison yard, lab, laundering,
  the street market, city hall, the jail card) are short silent looping clips from Mixkit's free
  stock video (see public/scenes/CREDITS.md), with the illustrated scenes as a fallback and a
  still poster for players who prefer reduced motion or are saving data.
- **Businesses**: buy one in any country (paid from the bank) and collect hourly income.
- **Account recovery**: a one-time recovery code is shown at sign-up; use it with
  "Forgot password?" to set a new password. Players can generate a new code in the Me tab.
- **Daily**: a login reward with a 7-day streak, three daily contracts, and a boxing gym in
  every city to train the stat you choose.
- **Medicine** career (8 ranks, Doc Mercy vouches) at St. Brigid's in Grayhaven or Halcyon
  University of Medicine; medics heal twice as fast. Kestrova also has its own Police college.
- **Story**: the mystery of who framed you, told in comic chapters that unlock as you play
  (one for everyone, two per career), replayable from the City tab. Story progress survives
  death.
- **Death**: being knocked out by someone far stronger can kill you. Hidden stats are halved,
  cash, gear, housing and career are lost, bank savings survive. You continue as a new life,
  keeping your name or choosing a new one, and the game tells you that you feel weak.
- **Doc Mercy** assessment after a hospital stay (rough comparison, never numbers).
- **Layout**: a Home tab (greeting scene, your next move, career progress, daily reward, story,
  inbox), Jobs grouped by district chips, Fight, Shop, People and City. Illustrated comic
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
| `src/components/` | The UI (React). `Game.tsx` is the shell: top bar, navigation, quick bar, overlays |
| `src/app/tokens.css` | The one sheet of colours, sizes and spacing every stylesheet uses |
| `src/app/syndicate.css` | The look (the syndicate kit), loaded last |

All rules run on the server, so the game is ready for multiplayer. Storage sits behind a
small `PlayerStore` interface (`src/server/store.ts`) with a Postgres version for Supabase and a JSON file version
for local development.

Online there is one database connection per server instance, and a transaction holds it. Inside
`store.transaction(...)`, read and write only through its `tx`; do any other reads before the
transaction opens. A guard in `store.ts` fails a store call made inside a transaction online
(instead of letting it hang) and logs it locally with where it came from.

## Design docs

- [Game study & decisions](docs/GAME_STUDY.md)
- [Law path](docs/LAW_PATH.md)
- [World: countries & cities](docs/WORLD.md)
- [Timers, pop-ups & monetization](docs/TIMERS_AND_MONETIZATION.md)
- [Design lessons and the syndicate kit](docs/DESIGN_LESSONS.md) (read before changing how anything looks)
- [Monetization rules](docs/MONETIZATION.md) (Favors buy looks, never power)
- [Professional fees: the real-life reference](docs/FEES.md) (check new fees against it)
- [Realism check: the game against real life](docs/REALISM.md)

## The City: buildings

The City tab is a grid of buildings you walk into; each one holds everything that happens there:

- **Police Station**: witness sightings, case files, envelopes, narcotics and financial crimes, internal affairs.
- **Courthouse**: trials, bail, the court record, your lawyer on retainer.
- **Hospital**: Doc Mercy's check-ups, the clinic's patients, the back-alley door.
- **Bank**: your account, laundering (and bankers' own services), loans, the compliance desk.
- **Academy**: enroll at a school (tuition or a vouch), the dean's decision, student coursework, graduation with your degree.
- **City Hall**: the mayor, elections, the paper, turf, the police chief, the soup kitchen.
- **Prison**: the yard, when you're doing time.
- **The Street**: the drug market, rackets, contracts, cold cases.
- **Station**: travel between countries.

Links anywhere in the game can open a building directly with `place:<id>` (for example `place:bank`).

## Trophies, alliances and the editor

- **Season trophies:** when a month ends, the top three in money made, fights won and arrests
  claim a trophy and a prize ($1,000 / $500 / $250, into the bank) from the season card in Me.
  Boards stay anonymous; trophies are private unless the winner ticks "show my trophies", which
  puts them next to their name in People.
- **Crew alliances:** a crew leader proposes an alliance from the Crew tab, the other leader
  accepts. Up to two allies. Allies can fight on each other's side in turf wars, can't declare war
  on each other, and don't pay each other protection money. Either leader can break it.
- **The newspaper editor:** the mayor appoints a resident (reputation 15+) to run the city paper.
  The editor writes a column, pulls or restores stories, draws $60 a day from the treasury, and
  sets a price for burying a story. Anyone can pay that price (dirty money first) to make a story
  vanish from the front page; the envelope goes to the editor as dirty money.

## The family, the secret forum, issued weapons and the Military

- **The family's rules (Mafia promotions).** Hard work alone gets you to Soldier. After that:
  - **Made Man:** you must be *made*: pass Kozak's test (the one-time "make your bones" contract,
    Soldier and up), or be sworn in by your crew leader in a making ceremony ($500 from the vault,
    once you've done a crew job).
  - **Consigliere / Underboss:** you must be in a crew and have taken part in its organized crime
    (bank jobs, turf wars, prison breaks): 2 and 5 crew jobs.
  - **Boss:** you must lead a crew (8 crew jobs).
  - **Don:** you lead a crew, your crew has taken or claimed a district under you, and it has pulled
    off a bank job (12 crew jobs).
  - The career hint says what the family is waiting for. Players already above a gate keep their rank.
- **Only the Mafia joins crews.** Other careers can't join, request or be invited. Members who joined
  before this rule keep their place.
- **Secret forum.** A crew leader opens one ($200 from the vault) and invites anyone, of any career,
  from the People list. Guests read and post in it from People → Crew without joining the crew. The
  leader can remove guests or shut it down; guests can leave.
- **Issued weapons.** Never for sale, handed back if you leave the career:
  - Police: service pistol on graduation (Patrol Officer), body armor at Detective.
  - Military: service rifle on graduation (Private), combat armor at Sergeant, light machine gun at
    Captain, heavy assault armor at Colonel.
- **The Military** (law career). Enroll at the Ironmoor Military Academy in Kestrova ($300), or get
  recruited by Sergeant Major Brann (for people who train hard at the gym). Ranks: Recruit, Private,
  Corporal, Sergeant, Lieutenant, Captain, Colonel, General. Jobs at Checkpoint Row: drills, the
  obstacle course, the rifle range, border checkpoint duty, convoy escorts, squad patrols, raids on
  smugglers' depots, war games, running the garrison. Soldiers can **stand guard at the bank**
  (Bank building, 1 hour, paid by the city): each guard on duty (up to 3) makes bank jobs in that
  city 10% harder at every role.

## Omertà, martial law, court-martials and the black market

- **Omertà.** A made man who walks out on a crew (while others remain) is a **rat** for a week:
  the family takes back his "made" status, nobody promotes or re-makes him, a 🐀 Rat badge shows
  next to his name, and his old crew can attack him through fight protection and the "picking on
  someone small" rule. Beating the rat earns his old crewmates +5 reputation.
- **Martial law.** The mayor can call in the army for two hours ($300 from the treasury, once a
  day). Soldiers (Corporal and up) can then march into a turf war ("Break it up"). When the war is
  settled, if the soldiers outgun both crews the war is called off, the district stays with its
  holder, every fighter is arrested by military police for 15 minutes, and each soldier is paid
  $50 by the city. An outgunned squad just gets bruised.
- **Court-martial.** A soldier convicted in court is court-martialed automatically. Officers
  (Lieutenant and up) can bring charges against lower-ranked soldiers: they stick if the soldier's
  record is dirty or they sold army gear, and cost the officer reputation if not. The sentence is
  two ranks down (gear they no longer rate is taken back), or a dishonorable discharge for a
  Recruit or Private.
- **Army gear on the black market.** Corporals and up can offer a stolen army rifle (Captains and
  up: a machine gun) to a Mafia player from the People list, once a day, at their own price
  ($100–$5,000). The buyer pays from the Black market card on the Street, dirty money first, and
  the soldier is paid in dirty money. Each sale goes on a hidden ledger: internal affairs (soldiers
  Corporal and up are now auditable officials) and court-martials can find it.

## Gear, arson and portraits (v1.2.0)

- **Gear slots.** Equip one weapon and one armor (Me → Gear). Gear wears out with every fight;
  repair it at the shop, or replace it when it breaks. Issued gear: free armory service once a day.
- **Torch a business** (Mafia in a crew): from the People list, against rivals' businesses in your
  city. Closes it for 12 hours on success; can land you in a cell on failure.
- **Career portraits**: looping real-footage clips in `public/portraits/` (credits in
  `public/scenes/CREDITS.md`).
- **Whacking** is designed but not built: see `WHACK.md`.

## Contract hits (v1.3.0)

Crew leaders put out contracts on rivals; a made man cases the target and carries it out. The
target notices they're being watched and can hire bodyguards, lie low or go to the police, and
detectives can stake out a reported threat. A player killed by a hit keeps their career but
loses a rank, their cash and gear, and spends eight hours in the morgue; the killer faces a
murder case and a three-day vendetta. Full rules in `WHACK.md`.

## Moderation and anti-cheat (v1.5.0)

- Moderators are the accounts listed in the `ADMIN_USERNAMES` environment variable
  (comma-separated). They work from `/admin`.
- `IP_HASH_SALT` salts the IP hashes used to spot alt accounts; raw IP addresses are never stored.
- Reports live in `injustice.reports` (migration `supabase/migrations/20261104120000_reports.sql`).

## Old wounds, the soft cap and crew ambushes (v1.7.0)

- Old wounds (`src/game/wounds.ts`) lower max health after fights you chose; doctors operate.
- XP gains slow above a stat value of 70 (`BALANCE.statSoftCap`).
- Crew ambushes (`src/game/ambush.ts`): attackers, a driver and a lookout; see `CHANGELOG.md`.

## A living city (v1.8.0)

- Street regulars (`src/game/regulars.ts`, `src/server/regulars.ts`): game-run characters stored
  as players with ids starting `reg-`. `listPlayers` never returns them; `listRegulars` does.
- `/api/community?pulse=1` returns the street feed and what your crew needs from you.

## Where the game is now

Everything since 1.8, in short. The details are in [CHANGELOG.md](CHANGELOG.md).

**Your story.** Home opens on your case: who framed you, what you can prove, and your next lead.
Leads (`src/game/leads.ts`) are short missions built from things you already do (work, fights,
standing, travel, paying the right person). Closing one pins evidence to the board on the City
page. Chapters of your story unlock as you go.

**Careers.** Ten careers on the law and street sides: police, courts, medicine, banking,
vigilante, enforcer (the family), military, mechanic, hacker and fire. Each has eight ranks, nearly all
with their own photo, its own city work (the hospital ward, the fire log, the garage and so
on), and experience for every job done. The Jobs page is a career track with a cover card for
every job.

**A living city.** Twenty street regulars per city (`src/game/regulars.ts`) live like players, with limits:
they work their careers, shop, eat, get treated, own spare gear, run for mayor and vote. The
city runs on a timer (`/api/push/tick`): fires, incidents, restocks, the dog pound and elections. The
live feed shows the street the news. Officials (police, courts, fire, the mayor) also see case
numbers and investigation work. Covert and corrupt work is never posted (`src/game/feed.ts`).

**The economy.** Player-run shops set their own price level, which is what customers see and pay
(the owner sees it on their own shelf too). City hall is funded by a 3% income tax, a 6% sales
tax and court fines; the state pays fire rewards and soldiers. Shops sell what each city stocks, and gear is limited to three of a kind. The
black market trades items by rarity. Player-run businesses earn from real customers. There are
also cars and smuggling, a home stash, break-ins, customs and the Velvet Ace casino in Port
Solace.

**Crime and the law.** Crews, fronts, turf wars, ambushes, arson, contract hits, prison life,
escapes and hideouts. Then court cases, lawyers, court-martials and martial law. Risk is only
ever shown in words, never as odds.

**Favors.** The paid currency buys looks only: frames, name colours, banners, car paint and home
decor, plus a season pass. It never buys power (see `docs/MONETIZATION.md`).

**The look (7.x).** The syndicate kit: Outfit and Plus Jakarta Sans, crimson, amber and green
by meaning, glass panels and pills. One sheet of colours and sizes (`src/app/tokens.css`).
- **Phones:** five tabs (Home, Work, City, People, Me). Fight sits inside Work and the Shop
  inside City. The top bar and quick bar fold away as you scroll.
- **Desktop:** a side menu and a live rail.
- **Fights:** every fight ends on a result plate.
- **Confirmations and amounts:** the game asks its own questions, including amounts, instead of
  browser pop-ups.
- **New players:** the first-day checklist is pinned to the top of Home, and coach marks give
  them a first look around.

## Releasing

Every push to `claude/injustice-game-design-1lp7d6` deploys to production on Vercel. For each
release:

1. Run `npx tsc --noEmit`, `npx vitest run` and `npm run build`.
2. Check the changed screens in a browser at phone (390px) and desktop widths.
3. Bump the version with `npm version X.Y.Z --no-git-tag-version` and add a `CHANGELOG.md` entry.
4. Update this README if what the game does has changed.
5. Commit and push.
