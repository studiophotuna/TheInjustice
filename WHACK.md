# Whacking: design and how it was built

**Built in v1.3.0** with every recommendation below (code: `src/game/hit.ts`). The "Decision
needed" questions were answered "go with the recommendations": softer player-kill death, full
counterplay from the start, Mafia-only hitmen.

## As built

| | Value |
|---|---|
| Who orders | The crew leader, from the People list ("Put out a contract") |
| Who carries it out | A made man in the crew (Made Man and up), the leader included |
| Cost | $25,000 + $5,000 × the target's rank, from the crew vault into escrow |
| Targets | Not new players, not in the hospital, morgue, a cell, on the road or lying low; not more than 3 ranks below the hitman; not crewmates or allies; one contract per target per week |
| Casing | 3 trips, an hour apart, 20 energy each; the hit can't happen until 12 hours after the order |
| Hit chance | 25–60%: hitman nerve, agility, strength and weapon against target perception, toughness and armor; bodyguards multiply it by 0.55 |
| Kill / wound | 1 in 3 hits kill, 2 in 3 wound (2–6 hours in hospital, cash on hand lost, heavy gear wear) |
| Player-kill death | Career kept, one rank lost, merit reset, cash, dirty money and equipped gear lost, 8 hours in the morgue |
| Pay | Escrow to the hitman as dirty money: all of it for a kill, half for a wounding (rest back to the vault); a botch returns a quarter |
| Botch | The target learns who it was; the hitman gets heat and a 50% chance of a cell |
| Vendetta | For 3 days the victim and their crew can attack the hitman through any protection |
| Case file | Murder (6-hour sentence) or attempted murder (2-hour sentence), with witnesses, tips, detectives and a trial |
| After a hit | The hitman can't be promoted for 3 days; one hit per hitman every 3 days |
| Counterplay | Bodyguards ($2,000 a day), lie low in a safe house ($300, 6 hours, once a day: no work, no fights, can't be found), tell the police |
| Police | Detectives (rank 4+) see threat reports in the Police Station and can stake one out (20 energy): if the hit is live and they spot the hitman, it's blown and the hitman is held 45 minutes for conspiracy to murder |
| Calling it off | The leader gets half the escrow back |

---

# The original analysis

A "whack" is a planned hit on another player that can leave them **dead or badly injured**. This
is the most powerful thing one player could do to another, so this note looks at it before any
code is written.

## What death means today

Death only comes from fights with NPCs (a small chance when badly outmatched). When you die you:

- lose **your career and rank** (back to nobody), all items and gear, housing, cash on hand and
  dirty money;
- keep **half** your hidden stats and half your reputation, and all bank savings.

Player-vs-player attacks are never fatal today: the loser goes to the clinic and loses 10% of
their cash.

**This is the core problem.** If a whack used today's death, one successful hit would wipe out
weeks of someone else's work (a regular player needs about 9 weeks to reach the top rank). That is
the fastest way to make people quit, and it rewards ganging up on players who are offline.

## Risks

| Risk | Why it matters |
|---|---|
| Losing weeks of progress to one roll | Players who lose a career they spent weeks on often leave the game. |
| Hitting people who are offline | The target can't react, so it isn't a contest. |
| Big players farming small ones | A Don with a crew could keep killing new players. |
| Alt accounts | A player could make throwaway characters to order hits without risk. |
| Crews dog-piling one person | Several hitmen in a row with no way out. |
| Harassment | Killing the same person again and again. |

## Recommendation

Build whacking as a **slow, expensive, risky contract** with real counterplay, and make
player-caused death **softer than NPC death**.

### 1. Who can order and carry out a hit

- Only the **Mafia**, from **Made Man** up, can carry out a hit; ordering one needs the **crew
  leader's sign-off** (the family has to approve a hit).
- A hit costs real money up front, paid into an escrow from the crew vault: say $25,000 plus
  $5,000 × the target's rank. If the hit is called off or fails, most of it is lost.

### 2. Who can be targeted

- Not new players (inside the 24-hour protection), not people in the hospital, in a cell, under
  witness protection, or traveling.
- Not more than about 3 ranks below the hitman's own standing (no picking on the small).
- Each target can be the subject of **one hit per week** at most, from anyone.

### 3. Planning gives the target a chance

- After the contract is placed, the hitman has to **case the target** over 12–24 hours (a few
  scouting actions that cost energy).
- The target gets uneasy hints in the meantime ("You've seen the same car three times today"),
  without being told who. They can respond:
  - hire bodyguards (a Vigilante or Military player, or paid NPC muscle);
  - **lie low** (a safe house: can't work or be found for a few hours);
  - go to the police: if a detective solves it in time, the hit is blown and the hitman is
    arrested for conspiracy.

### 4. The hit itself

Outcome rolls on the hitman's stats and gear (nerve, agility, strength, their weapon) against the
target's (perception, toughness, their armor), plus bodyguards and the target's crew:

| Roll | Result |
|---|---|
| Botched | The target survives unhurt and learns who sent the hitman. Hitman: big heat, likely arrest. |
| Wounded | The target spends a long time in the hospital (2–6 hours), loses cash on hand and all gear wear. |
| Whacked | The target "dies". |

### 5. A softer death for player kills

Instead of the full NPC death, a player-caused death would:

- keep the **career**, but drop the target **one rank** (never below 1) and empty their merit;
- lose cash on hand, dirty money and **equipped gear**; keep housing, businesses and savings;
- put them in the morgue (out of play) for 6–12 hours;
- give them a short **revenge window**: a free revenge contract on the hitman, and their crew
  can go to war with the hitman's crew without the usual cooldown.

### 6. Consequences for the killer

- A **homicide case** opens in the justice chain: detectives, witnesses, trial. A guilty verdict
  carries a long sentence (hours, not minutes) and confiscates the hitman's gear.
- Very high heat; the hitman can't be promoted for a few days ("the family keeps you out of
  sight").
- A public city headline: "Body found in the Rail Yards", which never names the killer unless
  convicted.

## Numbers to start with

| | Value |
|---|---|
| Contract cost | $25,000 + $5,000 × target rank, from the crew vault |
| Casing time | 12 hours, 3 scouting actions (20 energy each) |
| Hit chance | 25–60% depending on stats and gear; bodyguards and lying low cut it a lot |
| Killed / wounded split on a hit | about 1 in 3 killed, 2 in 3 wounded |
| Morgue time | 8 hours |
| Rank lost on death | 1 |
| Homicide sentence | 6 hours |
| Cooldowns | One hit per hitman per 3 days; one contract per target per week |

## Decision needed

1. **Is the softer player-kill death right?** That means losing one rank and equipped gear instead of the whole career.
2. **Should counterplay be included from the start?** That means bodyguards, lying low and police tips. It's most of the work, but without it a hit is just a dice roll the target never sees.
3. **Should the Mafia be the only ones who can carry out hits?** Or could, say, a corrupt soldier take a contract too?

Once these are settled, it can be built in one round.
