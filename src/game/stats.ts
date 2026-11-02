import type { HiddenStats, Player, StatKey } from "./types";

/** Converts hidden XP into an effective stat value (10 = untrained). */
export function statValue(xp: number): number {
  return 10 + 4 * Math.sqrt(Math.max(0, xp));
}

export function sv(p: Player, key: StatKey): number {
  return statValue(p.stats[key]);
}

export function emptyStats(): HiddenStats {
  return {
    strength: 0,
    toughness: 0,
    agility: 0,
    wits: 0,
    nerve: 0,
    charisma: 0,
    perception: 0,
    integrity: 0,
  };
}

/** Value thresholds for descriptor tiers. */
const TIERS = [0, 18, 28, 40, 55, 75];

export function tierOf(value: number): number {
  let t = 0;
  for (let i = 0; i < TIERS.length; i++) if (value >= TIERS[i]) t = i;
  return t;
}

/** What the player sees on their profile instead of numbers. */
export const DESCRIPTORS = {
  body: ["Scrawny", "Wiry", "Lean", "Solid", "Hard as nails", "Built like a wall"],
  reflexes: ["Clumsy", "Slow", "Steady", "Quick", "Sharp", "Lightning"],
  smarts: ["Naive", "Green", "Alert", "Savvy", "Shrewd", "Sees everything"],
  presence: ["Invisible", "Timid", "Noticeable", "Confident", "Commanding", "Magnetic"],
} as const;

export function describe(p: Player) {
  const avg = (...k: StatKey[]) => k.reduce((s, x) => s + sv(p, x), 0) / k.length;
  return {
    body: DESCRIPTORS.body[tierOf(avg("strength", "toughness"))],
    reflexes: DESCRIPTORS.reflexes[tierOf(avg("agility"))],
    smarts: DESCRIPTORS.smarts[tierOf(avg("wits", "perception"))],
    presence: DESCRIPTORS.presence[tierOf(avg("charisma", "nerve"))],
  };
}

/** Flavor lines shown when a single stat crosses into a new tier. */
export const TIER_UP_LINES: Record<StatKey, string[]> = {
  strength: [
    "Lifting things is getting easier.",
    "Your arms ache less after a hard day.",
    "You carried that load like it was nothing.",
    "People step aside when you carry something heavy.",
    "You catch yourself bending a bottle cap with two fingers.",
  ],
  toughness: [
    "The cold doesn't bite as hard as it used to.",
    "You barely notice the bruises anymore.",
    "A long night on concrete and you still feel fine.",
    "A doctor would say you heal fast.",
    "Pain feels like a rumor these days.",
  ],
  agility: [
    "Your feet feel lighter.",
    "You dodge a cyclist without thinking.",
    "You move through crowds like water.",
    "You catch a falling glass before it hits the ground.",
    "Nobody sees you coming anymore.",
  ],
  wits: [
    "You're starting to see how the street works.",
    "You spot a scam before it starts.",
    "Prices, routes, schedules: it all clicks.",
    "You're always two moves ahead.",
    "People ask you for advice now.",
  ],
  nerve: [
    "Your hands shake a little less.",
    "Danger feels more like a dare.",
    "You stare down a guy twice your size.",
    "Fear is just a feeling now.",
    "Nothing rattles you.",
  ],
  charisma: [
    "A stranger smiled back at you today.",
    "People listen when you talk.",
    "You talked your way out of trouble.",
    "Folks remember your name.",
    "You could sell sand in a desert.",
  ],
  perception: [
    "You notice things you used to miss.",
    "You spot a pickpocket working the crowd.",
    "You can tell when someone's lying.",
    "Nothing in this city escapes you.",
    "You read people like headlines.",
  ],
};

/** Hint about the hidden Integrity stat, delivered through how the world treats you. */
export function integrityHint(integrity: number): string {
  if (integrity >= 30) return "The shopkeepers trust you with their keys.";
  if (integrity >= 10) return "People on the block nod when you pass.";
  if (integrity > -10) return "Nobody's sure what to make of you yet.";
  if (integrity > -30) return "Some people cross the street when they see you.";
  return "Conversations stop when you walk into a room.";
}
