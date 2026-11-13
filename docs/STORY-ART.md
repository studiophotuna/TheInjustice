# Crookvale: the story, and a script for every image

The whole storyline as it plays in the game, split into one script per image. Every caption is
the exact text the player reads under that picture. Give each image the file name shown, and I'll
drop them in.

## The style for every image

- **Look:** photographic noir, matching the new place art: night, rain or haze, wet streets,
  teal shadows and warm amber light, a little film grain. Grounded and real, never cartoonish or
  glossy.
- **Size:** story panels are 3:2 (1536 × 1024, or larger at the same shape). Evidence images are
  square (1024 × 1024).
- **Faces:** the cast has fixed faces in the game (`public/portraits/story/`). Keep each person
  recognisable from their portrait, or frame them from behind, in shadow, or by their hands.
  Hands, rings, envelopes and doorways carry this story better than faces anyway.
- **Lettering:** a few panels need words in the picture (a matchbook, a brass door plate, a box
  number). AI image tools garble lettering, so make those areas plain and I'll set the words in
  the right typeface, or add them yourself in an editor.
- **Never:** logos of real brands, real people's likenesses, gore. A body in the morgue stays
  under a sheet.

## The spine (read this first)

You had a life: a job, an apartment. Then a trial with a bought witness and a judge who never
looked up. Guilty. Three years in Grayhaven Penitentiary for a crime you didn't commit.

You were framed by **the Ledger**, a ring that sells verdicts. Its face in the city is **Judge
Aldous Crane**. Its paid witness was **Benny Marlowe**. Its money runs through a shell company,
**C&P Holdings** (Crane & Partners), registered in Port Solace. **Kozak**, the Mafia boss of Iron
Row, pays the Ledger every month and collects its envelopes.

Every career you take uncovers a different piece of the same conspiracy:
- **Police:** the evidence was signed out by "A.C.", and your sergeant's partner was framed too.
- **Mafia:** Kozak's own ledger shows your verdict paid for like a delivery.
- **Courts:** your case file, the judge's gavel ring, and a quiet threat in chambers.
- **Vigilante:** a wall of ten framed people, and Benny finally cornered.
- **Medicine:** a witness murdered before a retrial, and Crane himself as a patient.
- **Banking:** forty accounts, and your missing evidence locked in a vault.

The leads build the case piece by piece, until the last evidence (Crane's signet ring and the wax
seals it made) makes the case against him whole.

## The cast

| Who | Role | Gender | Notes for images |
|---|---|---|---|
| **You** | The framed player | any | Never show the face: a figure in a coat, hands, a back. Players choose their own face. |
| **Judge Aldous Crane** | The Ledger's face in the city | man, sixties | Silver hair, glasses, black robe. A **gold ring shaped like a small gavel**: his signature in every image. |
| **Benny Marlowe** | The paid witness | man, forties | Camel-hair coat, nervous, sweating, always about to run. |
| **Kozak** | Mafia boss of Iron Row | man, fifties | Heavy-set, careful, a card club in the back room, a thick ledger on his desk. |
| **C&P Holdings** | The money | none | Never a person: brass plates, folders, forty account books. |
| **Sgt. Dana Reyes** | Police contact | woman | Tired, honest, dress-blue photo of her framed partner in her locker. |
| **Counselor Vivian Marsh** | Courts contact | woman | Public defender, sharp, files under her arm. |
| **Silas, the Night Watchman** | Vigilante contact | man | Hood or cap, rooftop at night, a wall of red string. |
| **Doc Mercy** | Medicine contact | woman | Doctor's coat, night shift, the back door of the clinic. |
| **Isadora Quell** | Banking contact | woman | Immaculate suit, vault keys, never raises her voice. |

The places: **Grayhaven** (the old city where you were framed), **Port Solace** in Solmarra (beach,
casino, banks with no names on the accounts), **Ironmoor** (cold, industrial, checkpoints) and
**Halcyon** (glass towers over an Undercity).

---

## Part 1: The story chapters (37 panels)

Each chapter is a short comic: three or four panels, each with a caption. Files go in
`public/story/` as `<chapter>-<panel>.jpg`.

### Chapter 0 · The Verdict
*Everyone sees this first. Teaser: "How you ended up with nothing."*

**prologue-1.jpg**
> You had a life once. A job. An apartment. Then came the trial: a bought witness, and a judge who never looked up.
- **Shot:** close, from the dock. A judge's bench towers above; a gavel comes down, motion-blurred.
- **Details:** the judge is only a black sleeve and a gold gavel-shaped ring. Wood panelling, a single hard light.
- **Mood:** small, powerless.

**prologue-2.jpg**
> "Guilty." Three years in Grayhaven Penitentiary for a crime you didn't commit.
- **Shot:** through cell bars at night, a figure sitting on a cot, back to camera.
- **Details:** a thin mattress, a tally of days scratched in the wall, moonlight in bars across the floor.
- **Mood:** time passing, cold.

**prologue-3.jpg**
> Today they let you out. No money. No home. No name. Just the rain and the overpass in The Gutter.
- **Shot:** wide. A lone figure with a paper bag of belongings, walking under a concrete highway overpass in the rain.
- **Details:** tents, a burning barrel, puddles reflecting sodium lights. The prison gate small in the distance.
- **Mood:** free, but with nothing.

**prologue-4.jpg**
> Somebody did this to you. In your pocket, the only thing you kept: a card with a tiny gavel logo. Time to find out who.
- **Shot:** macro, hand in rain light holding a small cream business card.
- **Details:** the card is blank except a **tiny gold gavel emblem** (no words). Rain drops on it.
- **Mood:** the hook. Resolve.

### Chapter 1 · Old Faces
*Teaser: "Someone from your trial is still in town."*

**old_faces-1.jpg**
> Old Market, Saturday crowd. A man in a camel-hair coat haggles over oranges. You know that voice. You heard it swear on a Bible.
- **Shot:** over-the-shoulder through a busy market crowd at dusk; a man in a camel-hair coat at a fruit stall, seen from the side.
- **Details:** oranges, string lights, steam from food stalls. He's in focus; the crowd is a blur.

**old_faces-2.jpg**
> Benny Marlowe. The witness who put you away. He sees your face, goes pale, and runs. You lose him in the crowd.
- **Shot:** Benny mid-turn, eyes wide, already running; oranges spilling from a crate.
- **Details:** motion blur, people stepping aside, a gap in the crowd closing behind him.

**old_faces-3.jpg**
> He dropped a matchbook. Gold letters: CRANE & PARTNERS. On the flap, the same tiny gavel as your card.
- **Shot:** macro, a black matchbook on wet cobblestones, a hand reaching for it.
- **Details:** the gold gavel emblem on the flap. **Leave the cover plain**: I'll set "CRANE & PARTNERS" in gold.

### Police · The Evidence Locker
*Teaser: "Your case file should be in the basement."*

**police_2-1.jpg**
> Night shift. You sign into the evidence room and find your old case number. Box 4471.
- **Shot:** a long basement aisle of metal shelves and cardboard evidence boxes under one swinging bulb; a hand on one box.
- **Details:** dust in the light. Box label area plain (I'll add 4471).

**police_2-2.jpg**
> It's empty. The sign-out sheet says it was taken the week of your trial. Signed: "A.C."
- **Shot:** looking down into an open, empty evidence box; a clipboard sign-out sheet beside it.
- **Details:** the sheet's lines plain except one scrawled set of initials (I can add "A.C.").

**police_2-3.jpg**
> A.C. Aldous Crane? The judge who sentenced you. Why would a judge need the evidence?
- **Shot:** the cream card with the gold gavel, held up next to the clipboard in torchlight.
- **Mood:** the first connection clicks.

### Police · You're Not the First
*Teaser: "Sgt. Reyes has been keeping secrets."*

**police_3-1.jpg**
> Reyes pulls a photo from her locker: a young cop in dress blues. "My partner. Framed for taking bribes. Judge Crane."
- **Shot:** a locker room at night; Reyes (from the side or behind) holding an old photo.
- **Details:** the photo shows a young officer in dress blues (face soft, out of focus).

**police_3-2.jpg**
> "Eleven cases. Same judge, same witnesses, same lawyers. They call themselves The Ledger. They sell verdicts."
- **Shot:** a desk covered in eleven case folders fanned out; one old leather ledger book on top.
- **Details:** a desk lamp, coffee rings, the gold gavel emblem embossed on the ledger's cover.

**police_3-3.jpg**
> "I can't touch Crane from Grayhaven. Their money runs through Solmarra." She hands you the file. "Neither of us can stop now."
- **Shot:** a rooftop at night; two silhouettes, one handing over a thick file. The city below in rain.
- **Details:** far on the horizon, a warm glow suggesting the coast (Solmarra).

### Mafia · Tribute
*Teaser: "Even Kozak answers to someone."*

**enforcer_2-1.jpg**
> Every Friday, Kozak fills one thick envelope. Not for the boys. Not for the cops.
- **Shot:** a back-room desk in a card club; heavy hands counting cash into a fat brown envelope.
- **Details:** cigar smoke, card tables blurred behind, a pinky ring (not the gavel; that's Crane's).

**enforcer_2-2.jpg**
> Tonight he hands it to you. "Courthouse Hill. Back door. Don't open it, don't count it, don't ask."
- **Shot:** across the desk, Kozak's hand pushing the envelope toward the viewer.
- **Details:** Kozak's face half in shadow, a level stare.

**enforcer_2-3.jpg**
> A clerk takes it without a word. Behind her, a door with a brass plate: JUDGE A. CRANE.
- **Shot:** a courthouse side door at night, a clerk's hands taking the envelope; a corridor beyond.
- **Details:** a brass name plate on a dark wood door, **plain** (I'll add "JUDGE A. CRANE").

### Mafia · Paid in Full
*Teaser: "Kozak keeps a book of everyone who owes."*

**enforcer_3-1.jpg**
> Kozak falls asleep at his desk. His book is open: names, dates, amounts. A ledger.
- **Shot:** Kozak slumped asleep over his desk, a big ledger open by his arm, a glass tipped over.
- **Details:** handwriting shown as unreadable columns, a lamp left on.

**enforcer_3-2.jpg**
> Three years back, one line: your name. "Verdict: guilty. Paid in full. Client: C&P."
- **Shot:** extreme close-up on a ledger page, a fingertip under one line.
- **Details:** the line itself can stay unreadable; I'll overlay the words.

**enforcer_3-3.jpg**
> Somebody paid for your sentence like a delivery. Crane & Partners. Kozak only collected. Now you know who placed the order.
- **Shot:** the matchbook from Chapter 1 laid on the ledger page.
- **Mood:** the order behind the order.

### Courts · Case 4471
*Teaser: "The records room has your file."*

**courts_2-1.jpg**
> Records room, after hours. Case 4471: The State v. you. Thinner than it should be.
- **Shot:** a records room with tall filing shelves; a thin case folder on a reading table under a green banker's lamp.

**courts_2-2.jpg**
> Marlowe's witness statement, and the prosecutor's private notes. Same handwriting. Same green ink.
- **Shot:** two documents side by side, both in matching **green ink** handwriting (unreadable script).

**courts_2-3.jpg**
> Marsh reads it over your shoulder. She goes very still. "I was your public defender's intern. I always knew that case stank."
- **Shot:** Vivian Marsh behind you in the lamplight, looking down at the file, one hand to her mouth.

### Courts · His Honor
*Teaser: "Your first case in Courtroom 3."*

**courts_3-1.jpg**
> Your first real case. Courtroom 3. The bailiff calls: "All rise for the Honorable Aldous Crane."
- **Shot:** from the lawyers' table, a courtroom rising to its feet; the judge entering at the bench.

**courts_3-2.jpg**
> He looks down at you over his glasses. On his finger, a gold ring shaped like a small gavel.
- **Shot:** close on Crane's hand resting on the bench, the **gavel ring** sharp; his glasses and eyes soft above.

**courts_3-3.jpg**
> In chambers afterward he says only: "Small world, isn't it? Be careful. Grayhaven is smaller still."
- **Shot:** judge's chambers, Crane by a rain-streaked window, his back half-turned, smiling slightly.
- **Mood:** a threat delivered politely.

### Vigilante · The Watchman's Wall
*Teaser: "Silas finally shows you his hideout."*

**vigilante_2-1.jpg**
> Silas's hideout. One wall is covered in photos, joined by red string.
- **Shot:** an attic hideout, a whole wall of pinned photos and red string, a figure in a cap with a torch.

**vigilante_2-2.jpg**
> In the middle: your mugshot. Around it, nine more faces. Every one of them framed.
- **Shot:** closer on the wall: one mugshot in the centre (the face in shadow), nine photos around it, string joining all ten.

**vigilante_2-3.jpg**
> "Same witness in four of them," Silas says. He taps a photo. Benny Marlowe, smiling.
- **Shot:** a gloved finger tapping a photo of Benny Marlowe, smiling, in his camel coat.

### Vigilante · Masks
*Teaser: "You finally corner Benny Marlowe."*

**vigilante_3-1.jpg**
> Rain, a dead-end alley, and Benny Marlowe with nowhere left to run.
- **Shot:** a dead-end alley in heavy rain; Benny backed against a chain-link fence, the viewer's shadow falling over him.

**vigilante_3-2.jpg**
> "I just say what they tell me! The man with the gavel ring pays, I testify. Ten grand a verdict."
- **Shot:** close on Benny, soaked, hands up, pleading.

**vigilante_3-3.jpg**
> "The money comes from Solmarra. Ask about the casino." You let him go. Above the city, you finally know where to look.
- **Shot:** a rooftop, a figure from behind looking out over the city toward a far coastal glow.

### Medicine · The Quiet Patient
*Teaser: "A body in the morgue with the wrong cause of death."*

**medicine_2-1.jpg**
> Night shift in the morgue. A man brought in as a suicide. The file says he jumped.
- **Shot:** a cold morgue, steel drawers, a body **fully under a sheet** on a table, a clipboard on top.

**medicine_2-2.jpg**
> Bruised wrists. Skin under his fingernails. Nobody jumps like that. Somebody held him.
- **Shot:** gloved hands lifting the sheet just enough to show a bruised wrist. Clinical, not gory.

**medicine_2-3.jpg**
> His name was on a witness list, for a retrial of one of Judge Crane's old cases. The hearing was next week.
- **Shot:** a typed witness list on a desk, one line circled in red (unreadable names).

### Medicine · Prescription
*Teaser: "A very important patient checks in under a false name."*

**medicine_3-1.jpg**
> A private room, guards at the door, a patient registered as "Mr. Gray." You bring his medicine.
- **Shot:** a hospital corridor, two guards in suits outside a private room; a medicine tray in the foreground.

**medicine_3-2.jpg**
> It's Aldous Crane. His heart is failing. On the nightstand, the gavel ring. He doesn't recognize you.
- **Shot:** Crane asleep in a hospital bed (in profile), a heart monitor; the **gavel ring** on the nightstand in focus.

**medicine_3-3.jpg**
> His chart lists his specialist: a private clinic in Port Solace, paid by Crane & Partners. Wherever the money goes, he follows.
- **Shot:** a medical chart on a clipboard; behind it, through the window, a palm-lined coast (Port Solace).

### Banking · Forty Accounts
*Teaser: "Quell asks you to look at one client's file."*

**banking_2-1.jpg**
> Quell slides a folder across her desk. "One client. Forty accounts. All opened the same week."
- **Shot:** an elegant banker's desk; Quell's manicured hand sliding a thick folder toward you.

**banking_2-2.jpg**
> Account holder: C&P Holdings. Signatory: A. Crane. Deposits every time a verdict goes his way.
- **Shot:** an open folder of bank statements, a column of deposits highlighted (unreadable figures).

**banking_2-3.jpg**
> One deposit is dated the day after your sentencing. $10,000, from Kozak's card club. Your freedom had a price tag.
- **Shot:** a single deposit slip under a magnifying glass, a stack of cash beside it.

### Banking · The Vault
*Teaser: "The Ledger keeps more than money in Port Solace."*

**banking_3-1.jpg**
> Quell takes you to the deepest vault in the Exchange. Box 4471 is rented by C&P Holdings.
- **Shot:** a deep vault of safe-deposit boxes; Quell with a key at one box (box number plate plain; I'll add 4471).

**banking_3-2.jpg**
> Inside: the missing evidence from your trial, carefully kept. Crane never destroys anything he can use later.
- **Shot:** an open safe-deposit drawer holding evidence bags and the empty box's missing contents, neatly kept.

**banking_3-3.jpg**
> "Evidence is worthless without a court that will hear it," Quell says. "Find someone in Grayhaven who isn't bought."
- **Shot:** Quell and a figure on the Exchange steps at night, the city lit behind them.

---

## Part 1b: The new career chapters (24 panels)

Shown to players in that career, at ranks 2 and 3.

### Military · Requisition
*Teaser: "The armory books don't add up."*

**military_2-1.jpg**
> Inventory night at the garrison armory. Forty rifles signed out for "private security training". None came back.
- **Shot:** A long garrison armory at night, rifle racks half empty, a clipboard on a crate under a caged bulb.

**military_2-2.jpg**
> The requisition was countersigned by Sergeant Major Brann's predecessor, and paid for by C&P Holdings.
- **Shot:** Close on a requisition form on a steel desk: two signatures, a C&P Holdings stamp in red (leave the text plain).

**military_2-3.jpg**
> Two weeks later the same serial numbers turn up in a police raid on Iron Row. Kozak's men were holding them.
- **Shot:** A police raid in a rain-wet alley on Iron Row: crates pried open, rifles inside, flashlights crossing.

### Military · Escort Duty
*Teaser: "A VIP convoy, and no names on the manifest."*

**military_3-1.jpg**
> A two-car escort at midnight: Courthouse Hill to the airfield. No names on the manifest.
- **Shot:** Two black cars with military plates on an empty highway at midnight, headlights on wet asphalt.

**military_3-2.jpg**
> The passenger climbs out at the airfield with a locked case. On his hand, a gold ring shaped like a gavel.
- **Shot:** An airfield at night: a man in a long coat steps from a car holding a locked case. Close on his hand: a gold gavel-shaped ring.

**military_3-3.jpg**
> Brann watches the plane climb toward Solmarra. "Some orders come with a judge's signature. Forget you saw him." You don't.
- **Shot:** Sergeant Major Brann in uniform, seen from behind at the airfield fence, watching a plane's lights climb into cloud.

### Mechanic · The Black Sedan
*Teaser: "A quiet repair for a very private client."*

**mechanic_2-1.jpg**
> A black sedan rolls in after closing. The driver pays cash for a quiet repair and waits outside, smoking.
- **Shot:** A garage after closing: a black sedan under a single work light, the driver smoking outside the open roll-up door.

**mechanic_2-2.jpg**
> Behind the back seat: a hidden compartment full of brown envelopes, each one sealed with red wax.
- **Shot:** Behind a lifted back seat: a hidden compartment packed with brown envelopes sealed with red wax.

**mechanic_2-3.jpg**
> Vera Dobrev runs the plates and frowns. "Registered to C&P Holdings. Fix it, give it back, and never open that panel again."
- **Shot:** Vera Dobrev at a cluttered garage office desk, a phone to her ear, frowning at a plate number on a notepad.

### Mechanic · Brake Lines
*Teaser: "An accident that wasn't."*

**mechanic_3-1.jpg**
> The wreck comes in on a flatbed. Its driver was due to testify at a retrial of one of Judge Crane's old cases.
- **Shot:** A crumpled car arriving on a flatbed tow truck into a garage at dawn, rain on the windshield.

**mechanic_3-2.jpg**
> The brake line didn't wear through. It was cut, clean. Then the shop's service records were changed to say otherwise.
- **Shot:** Macro close on a brake line under a work lamp: a clean, straight cut. A service logbook open beside it.

**mechanic_3-3.jpg**
> Dobrev bags the old line and locks it in her safe. "Somebody paid to make this look like an accident. We keep this."
- **Shot:** Dobrev sealing the brake line into an evidence bag and locking it into an old floor safe.

### Hacker · Forty Logins
*Teaser: "C&P's servers have a back door."*

**hacker_2-1.jpg**
> C&P Holdings keeps its accounts on an old server nobody patched. Juno Okafor gets you in before her coffee goes cold.
- **Shot:** A dark room lit by monitors; Juno Okafor at a keyboard, a cold coffee cup, green terminal text on screen (unreadable).

**hacker_2-2.jpg**
> Forty accounts. Every one of them logs in from the same place: a terminal inside the Grayhaven courthouse.
- **Shot:** A screen showing a list of forty accounts, each line tracing to one point on a city map: the courthouse.

**hacker_2-3.jpg**
> "Judges don't do their own banking at work," Okafor says. "Unless they don't want it done anywhere else."
- **Shot:** Okafor turning in her chair toward camera, monitor glow on her face, a half smile.

### Hacker · Edit History
*Teaser: "The court records keep every change."*

**hacker_3-1.jpg**
> Case 4471, in the court's own records system. Every change is logged. Almost nobody thinks to look.
- **Shot:** A records system on an old office monitor in a dim archive, rows of case numbers (keep text unreadable).

**hacker_3-2.jpg**
> The witness list was edited the night before your trial. One name added: Benny Marlowe. User: a.crane.
- **Shot:** Close on a screen: an edit log, one highlighted line. Reflected faintly in the glass, a gavel-shaped ring.

**hacker_3-3.jpg**
> Okafor copies the log to three places and erases your trail. "Deleting is easy. Making them believe it was never there is the job."
- **Shot:** Okafor on a rooftop at night with a laptop, three USB drives laid out beside her, the city behind.

### Fire · The Records Fire
*Teaser: "The courthouse annex burned the week before your trial."*

**fire_2-1.jpg**
> An old file: the courthouse annex fire, three years ago. The week before your trial. Ruled electrical.
- **Shot:** A dusty fire department records room; an old file box open, a folder marked with a red stamp.

**fire_2-2.jpg**
> The photos say otherwise. Pour patterns on the floor, two points of origin. Somebody used an accelerant.
- **Shot:** Black-and-white fire scene photos spread on a table: scorch pour patterns on a floor, two origin points circled.

**fire_2-3.jpg**
> The annex held the defense files for eleven cases. Yours was one. Every one of them was in front of Judge Crane.
- **Shot:** The burned-out courthouse annex in daylight: charred file cabinets, ash-covered folders.

### Fire · Signed Off
*Teaser: "Who called it an accident?"*

**fire_3-1.jpg**
> The "electrical" ruling was signed by the fire marshal of the day: Chief Hal Brennan's predecessor.
- **Shot:** Close on a fire report on a desk: a signature line and an official seal (leave text plain).

**fire_3-2.jpg**
> His bank records show a payment from C&P Holdings the same week. Then early retirement, to a villa in Port Solace.
- **Shot:** A bank statement under a desk lamp beside a postcard of a white villa on the Port Solace coast.

**fire_3-3.jpg**
> Brennan stares at the signature a long time. "I trained under that man." Then: "Whatever you need from this house, ask."
- **Shot:** Chief Hal Brennan in a firehouse at night, holding the report, an engine's red flank behind him.

---

## Part 1c: The endings (12 panels)

Each player sees only the ending they choose, after closing the last lead.

### Ending · The Retrial
*Teaser: "You took it to a court that wasn't bought."*

**ending_court-1.jpg**
> Courtroom 1, and a judge from out of town who has never heard of the Ledger. Marsh lays the evidence out, piece by piece.
- **Shot:** A bright, clean courtroom: a defense lawyer (Marsh) laying evidence bags on a table before an older judge.

**ending_court-2.jpg**
> The ring, the seals, the forty accounts, Benny's statement. Crane says nothing. For once, nobody tells the jury what to think.
- **Shot:** Judge Crane at the defendant's table, silent, gold gavel ring on his folded hands; the jury box out of focus.

**ending_court-3.jpg**
> "Not guilty." Then, for him: "Guilty." You walk out into the rain with your name back. The first thing you've owned in years.
- **Shot:** The player character walking out of the courthouse doors into rain, face lifted, free.

### Ending · Front Page
*Teaser: "You gave it to the paper."*

**ending_press-1.jpg**
> You spread it across the editor's desk. She reads for an hour without a word, then calls the printers.
- **Shot:** A newspaper editor's desk at night, papers spread, a woman reading under a green banker's lamp.

**ending_press-2.jpg**
> Morning. Every newsstand in the city: THE LEDGER, with Crane's photograph under it. By noon he has resigned, "for his health".
- **Shot:** Morning newsstand: stacks of the same paper with a huge headline and a photo of Crane (headline area plain; I'll add it).

**ending_press-3.jpg**
> Nobody can put it back in the box now. The whole city knows your name, and so does everyone who ever paid the Ledger.
- **Shot:** The player character on a rooftop at dawn, a newspaper folded in one hand, the city waking below.

### Ending · Sold
*Teaser: "You sold the case to Kozak."*

**ending_kozak-1.jpg**
> Kozak turns the pages slowly, like a man reading a will. Then he smiles. "This is worth more than you know. To me."
- **Shot:** Kozak behind a heavy desk in a dark office, turning the pages of a leather ledger, smoke in the lamp light.

**ending_kozak-2.jpg**
> A fat envelope crosses the desk. "Crane works for me now. And he owes you one. Once, whatever you did, it goes away."
- **Shot:** A thick envelope sliding across polished wood toward the camera; Kozak's ringed hand letting go of it.

**ending_kozak-3.jpg**
> You walk out richer and no cleaner. Somewhere a judge just changed owners. The Ledger doesn't care who holds the pen.
- **Shot:** The player character walking down a neon-lit alley at night, envelope in coat, not looking back.

### Ending · Insurance
*Teaser: "You kept it, and Crane pays."*

**ending_keep-1.jpg**
> You make copies and hide them in three places only you know. Then you send Crane one photograph: his ring.
- **Shot:** Three hiding places in one frame: a floorboard, a locker key, a safe-deposit drawer, each holding the same copied file.

**ending_keep-2.jpg**
> Every week after that, an envelope finds you. No note. Just cash, and a judge who sleeps badly.
- **Shot:** An envelope pushed under an apartment door at night, a strip of hallway light.

**ending_keep-3.jpg**
> His heart was failing anyway. You'll be paid for as long as it keeps beating. Insurance, of a kind.
- **Shot:** A private hospital room: Crane in the bed, a heart monitor's green line, rain on the window.

---

## Part 2: The evidence board (9 images)

When you close a lead, its evidence is pinned to the board on the City page. Square
(1024 × 1024), shot like a crime-scene photo pinned with a red thumbtack. Files go in
`public/evidence/<lead>.jpg`.

| File | Evidence | What the image shows |
|---|---|---|
| **benny_seen.jpg** | Benny's new address: "A rented room above a pawn shop in the Old Market. Paid a year in advance, in cash." | A narrow door beside a pawn shop at night, a lit window above. |
| **benny_minder.jpg** | Paid by envelope: "The minder's pay comes in the same brown envelopes Benny gets. Same handwriting." | Two brown envelopes side by side on a table, matching handwriting (unreadable). |
| **benny_talks.jpg** | Benny's statement: "I never saw you that night. A man from the judge's office told me what to say." | A handwritten confession on bar napkins, a shaking pen, a whisky glass. |
| **kozak_books.jpg** | A page from Kozak's ledger: "Monthly payments to C&P. The same amount, every month, since before your trial." | A torn ledger page with a column of identical amounts. |
| **kozak_tribute.jpg** | The collection route: "The collector's last stop every month is a side door of the courthouse." | A courthouse side door at night, a figure with an envelope slipping in. |
| **cp_money.jpg** | C&P's directors: "Two names on the register. One is a shell. The other is a judge's brother-in-law." | A company register book open at one entry, two signature lines. |
| **cp_accounts.jpg** | Forty accounts: "Forty accounts, one owner. Every verdict Crane sold paid into one of them." | Forty small bank passbooks spread in a grid. |
| **crane_docket.jpg** | The original docket: "The real witness list. Benny's name was added later, in the judge's own hand." | A typed court docket with one name added in ink by hand. |
| **crane_ring.jpg** | The signet ring: "Wax seals on Ledger letters, and the ring that made them. The case against Crane is whole." | The gold gavel ring beside red wax seals on folded letters. The final, strongest image. |

---

## Part 3: The cities (4 images, optional)

New players pick where to start, and each city has one line of story. Wide 16:9 (1920 × 1080).
Files go in `public/cities/<city>.jpg`.

| File | City | Line in the game | What the image shows |
|---|---|---|---|
| **grayhaven.jpg** | Grayhaven | "You stay where they framed you. Grayhaven owes you answers." | The old city in rain: courthouse dome, overpass, brick. |
| **portsolace.jpg** | Port Solace | Beach, casinos and dirty money. | A palm-lined night coast, casino glow, yachts. |
| **ironmoor.jpg** | Ironmoor | "You ride a freight car north to Ironmoor. Nobody there knows your face, and they watch every face." | A freight train arriving in a snowy industrial city, checkpoint floodlights. |
| **halcyon.jpg** | Halcyon | "You stow away on a cargo plane to Halcyon. Down in the Undercity, the towers block out the sky." | Glass towers from below, the Undercity's dark streets at their feet. |

---

## Totals

| Part | Images |
|---|---|
| Story chapters | 37 |
| New career chapters | 24 |
| Endings | 12 |
| Evidence board | 9 |
| Cities (optional) | 4 |
| **All** | **86** |

The logo and name artwork you're making come on top of this. The game currently shows Chapters
0 and 1 to everyone, and the career chapters to players in that career. If you work in order, do
Chapter 0, Chapter 1 and the evidence board first: every player sees those.
