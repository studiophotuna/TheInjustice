# Realism check: the game against real life

Prices in Crookvale are real-world dollars, and time is compressed (minutes stand in for days,
months or years). This check compares every price, wage, fee, sentence and rule with real life
(United States, late 2020s), and lists what matches, what was fixed, and what's still different
on purpose or waiting for a decision. Professional fees have their own table in `FEES.md`.

Checked in 7.12.0.

## Matches real life

| Thing | In the game | Real life |
|---|---|---|
| Day-old sandwich, hot meal | $8, $30 | $6 to $10, $15 to $30 |
| Street medkit | $60 | First-aid kit $20 to $60 |
| Sleeping bag | $60 | $30 to $100 |
| Cars | Hatchback $3,000, sedan $12,000, van $18,000, sports coupe $55,000, armored SUV $110,000 | Used cars and armored SUVs are in these ranges |
| Bus, train, plane between cities | About $25 to $40, $70 to $125, $280 to $490 | Intercity bus $20 to $80, train $50 to $150, flight $150 to $500 |
| Street drugs, per unit | Herb $20, pills $60, powder $150 | $10 to $15 a gram, $20 to $80 a pill, $80 to $120 a gram |
| Opening a bank account, the gym | $20, $12 | Minimum deposit around $25; day pass $10 to $25 |
| City income tax, sales tax | 3%, 6% | Local income tax 1% to 4%; sales tax averages about 7% |
| Bail | Refunded to whoever paid it at the verdict | Refunded when the accused attends court |
| After a guilty verdict | The victim is paid back first, then the court's fine | Restitution, then fines |
| Search warrants | Only when the suspect fits the clues; "No judge would sign that warrant" | A judge needs probable cause |
| Arson | Investigated by the fire service; reward from the state fire marshal | Fire marshals investigate arson |
| Hospital | A free clinic treats anyone | Emergency rooms must treat everyone |

## Fixed in 7.12.0

| What | Was | Now | Why |
|---|---|---|---|
| Who rules when no player judge takes a trial | "The court clerk" decided the verdict | The duty judge | Clerks keep records; only a judge can decide a verdict |
| Highest city tax a mayor can set | 10% | 5% | Real city income taxes top out around 4% |
| Jail time by crime | Mugging 25 min, assault 45, burglary 30, car theft 25 | Mugging 40, assault 35, burglary 30, car theft 25 | A mugging is a robbery, and real sentences punish robbery harder than assault, burglary or car theft |
| Steak dinner | $140 | $70 | A steak dinner out costs $40 to $80 |

## Different on purpose (time is compressed)

- **Jail:** 10 minutes to 6 hours instead of months to decades. The order of seriousness
  follows real sentencing.
- **Hospital:** 10 to 25 minutes instead of days.
- **Travel:** minutes instead of hours.
- **Business income:** a business pays for itself in about 20 days instead of 3 to 7 years. See
  "Waiting for a decision" below for the prices.

## Decided in 7.13.0

1. **Weapons and armor** keep their prices as the game's progression ladder, and are presented as
   what they are: street prices for unregistered gear ("No paperwork, no serial numbers: street
   prices"). Real black-market guns do sell at several times their shop price; the game goes
   further on purpose.
2. **Homes** are prepaid leases ("pay once and the place is yours to live in"), which fits the
   prices far better than buying would. Your Place says "Lease a place here first".
3. **Businesses** keep their quick payback (game time), but the order is fixed: the boutique
   hotel is now $140,000 earning about $280 an hour, above the nightclub ($95,000), with the same
   payback of about 21 days. Nobody owned one, so nobody's income changed under them.
4. **Top career pay** follows real pay more closely. Doctors and bankers at ranks 6 and 8 earn
   15% more (up to $530 a job at the top). Vigilantes at ranks 6 and 8 earn 15% less (up to
   $510). Top doctors and bankers are now the best paid, ahead of vigilantes and police chiefs
   (up to $360). Mechanics, hackers and the fire service still stop at rank 7.
