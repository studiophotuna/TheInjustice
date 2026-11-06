# Changelog

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
