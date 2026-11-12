# Realism check: the game against real life

Prices in Conspira are real-world dollars, and time is compressed (minutes stand in for days,
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

## Waiting for a decision

These are big gaps from real life, but they carry the game's progression, so changing them is
a design decision rather than a correction.

1. **Weapons and armor cost 10 to 50 times their real price.**
   - Prices:
     - snub-nose pistol $14,500 (real street price about $500 to $2,000);
     - sawed-off shotgun $45,000 (real about $300 to $1,500);
     - tactical plate carrier $40,000 (real about $500 to $2,000);
     - bike chain $160 and lead pipe $150 (real under $20).
   - A pistol costs more than a family sedan.
   - Options:
     - keep the prices as the game's progression ladder and present them as black-market prices;
     - move toward real prices with an illegal markup of two to three times, and rebalance gear
       progression.
2. **Homes cost 10 to 15 times less than real.**
   - Prices: studio apartment $9,000 (real $150,000+); townhouse $38,000 (real $300,000 to
     $600,000); penthouse $160,000 (real $2 million+).
   - A studio costs less than a used sedan.
   - Options:
     - present them as prepaid long leases;
     - raise prices, which changes how fast players reach better energy.
3. **Businesses are cheap and pay back in days.**
   - Prices: a corner bar $8,750 (real $100,000+); a boutique hotel $22,500 (real millions).
   - The hotel is cheaper than the nightclub ($95,000) and only two and a half times the bar.
   - Options:
     - fix only the order (the hotel above the nightclub);
     - raise prices and income together by about ten times, which keeps the payback time.
4. **Career pay at the top doesn't follow real pay.**
   - Rank 8 vigilantes are the best paid of all, though vigilantes aren't a paid profession.
   - Top doctors and bankers earn about the same as police chiefs, where in real life they earn two
     to three times more.
   - Mechanics, hackers and the fire service stop at rank 7.
