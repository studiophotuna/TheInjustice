# INJUSTICE — Game Study & Modernization Plan

> Status: **Design study (pre-production)**. No code yet. This document captures the
> original concept, what we can learn from the games that inspired it, and a proposal
> for how to give it a modern feel. Open questions are listed at the end.

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

Plus a visible-but-vague **Health** and **Reputation** (street cred).

### 5.2 How players "feel" their stats without seeing numbers

- **Body descriptions** on your profile: *"Scrawny" → "Wiry" → "Solid" → "Built like a wall"*.
- **Flavor messages** after jobs: *"Hauling crates is getting easier."*
- **Combat logs** that describe, not quantify: *"You barely felt that punch."*
- **NPC reactions**: a street doctor says *"You heal fast for a guy who sleeps on concrete."*
- **Scouting**: before attacking, you get a gut read — *"He looks like he could take you."*
  Higher Wits = more accurate read.
- **Rare paid/earned "assessment"** (a boxing coach, a doctor) that gives a rough tier.

Players get the mystery **and** the sense of progression.

### 5.3 Anti-frustration rules

- Stats grow with diminishing returns per job type → encourages variety.
- No stat ever goes *down* from normal play (injuries are temporary debuffs).
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
| Law | **Corrupt Cop** | Badge + bribes; can jail players | Toughness, Nerve, Charisma |
| Law | **Lawyer** | Get crew out of jail, legal schemes | Wits, Charisma |
| Law | **Vigilante** | Hunts high-Heat criminals for bounties | Strength, Agility |

Each profession has its own job tree, gear and a short story arc. Switching is
possible but costly, so the choice matters.

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

## 9. Suggested tech direction (to confirm)

| Layer | Suggestion | Why |
|---|---|---|
| Frontend | Next.js (React) + Tailwind, PWA | Fast to build, works on phone + desktop |
| Backend / DB | Supabase (Postgres, Auth, Realtime, Edge Functions) | Hidden stats stay in DB with row-level security; realtime for attacks & chat |
| Hosting | Vercel | Simple deploys from this repo |
| Game logic | Server-side functions (job resolution, combat) | Hidden stats never sent to the client |

---

## 10. MVP scope (first playable)

1. Sign up → create character → start as a Bum with $0.
2. 6–8 starter jobs using Energy, granting money + hidden stat XP.
3. Body/feel descriptions and flavor messages (hidden-stat feedback).
4. Shop: food (restore energy), basic gear, cheap housing.
5. Bank to protect money.
6. First profession unlock (Enforcer or Hustler) with 5 jobs.
7. Simple async PvP attack + hospital timer + newbie protection.
8. Leaderboard by Reputation.

Later: more professions, crews, turf map, events, law-side paths, monetization.

---

## 11. Open questions for the designer

1. **Name**: "Injustice" is also the title of the DC/NetherRealm fighting game series
   (*Injustice: Gods Among Us*). That's probably why searching is hard, and it may be
   a trademark risk. Keep it with a subtitle (e.g. *Injustice: Streets*), or rename?
2. **Setting & tone**: gritty realistic city, 90s nostalgia, or stylized/comic?
3. **Single-player first or multiplayer from day one?** (Single-player is faster to
   prototype; PvP needs a backend from the start.)
4. **Law-side professions** (Cop, Lawyer, Vigilante) — in the MVP or later?
5. **How hidden is hidden?** Pure descriptions only, or allow a rare "assessment" item?
6. **Platform**: web/PWA first (recommended), or native mobile?
7. **Monetization** plans, if any?

---

### References

- Torn (2003 browser game) — https://www.wikipedia.org/wiki/Torn_(2003_video_game)
- Torn wiki — https://wiki.torn.com
- Torn review — https://mmohuts.com/review/torn
- Mafia Wars (Zynga, 2008) — general genre reference
