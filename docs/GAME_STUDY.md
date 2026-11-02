# INJUSTICE — Game Study & Modernization Plan

> Status: **Design study (pre-production)** — decisions recorded in §11.
> Deep design of the Law side: [LAW_PATH.md](LAW_PATH.md).
>
> No code yet. This document captures the original concept, what we can learn from the
> games that inspired it, and a proposal for how to give it a modern feel.

---

## 1. The concept (as remembered)

- You start as a **bum with $0**.
- You do **starter jobs** (odd jobs, scavenging, petty crime) to earn money.
- Doing jobs also **raises your stats** — but the stats are **hidden, even from you**.
- Those hidden stats decide **how strong you are** and **whether you survive attacks**
  from enemies / other players.
- Over time you **choose a profession** and climb from the gutter to power.

The original game can't be found online today. That's common for 90s/early-2000s
browser and WAP games — many were hosted by small studios and vanished. The closest
surviving relatives are **Torn City** (2003, still running) and **Mafia Wars** (Zynga,
2008–2016). Studying both gives us almost everything we need.

---

## 2. What the genre got right (keep these)

| Idea | Seen in | Why it works |
|---|---|---|
| Rags-to-riches start | Torn, Mafia Wars | Strong emotional arc; every dollar early on feels earned. |
| Jobs as the core action | Mafia Wars | One tap = progress. Simple, satisfying, mobile-friendly. |
| Stats grow from what you *do* | Torn (gym), Mafia Wars (skill points) | Your playstyle shapes your character. |
| Asynchronous PvP | Both | You can be attacked while offline → tension and reasons to come back. |
| Hospital / jail as consequences | Torn | Losing costs *time*, not your whole account. |
| Crews / families / factions | Both | Social glue; long-term retention. |
| Persistent world, no resets | Torn | Years of investment in one character. |

## 3. What aged badly (fix these)

| Problem | Modern fix |
|---|---|
| **Energy timers that just block you** ("come back in 4 hours") | Energy still exists, but has *choices*: rest, eat, use a cheap item, or do low-energy activities (planning, trading, socializing). |
| **Wall-of-text UI** | Card-based, mobile-first UI with short animations, sounds and clear feedback. |
| **Spam-your-friends growth** (Mafia Wars invites) | Crew recruitment in-game; referrals optional and never required. |
| **Veterans farming new players** | Newbie protection window + level-band matchmaking for attacks + bounty system that punishes bullies. |
| **Pay-to-win** | Cosmetics, convenience and a battle pass only. Never sell hidden stats. |
| **No story, endless grind** | Short narrative arcs per district/profession, NPC characters, weekly events. |
| **Fully hidden stats = feels random** | See section 5 — hidden numbers, *readable signals*. |

---

## 4. Core gameplay loop

```
        ┌──────────────┐
        │   DO A JOB   │  costs Energy (+ sometimes Nerve)
        └──────┬───────┘
               ▼
   💵 Money   +   🔒 hidden stat XP   +   ⚠️ Heat / risk
               ▼
        ┌──────────────┐
        │ SPEND / GROW │  food, gear, housing, training, bribes
        └──────┬───────┘
               ▼
   Unlock better jobs → choose a Profession → join a Crew
               ▼
        ┌──────────────┐
        │  CONFLICT    │  attack / be attacked / rob / defend turf
        └──────┬───────┘
               ▼
   Win: loot + respect   |   Lose: hospital time, lost cash on hand
               └─────────────────► back to jobs
```

**Session goal:** a satisfying 3–5 minute session on a phone, with optional deeper play.

---

## 5. The hidden stat system (the heart of the game)

This is the most unique idea and also the riskiest. If players see *nothing*, outcomes
feel random and unfair. The modern approach: **keep the numbers hidden, but leak
information through the world.**

### 5.1 Proposed hidden stats

| Stat | Grown by | Affects |
|---|---|---|
| **Strength** | Labor jobs, fights, gym | Damage dealt, carry capacity |
| **Toughness** | Sleeping rough, taking hits, manual work | HP, chance to survive an attack |
| **Agility** | Theft, running jobs, escaping | Dodge, escape, first strike |
| **Wits** | Scams, trading, reading, hacking | Job success, spotting ambushes, prices |
| **Nerve** | Risky jobs, crimes | Unlocks dangerous jobs, intimidation |
| **Charisma** | Hustling, talking, crew activity | Recruiting, bribes, negotiation |
| **Perception** | Investigations, patrols, surveillance | Finding evidence, spotting lies/ambushes, accuracy of gut reads |
| **Integrity** | Moral choices (can go **up or down**) | Clean vs. corrupt jobs, story endings, Internal Affairs risk |

Plus visible meters: **Health**, **Reputation**, **Heat** (how wanted you are) and, for
law players, **Suspicion** (Internal Affairs attention). See [LAW_PATH.md](LAW_PATH.md) §2.

### 5.2 How players "feel" their stats without seeing numbers

- **Body descriptions** on your profile: *"Scrawny" → "Wiry" → "Solid" → "Built like a wall"*.
- **Flavor messages** after jobs: *"Hauling crates is getting easier."*
- **Combat logs** that describe, not quantify: *"You barely felt that punch."*
- **NPC reactions**: a street doctor says *"You heal fast for a guy who sleeps on concrete."*
- **Scouting**: before attacking, you get a gut read — *"He looks like he could take you."*
  Higher Perception = more accurate read.
- **Rare assessments** tied to the story (clinic doctor after a hospital stay, academy
  exam or bar exam at promotions, a fight-pit promoter who appears at random). Never on
  demand, 7-day cooldown, reveals 1–3 stats as a tier band, never a number.
  Full rules: [LAW_PATH.md](LAW_PATH.md) §8.

Players get the mystery **and** the sense of progression.

### 5.3 Anti-frustration rules

- Stats grow with diminishing returns per job type → encourages variety.
- No stat ever goes *down* from normal play (injuries are temporary debuffs).
  Exception: **Integrity**, which is a moral compass and moves both ways.
- Fights use stats + small randomness, so a weaker player can occasionally win.
- **All stats live on the server.** Hidden means hidden from the client too —
  otherwise anyone can read them from network traffic.

---

## 6. Progression & professions

### 6.1 The Bum phase (tutorial, ~first hour)

Jobs: collect cans, beg, wash windshields, unload trucks, dig through dumpsters,
run errands for the corner shop. Goal: buy food, a sleeping bag, then a cheap room.

### 6.2 Choosing a profession

Professions are **chosen by the player** but **gated by hidden stats** — e.g. the
Enforcer path only opens once Strength + Nerve are high enough. The game tells you
*"Someone's been watching you work. They want to talk."* instead of showing numbers.

The name **Injustice** suggests both sides of the law, so we propose paths on both:

| Path | Profession | Fantasy | Main stats |
|---|---|---|---|
| Street | **Enforcer** | Muscle for hire, collector | Strength, Toughness, Nerve |
| Street | **Thief** | Burglary, heists | Agility, Wits |
| Street | **Hustler** | Dealing, scams, gambling | Charisma, Wits |
| Grey | **Street Medic** | Heal others, sell services | Wits, Charisma |
| Grey | **Hacker / Fixer** | Information, digital crime | Wits |
| Law | **Police** (8 ranks, 4 detective specialties) | Arrest, investigate, run a precinct | Toughness, Perception, Nerve |
| Law | **Courts** (8 ranks, Defense or Prosecution → Judge) | Trials, sentences, expunge records | Wits, Charisma, Perception |
| Law | **Vigilante** (8 ranks, secret identity) | Bounties, protect blocks, outside the law | Strength, Agility, Perception |

Each profession has its own job tree, gear and a short story arc. Switching is
possible but costly, so the choice matters.

The **Law side is the deepest path**: each branch has clean and corrupt variants driven
by Integrity, and together they form a player-driven justice loop (investigate →
warrant → arrest → trial → sentence) that connects to every Street player. NPCs fill
any role no player holds. Full design: [LAW_PATH.md](LAW_PATH.md).

### 6.3 Story spine

You weren't always a bum. You were **framed** for a crime you didn't commit — The
Verdict — and released from prison with nothing. Every path chases who did it and why,
each revealing a different piece of the conspiracy. Story beats are short comic-panel
chapters unlocked at rank milestones. See [LAW_PATH.md](LAW_PATH.md) §1.

---

## 7. Combat & survival

- **Asynchronous**: you attack another player's character; they don't need to be online.
- **Resolution**: server-side, rounds of attack vs. defense using hidden stats + gear.
- **Outcomes**: winner takes a share of the loser's *cash on hand* and Reputation;
  loser goes to **hospital** for a timer (shortened by medics or items).
- **Defense**: a **bank** protects money; housing and crew membership add defense.
- **Heat**: crimes raise Heat → more likely to be jailed or hunted by Vigilantes/Cops.
- **Protection**: new players can't be attacked for N days / until level X;
  attacking far-weaker players gives no reward and adds a bounty on you.
- **Revenge**: one-tap revenge on whoever hospitalized you, with a short buff.

---

## 8. Making it feel modern

1. **Mobile-first web app** (installable PWA) — playable on any phone, no app store needed at first.
2. **Juicy feedback** — micro-animations, haptics, sound, cash counters that roll up.
3. **Push notifications** that matter: *"You were attacked"*, *"Hospital timer done"*,
   *"Crew heist starting"* — never spammy.
4. **Narrative & world**: a city map with districts that unlock; NPCs with names and arcs.
5. **Live ops**: weekly events, seasonal leaderboards, limited-time jobs.
6. **Crews**: chat, shared vault, turf wars, crew heists that need multiple professions.
7. **Fair monetization**: cosmetics (outfits, avatars), season pass, convenience
   (extra job queue slot). **No buying stats or protection.**
8. **Anti-cheat by design**: every action validated server-side, rate-limited.
9. **Accessibility**: dark/light theme, readable fonts, color-blind safe indicators.

---

## 9. Tech direction (decided: multiplayer-ready from day one)

| Layer | Suggestion | Why |
|---|---|---|
| Frontend | Next.js (React) + Tailwind, PWA | Fast to build, works on phone + desktop |
| Backend / DB | Supabase (Postgres, Auth, Realtime, Edge Functions) | Hidden stats stay in DB with row-level security; realtime for attacks & chat |
| Hosting | Vercel | Simple deploys from this repo |
| Game logic | Server-side functions (job resolution, combat) | Hidden stats never sent to the client |
| Art | Comic-style SVG (see §11) | Tiny files, sharp on every screen |

**Why not single-player first?** Hidden stats must live on a server anyway, or players
can read them. If the first version ran all game logic in the browser, adding
multiplayer later would mean rewriting jobs, combat, the economy and saves. So we build
the server-side design from the start, and **launch with NPC opponents and NPC cops,
lawyers and judges**. It plays like single-player on day one. PvP and player-held
roles switch on later without a rewrite.

---

## 10. MVP scope (first playable)

1. Sign up → create character → start as a Bum with $0.
2. 6–8 starter jobs using Energy, granting money + hidden stat XP.
3. Body/feel descriptions and flavor messages (hidden-stat feedback).
4. Shop: food (restore energy), basic gear, cheap housing.
5. Bank to protect money.
6. First profession unlocks: **Police (ranks 1–3)** and **Enforcer**, 5 jobs each.
7. Heat + NPC arrest/jail loop; async attacks on NPCs + hospital timer.
8. Prologue + first comic chapter (The Verdict).
9. Doc Mercy assessment.
10. Leaderboard by Reputation.

Next: Courts and Vigilante branches, player-vs-player attacks and arrests, crews,
other street paths, turf map, events, monetization.

---

## 11. Decisions log

| # | Topic | Decision |
|---|---|---|
| 1 | **Name** | Keep **Injustice** as the working title and the story's core theme. Before any public launch, run a trademark search: Warner Bros. uses *Injustice* for DC video games, so a game sold under that exact name is a real risk. Backup names that keep the theme: **Crooked Scales**, **Gutter & Gavel**, **Concrete Verdict**, **Grayhaven**. Decide before launch, not now. *(Not legal advice; check with a trademark lawyer.)* |
| 2 | **Art style** | **Comic style.** Flat vector SVG with bold ink outlines, a limited palette and CSS halftone textures. Characters built from layered SVG parts so outfits are cheap to add. Story told in comic panels. Target: first load under 1 MB. |
| 3 | **Single vs. multiplayer** | **Multiplayer-ready from day one** (server-side logic), launched with NPCs so it plays like single-player at first. See §9. |
| 4 | **Law paths** | The **deepest path**: Police, Courts, Vigilante, 8 ranks each, clean/corrupt variants, player-driven justice loop. Two new hidden stats: **Perception** and **Integrity**. Balanced to be deeper, not stronger. See [LAW_PATH.md](LAW_PATH.md). |
| 5 | **Assessments** | Yes, but **rare and story-tied**, never an always-available coach. See §5.2. |

### Still open

1. **Platform**: web/PWA first (recommended) or native mobile?
2. **Monetization** plans, if any?
3. City name: **Grayhaven** (placeholder) — keep or change?

---

### References

- Torn (2003 browser game) — https://www.wikipedia.org/wiki/Torn_(2003_video_game)
- Torn wiki — https://wiki.torn.com
- Torn review — https://mmohuts.com/review/torn
- Mafia Wars (Zynga, 2008) — general genre reference
