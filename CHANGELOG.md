# Changelog

## 8.8.8: painted Military ranks

- All eight Military ranks (Recruit to General) use the owner's painted portraits, faces in
  shadow. The regular who wore the old Sergeant photo as a face keeps it.

## 8.8.7: painted Banking ranks

- All eight Banking ranks (Finance Student to Governor of the Exchange) use the owner's painted
  portraits, faces in shadow. Regulars who wore old Banking photos as faces keep them.

## 8.8.6: painted Vigilante ranks

- All eight Vigilante ranks (Watcher to Symbol) use the owner's painted portraits, hooded and
  masked. Regulars and the street fighters who wore old Vigilante photos (the Alley Rat, the
  Undercity Scavenger) keep them.

## 8.8.5: painted Courts ranks

- All eight Courts ranks (Law Student to Chief Justice) use the owner's painted portraits, faces
  in shadow. Regulars who wore old Courts photos as faces keep them.

## 8.8.4: painted Mafia ranks

- All eight Mafia ranks (Associate to Don) use the owner's painted portraits, faces in shadow,
  now stored in rank order. Street regulars and street fighters (the Mugger, the casino bouncer,
  the road gang, and the police NPCs) keep the old photos as their faces.

## 8.8.3: painted Police ranks

- All eight Police ranks (Academy Cadet to Commissioner) use the owner's painted portraits, faces
  in shadow. The old photos that street regulars wore as faces stay on as faces.

## 8.8.2: painted Medicine ranks

- Medicine ranks 2 to 8 (Intern up to Medical Director) use the owner's painted portraits: one
  doctor's career from a 3 a.m. corridor to the director's office, face always turned away.
  The Medical Student keeps the old photo until its painting arrives.
- The old photos that street regulars wore as faces stay on as faces, so nobody's face changed.

## 8.8.1: painted shop

- Every item in the Shop and every business (49 pictures) now uses the owner's painted artwork:
  food, medical, homes, weapons, armour and the ten businesses, all in the same rainy noir style.

## 8.8.0: arson and turf wars play out as cards

- **Arson.** Torching a business or a rival crew's front plays as cards: case it, douse it, the
  match, then the blaze, or the sprinklers saving it ("Foiled"), or the night guard catching you
  ("Busted").
- **Turf wars.** Settling a war plays as cards: the attackers rolling in, the defenders digging in,
  the clash, and whose flag flies after ("Taken" or "Held"). The stamp is green if it went your
  crew's way and grey if it didn't.
- **Painted crime cards.** All 15 crime and heist cards (case it, the lift, the grab, the lock,
  inside, the safe, muscle, lookout, getaway, alarm, guard dog, someone's home, witnesses,
  hotwire, the hacker) now use the owner's artwork. The new arson and war cards show a drawn mark
  until theirs arrive.

## 8.7.0: crimes and heists play out as cards

- **Crime cards.** Pickpocketing, bag snatches, break-ins, car theft, bank jobs and crew jobs on a
  player's home now play out step by step as cards, like fights. Each step is dealt, flips over
  and gets stamped with how it went, then joins the trail at the top:
  - Pickpocket and snatch: case it, the lift or the grab, the getaway, witnesses.
  - Break-in: case it, the lock (or the owner, the dog, the alarm), inside, the getaway.
  - Car theft: case it, hotwire, getaway.
  - Bank job: lookout, muscle, the safe, the getaway, each with the name of who did it.
  - Home job: the hacker on the alarm, lookout, whoever walks in, the safe, the getaway.
  The job ends on a stamp: Clean, Got away, Empty, Caught or Busted, then the usual result plate.
- The server already worked these crimes out step by step; now it records the steps. Nothing new
  is rolled, and nothing shows odds.
- **Painted fight cards.** Strike, Shot, Block, Dodge and Critical now use the owner's artwork.

## 8.6.0: fights play out as cards

- **Card fights.** Every fight now plays out by itself as a run of cards: each move is dealt
  face-down from the fighter who makes it, flips over, and flies at the other one.
  - **Strike** (close range): an impact burst with slash marks.
  - **Shot** (long range): a tracer, a muzzle flash and bullet holes punching in.
  - **Block**: a steel shield goes up and throws sparks when the hit lands.
  - **Dodge**: running feet with wind streaks, and the fighter jumps aside leaving afterimages.
  - Critical hits get slow motion, letterbox bars, a zoom and a gold card.
- **No gear is ever shown.** The cards say only strike or shot, block or dodge, and the lines under
  them never name a weapon, so a fight can't be used to see what someone carries. There are no
  damage numbers either: health bars show how a fight is going.
- Hits flash, shake the screen, knock the photo back and leave marks on it (bullet holes for shots,
  slashes for strikes). Sparks, embers, steel shards and dust fly. The street behind drifts, the
  lamp flickers, fog rolls through the rain.
- Long fights are cut to their eight biggest moves. Speed 2x and Skip are always there, and the
  result plate is the same as before.
- Under the hood: the fight engine records each move as it rolls it (`FightBeat` in `combat.ts`).
  No new rolls, so every fight comes out exactly as it did before.

## 8.5.1: evidence photos, two more panels

- **Evidence photos on the board.** A closed lead whose evidence has a painting now shows it as a
  print pinned above the note. The first is Benny's new address: the door beside the pawn shop,
  a lit room upstairs. More are added by listing the lead in `EVIDENCE_ART` (`board.tsx`) and
  dropping `public/evidence/<lead>.jpg` in.
- Painted: Medicine "The Quiet Patient" panel 1 (Doc Mercy at the morgue table) and Vigilante
  "The Watchman's Wall" panel 1 (Silas at his wall of photos and red string). 24 of 86 story
  panels are now painted.

## 8.5.0: twelve more painted story panels

- Painted from the owner's asset set: Police "You're Not the First" (Reyes and her partner's
  photo, the eleven files, the hand-over on the roof), Mafia "Tribute" and "Paid in Full" (Kozak's
  envelope, the courthouse back door, the ledger), and Courts "Case 4471" (the records room, the
  green-ink pages, Marsh). The brass door plate in Tribute now reads JUDGE A. CRANE, and white
  strips on the edges of the Case 4471 images were trimmed.
- 22 of the 86 story panels are now painted. Images in the set marked as rough prototypes
  (banking, medicine, vigilante, the courts finale, the evidence board and Halcyon) were left out:
  they were blurry, some were duplicates of each other, and several didn't match their scene.

## 8.4.3: Grayhaven and Port Solace paintings

- Grayhaven (the courthouse dome over the harbour, in the rain) and Port Solace (the wet docks,
  cranes and palms) now have the owner's paintings in the city picker and on the arrival card,
  like Ironmoor. Halcyon waits for a sharper image.

## 8.4.2: Ironmoor's painting

- The owner's painting of Ironmoor (freight train, snow, checkpoint floodlights) now shows when a
  new player picks where to live, and on the "Welcome to Ironmoor" card after a trip there. The
  other cities keep their drawn skyline until their paintings arrive (`src/components/art/cities.ts`).

## 8.4.1: five more story paintings

- Chapter 1 (Old Faces) now has all three paintings: Benny at the fruit stall, Benny running, and
  the matchbook.
- The police chapter "The Evidence Locker" is fully painted: box 4471 in the basement, the empty
  box with the sign-out sheet signed "A.C.", and the gavel card. The box number and the initials
  are lettered onto the owner's art.
- 10 of the 86 story panels are now painted.

## 8.4.0: how the case ends

- **The ending.** Once the last lead is closed, the case card asks what you do with everything you
  have on Judge Crane. Four choices, and you get one:
  - **Take it to court:** a retrial clears your name. Heat drops to zero, +15 standing, title
    "Exonerated".
  - **Give it to the press:** the story runs on your city's front page for every player to see.
    +25 standing, title "The one who talked".
  - **Sell it to Kozak:** $25,000 in dirty money, and Crane owes you one favour: once, a jail
    sentence ends early (it doesn't work during a trial). Title "Kozak's friend".
  - **Keep it:** blackmail. Crane pays $2,000 a week for eight weeks, then his heart gives out.
    Title "Holds the Ledger".
  Each choice unlocks its own three-panel final chapter. None of them changes fighting strength.
- **Career chapters.** Military, mechanic, hacker and fire careers each get two chapters, at ranks
  2 and 3, like the other careers.
- **Painted story art.** The cold open and the prologue now use the owner's painted images, and
  the matchbook panel in Old Faces carries "CRANE & PARTNERS" in gold. Panels without a painting
  keep their drawing until one arrives.
- `docs/STORY-ART.md` has scripts for the 36 new panels (24 career, 12 ending).

## 8.3.0: the game is now Crookvale

- **New name: Crookvale.** "Conspira" was already taken (not by a game), so the game has a name of
  its own. Every place players see the name now says Crookvale: the page titles, the app name on
  phones, the landing page, How to play, the rules, terms, privacy and refund pages, alerts and
  shared story text.
- **New logo:** the Crookvale wordmark (side menu, info pages) and badge (landing page), cut out
  from the owner's artwork so they sit on the dark panels without a black box. The small mark,
  favicon and app icons come from the same badge.
- Internal names (saved settings, event names) are unchanged, so nobody's preferences reset.

## 8.2.0: new place art, part 1

- **New art for four places:** the Academy, the Boardwalk, the Velvet Ace casino and the city view
  behind the Directory. Generated with FLUX.1-schnell (Apache 2.0, commercial use allowed) in
  one moody night style; people only appear as distant silhouettes. These places now show the new
  still instead of the old stock clip.
- The rest of the places follow, about seven a day. Faces stay real photographs.
- `scripts/ai-art/`: the prompts, the queue (most-seen places first) and the scripts that make and
  accept new art.

## 8.1.0: lighter on the database, ready for more players

Nothing changes on screen; the game reads far less to show the same things. Measured on a busy
city (40 players), per request:

| Request | Before | After |
|---|---|---|
| City pulse (every minute) | 618 KB | 57 KB |
| City chat (every 8 s) | 316 KB | 35 KB |
| People tab | 669 KB | 231 KB |

- Lists of other players (the pulse, People, chat, your contacts) read slim copies: the database
  leaves out what only the owner sees before sending. A slim copy can never be saved over a
  player.
- Uploaded photos are served from their own address and cached by the browser, instead of
  travelling inside every list.
- Chat looks up all its authors in one go instead of one by one.
- The People chat and crew forum check for new messages every 8 seconds, and only while you're
  looking (they were every 4 and 6 seconds, even in a background tab).
- New `docs/CAPACITY.md` with the measurements and what they mean for hosting.

## 8.0.3: the desktop top bar stays in its column

- Fixed: on desktop the top bar reached 24px under the side menu (cutting off the logo and the
  first letter of your name) and 24px under the right-hand panel. It now spans exactly the middle
  column at every screen width, with its contents 24px in from each edge.

## 8.0.2: a lower dock, and the gut read explained

- **The dock sits lower on phones.** It was 8px plus the whole home-bar area above the bottom
  edge; now it's 4px, using only the part of the home-bar area it needs. The Go button, its sheet,
  and pop-ups above the dock moved down with it.
- **How to play explains the gut read:** what Build, Reflexes, Street smarts and Presence mean,
  their six words from weakest to strongest, what each one helps with and how to raise it, and
  what the "how people see you" line under your name means. No numbers, as before.

## 8.0.1: the Go button stays put

- Fixed: on phones, scrolling down hid the Go button (an old rule that folded the quick bar away
  on scroll). The Go button and the dock now stay on screen while you scroll, and a street
  encounter card no longer slides down over them.

## 8.0.0: Street level, a new look

A redesign of every screen, approved from mockups and samples. Same photos, same fonts, much less
in the way.

- **One slim top bar.** Your photo, energy, health and cash (with dirty money under it) in one
  56px row, instead of a name row plus four tiles. Tap your photo to open Me. Your record shows
  only when it isn't clean. The "Save your character" banner moved to Me; a small dot on your
  photo reminds guests.
- **One dock on phones, with a Go button.** Home, Work, City and People sit around a big amber
  Go button that does your work in one tap. The arrow beside it opens the gym, food and first aid.
  The separate quick bar is gone, so a phone shows about a third more of each page.
- **Colours mean one thing each.** Amber is energy and the main action (Go, work, follow the
  lead); green is money; red is fights, crime and warnings only. Job buttons are amber now;
  fight buttons stay red.
- **Calmer titles.** Only each page's own headline is in big capitals. Card titles are sentence
  case.
- **Page titles with their switch.** Work shows "WORK" with Jobs / Fight & gym beside it. City is
  titled with the city's name, with Places / Shop beside it. People and Me open on their own
  headers.
- **Home** leads with your case: the next lead as the headline, with the face of who it's about
  leaning out of the card. Under it, "Up next" is a row of photo cards (a new chapter, a boss out
  on the street, the best job, the election), each one tap.
- **Work** opens on a compact career strip with the rank ladder, then your career's jobs as the
  first filter before the districts, so jobs show on the first screen.
- **Even spacing.** Buttons, rows of buttons and notes now keep the same gap from each other and
  from the text around them everywhere.
- Desktop keeps the side menu and the full quick bar, with the same top bar, colours and Home.

## 7.22.0: Work and Fight upgraded

- **Fight:**
  - A "Pick your fight" headline over the street replaces the explainer card. The warning that
    losing badly can kill you stays, as one line.
  - Your record in three tiles: street wins, all wins this season, and health (red, "Too hurt",
    when you can't fight).
  - Opponents are photo cards like jobs. Each shows a word for their build (Scrawny to "Built like
    a door"), the most cash they might carry, and how many times you've beaten them. No odds or
    numbers for their strength.
  - The gym sits below the fights, its price and energy in the title.
  - Fixed: the Fight button said "Too hurt" below 20 health even on painkillers. It now uses the
    same lower limit as the game. Short of energy, it says "Ready in X min" like jobs do.
- **Work:**
  - The career card shows one 8-step ladder instead of eight rank chips and a separate progress
    bar. The next step fills as you put in the work.
  - Job cards carry one tag at most: Best now or New first, then the difficulty, then Risky or
    Shady.

## 7.21.0: a faster Shop, Directory and Street

- **The Shop is about half as long on phones.** Each item is one row: photo, name and note, then the
  price button right beside them, instead of a tall card with the button in the far corner. The
  "Food" and "Medical" chip on every item is gone, since the tab already says it. Weapons and armor
  keep their rarity tag.
- **The Directory shows who's working first.** Services someone actually offers come first. Services
  nobody offers right now share one "Nobody offering yet" card at the end (tap it to see which, and
  how to start offering one) instead of a card each.
- **The Street's drug table:** the amount box, Buy and Sell sit on one line per drug again. A
  general input style had been stretching the box to full width and pushing the buttons below it.
  The intro above it is shorter.

## 7.20.0: shorter pages, clearer labels

- **Me is about half as long.** "Your record" (career record, season, the story so far, what
  happened) and "Settings and account" (motion, alerts, account, help) are now tap-to-open groups.
  They remember whether you left them open. For guests, Settings and account starts open, so saving
  the character is still right there.
- **Home:** the "Daily reward" bubble in the top row is gone. The Daily card further down has the
  button.
- **City Hall:** the Leadership card's four-line explanation is now one line. The full rule (rank 6,
  one challenge a week, losing costs reputation) is in How to play.
- **Quick bar on phones:** each slot shows one short word that fits: Work, Lift, Eat, Patch up.
  Wider screens and the tooltip still show the full name.
- **Today's contracts:** no empty progress bar until you've made a start.
- **Coloured names over photos** get a tight dark outline, so a gold name on a bright photo still
  reads.
- Fixed: on phones, cards on Me ran 12px past the right edge of the screen.

## 7.19.0: a tidier layout

- **Home stops saying things twice.** The "Right now" card no longer repeats the daily reward, the
  story chapter or the work nudge, because Home already shows each of those in its own place.
- **The map's hint sits inside its card**, and so does the panel that opens when you tap a pin.
- **People:**
  - Names over the photos show in full on up to two lines instead of being cut off, and they are
    readable over bright photos.
  - Regulars who've gone home are listed one line each under "Off the street" instead of getting
    full-size cards. The page is about a screen shorter.
- **City Hall:**
  - Leadership seats you can't act on are a single line. Tap one to see its power.
  - Long newspaper headlines are set smaller, so the front page no longer runs five big lines.
- **Me:** the Alerts card no longer appears just to say "coming soon".
- **Jobs:** a job you've finished for good, like the test to get made, drops off the list instead
  of sitting there locked.
- **City chat:** regulars no longer repeat a line that's still in the channel, and the same regular
  doesn't speak twice in a row.

## 7.18.0: a real Pharmacy, and a hacker for the alarm

- **The Pharmacy sells three things instead of one**, priced like real life:
  - Bandages, $15: heal 15 health.
  - Painkillers, $20: they heal nothing, but for two hours you can still fight (and mug) while
    badly hurt, down to 8 health instead of 20.
  - The medkit, $60: unchanged, and the only item that gets you out of the clinic early. A bandage
    used to do that too, since any medical item halved the stay.

  Regulars keep buying medkits. The Pharmacy's owner now has more to sell.
- **Crews can hire a hacker to cut a home's alarm.** On a job against someone's home, the leader
  can bring in a hacker: a player hacker taking clients from the Directory, or a regular hacker
  who's out. They're paid their usual fee up front, dirty money first.
  - When the crew goes in, the hacker tries the alarm first; better hackers get it off more
    often.
  - If it works, there's no siren to slow the safecracker, and no alarm camera footage goes on the
    police case file.
  - Player hackers get dirty money and credit toward their next promotion.
  - Before this, hackers had no part in crew work: only the Mafia can join crews, so this is
    outside help, the same way ambushes hire regulars.
- The guide covers the new Pharmacy items.

## 7.17.0: vigilantes watch homes, firefighters inspect businesses

- **Night watch by vigilantes.** Vigilantes from rank 2 can take clients from the Directory at a
  fee they set ($100 to $1,000; a real night of private security is $200 to $350).
  - A homeowner hires one with "Watch my place": for 10 hours, break-ins at their home are
    harder.
  - The vigilante keeps the fee, and every night counts toward their next promotion.
  - You need a place in the city to have it watched. That now also goes for regular vigilantes,
    who used to take money to watch a home you didn't have.
- **Fire inspections by firefighters.** Firefighters from rank 2 can take clients from the
  Directory, charging per business ($100 to $2,000; real commercial inspections are $100 to $500
  and up).
  - A business owner picks which business to have inspected.
  - For a week it's much harder to torch: half the arsonist's usual chance.
  - Your business card in the Shop shows "Passed a fire inspection" and how many days are left.
  - Every inspection counts toward the firefighter's next promotion.
  - Regular firefighters offer it too, from the People list: $300 a business, covering everything
    you own in the city that's due.
  - Before this, the only defense against arson was the Fire Chief's city-wide fire watch.
- Checked: hiring both from the Directory on phone and desktop, the fees moving to the right
  people, the watch and the inspection taking effect, and an inspection stopping a torching that
  would otherwise succeed. Every API route was also stress-tested, with no errors and no hangs.

## 7.16.0: the pay ladder keeps its promises

- **Hidden work always pays more than the work that unlocks it.** Raising street pay in 7.14 left
  the first step of every street ladder ("Rough work") paying less than the ordinary jobs you had
  to grind to find it. The Mafia's and the vigilantes' "Only for the hardened" jobs paid no more
  than their regular top work. Every hidden job now pays at least 20% more per energy point than
  the best work that unlocks it.
- **Careers pay more than the street from rank 1, and every promotion is a raise.**
  - A rank 1 cop, doctor or clerk was earning less per energy point than someone washing
    windshields. Rank 1 now averages at least $3 per energy point, above ordinary street work.
  - Rank 3 paid less than rank 2 for police, courts and doctors, and rank 4 less than rank 3 for
    mechanics and hackers. Every rank now pays at least 15% more than the one below.
  - Top banking, police and courts work rises to keep the ladder climbing.
  - 79 jobs adjusted. A test now holds all three rules.
- **The guide explains the grades.**
  - Hidden work comes as rough work, hard work and only for the hardened: each costs more energy,
    can go worse, and pays more.
  - The grade on a job card explains itself when you hover over it.
  - The guide also covers coffee and energy drinks, and the "Ready in" times on jobs.

## 7.15.0: energy that respects your time, with a second wind and a coffee

Energy stays (a one-job-a-minute timer would reward whoever stays online longest, and empty out
homes and food), with its two weak spots fixed.

- **A second wind on day one.** When a new character's first bar runs out, it fills again once.
  A first day is now about 49 jobs instead of 13 (playtested: $397 earned).
- **Quick boosts: coffee and energy drinks.** Both are in the Shop under Supplies.
  - Black coffee: $5, +10 energy.
  - Energy drink: $6, +20 energy, but your heart races (−5 health).
  - They don't wait on meals: you can have one right after eating.
  - They share one timer and one daily limit: one every 30 minutes, six a day, whichever you
    buy. That holds boosts to at most +40 energy an hour and +120 a day, so more boost items can
    be added later without breaking balance.
  - Bought with game cash only, never Favors (Favors buy looks, never power).
  - The quick bar's food slot offers whatever you can have right now.
  - Regulars stick to meals.
- **Waiting says how long.** A job you don't have the energy for says "Ready in 12 min" instead
  of just greying out.

## 7.14.0: a first session that goes somewhere

Played as a brand-new player, the first session used to end after about 13 jobs with about
$119 earned. Often the new player was mugged, lost half of it and ended up in the clinic, and
the first lead couldn't be followed. Now the same session earns about $266, closes the first
lead (Benny Marlowe goes on the board), buys a first weapon and a meal, and wins a first street
fight.

- **Street work pays a living.** Legal street jobs paid about $1 per energy point. They now pay
  about $2 to $3.90; crime still pays more.
  - Collect cans: $5 to $12 (was $2 to $5).
  - Wash windshields: $10 to $22 (was $4 to $9).
  - Every city's starter work pays for a first weapon in one full bar.
- **A goal you can reach on day one.** Your first day has a new step, "Get something to fight
  with", which opens the Shop on Weapons. The cheapest weapon, a $150 lead pipe, is within reach
  of a first session.
- **Your first lead starts with you.** "Someone saw Benny" is already being followed when you
  arrive, so the jobs of your first session count toward it. Before, only jobs done after
  pressing "Follow the lead" counted.
- **Newcomers aren't mugged on the job in their first 24 hours.** It's the same grace period they
  already had from other players. After that the street is the street.
- **"Someone wants a word" no longer covers the page on phones.** It's a face at the right edge
  with the time left. Tap it for the full card.

## 7.13.0: the four realism decisions

- **Weapons and armor are street prices.** The Shop says so: "No paperwork, no serial numbers:
  street prices." The prices themselves are the game's progression ladder and stay.
- **Homes are prepaid leases.** The Shop's Housing section says "Prepaid leases: pay once and
  the place is yours to live in". Your Place says "Lease a place here first".
- **The boutique hotel costs more than the nightclub.** It's now $140,000 earning about $280 an
  hour (was $22,500 and $46), with the same payback of about 21 days as every other business.
  Nobody owned one.
- **Top doctors and bankers are the best paid.** Their rank 6 and 8 jobs pay 15% more; top
  vigilante jobs pay 15% less. At rank 8: doctors and bankers up to $530 a job, vigilantes up to
  $510, police up to $360.
- Details in `docs/REALISM.md`.

## 7.12.0: closer to real life

A check of every price, wage, fee, sentence and rule against real life. The full findings are
in `docs/REALISM.md`. Fixed:

- **Verdicts come from a judge.** When no player judge takes a trial, "the duty judge" now
  decides. It was "the court clerk", but clerks keep records and can't rule.
- **City tax tops out at 5%** (was 10%). Real city income taxes top out around 4%. Regular
  mayors already kept between 1% and 5%, and every city is at 3%.
- **Jail time follows real seriousness.** A mugging is a robbery, so it now carries 40 minutes,
  more than assault (35, was 45), burglary (30) or car theft (25). It was 25.
- **Steak dinner $70** (was $140). A steak dinner out costs $40 to $80.

Bigger gaps are listed in `docs/REALISM.md` for a decision:
- weapons and armor cost 10 to 50 times real prices;
- homes cost 10 to 15 times less than real;
- businesses are cheap and pay back in days;
- top career pay doesn't follow real pay.

## 7.11.0: a treasury that pays its way

The city's only regular income was the 3% tax on job pay, while fire rewards, guard pay and
bounties came out of the same pot. Most treasuries sat near $0, and anyone the city owed was
mostly paid nothing. 3% stays: it's a realistic city income tax. What changed:

- **Sales tax, 6%, on shop purchases.** Food, medicine, weapons and armor; homes are exempt.
  - Shelf prices include it, with one line in the Shop saying so. What you see is what you pay.
  - Regulars pay it too.
  - A shop owner's cut is worked out on the price before tax.
  - Very cheap items round to no tax (a $8 sandwich is still $8).
- **Court fines.** A guilty verdict now also fines the convicted person half the amount stolen,
  from $250 to $10,000, paid to the city after the victim is paid back. The verdict message says
  so.
- **The state pays for state work.**
  - Fire investigation rewards ($400) come from the state fire marshal.
  - Soldiers on guard ($40 an hour) and soldiers breaking up a turf war ($50 each) are paid by
    the garrison.

  These were the biggest drain on the city, and they're now always paid in full.
- **City hall still pays:** the mayor, the police chief, the editor, seat stipends, bounties, the
  soup kitchen, witness protection and calling in the army.
- **Checked with a simulated day** of the city timer on the same data (regulars working,
  shopping, crimes, trials, fires, guards):
  - Grayhaven went from losing $1,015 a day to gaining $904.
  - Port Solace, Ironmoor and Halcyon now gain $181 to $265 a day before any real players, up
    from $44 to $108.

  That covers a mayor's salary everywhere. Seat stipends ($300 each) need a busier city. Details
  in `docs/FEES.md`.

## 7.10.0: fees that match real life; Your Place needs a place

- **Every professional fee checked against real life.** Shop prices in this game are real-world
  dollars (a sandwich $8, a sedan $12,000), so fees for services are now held to what the same
  service costs in real life. The full table is in `docs/FEES.md`. What changed:
  - **Doctor treating you in hospital:** $60 + $20 per rank ($100 to $220), was $25 + $8. A
    real physician consult is $100 to $300.
  - **Back-alley doctor:** $200 + $50 per rank, was $50 + $10, which was cheaper than a clinic.
    Off-the-books care costs more than the legal kind.
  - **Surgery on old wounds:**
    - regulars charge $2,500 + $500 per rank (was $450 + $80);
    - players set $1,000 to $20,000 (was $50 to $5,000).

    Real outpatient surgery is $3,000 to $15,000.
  - **Lawyer on retainer:** $600 + $200 per rank a week for players and regulars alike. Players
    charged $100 + $20 and regulars $300 + $120. Real defense retainers start around $1,000.
  - **Bail:** at least $500, was $100.
  - **Loan interest per three-day term:**
    - banks up to 5% (was 20%, far above even payday lenders);
    - loan sharks up to 30% (was 100%; a real shark's "vig" is about 20% a week).
  - **Hacker scrubbing a record:** at least $500 (was $100). Scrubbing a regular's record:
    $400 + $100 per rank (was $120 + $30).
  - **Vigilante watching your place overnight:** $250, was $120 (a night guard is $200 to $350).
  - **Doctor examining a victim for the police:** $100 + $20 per rank, was $20 + $5.
  - **Checked and already in range:** patch-ups, laundering rates, garage repairs, hidden
    compartments, alarms, bodyguards, the safe house, bribes, the gym.
  - Fees doctors had already set, and loans already taken, keep their terms.
- **Your Place opens only once you've bought a place in that city.** Until then its tile in the
  City is greyed out and says "Buy a place here first". Tapping it opens the Shop on Housing,
  and a link to it explains why it's closed. Buying anything from a sleeping bag up opens it.
  The search box (Ctrl+K) says the same. Stashing, a dog and an alarm already needed a home.
- Links can now open the Shop straight on a category (used here for Housing).

## 7.9.0: what the street sees, and more people on it

- **The live feed no longer leaks police and investigation details to everyone.** Checked against
  the live feed:
  - **Case numbers.** "Marisol Cruz was mugged in The Boardwalk. The police opened case
    #D00B24." Everyone now reads "Marisol Cruz was mugged in The Boardwalk." Officials still see
    the case number.
  - **Investigation results.** "Fire investigator Hank Doyle names Lenny Pike as the arsonist…"
    now goes to officials only. The public still hears about the fire itself. The arsonist is told
    their name went to the police, no longer "said so in public".
  - **Police casework by regulars.** Crime-scene work shows publicly without the case number.
    Examining a victim for a case and flagging a suspicious deposit (which tipped off whoever was
    laundering) go to officials only.
  - **Covert and corrupt work is never announced.** "Look the other way" (a bribed cop) and other
    crime, corruption and pressure jobs stay off the feed. Surveillance work ("Tail a suspect")
    goes to officials only.
  - Officials are the police, the courts and the fire service in that city, plus its mayor.
  - The same rule covers the live feed, the desktop side panel, City Hall's log and the
    newspaper, which never prints anything meant for officials.
  - Lines written before this release are cleaned up the same way.
  - News stays public: muggings, fires, crashes, arrests, trials, elections, who took over a shop.
- **More people on the streets.** Every city has five new regulars (twenty each), mostly on night
  and early shifts, when the streets were emptiest:
  - **Grayhaven:** a rookie night cop, an emergency-room attending, a night tow-truck driver, a
    probationary firefighter, a 6am public defender.
  - **Port Solace:** a harbor night sergeant, a junior night doctor, a counting-room clerk, a
    fireboat deckhand, a slot-machine repairman who hacks.
  - **Ironmoor:** a checkpoint night officer, a railyard mechanic, a foundry doctor, a
    probationary firefighter, a court interpreter.
  - **Halcyon:** a transit-unit rookie, a night resident, a tower-garage valet, a night sysadmin,
    a fire marshal.

  They work their careers, shop, pay tax and do city work like the others. At least five
  regulars are out in every city at every hour (it used to drop to two). When few real players
  are around, up to nine people are out at once (up from six), and they still make room as real
  players arrive. Nobody in a city shares a face.

## 7.8.0: no more frozen requests

An overall check of the game: types, tests, build, every action and API call end to end, every
screen on phone and desktop, the city timer, the live error logs and the live data.

- **Fixed: some actions froze for five minutes online, and could freeze other players' requests
  with them.** Online, each server instance has one database connection, and a transaction holds
  it. A few actions read the database outside their transaction while it was open, so they waited
  for a connection that could never come free, until the platform killed them at five minutes.
  The live logs showed 14 of these in the last week, plus two timeouts on locked player rows. The
  actions that froze:
  - settling a turf war;
  - burying a story;
  - a stakeout;
  - challenging for a seat;
  - hiring a regular for a crew ambush.

  They now do those reads before the transaction opens.
- **A guard against it happening again.** Any database call made inside a transaction is now
  caught. Online it fails at once with a clear error instead of hanging. Locally it's logged with
  the line it came from, so it gets fixed before release.
- **Checked and working:**
  - all 69 game actions, from the button through the server's checks to the game rules;
  - every API operation (334 requests with bare and filled-in inputs, plus every game action):
    none failed with a server error or hung;
  - every tab, sub-tab and City place on phone and desktop: no errors, no failed requests, no
    broken images, no sideways scrolling;
  - the city timer, which runs online about every five minutes;
  - live data: no negative or broken money, and no players, crews, shops or seats pointing at
    anything missing.

## 7.7.0: settings that reach where they're used

A review of everything a player sets (prices, rates, fees) to check it shows up where it's used.

- **Your shop's price level now shows on your own shelf.** You buy from your own shop at the usual
  price, so raising prices used to change nothing you could see. Now each item in your shop says
  "Your customers pay $X", and your shop's strip shows its price level ("prices +50%"), the same as
  other players see it. Checked end to end: the owner sets +50%, another player sees $15 for a $10
  sandwich, pays $15, and the owner's till goes up by the sale minus the stock cost.
- **The command palette (Ctrl+K) charges what the shelf says.** "Buy ..." showed the plain price
  and ignored the owner's price, stock and which city sells the gear. It now uses the same shelf
  as the Shop page.
- **Regulars pay city tax.** Their job pay was never taxed, so the mayor's tax rate collected
  nothing from them. It's now withheld at the city's rate and goes to the treasury, like everyone
  else's.
- **No more browser pop-ups anywhere in the game.** 7.5 missed some. The game's own card now
  handles all of these:
  - selling or handing back a shop, selling a car, the chop shop;
  - customs bribes;
  - martial law, burying a story, stepping down or challenging for a seat;
  - leaving a career, giving away a dog.

  The card can also ask for an amount, with the allowed range shown and checked before you
  confirm. That covers bounties, loans and interest, surgery fees, laundering, army gear prices,
  recovery rewards and buying votes.
- Checked and already connected: garage rates, surgery fees, hacker and laundering fees, customs
  prices, and sales from the shop to its owner's till (players and regulars).

## 7.6.0: your first day comes first; a first look around; one style sheet

- **Your first day is pinned to the top of Home.** A slim strip shows how far along you are, the
  one next thing to do, and a single button to do it or claim it. "All ten" opens the whole list;
  "Hide for good" puts it away. After your first rank it only shows up as a single line when
  rewards are waiting.
- **A first look around for new players.** Five short pointers, once:
  - health, energy and cash;
  - your case;
  - your first day;
  - Work (Jobs on desktop);
  - the quick bar.

  Each one lights up the thing it's about. They wait until any recap, letter or fight is out of
  the way, never show for a player who already has a rank, and can be skipped.
- **One sheet of colours and sizes.** The game had four sets of colour and size definitions that
  disagreed; they're now one file. The game looks exactly the same: every element was checked on
  phone and desktop before and after. Three near-identical greys for secondary text became one.
  The sheet adds a scale of type sizes, spacing steps and a minimum tap size for new work to use.

## 7.5.0: fight results; the game asks its own questions

- **Every fight ends on a result plate.** After the win or loss stamp you see what changed:
  - cash and reputation won or lost;
  - your health, or how long you're in the clinic;
  - the energy it took;
  - anything else that happened, such as a mugger taking your wallet.

  Street fights get "Fight again" next to "Continue". The round-by-round lines fold down to the
  last one so the plate fits on a phone. Never any odds.
- **Big Fish asks properly.** Taking on a heavy alone opens the game's own card with their face,
  what they run, and the risk in words ("Back off" or "Take him on"), instead of the browser's
  plain pop-up.
- The same card now replaces every other browser pop-up: ambushes, torching, surgery,
  court-martial, contracts, forums and alliances. Escape or tapping outside backs off.

## 7.4.0: five tabs on phones

- **Phones get five tabs: Home, Work, City, People, Me**, with bigger labels on a 60px bar.
  - Fight and the gym now sit inside Work, and the Shop inside City, behind a switch at the top
    of the screen ("Jobs | Fight and gym", "Places | Shop").
  - Every link to Fight or the Shop still works and lights the right tab.
- **More room to play while scrolling.** Scroll down and your name row and the quick bar fold
  away. Scroll up and they come back. While scrolling, fixed bars take about a fifth of a phone
  screen instead of two fifths.
- Desktop keeps its full side menu.

## 7.3.0: your case comes first; leads; jobs as a career track

The approved redesign directions: A for Home, B for Jobs, plus leads.

- **Leads: story missions that build your case.** Nine leads in four chains:
  - Benny Marlowe;
  - Kozak;
  - C&P Holdings;
  - Judge Crane, who opens up once the others are cracked.

  Each lead is a short objective using things you already do: jobs, work in your career, street
  fights, your standing, going to a city, paying an informant or a clerk. Only what you do after you
  start following a lead counts. Closing one pins a new piece of evidence to the board, with a
  little cash and reputation. Never gear, power or odds. You can't work a lead from a cell, the
  clinic or the road.
- **Home opens on your case.** "Who framed you": the four suspects, how many pieces of evidence you
  have, and the next lead with one clear thing to do (follow it, pay, go to work, find a fight,
  travel, or close it). "The board" takes you straight to the board on the City page.
- **Your work, under the case.** Your rank photo, the best career job you can do now (it counts
  toward your next rank), and one tap to do it. Without a career, the game's own pick.
- **The board** now counts evidence from leads too, tied to the suspects each lead points at.
- **Jobs became a career track:**
  - your rank photo, the road from your first rank to the top, and what your boss thinks of your
    work;
  - every job is its own cover card: the best one large, the rest in a grid;
  - career work shows that career at the job's rank level, and street work shows a scene for the
    kind of work;
  - no two neighbouring cards share a picture;
  - risk stays in words.

## 7.2.0: art that matches what it shows (batch 1 of the redesign)

From the art audit. Every change below fixes a picture that showed the wrong thing.

- **The Fire Department has its own building.** The fire log moved out of the Police Station into
  a new **Fire Station** in every city.
  - The Fire! story on Home and the Fires tile now open the Fire Station.
  - The Fire! story shows firefighters, not police tape.
  - The Fire career's banner shows fire too.
- **Story characters have their own faces.** None of them share a face with a rank photo, a fight
  NPC or a street regular any more:
  - Judge Crane had no face at all (a gavel) and now has one;
  - Benny Marlowe no longer shares a face with a street brawler;
  - Mr. Kozak and Doc Mercy no longer share a face with players' rank photos;
  - Doc Mercy now looks as she's written: older, with glasses.
- **Other pictures that showed the wrong thing:**
  - The heatwave event showed rain; it now shows heat.
  - Turf wars showed a sunny yacht harbour; they now show a night street.
  - City Hall was a purple fountain; it is now a civic building.
  - The Police Station was an unreadable black frame; it now shows police.
  - The hospital district was a parking lot; it now shows the hospital.
  - Your Place was a rain puddle; it now shows apartments at night.
  - The daily reward and messages got fitting pictures.
  - The city of Halcyon no longer uses a real-world landmark skyline.
- **Search** finds the Fire Station, the Pound and the black market.
- Removed 49 unused old images.

## 7.1.0: the syndicate look, part 2 (Me and Home)

The Me and Home screens rebuilt to match the approved mockup.

- **Me, the dossier:**
  - Reputation and your record side by side, then where the money is: bank, cash and dirty.
  - **Gut read:** your qualities in words, grouped as Body (build, reflexes) and Mind (street
    smarts, presence).
  - **Career:** a rank bar (rank 5 of 8, next: Underboss) instead of the long list.
  - **Loadout:** one tile per weapon and armor, with its photo, rarity, condition and spares,
    and whether you carry or wear it. Gun shop and Black market buttons underneath.
- **Home:** the street feed is now a card on phones too ("On the street"), and every line shows
  the face of the person it's about, on phone and in the desktop side panel.

## 7.0.0: the syndicate look, part 1 (the shared kit)

The approved redesign, from the owner's design system. This release changes the parts every
screen shares; the next one reworks the Me and Home screens to match the approved mockup.

- **Type:** Outfit for headlines, names and numbers everywhere; Plus Jakarta Sans for reading
  text. The comic and mono faces are retired. Big headlines were resized, since Outfit is wider.
- **Color means one thing everywhere:** crimson for actions, danger and the active tab; amber for
  money in play, rank and energy; green for safe, live, healthy and positive.
- **Glass panels** over a dark canvas with soft colored glows and a faint dot grid.
- **Pill buttons:** crimson for action, frosted for secondary, amber for money.
- **New top bar:** your name and rank beside your photo, then four tiles: Health, Energy, Cash
  (with dirty money under it and the bank button) and Record.
  - Your record is a word (Clean, Noticed, Wanted, Most wanted), never a number, and it's
    always visible now.
- **Navigation:** the active tab is a filled crimson pill, on phone and desktop.

## 6.15.0: the black market, item rarity, and businesses that earn

- **Item rarity.** Every weapon and armor is Common, Uncommon or Rare, shown in the shop. Rarity
  never changes what a piece does. It sets how many a shop holds (6, 4 or 2) and how often a
  shipment brings it: rare pieces miss more shipments.
- **The black market**, on The Street in every city:
  - Sell your spares, or an unused piece, at your own price (half to three times the shop price).
  - Buyers pay cash or dirty money. Sellers are paid in dirty money, and the fence keeps 10%.
  - Buying puts a little heat on your record.
  - Gear from any city can be sold anywhere, so carrying pieces between cities pays.
  - The fence keeps a couple of out-of-town pieces of its own on offer, at a premium.
  - Regulars shop there too, at most once a day each, only for a piece they need and only at a
    fair price, so sellers have real customers.
- **Fix: player-run shops now earn from the city's regulars.** A Port Solace diner had made
  nothing since it opened, because regulars only ate when nearly out of energy, which never
  happened. Now:
  - regulars buy a meal every few hours at the diner;
  - when laid up in hospital they buy a medkit at the pharmacy;
  - they move to a better place through the real estate office when they can comfortably
    afford it.
  - Every sale goes to the owner's till, and the city tax is taken when the owner collects.

## 6.14.0: regulars at city hall

- **Regulars can run for mayor.** When the ballot is open, the regular with the best standing who
  can pay the $500 filing fee may file, with their own pitch. If a mayor is in office, players
  get the first 12 hours of the ballot to themselves.
- **Regulars vote.** Each regular votes once per term, mostly for candidates on their own side of
  the law.
- **A regular who wins governs.** They draw the salary, set taxes and the police bounty once a
  term, appoint a police chief, and sometimes order a crackdown or pay for soup kitchen meals.
  A crooked one sometimes skims the treasury, which internal affairs can catch.
- **Limiters, so the city stays the players' to run:**
  - At most one regular on the ballot per city per term.
  - Players' votes decide. Regulars' votes only count when players' votes are tied or there are
    none.
  - A regular mayor keeps taxes moderate (1% to 5%), never pardons anyone and doesn't touch
    witness protection.
  - Regulars never sign recall petitions. Players can recall a regular mayor as usual.

## 6.13.0: regulars do their careers' city work

- **Regulars work the city's cases, not only their career jobs.** When there's city work for their
  career, a regular out on the street does it, by the same rules as players:
  - **Police:** work crime scenes, and arrest when the clues point clearly at one person (players
    included).
  - **Attorneys:** take up prosecutions nobody has taken.
  - **Doctors:** treat whoever is in the ward and examine crime victims.
  - **Bankers:** review flagged deposits.
  - **Firefighters:** walk burn scenes and sometimes name the arsonist.
  - **Mechanics:** fix the wrecks waiting at the garage.
  - **Hackers:** quietly clean other regulars' records.
  - **Soldiers:** stand guard at the bank, one at a time.

  Players get the first 20 minutes on any fresh case, fire or wreck. Regulars only step in after
  that. Their work shows up in the street feed.
- **New regulars.** Every city now has a firefighter, a mechanic and a hacker (15 regulars per
  city), so fires, wrecks and records always have someone to see to them.
- **Fixes:**
  - When an attorney joined a trial, the work wasn't saved to their record. It now counts toward
    promotion.
  - Regulars' casework counts toward their own slow promotions, never the player promotion path.

## 6.12.0: regulars live in the city; spare gear

- **Regulars work their careers.** While they're out on the street, each regular does a job from
  their own career about once an hour. They get paid and gain a little experience. Their work
  shows up in the street feed ("Rosa Vint · Work an ER night shift").
- **They rise slowly, to a cap.** A regular can climb at most two ranks above where they started.
  Promotions take a long time. The city's big bosses don't climb.
- **Regulars shop.** They keep what they earn, then buy what they need:
  - a medkit when hurt, food when worn out;
  - a weapon or armor from their own city's shop when they have none that works.

  They pay the owner's price, so player-run shops earn from them. They never take the last piece
  off a shelf, so a player is never shut out.
- **Up to 3 of each weapon or armor.** You can now own the one in use plus two spares. The shop
  shows "You own 2 of 3". When the piece you're using breaks, a spare takes over by itself.
- **Fixes:**
  - Regulars no longer lose their record and cash every few hours. The hacker's walk-in clients
    from 6.11.0 now actually appear, and stolen money is fenced a little at a time.
  - The purchase message no longer puts an emoji in the text.

## 6.11.0: the city keeps every career busy

- **The city's own people get into trouble.** About every 75 minutes, each city has an incident
  among its regulars: a mugging, a snatched bag, a lifted wallet, a fire or a car wreck. Only the
  street's muscle and drifters commit them, never the law or the big bosses.
- **Each incident is real work:**
  - **Police:** muggings and snatches open real case files. Work the scene, then arrest the
    culprit. Regulars can now be suspects, arrested, searched and hunted.
  - **Courts:** arrests go to trial.
  - **Medicine:** anyone in the city's hospital, player or regular, now shows up in **The ward**.
    Doctors (Intern and up) can treat each patient once. The patient's remaining stay is halved
    and the city pays the doctor. Examining crime victims still adds a clue to the case.
  - **Banking:** some thieves bank the money, which lands on the compliance desk.
  - **Vigilantes:** cases that go cold can be hunted.
  - **Fire Department:** fires go on the fire log to investigate.
  - **Mechanics:** wrecks wait at the garage (in the Docks) for a mechanic to fix, and the
    driver pays.
  - **Hackers:** thieves pick up a record. Hackers can scrub it for dirty money (on The Street).
- **Every career activity now gives experience.** Arrests, exams, treatments, verdicts, hunts,
  guard shifts, repairs, scrubs and the rest count toward promotion. They now also improve the
  career's key qualities, like a career job does.
  - Activities that gave nothing before now count too: surgery, back-door treatment, house
    searches, laundering for a client, lawyer retainers, guard duty, peacekeeping, and a fire
    investigation that comes up empty.

## 6.10.0: the pound

- **The Pound** is a new building in every city. Dogs now come from there instead of Your Place.
- **Each city has its own breeds.** Grayhaven has the pound mutt and the junkyard dog. Port
  Solace has the labrador and the pit bull. Ironmoor has the husky, shepherd and rottweiler.
  Halcyon has the bulldog and the mastiff.
- **Kennels are limited.** "In kennels: N" shows how many are waiting. A new batch arrives every
  six hours, and what turns up is pure luck. Each kennel holds up to 3 of a cheap breed, 2 of a
  mid-priced one and 1 of the big dogs.
- **The city runs the pound.** No player can buy it, own it or rob it.
- **Your Place** still shows your dog (feed it, give it away), and sends you to the pound when
  you don't have one.
- **Fix:** six breeds could never actually be bought. The server only accepted three of them.
  All nine work now.

## 6.9.1: the shop shows only what this city sells

- Weapons and armor sold in other cities no longer appear in the shop: you only see what's on
  sale where you are. Travel to find the rest.
- Every weapon and armor shows its stock: "In stock: 4", or "In stock: 0" when it's sold out
  until the next shipment.

## 6.9.0: armor pairs, gear by city, stock and shipments, no more repairs

- **Four new armors**, so every price has a choice between a light piece (keeps you quick,
  soaks a little less) and a heavy one (soaks more, slows you): Motorcycle leathers next to the
  Padded jacket, a Steel-lined coat next to the Old kevlar vest, a Concealed vest next to Riot
  gear, a Ballistic undersuit next to the Tactical plate carrier. Each pair balanced to be worth
  the same.
- **The shop no longer says Quick, Heavy or Light**: players find out for themselves.
- **Every city sells different gear.** Grayhaven carries the cheapest pairs; the rest are spread
  over Port Solace (baseball bat, snub-nose pistol, kevlar and concealed vests), Ironmoor
  (hatchet, revolver, shotgun, steel-lined coat, riot gear, plate carrier) and Halcyon
  (switchblade, machine pistol, ballistic undersuit). The shop shows where the rest is sold.
- **Limited stock.** Gun shops and armor outfitters hold a few of each piece (plenty of cheap
  gear, a couple of the expensive). A shop owner orders a shipment every 6 hours; a shop nobody
  runs gets one every 4 hours. What arrives is pure luck: anything from a single piece to full
  shelves, and nothing a player has changes it. A shop whose owner hasn't ordered in two days
  gets one sent anyway.
- **Nothing gets repaired.** Worn-out gear is replaced by buying a new one. Issued police and
  army gear can't be bought, so the armory swaps a broken piece for a new one once a day.
- The guide explains gear, cities and stock.

## 6.8.0: two weapons at every price

- **Five new weapons**, so every price has a choice between a quick weapon (speed: you strike
  first and land more) and a strong one (power: every hit lands harder):
  - about $150: Bike chain (quick) or Lead pipe
  - about $700: Brass knuckles (quick) or Baseball bat
  - about $3,300: Switchblade (quick) or Hatchet (heavy)
  - about $14,000: Snub-nose pistol (quick) or Old revolver
  - about $45,000: Machine pistol (quick) or Sawed-off shotgun (heavy)
- Each pair is balanced to be worth the same: the quick one does a little better against fast
  fighters, the strong one against slow brutes. A test keeps every pair even.

## 6.7.0: armor that works, quick and heavy gear, and an age check

- **Armor now soaks a share of every hit** instead of a tiny flat amount. Before, the $40,000
  plate carrier helped less than a $150 lead pipe; now armor is worth about as much as a weapon
  at the same price. Worn armor soaks less, broken armor none.
- **Gear has a feel**: knuckles and the switchblade are *Quick* (you're faster with them); the
  shotgun, machine guns, riot gear, plate carriers and army armor are *Heavy* (they slow you a
  little); the jacket and vest are *Light*. The shop shows the word, never a number.
- **Date of birth.** Making a character now asks for a date of birth, and everyone who already
  plays is asked once. Conspira is for adults (18+, because of the crime, guns and casino). Too
  young: the character can't be made (that browser can't try again for 30 days) or, for an
  existing one, is held. The date is private, never shown to anyone.
- The terms and privacy pages say 18 and explain the date of birth.
- **The new logo on the help and legal pages**: the wordmark in the header, the badge above the
  title.
- Errors on the start screen (a bad name, a date that's not allowed) now show; before they were
  silent.

## 6.6.0: the new logo, and a photo for every rank

- **New logo.** The new Conspira badge (the eye over the die, cards, the scales of justice, the
  pistols and the gold police shield) on the start screen, the loading splash and the app
  icons; the new wordmark in the sidebar and on the moderator page; the eye in the triangle as
  the browser-tab icon.
- **A different photo for every career rank.** A soldier no longer looks like the boss, an intern
  no longer looks like the doctor. Regulars, contacts, street toughs, boss cards and your own
  portrait all use the photo for their career and rank. Mechanic, Hacker and Fire Department got
  seven new rank photos each; people without a career get one of six street photos. The Mafia
  photos were reordered so the Boss is the old man in sunglasses, not a Made Man.
- **No more cut-outs.** Every background-removed image is gone; photos stay whole, in a frame.
  The player's portrait is a still photo now (no video), which also makes Home lighter to load.

## 6.5.0: every NPC is their career

- **NPCs are drawn as their career, no more random faces.** Regulars, contacts, suspects, bosses
  and street toughs all use one cut-out character per career (still, background removed), with a
  woman's version for Police, Mafia, Courts, Medicine, Banking, Vigilante and the street. The
  soldier, mechanic, hacker and firefighter are shared (helmet, hood or gear hide the face).
  Mechanic, Hacker and Fire Department have characters of their own for the first time.
- The same cut-out breaks out of the frame on boss cards; small round faces use a crop of it.
- **Cars are real photos** in the garage, the lot, the city lot and on drive routes.
- **Car paint and Your Place are gone from the Style shop.** The one decor bought was refunded.

## 6.4.0: The Velvet Ace

- **A casino on the Casino Strip in Port Solace** (City → The Velvet Ace), with three tables:
  - **Twenty-One**: beat the dealer without going over 21. Hit, stand or double. The dealer
    stands on 17; a two-card 21 pays 3 to 2.
  - **Roulette**: one zero. Red or black, odd or even, 1 to 18 or 19 to 36 (pays 1 to 1), or a
    single number (pays 35 to 1).
  - **Burning Seven**: two dice, the flaming die from the logo. Under 7 or over 7 pays 1 to 1,
    exactly 7 pays 4 to 1.
- Cash on hand only, $10 to $5,000 a bet, up to $100,000 in bets a night. Favors can never be
  bet, and nothing won has value outside the game. Every table shows what a bet pays, never the
  chances. The house keeps a small edge, so the casino slowly takes money out of the game.
- "Tonight" shows whether you're up or down. **Walk away** asks the doorman to keep you out for a
  day, a week or a month.
- The guide and the terms explain the casino.

## 6.3.0: the official logo

- **The Conspira badge is in the game**: on the start screen, the loading splash, the desktop
  sidebar and the moderator page.
- **App icons and the favicon** use it too: the full badge for the home-screen icon, and the
  flaming die from its top for the tiny browser-tab icon, where the full badge can't be read.
  Phone alerts show the badge.

## 6.2.0: season pass, Favors exchange, paint and decor, phone alerts

- **Season pass** (Shop → Style). Ten levels a month, climbed by playing: jobs, training, fights
  won and arrests. Every level has a free reward; the pass (500 Favors, for the month) adds a
  second one. Rewards are looks only you can get this way (Ember, Jade, Smoke and Sunset name
  colours; Brass knuckle, Onyx and Halo frames; four new banners) and Favors. Anything earned but
  not collected is handed over when the month ends.
- **Favors exchange** (Shop → Style). Sell Favors to other players for bank money, or buy theirs.
  Favors are held on the order until it sells or you cancel; the exchange keeps 10% of each sale.
  Saved accounts at least a week old only; up to 3,000 sold and bought a week. Gifted Favors,
  free rewards and Favors bought in the last week can be spent but not sold.
- **Car paint** (eight colours) recolours every car you own, in your garage and wherever it's
  parked. **Your place** (six rooms) changes the photo of your home on the City page.
- **Phone alerts**: energy full, out of the clinic or jail, arrived, school decisions, and what
  other players did to you, even with the game closed. Pick which ones you want on the Me page.
  (Switches on once the alert keys are added.)
- **Favors packs** can be bought through Lemon Squeezy once the store is opened. Paid packs are
  credited once and held a week; refunds take them back. New **refund policy** page.
- **Player numbers** on /admin: characters, saved accounts, who played today and this week, who
  came back the next day and after a week, new characters per day, how far people get, where
  people who left stopped, and careers. From the game's own records; nothing tracked.
- The six QA test characters were deleted.

## 6.1.0: ready for strangers

- **Specialties show only what you have.** The Me page lists the specialties you've earned,
  their level, and what each gives you. No counters, no progress bars, no "how to get it" and
  no "next" hints. The numbers aren't sent to the browser any more either.
- **How to play** (/guide): the city in plain words: energy and work, hidden stats, careers,
  money and dirty money, heat and the law, fights and death, crews, travel, homes, the city and
  Favors. No numbers or odds.
- **Player rules** (/rules): one character per person, no bots or bug abuse, no real-money
  trading, no hate, harassment, threats, sexual content or personal details, and what happens
  when rules are broken.
- **Terms** (/terms) and **Privacy** (/privacy), marked as drafts until they're reviewed. The
  start screen links to all four, and so does a new Help and rules card on the Me page.
- **Chat filter.** Chat, character and crew names, usernames, bios, forum names, dog names,
  newspaper columns and mayor pitches now refuse slurs (also when disguised with numbers,
  spaces or repeated letters), telling people to hurt themselves, and links. Swearing is fine.
- **Speed limit.** Every account can send at most a quick burst of actions every few seconds
  and a set number a minute. A person tapping fast never hits it; scripts do.
- **Delete my account** (Me → Account). Removes the character, the login, its chat messages and
  uploads for good, after your password (or typing DELETE as a guest). Leave your crew first.
- **Crash reports.** Errors in players' browsers and on the server are recorded (message, page,
  version; nothing personal) and listed on /admin, grouped with a count, kept for 30 days.

## 6.0.0: harder work turns up as you get good

- **31 new jobs, hidden until you earn them.** Seven street areas (the Gutter, Old Market, the
  Boardwalk, the Marina, Rail Yards, the Foundry and the Undercity) each get three steps of
  harder work. The first turns up after 15 rounds of the area's ordinary jobs, each next one
  after 10 rounds of the step before. Every step costs more energy, is a tougher check, hurts
  more when it goes wrong, and pays and trains more. Some stay honest; some slide into crime.
- **Careers get one each, and only one**: a senior job that turns up from the fourth rank on,
  after 20 rounds of the career's senior work (for example Cold case squad, Collect from the
  untouchable, Mass-casualty night, Night insertion).
- You don't see hidden work at all until it turns up. When it does you get a message ("Word
  gets around...") and the card shows "New" until you try it. How hard it is shows in words
  (Rough work, Hard work, Only for the hardened), never as odds.
- Checked: dying can never leave a character weaker than a new one. Death halves what you've
  trained, never the base you start with. A test now holds this in place.

## 5.9.3: city events explain themselves

- **Tap a city event on Home (a blackout, heat wave, festival, storm or payday) and a card
  opens** with a photo, how long it has left, what's going on, and what it changes in plain
  words: for example "Jobs pay 10% less", "Crimes are much easier to pull off" and "Hardly
  anyone sees anything: few witnesses". No odds. "Go to work" takes you to Jobs. Before, the
  bubble just jumped to City without saying anything.

## 5.9.2: top bar hints on a tap

- **Tap a pill in the top bar to see what it means:** cash (and what's in the bank), dirty money,
  energy (with when the next point comes and when it's full) and health (or the clinic
  countdown). The hint shows under the top bar and goes away after a few seconds or on a tap.
  These were hover tooltips before, which phones can't show.
- **The top bar no longer shrinks when you scroll.**

## 5.9.1: timers back in the top bar

- **The energy countdown is visible again:** the energy pill shows "+1 0:27" until the next
  point (or "full"), and health shows the clinic countdown when you're in. On phones the pills
  wrap onto two rows beside your face, so energy and health are no longer cut off the edge.
- **A frame replaces the career ring** around your face in the top bar; with no frame, the
  career colour ring shows.

## 5.9.0: a Motion setting, and a cleaner top bar face

- **Motion setting (Me → Motion):** the game follows your phone's Reduce Motion setting by
  default, so with it on, animated frames, names, scene videos and other effects stand still.
  Choose "Always animate" to keep them moving anyway. The choice is saved on this device.
- **Top bar face:** your career colour now sits as a ring behind your face and any frame you
  wear, and the rank number is gone.

## 5.8.5: drop-up lists for food and meds

- **Eat and Medkit get the same arrow as Work and Gym.** The button uses the best thing you carry
  in one tap (it shows its name); the arrow opens a list of everything you carry with how many
  you have (and the energy food gives), plus Field dressing for field surgeons, and a link to
  the Shop. With nothing on you, the list says so and points to the Shop.

## 5.8.4: the gym by name

- **The gym shows its activities, not the stats they train:** the quick bar button reads "Lift
  weights", "Spar & condition" or "Footwork drills" (not "Gym · strength"), and so do its
  drop-up list and the search. The stats stay unseen, as everywhere else.
- **No hint lines:** the gym cards on Fight and the quick bar list drop "Hit harder", "Take more
  hits" and "Dodge and strike first" (and the "Your career" mark). Just the activity and its price.

## 5.8.3: choose from the quick bar

- **Work and Gym open a list upward.** A small arrow on each button opens a list: your career's
  jobs first (best pay for the energy at the top), then other work, each with its pay and energy
  cost, plus a link to all jobs; or the three exercises, with the ones your career uses marked.
  Pick one and it's done, and it becomes the button's default. The button itself still does the
  default in one tap.

## 5.8.2: quick bar follows your career

- **Work puts your career first:** the quick bar's job button now offers your career's work (a
  doctor gets doctor's jobs): the career job you did last if it's open, otherwise the
  best-paying career job you can do right now. Without a career, or with none of its jobs open
  in this city, it falls back to the job you did last or the suggested one.
- **Gym trains what your career leans on:** for example strength for the Mafia, toughness for
  Police, agility for Vigilantes. If you last trained one of your career's stats, it keeps that
  one. Courts and Banking don't rely on the body, so they keep your last choice.

## 5.8.1: quick buttons use what you carry

- **Eat and Medkit on the quick bar use your own pockets** instead of buying something. With one
  kind of food on you, a tap eats it; with several, a small list shows each with how many you
  have and how much energy it gives, so you pick. With nothing on you, the button says "No
  food" or "No medkit" and a tap takes you to the Shop. Field surgeons still get Field dressing
  when they carry no medkit.
- **No progress ring around your face in the top bar.** Work toward your next rank still shows
  on Jobs.

## 5.8.0: real faces in fights, the microphone, more dogs

- **Fights show the right faces.** Your side of the fight scene now uses your own photo (or
  career portrait) and the frame you wear, and a player or regular you fight shows their own
  face and frame instead of a generic street tough.
- **The microphone (Favors, Shop → Style → Extras, 400):** only players with a microphone can
  speak in Global chat; everyone can still read it. City, crew and forum chat stay open to all.
  Yours for good once bought.
- **Six more dog breeds:** junkyard dog, husky, labrador, bulldog, pit bull and rottweiler,
  alongside the pound mutt, shepherd and mastiff. Every breed has a photo, in the shop list
  and on your dog's card.

## 5.7.0: street regulars do their jobs

- **Regulars with a career now work for you, for a fee.** Tap one in People and
  their job is the main button, with "Their work" listed first:
  - **Doctors** patch you up to full health (the fee grows with how hurt you are); Residents
    and up also operate on old wounds.
  - **Attorneys** go on retainer for a week, paid from the bank: if you're arrested, they
    defend you.
  - **Bankers** clean dirty money for a 22% cut (the laundromat takes 30%).
  - **Beat cops** look the other way: your record cools a little, once a day per officer, and
    it costs you a little conscience. Cash or dirty money.
  - **Mafia muscle** watches your back: bodyguards for 12 hours.
  - **Soldiers** drill you: strength and toughness, more than the gym gives, for energy.
  - **Vigilantes** watch your place for the night: break-ins at your home are harder.
- They only work while they're out on the street (their own hours) and in their own city.
  Otherwise the button says why. The fee goes to them.

## 5.6.1: fixes for faces, frames and name colours

- **Street regulars show their real face everywhere.** Many regulars still had an old drawing
  or no face saved, so city chat, Big fish and the map showed a stand-in face (sometimes the
  wrong person). Their faces are fixed, and the game now saves any out-of-date regular the
  first time it loads their city.
- **The top bar face sits right inside its frame,** in the normal top bar and in the smaller
  one after you scroll. The photo was pushed off-centre, and live effects (fire, current,
  sparkles) didn't shrink with the top bar.
- **Name colours show in more places:** the top bar (wide screens), someone's file, the chat
  on People, and the map (pin name tags and the person you tap), with the live touches for
  animated colours. Frames now show in someone's file and on the map's person sheet too.

## 5.6.0: live touches on animated names

- **Animated name colours get a few live touches** on top of their shimmer, kept light on
  purpose: Gold rush has gold stars twinkling on the letters, Wildfire has small flames and
  embers lifting off the top, Neon flickers with the odd spark, Chrome has a glint that slides
  across now and then, Frost has snow specks and glints, and Aurora a couple of faint stars.
  They show on People cards, in city chat, on your Me header, in the shop and in Try it on.
- **Fixed:** a player wearing an animated frame had a round photo on their People card instead
  of one filling the card.

## 5.5.0: every animated frame drawn live

- **Frostbite:** an icy ring with frost crystals growing out of it (long branching spikes among
  short ones) that catch the light in turn, fine snow drifting down past your face, and a glint
  that travels round the ring.
- **Blood moon:** a deep red eclipse ring that breathes, a slow-turning corona of red light,
  embers rising off it, and drops of blood that gather at the bottom of the ring and fall.
- **Aurora:** three ribbons of northern lights weaving round the ring in waves, their colours
  flowing as they drift, with faint stars coming and going.
- All six animated frames now use the same live drawing as Wildfire and Live wire, and stay
  smooth with every effect on screen.

## 5.4.0: real fire, real current

- **Wildfire is a ring of real fire now:** flame tongues rise and flicker all around your face,
  white-hot at the base, then yellow, orange and red as they lick upward, over an ember glow.
  The fire burns around and behind the face, never across it.
- **Live wire is a current of electricity:** jagged bolts race around the ring and crackle as
  they go, with sparks that jump off now and then, over a faint charged ring.
- **Gold rush sparkles:** four-point stars glint around the turning gold ring and fade out.
- These are drawn live and stay smooth: one shared animation runs every effect on the page,
  faces off screen or in a hidden tab rest, and small faces (chat, map) use fewer particles.
  With motion turned off on your device, they show as a still picture.

## 5.3.0: try it on before you buy

- **Try it on:** tap any frame, name colour or banner in Shop → Style (or its price) and a
  sheet shows it on you before you pay: your profile header with the banner, your face and
  your name, a city chat line, and how others see you, together with what you already wear.
  Animated looks move in the preview too. Buy or wear it from there, or close it.
- **Uploads preview first:** choosing an image for your own frame or banner no longer sends it
  straight away. You see it on yourself first, then "Send for approval" pays and sends it. If
  you don't have enough Favors, the sheet says how many more you need.

## 5.2.0: animated premium looks

- **Six animated frames:** Gold rush (a turning gold ring with sparkles that come and go),
  Wildfire (flickering flame tongues over an ember glow), Live wire (an electric ring that
  crackles round), Frostbite (glinting ice), Blood moon (a deep red ring that breathes) and
  Aurora (colours drifting around the ring). 400 to 600 Favors.
- **Six animated name colours:** Gold rush (a gold shine that sweeps across), Wildfire (flame
  rising through the letters), Neon (a sign that flickers now and then), Chrome, Frost and
  Aurora. 250 to 350 Favors. They show on People, in chat and as your name on Me.
- Animated looks come first in the shop, marked "Animated". Players who turn off motion on
  their device see them standing still.
- **Fixed:** the upload button stuck out of its card on phones, and the empty upload slot
  showed only a label. It now shows a dashed ring around your face (frames) or a dashed 3 : 1
  box (banners), and the button fits.

## 5.1.0: upload your own frame and banner (with approval)

- **Your own frame and banner:** in Shop → Style, the first card under Frames and under
  Banners is "Upload your own". Frames are a PNG with a see-through middle, shown around your
  face; banners are a wide photo, shown behind your profile on Me. The image is resized in your
  browser before it's sent. A custom frame costs 300 Favors and a banner 250.
- **Nobody else sees it until a moderator approves it.** Until then it's marked "Waiting for
  approval" and only you can see it. Approved: you're wearing it straight away, and an inbox
  message tells you. Not approved: your Favors come back (exactly once) with the reason. The
  rules are shown next to the upload: no nudity, hate, real people without their consent, or
  art from other games.
- **Moderation page:** a new "Uploads to review" queue with a preview of each image (on a
  checkered background so see-through frames are clear), who sent it and what they paid, and
  Approve or Reject with a reason.
- Uploads are kept in their own database table and served from a separate address that only
  ever shows approved images publicly; pending or rejected images are visible only to their
  owner and to moderators.

## 5.0.0: Favors and the Style shop

- **Favors, the game's premium currency.** Favors buy looks, never power: no energy, stats,
  gear, money, property, rank or time off a sentence, and they never turn back into real money.
  The rules are written down in docs/MONETIZATION.md.
- **Style, a new section of the Shop:** six frames for your face, six name colours and eight
  banners (city photos behind your profile). Each one previews on your own face before you buy
  it; then wear it, swap it or take it off. A history shows what came in and what you spent.
- **Your look shows everywhere others see you:** your frame on People, the map, city chat and
  the top bar; your name colour on People cards, in chat and on Me; your banner behind your
  profile on Me.
- **Buying Favors opens soon.** The packs (100 to 3,200 Favors) are shown with placeholder
  prices and say "coming soon" until a payment provider is connected. Every purchase will be
  counted exactly once even if the provider sends its notice twice.
- **Moderators can grant Favors** from the moderation page (by player name, with a reason that
  shows in the player's history), for testing and support.
- **Players get their own faces.** 25 new photo faces only players wear (never a street
  regular or a story character), used as the default for anyone who hasn't picked one and as
  the choices in Edit profile. Fixes players sometimes having the same face as a regular.

## 4.8.0: skeleton loading

- **Loading looks like the game arriving:** instead of a spinner or a line of text, grey shapes
  with a slow shimmer stand where the content will land, matching each screen's layout. When
  you come back to the game you see the top bar, the story bubbles, the main card and the tiles
  (with the side menu and side panel on wide screens) while it loads. Home's city tiles and Big
  fish card, the People cards, crews, the prison yard, the Directory, City Hall, the season
  board, businesses and the city chat all load the same way. First-time visitors still get the
  logo while the game starts. The shimmer stops for players who turn off motion on their device.

## 4.7.0: lighter on the network, fairer pay between careers

- **Fewer requests:** the city's news, crew needs and numbers are now fetched once for the whole
  page instead of once per panel, and only once after an action instead of three times. The
  city chat only checks for messages on wide screens, where it's shown, and every 8 seconds
  instead of 5. A phone now makes 4 requests a minute instead of 18; a wide screen 12 instead
  of 18.
- **Balance: the newer careers no longer earn double.** Mechanic, Hacker and Fire Department
  reach their best job at rank 7 (about day 36 for someone playing three times a day), while the
  older careers wait until rank 8 (about day 63), and their best jobs had almost no risk. In the
  simulator they earned $600k to $730k from work by day 60 against $290k to $400k for everyone
  else. Their jobs from rank 4 up now pay about a third less, and Military's from rank 5 up
  about 15% less. Day-60 earnings now run from $293k to $465k across all ten careers.
- The pacing simulator now also reports money earned from work, not just money left over.
- "You found" messages no longer include an emoji.

## 4.6.0: new art (photos for every item, more boss cut-outs)

- **Every item and business is a photo now,** in the same style as the scenes and faces: food,
  medkit, housing, weapons, armor, and the businesses you can buy (laundromat, bar, hotel,
  nightclub, steel mill and the rest). The drawn icons are gone. Stills from free stock video,
  credited in public/items/PHOTOS.md.
- **Two more bosses break out of their card on Home:** Captain Harlan Webb and Augustin Vale
  have new faces with clean cut-outs. Seven of the eight bosses now have one; Colonel Hraba
  still shows a framed photo.

## 4.5.0: the rest of the cleanup (faces everywhere, no emoji, no odds)

- **Every named character is a photo now:** career contacts (Reyes, Kozak, Marsh, Silas, Mercy,
  Quell, Brann, Dobrev, Okafor, Brennan), the suspects on "Who framed you" and the street toughs
  you fight. Each has a fixed face that matches how they're written. No more cartoon busts mixed
  in with photos. Street regulars never share a face with anyone else in their city.
- **No emoji in the interface:** card titles, buttons, tags and messages are plain words. Energy
  costs show the lightning icon or "N energy". Shops show a small photo instead of an emoji.
- **No odds anywhere:** torching a business no longer shows a "% chance it catches", and a
  prison-break plan no longer says how good the odds are. Neither is sent to the browser either.
- **Bank statement:** one line per movement, with cash, bank and dirty amounts as colored figures,
  empty rows left out, and the latest eight with "Show all".

## 4.4.2: the map, as in the mockup

- **The map on Home is a street map now:** dark city blocks with lighter streets between them,
  two avenues cutting across, and the water along the bottom. District names sit in the corner
  of each block, and an orange marker pulses where something happened in the last hour.
- **Pins are faces with a pointer and a name tag:** white for people, gold with a crown for the
  boss, red for you. Each block shows up to two faces so they never pile up; anyone else there
  shows as "+1 more".

## 4.4.1: the side panel keeps "Right now"

- **On wide screens the right-hand panel has all three again:** "Right now" on top, "Live in"
  your city under it, and the city chat below, filling the rest. The chat is just the chat now,
  since the city's news is right above it.

## 4.4.0: a new look, round 5 (closer to the mockup, faces, city chat)

- **More faces, matched to who people are:** 43 new photo faces, plus the career portraits that
  show a face, all tagged as women or men. Every street regular now has a fixed face that fits
  how they're written, and no two in the same city share one. The city's bosses get their own.
- **Pick your own face:** Me → Edit profile now has a grid of faces (Women / Men) besides
  uploading a photo.
- **City chat on wide screens:** the right-hand panel is now the city's chat, with faces,
  times, the city's news from the Courier in between, and a box to say something.
- **Home follows the mockup more closely:**
  - The story bubbles lead with the city: your chapter, the big fish who's out, fires,
    the election and turf wars, then your own to-dos.
  - The main button is short ("Run errands $16–24").
  - Big fish is one poster-sized card for the boss who's out, with "Take him on" or
    "Take her on".
  - "The map" has its own heading with an "Open" link, faces as pins with name tags, and a
    crown on the boss.
  - "Right now" and your rewards moved below the map.
- **Turf war board:** a photo of the district behind the score, bigger crew badges, how many
  are in on each side, a center timeline with faces on each side, and photo rosters.
  "Join the fight" shows its energy cost, and "Break it up" is now "Call peacekeepers". The
  board says the war is settled when the clock runs out: it never shows who's likely to win.

## 4.3.0: a new look, round 4 (Me, People, City)

- **Me is half as long.** It opens on a big portrait of your character over a photo of where your
  career works, with your name, rank and introduction, and "Edit profile" right there. How you
  feel is four colored tiles under it. Specialties are compact tiles: tap one for its perks and
  how to earn it. "What happened" and "The story so far" show the latest few lines with
  "Show all". Pockets only show up when there's something in them.
- **Fixed:** some lines in "What happened" were squeezed into a narrow column, and some had a
  card border around them. They're now one quiet list, and emoji are gone from it. Long weapon
  names in Gear no longer get cut off.
- **People are player cards:** a full photo with the name over it, instead of a mugshot against
  a height chart.
- **City:** place titles lose the small icons, and each gets a short subtitle that fits.
- Card titles on Me lose their icons, and a few explainer lines are shorter or gone.

## 4.2.0: a new look, round 3 (faces and jobs)

- **One portrait style everywhere:** every player and contact without an uploaded photo now gets a
  real photo face, always the same one for the same name and from their own career where
  possible. No more cartoon faces or silhouettes mixed in with photos. Your own avatar in the top
  bar shows your career portrait.
- **The Big Fish on Home** are the same people as their faces elsewhere.
- **Jobs get cover art:** each job shows its district's photo, and the three chips under each job
  are now one quiet line (the kind of work, plus "risky" or "shady" marks).

## 4.1.0: a new look, round 2 (turf wars go live)

- **Turf wars as a live match** at City Hall: a LIVE tag and countdown, both crews' badges, the
  headcount on each side as a big score, a tug bar, a timeline of who declared war and who joined
  which side (and when), and both rosters with open slots. Join, break it up or settle it from the
  board. No odds: it shows who's in, never who's likely to win.
- **Home shows a "Turf war" story** whenever a war is on in your city.
- Wars now remember when each fighter joined.

## 4.0.0: a new look, round 1 (the kit and Home)

The first round of the visual redesign, based on reference designs from real game and app
designers. The lessons behind it are written down in docs/DESIGN_LESSONS.md.

- **One kit across the game:** a deeper charcoal background, one corner radius, pill buttons, red
  for the main action and gold for money. Manrope for the interface and Anton, a condensed face,
  only for big titles and names. Card titles lose the small icon in front.
- **Top bar as pills:** cash (the gold "+" opens the bank), dirty money, energy and health. No
  emoji. Heat only shows when you have some.
- **Home, rebuilt:**
  - A row of stories at the top: a new chapter, your crew's plans, the daily reward, messages,
    hiding your dirty money, feeding your dog, timers. Gold rings are ready or new.
  - Your character, cut out from the photo, stands in front of the city and breaks out of the
    banner, with the best job for you as one red button.
  - "Tonight in" tiles: who's out on the street, crews, wanted and fires, each its own color.
  - Big fish: each boss leans out of his own card.
  - The city map is dark blocks with streets between them instead of colored rectangles.
- Character cut-outs are made from the existing career portraits; careers or ranks without a clean
  cut-out keep the framed portrait.

## 3.9.0: every career, schools in the right place, fire investigators and hideouts

- **Course locations fixed:**
  - Kestrova no longer lists Ironmoor Military Academy as "coming soon"; it's open, and the city
    summary says so.
  - Accepting a career offer now enrolls you at that career's school in the city you're in, if
    there is one, instead of always the original one. A contact's or player's vouch now works at
    any school for the career.
  - The Academy lists schools in your city first, and the rest under "In other cities".
  - Mechanic is listed with the other invitation-only careers.
- **Every planned career is in:**
  - **Meridian Corporate Law School** in Halcyon: a second school for the Courts career.
  - **Hacker**, through the Halcyon Tech Institute (contact: Juno Okafor). Seven ranks from Script
    Kiddie to Ghost. From Pen Tester up, a hacker can sell record scrubs in the Directory: a client
    pays them (dirty money) and 20 heat disappears from their file. Their city seat can wipe one
    player's record once a day.
  - **Fire Department**, through the Grayhaven Fire Academy (contact: Chief Hal Brennan). Seven
    ranks from Probie to Fire Chief.
  - Two new starting backgrounds point to them: phone repair kid and volunteer firefighter.
- **Fire investigators:** every arson (businesses and crew fronts) goes on the city's fire log at
  the Police Station. Firefighters from Engineer up walk each scene once; read it right and they
  name the arsonist in public, who takes 25 heat, and city hall pays a reward. The Fire Chief's seat
  can order a fire watch: nothing burns in the city for six hours.
- **Hideouts:** a fugitive can go to ground for $300 (no waiting for the usual lie-low cooldown).
  They drop off the wanted board, detectives can't hunt them, and the trail goes cold twice as
  fast, but they can't work until they come out.

## 3.8.0: burning fronts, and life on the run

- **Torch a rival's front:** a crew front now stands in the city where it was bought. Members of
  other crews in that city see it under "Rival fronts" and can send themselves with a gas can.
  Bigger fronts have better guards and sprinklers. A burned front earns nothing and launders
  nothing for 12 hours, unless the leader pays a fifth of its price from the vault to rebuild.
  Get caught with the can and it's a cell.
- **On the run:** tunneling out of prison makes you a fugitive for six hours.
  - Detectives see escaped prisoners in their city at the Police Station and can hunt them. Bring
    one back and city hall pays a reward; miss, and the fugitive is warned.
  - Customs officers on duty can recognize a fugitive at the checkpoint or the station.
  - Airports check papers (no flights), and the bank freezes your accounts.
  - A card on Home counts down until the trail goes cold. Caught, you're back inside for longer.

## 3.7.0: envelopes, life inside, and crew fronts

- **Customs bribes:** an officer on a customs shift can name a price to look the other way. Word
  gets around: the Docks and the Station show who can be persuaded and for how much. Pay it
  (dirty money first) and that officer waves you through for the rest of their shift, trunk and
  bags. Other officers on duty still search you. The officer gets dirty money and loses some
  conscience, and every envelope is on record: internal affairs can audit anyone who took one,
  even a rank-2 soldier.
- **Life inside:** a new card in the Prison.
  - Standing in the yard: Fresh fish, Known face, Trusted, Shot-caller. Respect comes from prison
    shifts, yard fights you win, and escaping; higher standing makes the guards look elsewhere.
  - The tunnel: dig a little each session. If the guards find it, it's filled in and time is
    added. Finish it and you're out, with a lot of heat on you.
  - A shank: an edge in yard fights, until a shakedown finds it (and adds time).
  - The parole board: one hearing per sentence, once you've worked two shifts and stayed out of
    fights for a while. Effort, standing and a clean conscience help.
- **Crew fronts:** the leader buys a front from the vault: laundromat, trattoria, construction firm
  or freight company. It earns for the vault every hour, lets members clean dirty money through
  its books (the fee goes to the vault, and nobody files a report), and makes room for 2 to 8 more
  members. Trade up any time; the old front sells for half.

## 3.6.0: who you were, and customs at the border

- **Starting background:** character creation now asks who you were before they locked you up.
  Eight backgrounds (raised on the street, amateur boxer, police cadet, nursing student,
  paralegal, bank clerk, grew up in a garage, neighborhood watch), each with a line of story,
  a small head start in two stats, and a career that fits. It's optional and never skips the
  work: offers still come from doing the job.
- **Your old life:** until a career finds you, Home shows a card with the first job that gets the
  right person to notice you, with a button straight to it (or to the station, if it's in another
  city).
- **Customs officers:** police and soldiers (rank 2 and up) can take a one-hour customs shift at
  the Station. While anyone is on duty, more drivers leaving the city are stopped, the officer does
  the searching (sharp eyes find more, even with a false floor), stolen plates get run, and the
  station checks more passengers' bags. The officer gets a message and a 25% bounty on every
  seizure, paid by the city, and it counts toward their promotion.
- **Smugglers can see it coming:** the Station and the Docks say whether customs is on duty, and
  who. A stop by an officer names them.

## 3.5.0: the Directory, mechanics, and guard dogs

- **The Directory:** a new building in every city listing everyone who offers a service, and
  what they charge: mechanics, bankers who launder, lawyers on retainer, back-alley doctors and
  player-run shops. Online players have a green dot. Tap a name to open their file, or jump
  straight to where you hire them.
- **New career: Mechanic.** Start by lending a hand at Dobrev's garage in Iron Row; Vera Dobrev
  makes the offer. Seven ranks from Grease Monkey to Garage Owner, with work at every rank.
- **Player garages:** a mechanic opens their garage from the Docks and sets a rate against the
  dealer (from half price to 50% over). Other players hire them for car repairs, then false
  floors and home alarms (Mechanic rank), then rebuilding a business after a fire (Senior
  Mechanic). The mechanic keeps the whole fee, and every job counts toward their next promotion.
  Mechanics fix their own cars at the dealer for parts only. The city seat, Master of the Yards,
  can give one player's cars a free full service once a day.
- **Guard dogs:** get a dog for Your Place (a pound mutt, a shepherd or a mastiff) and give it a
  name. Break-ins get harder, burglars can hear it through the door, a failed break-in ends with
  the dog barking and you getting a message, and a crew job is likelier to wake the street. Feed it
  every three days: a hungry dog guards half as well (Home reminds you), and one left for a week
  finds a new home.
- Four specialties have new names: Bloodhound, Field surgeon, Ledger sense and Scar tissue. What
  they do hasn't changed.

## 3.4.1: career offer fixes

- **Fixed:** answering a Military career offer (accept or turn down) failed with "Bad request".
  The server's list of careers didn't include Military; it now comes straight from the career list,
  so a new career can't be left out again.
- **Fixed:** career offers kept arriving during the 24-hour break after leaving a career. They now
  wait until the break is over.
- An offer that already came in during a break says how long is left, keeps until then, and can
  be put aside with "Call me back later" instead of blocking the screen.

## 3.4.0: getting your car back, and crew home jobs

- **Stolen cars come home.** When a car thief is found guilty, the court returns the car itself
  (clean plates, wherever it's parked now) instead of money. If the thief already got rid of it,
  the owner is paid its value as before.
- **Checkpoints recover stolen cars.** A hot car impounded at a highway checkpoint goes straight
  back into its owner's garage, and they get a message.
- **Crew home jobs.** A crew leader can plan a job on a big home (studio apartment and up) from the
  homes list at The Street ("Crew job"). The crew takes the usual roles: the driver gets everyone
  away, the safecracker finds the hiding spot and opens it, the lookout makes sure nobody walks in,
  and the muscle handles the owner if they do. A crew carries off 60–90% of the stash, split
  between the team; product goes to whoever has room.
- It's still a crime: the safecracker is the face on the case file, an alarm camera helps the
  police, and the mark is told. No driver means everyone is caught at the door.

## 3.3.0: break-ins and car theft

- **Break-ins:** The Street lists the homes other players keep in this city: what kind of place,
  whether there's an alarm sticker, and whether the lights are on. Get in and you carry off part of
  their stash (money as dirty money, and product). Bigger homes have better locks, an alarm makes it
  harder, and an owner who's home sees your face if it goes wrong. The best time is when they're out
  of town.
- **Fit an alarm** at Your Place: break-ins get harder, and if one happens the camera gives the
  police a good clue.
- **Car theft:** the Docks lists cars other players left parked in this city. Steal one and it's
  yours, trunk and all, with hot plates. A hot car can't go to the lot: pay for new plates and
  papers, or sell it to the chop shop for dirty money. Drive it with hot plates and a checkpoint
  will run them: the car is impounded with everything in it (a sports coupe can still floor it).
  Armored SUVs are the hardest to take; the Wheelman specialty helps.
- **Both are real crimes:** a success opens a case file with neighbors' and witnesses' tips, so
  detectives can work it, arrest, and take it to trial. Victims get a message either way.
  Newcomer protection applies, and you can't hit the same person twice in six hours.

## 3.2.0: the home stash

- **Your Place:** a new building in every city. Wherever you have somewhere to live, you can hide
  clean cash, dirty money and product at home. Muggers, robbers and customs only get what's on you,
  and dirty money can't go in a bank, so this is where it waits until you launder it.
- **Bigger homes hide more:** a sock in the sleeping bag ($1,500 and 10 units), a loose floorboard,
  the bathroom tiles, a safe in the cellar wall, up to a panic room ($1,000,000 and 200 units).
  A cardboard box hides nothing.
- **Each city's stash is separate.** You have to be there to reach it; the card lists what's waiting
  elsewhere.
- **Hide everything risky** in one tap, from Your Place or from the ready strip on Home when you're
  carrying dirty money or product.
- **The risk:** a detective with a warrant and the right suspect now also finds the stash in that
  city. Dirty money and product are seized; clean cash is left alone.
- Losing a life empties every stash.

## 3.1.0: cars and smuggling

- **The Docks:** a new building in every city with your garage, a car lot and the fences.
- **Five cars**, from a rust-bucket hatchback to an armored SUV. Each has its own speed and
  trunk size: the family sedan looks innocent, the panel van carries the most, the sports coupe can
  blow through checkpoints, and road gangs leave the armored SUV alone. Garage holds three.
  Paid in clean money, cash first and then the bank.
- **Drive yourself** from the Station: fuel instead of a ticket. Your car (and its trunk) comes with
  you and stays parked in the new city. Every drive wears the car; get it repaired at the Docks
  before it gives out.
- **Cross-city smuggling:** untaxed cigarettes, bootleg liquor, grey-market phones and
  unregistered pistols. Each is cheap where it's made and dear where it's banned, and prices move
  every hour. Fences take dirty money or cash and pay in dirty money. A price board shows what
  every city's fences pay this hour.
- **Highway checkpoints** replace customs for drivers. A search can find your cargo and anything
  on you: it's seized, you pay a fine and carry the heat. A false floor makes searches much
  harder; the Wheelman specialty helps too.
- Road gangs can ambush cars on the highway, like the bus.
- Losing a life loses the garage.

## 3.0.0: player-run shops

- **Every counter in town can be run by a player.** Each city has a gun shop, an armor outfitter,
  a diner, a pharmacy and a real estate office. Buy the licence from city hall (from your bank)
  and the shop is yours; the city announces it.
- **You set the prices** with a slider, from 15% under the usual price to 50% over. Every sale
  pays you what's left after stock (about 20% of a sale at usual prices), into the till. Collect
  it when you like; city tax comes out like any other income.
- **Shoppers see who runs the counter.** Each shop category shows the owner and their price
  level ("Gun shop · run by Victor · prices +20%"), and the shelf prices include it. If the owner
  changes prices while you're looking, the sale stops and tells you the new price instead of
  charging you more.
- **Owners shop their own shelves at the usual price.**
- **Make an offer** for a shop someone else runs. The money stays in your bank until they accept;
  the owner gets a message and answers from Shop → Businesses (sell or no).
- **Use it or lose it:** an owner who hasn't been seen in a week can be replaced by anyone who
  pays city hall for the licence (their takings go to their bank). Or sell back to city hall
  for half the licence price.
- Up to two shops per person, across all cities. Shops you run elsewhere are listed with what's
  waiting in their tills.

## 2.9.0: clearer days, harder choices

- **Next-rank progress:** the ring around your face in the HUD and a bar on your career card
  show how much of the work toward your next rank is done ("Next: Underboss · 42% of the work").
  When the work is nearly done but your stats aren't ready, it tells you which ones need to grow.
- **What's ready:** a strip on Home shows what you can do now (daily reward, eat, field dressing,
  lie low) and what's on a timer (energy full, bodyguards, clinic, arrival). Tap a ready one to
  do it.
- **Your people:** add anyone to your contacts from their file ("Add to your people"). They show
  at the top of People: online or not, which city, in a cell or the clinic. Up to 30.
- **Community service (Jobs):** unpaid good deeds (scrub graffiti, the soup kitchen, the crossing
  guard...). They cool your heat, mend your conscience and count toward getting out.
- **Bank statement (Bank):** where your money went, newest first: work, shopping, laundering,
  rewards, and anything that happened between your moves (fights, robberies, fines, interest),
  across cash, bank and dirty money.
- **The body:** after a successful hit, decide within 20 minutes: leave it and run (free, but
  forensics gets a clue and the heat rises), a boat and the sea ($1,500, the physical clues are
  gone), or the funeral parlour ($4,000, only what witnesses saw remains).
- Fixed: the bank's buttons ran off the side of the screen on phones.

## 2.8.0: specialties, promotion choices, break reminders

- **Specialties (Me):** lasting skills earned by what you've done in *any* career, so living more
  than one life pays off. Three tiers each, with progress bars:
  - **Private eye** (Police work; arrests and manhunts count triple): when you're robbed you work
    out the first letter, then three letters, then the whole name of who did it. Also makes you
    a better ambush lookout.
  - **Devil's advocate** (Courts work): once per sentence, argue your own case and cut 30 / 45 /
    60% of the time left.
  - **Combat medic** (Medicine *and* Military work): a field dressing for 15 / 30 / 45 health
    every half hour, no medkit needed. Shows on the quick bar when you're out of medkits.
  - **Wheelman** (Military and Vigilante work, successful snatches): cleaner ambush getaways.
  - **Money on my mind** (Banking work): laundering fees 15 / 30 / 45% cheaper.
  - **Hard as nails** (waking up in the clinic): shorter clinic stays.
  - **Globetrotter** (trips between cities): shorter trips.
  Past work counts: your history already earns tiers, announced the next time you act.
- **Promotion choices:** every promotion asks how the job changed you, with two answers per
  career (a cop's "The beat" or "The case", a mobster's "Muscle" or "Respect"...). Each
  strengthens two hidden stats a little more at higher ranks.
- **Break reminders:** after every hour of actual play, a short in-world nudge to stretch, drink
  water or rest (energy refills while you're away anyway).

## 2.7.0: getting out

- **Nobody just walks out of the family.** To leave the Mafia you start **getting out** (Me ->
  Career record) and work through a checklist:
  - honest jobs: 5 per rank (an Associate needs 5, a Consigliere 35). Any crooked job, even a
    botched one, sets the count back to zero;
  - heat down to Clean;
  - no dirty money (launder it or spend it);
  - a conscience you can live with (each honest job while getting out mends it a little);
  - no case pending;
  - out of the crew (and if you were made, omerta still applies).
  When every box is ticked you can leave and become a nobody again, free to apply anywhere.
- **Legit careers just resign, unless their record is dirty.** An honest lawyer, banker or cop
  hands in the badge as before. A cop on the take or a banker washing mob money (heat, dirty
  money, or a heavy conscience) goes through the same checklist, with 3 honest jobs per rank.
- You can change your mind and go back to the life at any time.
- While getting out, the quick bar's job slot only offers honest work, and Right now shows how
  far along you are.

## 2.6.1: fixes and fewer interruptions

- **Fixed: the +$ / -$ pops next to your cash never went away.** Each pop now clears itself after
  a second and a half.
- **Fixed: planning an ambush sometimes showed no confirmation.** The confirmation was showing,
  but behind the person's file. Notifications now always sit on top, and the file closes once an
  action goes through so you see the result.
- **Fixed: after giving the signal, the side panel kept showing the ambush until a refresh.** The
  side panel, the map and People now refresh the moment you do something.
- Your crew gets a message when you plan an ambush, so they can take a role in time.
- Tapping while the last move is still going through tells you so, instead of silently doing
  nothing.
- New story chapters no longer pop up over what you're doing. Open them from the notification,
  the Right now card or the board, when you're ready.

## 2.6.0: real sounds, item art, steady scrolling

- **Real sound effects** (recorded, CC0; see public/sfx/CREDITS.txt), 120 KB in all, loaded on
  your first tap:
  - coins dropping when you earn; a cash register for daily rewards, business income and big
    payouts;
  - a soft scuffle (two punches and a body falling) for fights;
  - running footsteps when you pickpocket, snatch or mug, then coins or a thud;
  - a cell door slamming and locking when you're locked up; a short siren when the police
    catch you;
  - a level-up fanfare for promotions, a page turning for story moments, a wooden click for
    everything else.
- **Item art:** every shop item, issued weapon, piece of armor, home and business has its own
  illustrated tile (game-icons.net, CC BY 3.0; see public/items/CREDITS.txt), coloured by type
  and framed by price (grey, green, blue, gold). Shown in the Shop, businesses, gear, pockets and
  black-market offers.
- **Fixed: the page jumped while scrolling.** When the HUD shrank as you scrolled, the whole page
  got 80px shorter and jumped under your finger (and could flicker near the switch point). The
  HUD now floats over the page with a fixed space reserved for it, and shrinks/grows at two
  different points. The page behind a sheet or popup (someone's file, the search, an encounter,
  any dialog) no longer scrolls along with it.

## 2.5.0: the lineup

- **No more odds.** The Easy / Favorable / Even / Risky / Deadly labels and the "gut read" lines
  are gone everywhere (People, the map, Big fish, street fights), and the server no longer sends
  them. You size people up from who they are: their career, their reputation, what the street
  calls them.
- **People is a lineup:** everyone stands against a height chart, faces first, with a number
  placard, their crew tag, what they think of you, and a light for who's out now. Tap a face to
  pull their file: bio, what they remember about you, one big main action and everything else
  grouped below.
- **Less noise:**
  - "Online now" is gone; the map and the lineup already show who's out.
  - The live ticker is only on Home (and the desktop side panel).
  - Home loses its Career and Inbox cards (the HUD ring and People cover them).
  - The HUD shows only heat and reputation.
  - The Home banner is shorter.

## 2.4.0: big fish

- **Fixed: strong players couldn't attack anyone.** Two things combined:
  - The "too small to pick on" rule blocked anyone with under about a third of your reputation.
    Above ~120 reputation that was every regular in the city. Regulars are now always fair
    game; beating up nobodies just costs you a little reputation. Small *real* players are
    still protected.
  - Regulars were far stronger than real players of the same rank (the stat formula didn't
    match how players actually grow). They're recalibrated: a rank-N regular is about as strong
    as a player who reached rank N. Existing regulars update automatically.
- **The heavies:** two per city (an underboss and a captain, a Don and a commodore, a colonel and
  a racket boss, a banker and his fixer), with real reputation and $200–1,000 in their pockets.
  They keep their own hours, however busy the city is, wear a gold ring on the map and a 👑 Heavy
  badge.
  - Beating one: +8 reputation and a line in your story.
  - Crews can plan an ambush on a heavy from their card in People.
- **Big fish (Home):** the city's heavies, when they're out (in your local time), your odds, and
  "Take them on" or "Bring a crew".

## 2.3.0: the city remembers you

- **The regulars remember you:** every encounter choice, mugging and fight changes how that
  regular feels about you (Friend, Knows you, Wary of you, Hostile) and what they remember ("You
  told the police about them."). It shows on their card, on the map and when they stop you.
  - Friends who see you commit a crime keep quiet (and you hear about it). Regulars you've
    crossed always talk to the police.
  - When you're hot, a friend in town may pull you aside to warn you a detective is asking
    about you.
  - Regulars who can't stand you stop coming over to talk.
- **The story so far (Me):** your character's life is written down as you play, grouped by day
  since your release: your career moves and promotions, joining a crew, getting locked up, the
  first time you woke up in the clinic, each chapter you uncover, money milestones, moving city,
  and the choices you made on the street. **Share** sends it as a few lines of text.

## 2.2.0: every move has an agenda

- **Street encounters:** now and then while you work (about one every half hour of play,
  never in your first few jobs), a regular stops you with a choice. Their face slides in above
  the quick bar on any screen; open it to hear them out. Ten situations, each tied to the
  regular's career: a hot watch from a collector, off-the-books painkillers from a nurse, a cop
  who wants a name, a back-room card game, a found wallet, a law clerk selling a page from your
  old case file, a banker offering a quick clean, a vigilante asking for help, a collection job,
  a soldier who wants to spar. Each choice shows what it costs up front; what it really costs
  (heat, conscience, reputation, a clue) you find out after. They move on after 20 minutes.
- **The board · who framed you (City):** your story as an evidence wall. Each chapter is a piece
  of evidence tied with red string to the suspects it names; suspects stay "Unknown" until a
  chapter unmasks them. Missing evidence says exactly how to find it ("Reach rank 3 in the
  Courts career"), so the board is also your long-term goal list. Clues bought on the street
  are pinned there too.
- **Sound:** short synthesized effects (coins, a punch, a rising chord for promotions, a low
  one for story moments). Toggle with the speaker button in the HUD (desktop) or "sound" in the
  do-anything search.

## 2.1.0: faces, a live map and do-anything search

- **Faces for the street regulars:** all 40 regulars have their own drawn portrait (the
  Notionists set by Zoish, CC0), each picked to fit the character, on a background tinted by
  their career. They show everywhere: People, Online now, the map, the side panel.
- **Live city map (Home):** your city's districts as a board, with everyone out right now
  standing in a district (they move around through the day), and you marked YOU. Districts
  flash red where something happened in the last hour. Tap someone for instant actions
  (attack, pickpocket, snatch, mug); tap a district for its news and "Work here".
- **Do anything (Ctrl/⌘+K, "/", or the search button in the HUD):** type what you want and press
  Enter: any screen or place, any job, gym exercise, anything in the shop, collect your daily
  reward, use a medkit, or act on anyone out on the street ("mug bea", "steak", "bank").
- The street feed rotates between different regulars instead of repeating one.

## 2.0.0: game feel

A new look and layout built for long sessions: clear at a glance, fast to play.

- **One colour per resource, everywhere:** cash green, energy yellow, health red, heat orange,
  reputation violet, info cyan.
- **Game HUD:** your avatar with a ring showing how far up your career ladder you are and your
  rank number; big cash with bank and dirty money under it; chunky energy and health meters with
  the numbers inside; heat, rep, city and home as tags. It shrinks while you scroll.
- **Money pops:** every change in cash floats up beside it (+$24, -$60).
- **Quick bar:** your four most common actions on every screen: repeat your last job, the gym
  (your last exercise), eat the best food you can afford, use a medkit. Energy costs on each.
  On desktop, press 1–4.
- **Desktop layout:** sidebar, game in the middle, and a live panel on the right with Right now,
  what's happening in the city and who's online.
- **Type:** Barlow Condensed for the HUD, headings and buttons; Barlow for reading.
- **Buttons** are chunky and obvious: yellow for actions that cost energy, red for violence,
  dark for everything else. Fight odds are solid colour badges.
- Replaces the 1.9 case-file look.

## 1.9.0: the case file

A new look built around the game itself: the interface reads like the evidence in your frame-up.

- **Paper, not glass:** every panel is a sheet of carbon paper on a dark desk, with a faint
  grain. No blur, glows or glossy gradients; square corners instead of pills.
- **Type:** a typewriter face (Special Elite) for names, headings and stamps; IBM Plex Sans for
  reading; IBM Plex Mono for money, timers and labels.
- **Ink colours:** cream text, manila for things you can press, red for danger and the red
  thread, faded blue and green inks for energy and good news.
- **Your file:** the top bar is your case file ("File Nº 9154 · Grayhaven") with your heat as a
  rubber stamp (CLEAN / NOTICED / WANTED).
- **Home:** your portrait is a mugshot print pinned to the photo; the street feed is a teletype
  tape; Right now is a manila memo with a paper clip.
- **Stamps:** how dangerous someone looks (Easy, Risky, Deadly...) is a crooked rubber stamp.
- **Navigation:** folder-style tabs, a file-index sidebar with a manila marker on desktop, and a
  flat bottom bar with a red marker on phones.
- **Jobs** read as a work-order list; **City** buildings are photographs on the board.
- **Landing:** the sign-up card is a confidential case file.

## 1.8.0: a living city

- **Street regulars:** each city has ten characters run by the game (a night nurse, a beat cop,
  a debt collector, a card sharp...), each with a career, rank, routine and a short bio. When few
  real players are online, regulars fill the street (up to six people out in total); as the
  city fills up, they fade out. They're always labelled "Regular".
  - You can fight them, pickpocket, snatch or mug them. They carry pocket money only ($20–160,
    refilled every 4 hours), so they can't be farmed.
  - They see crimes and, half the time, tell the police.
  - Now and then one says something in city chat.
  - A crew leader can hire one for an ambush role (one per ambush, for an equal cut).
  - They never appear on leaderboards or season boards, never hold seats or run for office, and
    can't be put under contract, given loans, bountied, invited or reported.
- **Live street feed:** a ticker on Home and People with the city's news (turf, seats, ambushes)
  and what the regulars are up to.
- **Right now (Home):** one card with the most useful thing to do next: your crew needs a driver,
  your daily reward or business income is waiting, a new chapter, or the best job. Replaces
  "Your next move".
- **While you were away:** after 30 minutes or more, a short recap when you come back: messages,
  money, reputation, how your body feels.
- **First-day checklist:** from rank 2 it only appears when rewards are waiting, as one line with
  "Claim all".
- **Guest reminder:** a small chip instead of a banner. Dismiss it and it comes back once, at your
  next promotion.
- **People:** compact cards with one main button and a "⋯" menu grouped into Street, Crew,
  Business, The law and Safety. Actions you can't take are hidden instead of greyed out. Cards
  are about 70% shorter.
- **Me** is in the phone's bottom bar.
- **Shop** is split into Supplies, Weapons, Armor, Housing and Businesses.
- **Desktop** uses two columns on Home and People.
- **Landing:** first-time visitors get a 15-second comic cold open of the frame-up (tap to skip).

## 1.7.0: old wounds, a stat soft cap and crew ambushes

- **Old wounds:** every hospital stay from a fight you chose leaves an old wound that lowers your
  maximum health by 4 (at most 7 wounds, so never below 72). That covers being knocked out by
  an NPC you fought, as an attacker or mugger, on a risky job, in a lost turf war, or as the
  target of a hit or an ambush. A random mugging on the way to work never counts. One wound
  fades every three days. "How you feel" hints at them, never with numbers.
- **Surgery:** doctors (Medicine, Resident and up) set a fee in their career card. Wounded
  players see a "Surgery ($fee)" button on the doctor's row in People; it fixes two wounds.
- **Stat soft cap:** above about 70, training and jobs raise a stat more slowly (half as fast
  every 10 points). A player who stacks careers still grows, just not without limit.
- **Crew ambushes (People → Plan an ambush, leaders only):** the crew gets two hours to take
  roles on the Crew tab:
  - Attackers (1–3): combined strength, each extra one counting a bit less (100%, +70%,
    +50%). Five good players can take down someone much stronger than any of them.
  - Driver (agility): nobody is left behind for the police, and if it goes wrong the attackers
    take half the damage. Without a clean getaway, one attacker may spend 20 minutes in a cell.
  - Lookout (perception): no witnesses, the target's crewmates aren't warned in time to help,
    and everyone's heat is halved.
  - The target's bodyguards and up to two crewmates who are online nearby fight back.
  - If it works: the target goes to hospital for 1–3 hours with an old wound, and the crew
    splits the cash they carried (dirty). An assault case opens and the target gets a three-day
    vendetta on everyone who took part. If it fails, the attackers get hurt.
  - Limits: newcomers are protected, a player can be ambushed once a day, a crew once every 12
    hours, and alts can't take part.

## 1.6.0: changing careers and leadership seats

- **Changing careers (Me → Career record → Leave this career):** walk away at any rank. Hidden
  stats stay (everything you learned); rank, issued gear and (for the Mafia) made status go.
  Not from a cell or while awaiting trial; the Mafia must leave their crew first (a made man
  walking out still breaks omertà). A day's gap before accepting or applying for a new career.
- **Veterans:** returning to a career you held before needs half the promotion merit until you
  reach your old best rank.
- **Legacy:** leaving a career at its top rank gives a permanent "Retired …" title and +5% pay
  on every job (up to +15% for three finished careers). The career record lists every past
  career.
- **Leadership seats (City Hall → Leadership):** in each city, one seat at the head of each
  career (Commissioner, Don of the City, Chief Justice, Medical Director, Governor of the
  Exchange, General of the Garrison, The Symbol). Rank 6+ can take an empty seat or challenge
  the holder once a week (career stats, rank and reputation, with a small edge to the holder;
  new holders are safe for 48 hours). A holder who leaves the career or the city loses the seat.
  Seats pay $300 a day from the treasury and have one daily power:
  - Commissioner: name a player Most Wanted (+20 heat, a public badge).
  - Don: call a 12-hour truce on turf wars.
  - Chief Justice: commute one prison sentence.
  - Medical Director: discharge one patient, healed.
  - Governor: freeze one player's dirty money for a day.
  - General: three squads guard the banks for two hours.
  - The Symbol: publicly name a player with a dirty record (+15 heat).
- A police chief who leaves the police is no longer chief.

## 1.5.0: moderation and anti-cheat basics

- **Reports:** players can report another player (photo, name or intro) from People, or a chat
  or forum message with the small flag beside it. Reports keep a snapshot of what was reported.
  One report a minute.
- **Moderation page (/admin)** for accounts in `ADMIN_USERNAMES`: open reports with the evidence,
  and one-click actions (dismiss, delete message, remove photo, clear intro, mute 24 hours,
  suspend 7 days, suspend for good), a list of who is muted or suspended (with "Lift"), possible
  alt accounts, and recent decisions. Moderators see a "Moderation" button under Me → Account.
- **Mutes and suspensions:** muted players can't chat, post in forums, pin crew notes or change
  their profile; suspended players can't take any action and disappear from People and the
  online list.
- **Alt accounts:** every browser gets a long-lived device id, and IP addresses are stored only as
  salted hashes. Characters played from the same device can't attack, rob, vouch for, put
  bounties on, lend to, hire, treat, launder for, buy votes from or sell guns to each other, and
  only one of them can vote in an election. Characters that only share a network are shown to
  moderators but not blocked (households and cafés share IPs).

## 1.4.0: Injustice is now Conspira

- **New name:** Conspira, with the slogan "Every move has an agenda."
- **New logo:** an open gold C pinned at both ends, with red string tying hidden points
  together, like a detective's evidence wall. The centre pin pulses. Used as the app icon,
  the browser tab and beside the CONSPIRA wordmark.
- Page title, app name (home-screen install), description and README updated. Internal names
  (the repository, the database schema, `INJUSTICE_DATA_FILE`, saved settings) are unchanged, so
  existing characters and logins keep working.

## 1.3.1: new logo, player profiles

- **New logo:** a gold scale of justice, tipped out of balance and cracked through in red, on a
  dark tile. Used as the app icon and next to the INJUSTICE wordmark (the crack glows).
- **Player profiles (Me → Your profile):** a short introduction (up to 160 characters) and a
  photo. Photos are shrunk to 160×160 in the browser and stored with the character; they replace
  the drawn avatar in People, the online list and the status bar. The moving rank portrait stays
  on the home screen.
- The street name can't be changed: detectives' clues are built from it, and case files, crews
  and trials keep it. Season boards stay anonymous (no photos or intros there).

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
