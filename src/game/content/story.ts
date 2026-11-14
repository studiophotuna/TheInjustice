// Comic-panel story chapters. Art for each panel is drawn in src/components/Comic.tsx.
//
// The spine: you were framed by "The Ledger", a ring that sells verdicts. Its local face is
// Judge Aldous Crane; its paid witness was Benny Marlowe. Every career path uncovers a
// different piece. Chapters unlock on milestones (see engine.ts → unlockChapters).

export type PanelArt =
  | "gavel"
  | "bars"
  | "street"
  | "card"
  | "market_chase"
  | "matchbook"
  | "evidence_locker"
  | "photo"
  | "envelope"
  | "ledger_book"
  | "case_file"
  | "courtroom"
  | "judge_ring"
  | "string_wall"
  | "alley"
  | "rooftop"
  | "hospital"
  | "morgue"
  | "vault";

export interface Panel {
  art: PanelArt;
  caption: string;
  /** A painted image for this panel (public/story/<chapter>-<n>.jpg), when there is one. */
  img?: string;
}

export interface Chapter {
  id: string;
  title: string;
  /** Short line shown in the Story list before and after reading. */
  teaser: string;
  panels: Panel[];
}

export const PROLOGUE: Chapter = {
  id: "prologue",
  title: "Chapter 0 · The Verdict",
  teaser: "How you ended up with nothing.",
  panels: [
    {
      art: "gavel",
      caption:
        "You had a life once. A job. An apartment. Then came the trial: a bought witness, and a judge who never looked up.",
    },
    {
      art: "bars",
      caption: "\"Guilty.\" Three years in Grayhaven Penitentiary for a crime you didn't commit.",
    },
    {
      art: "street",
      caption:
        "Today they let you out. No money. No home. No name. Just the rain and the overpass in The Gutter.",
    },
    {
      art: "card",
      caption:
        "Somebody did this to you. In your pocket, the only thing you kept: a card with a tiny gavel logo. Time to find out who.",
    },
  ],
};

export const CHAPTERS: Chapter[] = [
  {
    id: "old_faces",
    title: "Chapter 1 · Old Faces",
    teaser: "Someone from your trial is still in town.",
    panels: [
      {
        art: "market_chase",
        caption:
          "Old Market, Saturday crowd. A man in a camel-hair coat haggles over oranges. You know that voice. You heard it swear on a Bible.",
      },
      {
        art: "market_chase",
        caption:
          "Benny Marlowe. The witness who put you away. He sees your face, goes pale, and runs. You lose him in the crowd.",
      },
      {
        art: "matchbook",
        caption:
          "He dropped a matchbook. Gold letters: CRANE & PARTNERS. On the flap, the same tiny gavel as your card.",
      },
    ],
  },

  // ── Police ────────────────────────────────────────────────────
  {
    id: "police_2",
    title: "Police · The Evidence Locker",
    teaser: "Your case file should be in the basement.",
    panels: [
      {
        art: "evidence_locker",
        caption:
          "Night shift. You sign into the evidence room and find your old case number. Box 4471.",
      },
      {
        art: "evidence_locker",
        caption:
          "It's empty. The sign-out sheet says it was taken the week of your trial. Signed: \"A.C.\"",
      },
      {
        art: "card",
        caption: "A.C. Aldous Crane? The judge who sentenced you. Why would a judge need the evidence?",
      },
    ],
  },
  {
    id: "police_3",
    title: "Police · You're Not the First",
    teaser: "Sgt. Reyes has been keeping secrets.",
    panels: [
      {
        art: "photo",
        caption:
          "Reyes pulls a photo from her locker: a young cop in dress blues. \"My partner. Framed for taking bribes. Judge Crane.\"",
      },
      {
        art: "ledger_book",
        caption:
          "\"Eleven cases. Same judge, same witnesses, same lawyers. They call themselves The Ledger. They sell verdicts.\"",
      },
      {
        art: "rooftop",
        caption:
          "\"I can't touch Crane from Grayhaven. Their money runs through Solmarra.\" She hands you the file. \"Neither of us can stop now.\"",
      },
    ],
  },

  // ── Enforcer ──────────────────────────────────────────────────
  {
    id: "enforcer_2",
    title: "Mafia · Tribute",
    teaser: "Even Kozak answers to someone.",
    panels: [
      {
        art: "envelope",
        caption: "Every Friday, Kozak fills one thick envelope. Not for the boys. Not for the cops.",
      },
      {
        art: "envelope",
        caption: "Tonight he hands it to you. \"Courthouse Hill. Back door. Don't open it, don't count it, don't ask.\"",
      },
      {
        art: "courtroom",
        caption: "A clerk takes it without a word. Behind her, a door with a brass plate: JUDGE A. CRANE.",
      },
    ],
  },
  {
    id: "enforcer_3",
    title: "Mafia · Paid in Full",
    teaser: "Kozak keeps a book of everyone who owes.",
    panels: [
      {
        art: "ledger_book",
        caption: "Kozak falls asleep at his desk. His book is open: names, dates, amounts. A ledger.",
      },
      {
        art: "ledger_book",
        caption: "Three years back, one line: your name. \"Verdict: guilty. Paid in full. Client: C&P.\"",
      },
      {
        art: "matchbook",
        caption:
          "Somebody paid for your sentence like a delivery. Crane & Partners. Kozak only collected. Now you know who placed the order.",
      },
    ],
  },

  // ── Courts ────────────────────────────────────────────────────
  {
    id: "courts_2",
    title: "Courts · Case 4471",
    teaser: "The records room has your file.",
    panels: [
      {
        art: "case_file",
        caption: "Records room, after hours. Case 4471: The State v. you. Thinner than it should be.",
      },
      {
        art: "case_file",
        caption:
          "Marlowe's witness statement, and the prosecutor's private notes. Same handwriting. Same green ink.",
      },
      {
        art: "photo",
        caption:
          "Marsh reads it over your shoulder. She goes very still. \"I was your public defender's intern. I always knew that case stank.\"",
      },
    ],
  },
  {
    id: "courts_3",
    title: "Courts · His Honor",
    teaser: "Your first case in Courtroom 3.",
    panels: [
      {
        art: "courtroom",
        caption: "Your first real case. Courtroom 3. The bailiff calls: \"All rise for the Honorable Aldous Crane.\"",
      },
      {
        art: "judge_ring",
        caption: "He looks down at you over his glasses. On his finger, a gold ring shaped like a small gavel.",
      },
      {
        art: "judge_ring",
        caption: "In chambers afterward he says only: \"Small world, isn't it? Be careful. Grayhaven is smaller still.\"",
      },
    ],
  },

  // ── Vigilante ─────────────────────────────────────────────────
  {
    id: "vigilante_2",
    title: "Vigilante · The Watchman's Wall",
    teaser: "Silas finally shows you his hideout.",
    panels: [
      {
        art: "string_wall",
        caption: "Silas's hideout. One wall is covered in photos, joined by red string.",
      },
      {
        art: "string_wall",
        caption: "In the middle: your mugshot. Around it, nine more faces. Every one of them framed.",
      },
      {
        art: "photo",
        caption: "\"Same witness in four of them,\" Silas says. He taps a photo. Benny Marlowe, smiling.",
      },
    ],
  },
  {
    id: "vigilante_3",
    title: "Vigilante · Masks",
    teaser: "You finally corner Benny Marlowe.",
    panels: [
      {
        art: "alley",
        caption: "Rain, a dead-end alley, and Benny Marlowe with nowhere left to run.",
      },
      {
        art: "alley",
        caption:
          "\"I just say what they tell me! The man with the gavel ring pays, I testify. Ten grand a verdict.\"",
      },
      {
        art: "rooftop",
        caption:
          "\"The money comes from Solmarra. Ask about the casino.\" You let him go. Above the city, you finally know where to look.",
      },
    ],
  },

  // ── Medicine ──────────────────────────────────────────────────
  {
    id: "medicine_2",
    title: "Medicine · The Quiet Patient",
    teaser: "A body in the morgue with the wrong cause of death.",
    panels: [
      {
        art: "morgue",
        caption: "Night shift in the morgue. A man brought in as a suicide. The file says he jumped.",
      },
      {
        art: "morgue",
        caption: "Bruised wrists. Skin under his fingernails. Nobody jumps like that. Somebody held him.",
      },
      {
        art: "case_file",
        caption:
          "His name was on a witness list, for a retrial of one of Judge Crane's old cases. The hearing was next week.",
      },
    ],
  },
  {
    id: "medicine_3",
    title: "Medicine · Prescription",
    teaser: "A very important patient checks in under a false name.",
    panels: [
      {
        art: "hospital",
        caption:
          "A private room, guards at the door, a patient registered as \"Mr. Gray.\" You bring his medicine.",
      },
      {
        art: "judge_ring",
        caption: "It's Aldous Crane. His heart is failing. On the nightstand, the gavel ring. He doesn't recognize you.",
      },
      {
        art: "ledger_book",
        caption:
          "His chart lists his specialist: a private clinic in Port Solace, paid by Crane & Partners. Wherever the money goes, he follows.",
      },
    ],
  },

  // ── Banking ───────────────────────────────────────────────────
  {
    id: "banking_2",
    title: "Banking · Forty Accounts",
    teaser: "Quell asks you to look at one client's file.",
    panels: [
      {
        art: "ledger_book",
        caption: "Quell slides a folder across her desk. \"One client. Forty accounts. All opened the same week.\"",
      },
      {
        art: "case_file",
        caption: "Account holder: C&P Holdings. Signatory: A. Crane. Deposits every time a verdict goes his way.",
      },
      {
        art: "envelope",
        caption:
          "One deposit is dated the day after your sentencing. $10,000, from Kozak's card club. Your freedom had a price tag.",
      },
    ],
  },
  {
    id: "banking_3",
    title: "Banking · The Vault",
    teaser: "The Ledger keeps more than money in Port Solace.",
    panels: [
      {
        art: "vault",
        caption: "Quell takes you to the deepest vault in the Exchange. Box 4471 is rented by C&P Holdings.",
      },
      {
        art: "vault",
        caption:
          "Inside: the missing evidence from your trial, carefully kept. Crane never destroys anything he can use later.",
      },
      {
        art: "rooftop",
        caption:
          "\"Evidence is worthless without a court that will hear it,\" Quell says. \"Find someone in Grayhaven who isn't bought.\"",
      },
    ],
  },
  // ── Military ──────────────────────────────────────────────────
  {
    id: "military_2",
    title: "Military · Requisition",
    teaser: "The armory books don't add up.",
    panels: [
      { art: "evidence_locker", caption: "Inventory night at the garrison armory. Forty rifles signed out for \"private security training\". None came back." },
      { art: "case_file", caption: "The requisition was countersigned by Sergeant Major Brann's predecessor, and paid for by C&P Holdings." },
      { art: "street", caption: "Two weeks later the same serial numbers turn up in a police raid on Iron Row. Kozak's men were holding them." },
    ],
  },
  {
    id: "military_3",
    title: "Military · Escort Duty",
    teaser: "A VIP convoy, and no names on the manifest.",
    panels: [
      { art: "street", caption: "A two-car escort at midnight: Courthouse Hill to the airfield. No names on the manifest." },
      { art: "judge_ring", caption: "The passenger climbs out at the airfield with a locked case. On his hand, a gold ring shaped like a gavel." },
      { art: "rooftop", caption: "Brann watches the plane climb toward Solmarra. \"Some orders come with a judge's signature. Forget you saw him.\" You don't." },
    ],
  },

  // ── Mechanic ──────────────────────────────────────────────────
  {
    id: "mechanic_2",
    title: "Mechanic · The Black Sedan",
    teaser: "A quiet repair for a very private client.",
    panels: [
      { art: "street", caption: "A black sedan rolls in after closing. The driver pays cash for a quiet repair and waits outside, smoking." },
      { art: "envelope", caption: "Behind the back seat: a hidden compartment full of brown envelopes, each one sealed with red wax." },
      { art: "case_file", caption: "Vera Dobrev runs the plates and frowns. \"Registered to C&P Holdings. Fix it, give it back, and never open that panel again.\"" },
    ],
  },
  {
    id: "mechanic_3",
    title: "Mechanic · Brake Lines",
    teaser: "An accident that wasn't.",
    panels: [
      { art: "alley", caption: "The wreck comes in on a flatbed. Its driver was due to testify at a retrial of one of Judge Crane's old cases." },
      { art: "case_file", caption: "The brake line didn't wear through. It was cut, clean. Then the shop's service records were changed to say otherwise." },
      { art: "morgue", caption: "Dobrev bags the old line and locks it in her safe. \"Somebody paid to make this look like an accident. We keep this.\"" },
    ],
  },

  // ── Hacker ────────────────────────────────────────────────────
  {
    id: "hacker_2",
    title: "Hacker · Forty Logins",
    teaser: "C&P's servers have a back door.",
    panels: [
      { art: "case_file", caption: "C&P Holdings keeps its accounts on an old server nobody patched. Juno Okafor gets you in before her coffee goes cold." },
      { art: "ledger_book", caption: "Forty accounts. Every one of them logs in from the same place: a terminal inside the Grayhaven courthouse." },
      { art: "card", caption: "\"Judges don't do their own banking at work,\" Okafor says. \"Unless they don't want it done anywhere else.\"" },
    ],
  },
  {
    id: "hacker_3",
    title: "Hacker · Edit History",
    teaser: "The court records keep every change.",
    panels: [
      { art: "case_file", caption: "Case 4471, in the court's own records system. Every change is logged. Almost nobody thinks to look." },
      { art: "judge_ring", caption: "The witness list was edited the night before your trial. One name added: Benny Marlowe. User: a.crane." },
      { art: "rooftop", caption: "Okafor copies the log to three places and erases your trail. \"Deleting is easy. Making them believe it was never there is the job.\"" },
    ],
  },

  // ── Fire ──────────────────────────────────────────────────────
  {
    id: "fire_2",
    title: "Fire · The Records Fire",
    teaser: "The courthouse annex burned the week before your trial.",
    panels: [
      { art: "evidence_locker", caption: "An old file: the courthouse annex fire, three years ago. The week before your trial. Ruled electrical." },
      { art: "case_file", caption: "The photos say otherwise. Pour patterns on the floor, two points of origin. Somebody used an accelerant." },
      { art: "photo", caption: "The annex held the defense files for eleven cases. Yours was one. Every one of them was in front of Judge Crane." },
    ],
  },
  {
    id: "fire_3",
    title: "Fire · Signed Off",
    teaser: "Who called it an accident?",
    panels: [
      { art: "case_file", caption: "The \"electrical\" ruling was signed by the fire marshal of the day: Chief Hal Brennan's predecessor." },
      { art: "envelope", caption: "His bank records show a payment from C&P Holdings the same week. Then early retirement, to a villa in Port Solace." },
      { art: "rooftop", caption: "Brennan stares at the signature a long time. \"I trained under that man.\" Then: \"Whatever you need from this house, ask.\"" },
    ],
  },
];

/** The four endings: what you do with the whole case. Only the one you choose is ever yours. */
export const ENDING_CHAPTERS: Chapter[] = [
  {
    id: "ending_court",
    title: "Ending · The Retrial",
    teaser: "You took it to a court that wasn't bought.",
    panels: [
      { art: "courtroom", caption: "Courtroom 1, and a judge from out of town who has never heard of the Ledger. Marsh lays the evidence out, piece by piece." },
      { art: "judge_ring", caption: "The ring, the seals, the forty accounts, Benny's statement. Crane says nothing. For once, nobody tells the jury what to think." },
      { art: "street", caption: "\"Not guilty.\" Then, for him: \"Guilty.\" You walk out into the rain with your name back. The first thing you've owned in years." },
    ],
  },
  {
    id: "ending_press",
    title: "Ending · Front Page",
    teaser: "You gave it to the paper.",
    panels: [
      { art: "case_file", caption: "You spread it across the editor's desk. She reads for an hour without a word, then calls the printers." },
      { art: "photo", caption: "Morning. Every newsstand in the city: THE LEDGER, with Crane's photograph under it. By noon he has resigned, \"for his health\"." },
      { art: "rooftop", caption: "Nobody can put it back in the box now. The whole city knows your name, and so does everyone who ever paid the Ledger." },
    ],
  },
  {
    id: "ending_kozak",
    title: "Ending · Sold",
    teaser: "You sold the case to Kozak.",
    panels: [
      { art: "ledger_book", caption: "Kozak turns the pages slowly, like a man reading a will. Then he smiles. \"This is worth more than you know. To me.\"" },
      { art: "envelope", caption: "A fat envelope crosses the desk. \"Crane works for me now. And he owes you one. Once, whatever you did, it goes away.\"" },
      { art: "alley", caption: "You walk out richer and no cleaner. Somewhere a judge just changed owners. The Ledger doesn't care who holds the pen." },
    ],
  },
  {
    id: "ending_keep",
    title: "Ending · Insurance",
    teaser: "You kept it, and Crane pays.",
    panels: [
      { art: "photo", caption: "You make copies and hide them in three places only you know. Then you send Crane one photograph: his ring." },
      { art: "envelope", caption: "Every week after that, an envelope finds you. No note. Just cash, and a judge who sleeps badly." },
      { art: "hospital", caption: "His heart was failing anyway. You'll be paid for as long as it keeps beating. Insurance, of a kind." },
    ],
  },
];


/**
 * Panels with a painted image (public/story/<chapter>-<n>.jpg). The rest keep their drawing until
 * their image arrives; add the file name here when it does.
 */
export const STORY_ART = new Set<string>([
  "prologue-1", "prologue-2", "prologue-3", "prologue-4",
  "old_faces-1", "old_faces-2", "old_faces-3",
  "police_2-1", "police_2-2", "police_2-3",
  "police_3-1", "police_3-2", "police_3-3",
  "enforcer_2-1", "enforcer_2-2", "enforcer_2-3",
  "enforcer_3-1", "enforcer_3-2", "enforcer_3-3",
  "courts_2-1", "courts_2-2", "courts_2-3",
]);
for (const c of [PROLOGUE, ...CHAPTERS, ...ENDING_CHAPTERS]) {
  c.panels.forEach((panel, i) => {
    if (STORY_ART.has(`${c.id}-${i + 1}`)) panel.img = `/story/${c.id}-${i + 1}.jpg`;
  });
}

export const CHAPTER_BY_ID = Object.fromEntries([PROLOGUE, ...CHAPTERS, ...ENDING_CHAPTERS].map((c) => [c.id, c])) as Record<
  string,
  Chapter
>;
