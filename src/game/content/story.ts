// Comic-panel story chapters. Art for each panel is drawn in src/components/Comic.tsx.

export interface Panel {
  art: "gavel" | "bars" | "street" | "card";
  caption: string;
}

export interface Chapter {
  id: string;
  title: string;
  panels: Panel[];
}

export const PROLOGUE: Chapter = {
  id: "prologue",
  title: "Chapter 0 · The Verdict",
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
