# Pacing and balance

Injustice runs monthly seasons and an eight-rank career in each of seven careers. Pacing is
checked with a simulator (`src/game/pacing.ts`), not by feel. Run it with:

```
npm run pacing
```

It plays every career minute by minute for three kinds of player and prints the average day
each rank is reached (three runs each), actions per day, and money on hand at days 7, 30 and 60.

- **Hardcore:** logs in every hour from 8am to midnight, ten minutes each time.
- **Regular:** three sessions a day (20, 20 and 40 minutes).
- **Casual:** one 45-minute evening session.

The simulated player works the career's best job, trains the weakest key stat when stats are
what's missing, eats when allowed, banks cash and moves into better housing. It does **solo
work only**: casework (arrests, verdicts, audits) speeds real players up a little, and the
Mafia's family rules (being made, crew jobs, leading a crew, holding turf) slow them down.

## Targets

| | First promotion | Rank 4 (e.g. Capo) | Top rank |
|---|---|---|---|
| Hardcore | first day | ~4–5 days | ~7–8 weeks |
| Regular | first day or two | ~5–6 days | ~9–10 weeks |
| Casual | a few days | ~2–3 weeks | ~6 months |

Careers should stay within about 15% of each other.

## v1.2.0 (gear, prices, new housing)

The simulator now also buys the new homes and launders dirty money at the laundromat. Bigger
homes rest faster, so Mafia and Military requirements were set back near the others (9.5 and
8.2) and the merit scale went from 7 to 8. All careers are within about 5% of each other.

```
Regular (3 sessions a day)
career          r2    r3    r4    r5    r6    r7    r8   actions/day   $ day 7 / 30 / 60
Police         1.3   3.3   6.2  12.2  22.2  35.6  63.9       48        8,273 / 45,677 / 56,568
Mafia          0.8   3.0   5.6  10.6  20.0  33.8  62.1       48        7,596 / 45,008 / 15,491
Courts         1.3   3.3   5.8  10.5  20.2  33.5  61.6       49        2,614 / 72,824 / 100,967
Vigilante      1.5   3.5   6.8  11.5  21.3  34.8  63.2       48        7,998 / 50,189 / 52,653
Medicine       1.3   3.3   6.0  12.0  25.7  39.2  66.7       51        2,049 / 49,488 / 74,765
Banking        1.3   3.5   6.5  11.2  21.0  34.8  64.2       49        7,513 / 37,089 / 102,911
Military       1.3   3.3   6.2  11.2  17.6  31.2  65.7       45        8,202 / 62,501 / 229,802
```

A regular player affords a studio apartment in about a week, a townhouse in about a month and
the penthouse in about two months (the simulator spends only on homes and food, so real players
who also buy gear and businesses get there later).

## v1.1.0 (after the balance pass)

```
Regular (3 sessions a day)
career          r2    r3    r4    r5    r6    r7    r8   actions/day   $ day 7 / 30 / 60
Police         1.3   2.8   5.5  11.3  20.8  34.5  64.4       41        10,571 / 98,955 / 261,795
Mafia          0.8   2.8   5.7  10.9  20.5  37.8  73.1       31        9,581 / 84,829 / 195,861
Courts         0.8   3.0   5.5   9.8  19.5  33.0  63.0       42        14,140 / 119,968 / 294,737
Vigilante      1.3   3.2   6.5  10.8  20.5  34.1  64.1       42        15,671 / 141,518 / 352,977
Medicine       0.8   2.8   5.6  11.4  24.6  38.5  69.4       45        15,031 / 98,611 / 257,928
Banking        1.0   3.3   5.8  10.5  20.0  33.8  64.0       46        25,070 / 155,393 / 389,839
Military       0.8   2.5   5.2   9.5  15.2  27.6  62.7       38        10,138 / 109,458 / 365,983
```

Hardcore reaches rank 4 in 3.9–4.8 days and the top in 49–58 days; casual reaches rank 4 in
14–18 days and the top in 183–209 days.

## v1.0.0 (before)

```
Hardcore (logs in every hour, 8am–midnight)
career          r2    r3    r4    r5    r6    r7    r8
Police         0.4   0.5   0.8   1.6   2.6   4.4   6.3
Mafia          0.4   0.5   0.7   0.9   1.5   2.4   3.4
...
Regular        rank 4 in 1.3–1.8 days, top rank in 6.5–10 days
Casual         rank 4 in 1.9–3.8 days, top rank in 10–17 days
Banking        ~$685 million by day 60 (compounding interest)
```

## What changed and why

| | v1.0.0 | v1.1.0 | Why |
|---|---|---|---|
| Energy bar | 50 | 100 (+15 sleeping bag, +40 room) | A full bar is a session's worth of work. |
| Energy regen | 1 per minute | 1 per 3 minutes (faster with housing) | The old rate refilled the bar in under an hour: ~1,400 energy a day. |
| Food | every 10 minutes | every 3 hours | Cheap food every 10 minutes nearly doubled energy. |
| XP per job | set per job | the same per energy point for every job (career work 30% more) | Cheap street jobs (dumpster diving) trained stats 2–3× faster than career work, so grinding them was optimal. |
| Promotion merit | barely depended on a job's energy | proportional to energy, rank and risk | Cheap jobs counted almost as much as long, hard shifts. |
| Merit per rank | 10 → 40 (linear) | 35 → 7,900 (×2.2 a rank; first rank halved) | Late ranks were reached in days. |
| Mafia / Military merit | 10 / 13 | 7 / 7.5 | Their riskier jobs fail more often; they ran ~50% slower than other careers. |
| Banker interest | up to 1% an hour, compounding | 0.5% + 0.1% per rank a day, on up to $5,000 × rank | Bankers reached hundreds of millions. |
| Business income | pays back in 2–3 days | pays back in 2–3 weeks | Money snowballed into businesses. |
| Newcomer protection | 2 hours | 24 hours | New players need a day to find their feet. |
| Hospital stay | 3–8 minutes | 10–25 minutes | Getting knocked out should cost something. |
| Heat cool-down | 1 point a minute | 1 point every 2 minutes | A criminal record cleared in ten minutes. |
| School review / re-apply | 10 min / 30 min | 1 hour / 6 hours | Testing values. |
| Customs hold | 5 minutes | 20 minutes | Testing value. |

## Open balance notes

- **Money sinks are thin.** A regular player has ~$100k by day 30; the dearest business is
  $12,000 and the dearest gear $200. Later rounds should add things worth saving for
  (better housing tiers, rare gear, crew upgrades, campaign costs that scale).
- **Vigilantes earn the most clean money** (~40% above Police for regular players). Fine for
  now; revisit if it shows up in real play.
- Existing characters keep their rank. Their next promotion uses the new requirements.
