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
  | "morgue";

export interface Panel {
  art: PanelArt;
  caption: string;
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
    title: "Enforcer · Tribute",
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
    title: "Enforcer · Paid in Full",
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
];

export const CHAPTER_BY_ID = Object.fromEntries([PROLOGUE, ...CHAPTERS].map((c) => [c.id, c])) as Record<
  string,
  Chapter
>;
