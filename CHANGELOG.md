# Changelog

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
