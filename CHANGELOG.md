# Changelog

## 1.3.0: contract hits

Whacking, built from the recommendations in WHACK.md.

- **Ordering:** a crew leader puts out a contract from the People list and pays into escrow from
  the vault ($25,000 + $5,000 × the target's rank); a made man in the crew takes the job.
- **Casing:** three scouting trips over at least twelve hours. The target feels watched ("the
  same car three times today") but never learns who.
- **Counterplay:** the target can hire bodyguards, lie low in a safe house, or tell the police.
  Detectives see threat reports in the Police Station and can stake one out; if they spot the
  hitman, the hit is blown and the hitman is held for conspiracy to murder.
- **The hit:** stat- and gear-based. A botch leaves the target knowing the hitman's face. A hit
  wounds (hours in hospital) or, one time in three, kills.
- **A softer death for player kills:** the career is kept, one rank is lost, along with cash on
  hand, dirty money and equipped gear; eight hours in the morgue.
- **Consequences:** a murder or attempted-murder case in the justice chain (6-hour / 2-hour
  sentences), city headlines, heat, no promotions for the hitman for three days, and a
  three-day vendetta: the victim and their crew can go after the hitman through any protection.

## 1.2.1: a portrait for every rank, no repeated footage

- Every career has eight portraits, one per rank, from a cadet or student at rank 1 to the
  commissioner, Don, chief justice, medical director, governor, general or "symbol" at rank 8.
  The portrait changes when you're promoted.
- Every building, district and city now has its own footage. City Hall, the Courthouse Hill,
  Precinct Square, St. Brigid's, the Gutter, Old Market, Southside, Iron Row, the Boardwalk,
  the Marina, the Exchange, the Rail Yards, Checkpoint Row, the Foundry, the Undercity and the
  Tech Park got new clips, and Port Solace, Ironmoor and Halcyon have their own home skylines.
  The home screen no longer reuses a building's clip for your career.

## 1.2.0: gear, prices, arson, portraits

- **Equipment.** One weapon slot and one armor slot; only equipped gear counts in a fight. Gear
  wears out with every fight (and armor on rough jobs that go wrong). Worn gear hits softer,
  broken gear does nothing until it's repaired at the shop (cost grows with the wear) or
  replaced. Issued police and military gear is serviced free at the armory once a day.
- **Prices and things worth saving for.** A price ladder for weapons ($150 to $45,000) and armor
  ($200 to $40,000); three new homes (studio apartment $9,000, townhouse $38,000, penthouse
  $160,000) with bigger energy bars and faster rest; a steak dinner; two new top-end businesses
  (a nightclub and a steel-mill share). Businesses cost 2.5× more and earn 2× more (pay back in
  about three weeks). Crews, turf, labs, forums and the making ceremony cost more; tuition is up
  by half; the gym costs $12.
- **Torching a business.** A crew member (Mafia) can torch a rival's business in their city from
  the People list. Success depends on their nerve, agility and wits against the business's
  security (bigger places are harder). A burned business earns nothing for 12 hours and the
  takings in the register are lost; the city news reports the fire. A failed attempt can land the
  arsonist in a cell. Not against crewmates.
- **Career portraits.** Each career has a short looping clip of a real person (police officer,
  gangster, lawyer, doctor, banker, soldier, vigilante, a drifter for no career) on the home
  screen and the profile. The Academy and Station buildings have their own footage. Drawn
  avatars breathe and blink.
- **Whacking**: design analysis in WHACK.md, waiting for a decision before it's built.
- Pacing re-checked with the new housing and laundering in the simulator (PACING.md).

## 1.1.0: balance pass

Pacing and economy, measured with the new pacing simulator (`npm run pacing`, see PACING.md).

- Energy: a 100-point bar that refills in about five hours (housing adds size and speed); food
  every 3 hours instead of every 10 minutes.
- Every job now teaches the same amount per energy point (career work a bit more), so cheap
  jobs can't be farmed; promotion merit grows with the energy, rank and risk of the work.
- Each rank needs 2.2× the merit of the one before (the first promotion is quicker).
  A regular player now reaches rank 4 in about 5–6 days and the top rank in about 9–10 weeks,
  instead of 1–2 days and 1–2 weeks.
- Mafia and Military no longer lag the other careers.
- Bankers' interest is a small daily rate on capped savings instead of compounding hourly.
- Businesses pay for themselves in two to three weeks instead of two to three days.
- Real-game timers instead of testing ones: 24-hour newcomer protection, 10–25 minute hospital
  stays, slower heat cool-down, 1-hour school reviews, 20-minute customs holds.

## 1.0.0: the first full version

- Seven careers (Police, Mafia, Courts, Vigilante, Medicine, Banking, Military) with hidden stats,
  merit-based promotions and career gear; the Academy and its schools.
- The justice chain: crimes, witnesses, case files, detectives, arrests, bail, trials, lawyers,
  bribes, jail, prison breaks, the yard, internal affairs, witness protection.
- The city: buildings (police, courthouse, hospital, bank, academy, city hall, prison, street,
  station), elections every two weeks, the mayor and police chief, the newspaper and its editor,
  city events, martial law.
- Crews (Mafia only): turf wars, alliances, heists, drug labs, secret forums, the family's
  promotion rules and omertà.
- Money: clean and dirty cash, laundering, loans and loan sharks, businesses, drugs, the black
  market for army gear.
- Anonymous monthly season boards with trophies, street titles, a first-day tutorial.
