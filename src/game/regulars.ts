// Street regulars: characters the game runs, so a city never feels empty while it's still
// filling up with players. Each city has its own ten, with a career, a rank, a temper and a
// daily routine. When few real players are out, more regulars are; as the city fills up they
// fade away.
//
// Regulars are always labelled. They can be fought, robbed and hired for a crew's ambush, they
// see crimes and sometimes talk to the police, and they chat in the city channel. They never show
// up on leaderboards, never run for office or claim seats, can't be put under contract, lent to,
// invited, or bountied, and they carry only pocket money (refilled every few hours), so nobody
// can farm them.

import { rankPortrait, regularGender } from "./content/faces";
import { STAT_KEYS, type CountryId, type PathId, type Player, type StatKey } from "./types";

export const REGULARS = {
  /** How many people the street should feel like it has (real players + regulars). */
  busyStreet: 6,
  /** While the city has fewer real players than this, every regular is listed in People. */
  listAllBelow: 20,
  cashMin: 20,
  cashMax: 160,
  refillMs: 4 * 60 * 60_000,
  /** City chat: at most one regular line in this window. */
  chatGapMs: 25 * 60_000,
  /** Chance a regular who saw a crime tells the police. */
  reportChance: 0.5,
  idPrefix: "reg-",
};

export interface RegularDef {
  key: string;
  name: string;
  path: PathId | null;
  rank: number;
  /** Hours (UTC) they're usually out: start hour and how long. */
  hours: [number, number];
  /** Which stats they lean on (they get more of these). */
  leans: StatKey[];
  bio: string;
  lines: string[];
  /** The city's heavies: high reputation, real money, worth a top player's time. */
  heavy?: { rep: number; cash: [number, number] };
}

const HEAVY = (def: RegularDef, rep: number, cash: [number, number]): RegularDef => ({ ...def, heavy: { rep, cash } });

const R = (key: string, name: string, path: PathId | null, rank: number, hours: [number, number], leans: StatKey[], bio: string, lines: string[]): RegularDef => ({
  key, name, path, rank, hours, leans, bio, lines,
});

export const ROSTER: Record<CountryId, RegularDef[]> = {
  varrow: [
    R("gus", "Gus Marlowe", null, 0, [6, 10], ["toughness"], "Sells umbrellas when it rains and lighters when it doesn't.", ["Rain's coming. Rain's always coming.", "Anybody need a lighter? Two bucks.", "Saw the Iron Row boys down by the docks again."]),
    R("rosa", "Rosa Vint", "medicine", 2, [9, 9], ["perception", "wits"], "Night nurse at St. Brigid's. Has seen everything twice.", ["If you're bleeding, come in the front door, not the back.", "Third stabbing this week. Slow week.", "Eat something before you start a fight, people."]),
    R("dutch", "Dutch Kessler", "enforcer", 3, [18, 9], ["strength", "toughness"], "Collects for someone he won't name. Polite about it.", ["Nice shop. Shame if the rent went up.", "Mr. Kozak says hello. That's all. Hello.", "Pay what you owe and nobody gets a story."]),
    R("ivy", "Ivy Szabo", "courts", 2, [12, 8], ["wits", "charisma"], "Law clerk who reads every file twice and trusts none of them.", ["Courthouse coffee should be a crime.", "Half the files on Crane's desk are missing pages.", "Get a lawyer before you need one."]),
    R("teo", "Teo Brandt", "police", 3, [14, 10], ["perception", "toughness"], "Beat cop on the Gutter. Remembers faces, forgets favors.", ["Keep it moving, folks.", "Somebody lifted a wallet on Ninth. Again.", "I see you. I always see you."]),
    R("mags", "Mags O'Leary", null, 0, [20, 10], ["agility"], "Runs the late card table behind the laundromat.", ["Table's open. Bring cash, not attitude.", "House always wins. I'm the house.", "Who's buying the next round?"]),
    R("lenny", "Lenny Pike", "enforcer", 1, [16, 10], ["agility", "strength"], "New muscle. Talks big, punches medium.", ["Anyone wanna go? I'll go.", "I'm gonna be made by spring. Watch.", "Who's got a smoke?"]),
    R("bea", "Bea Calloway", "banking", 2, [8, 9], ["wits"], "Teller at Grayhaven Savings. Counts in her sleep.", ["Bank's open till six. Deposit, don't get mugged.", "Interest rates went up. Nobody's happy.", "Funny how some accounts never run dry."]),
    R("sully", "Sully Raines", "vigilante", 2, [22, 8], ["agility", "perception"], "Walks the Gutter at night in a red scarf. Says he's just walking.", ["Somebody's got to watch the watchers.", "Saw a guy in a nice coat paying off a cop. Again.", "Lock your doors tonight."]),
    R("nico", "Nico Hale", "military", 2, [4, 9], ["strength", "toughness"], "On leave from the garrison. Bored, which is dangerous.", ["Garrison's quiet. Too quiet.", "Anyone know a gym that opens early?", "Civilians. Always in a hurry."]),
    HEAVY(R("crowe", "Silas Crowe", "enforcer", 7, [19, 9], ["strength", "nerve", "toughness"], "Runs Iron Row's collections for Kozak. Has never once raised his voice.", ["Everyone pays. The only question is when.", "Kozak sends his regards.", "I don't threaten people. I explain things."]), 170, [300, 700]),
    HEAVY(R("webb", "Captain Harlan Webb", "police", 6, [13, 10], ["perception", "toughness", "wits"], "Precinct Square's night captain. Half the city fears him; the other half pays him.", ["Nothing happens in this city I don't hear about.", "Clean records are just records nobody's read yet.", "Move along. Unless you want to talk."]), 150, [200, 500]),
  ],
  solmarra: [
    R("lucia", "Lucia Ferro", "banking", 3, [7, 10], ["wits", "charisma"], "Port Solace exchange broker. Every handshake is a contract.", ["The harbor money moves before sunrise.", "Never trust a man who pays in coins.", "Rates are good today. For me."]),
    R("dario", "Dario Vela", null, 0, [10, 10], ["agility"], "Runs a fish stall and three side hustles.", ["Fresh fish! Fresher secrets!", "Customs are checking the north pier today.", "My cousin knows a guy. My cousin always knows a guy."]),
    R("marisol", "Marisol Cruz", "medicine", 3, [13, 9], ["perception"], "Harbor clinic doctor. Stitches sailors and asks nothing.", ["The clinic doesn't take names after dark.", "Salt water's good for cuts. Not for bullets.", "Somebody came in with a hook wound. Don't ask."]),
    R("beppe", "Beppe Lanza", "enforcer", 4, [19, 9], ["strength", "charisma"], "Owns the café nobody eats at. The back room is always busy.", ["Espresso? On the house. Don't refuse.", "Business is good. Very good.", "Tell your friends: the docks have rules."]),
    R("ana", "Ana Ribeiro", "police", 2, [15, 9], ["perception", "agility"], "Harbor patrol. Fast on her feet, faster with a report.", ["Containers don't fall off ships by themselves.", "I've got eyes on the north pier.", "Move along, nothing to see. Yet."]),
    R("tomas", "Tomás Neri", "courts", 3, [11, 8], ["wits", "charisma"], "Defense lawyer with a yacht and no bad cases.", ["Everyone deserves a defense. Especially the rich.", "Don't say anything without me.", "The judge owes me a dinner."]),
    R("pia", "Pia Sorrento", null, 0, [21, 9], ["charisma", "agility"], "Sings at the harbor bar. Hears every deal.", ["Song requests cost extra tonight.", "Two men argued about a boat. One left wet.", "Last call is a suggestion."]),
    R("rico", "Rico Mancuso", "enforcer", 2, [17, 10], ["agility", "strength"], "Smuggler's runner. Knows every alley to the sea.", ["Need something moved? Quietly?", "The coast guard changed shifts.", "I was never here."]),
    R("elena", "Elena Duarte", "vigilante", 3, [0, 8], ["perception", "agility"], "Writes anonymous letters to the paper. Signs them 'The Tide'.", ["The tide always comes back.", "Somebody should look at the port authority's books.", "Not everyone in a uniform is clean."]),
    R("matteo", "Matteo Russo", "military", 1, [5, 9], ["toughness"], "Navy recruit. Homesick, broke, and handy with a wrench.", ["Shore leave's too short.", "Anyone hiring? Odd jobs?", "The sea's calmer than this city."]),
    HEAVY(R("bruni", "Don Salvatore Bruni", "enforcer", 7, [20, 9], ["charisma", "nerve", "strength"], "Owns the harbor, the casino strip and three judges. Smiles at everyone.", ["Port Solace is a family. I am its father.", "Sit, eat. Then we talk business.", "The sea keeps secrets. So do I."]), 210, [400, 900]),
    HEAVY(R("vargas", "Commodore Vargas", "military", 6, [6, 10], ["toughness", "strength", "perception"], "Runs the naval yard like a fortress and the smuggling routes like a business.", ["Nothing leaves this harbor without my say.", "Discipline is cheaper than bribes.", "Stand straight when you talk to me."]), 160, [250, 600]),
  ],
  kestrova: [
    R("anya", "Anya Volkova", "military", 4, [5, 10], ["strength", "toughness"], "Garrison sergeant. Ironmoor's walls know her boots.", ["Curfew is not a suggestion.", "Stand up straight when you rob someone.", "The colonel is watching the rail yard."]),
    R("pavel", "Pavel Dragan", null, 0, [8, 10], ["toughness"], "Foundry worker with burned hands and a short fuse.", ["Shift's twelve hours. Pay's for six.", "The foundry boss drives a new car. Funny.", "Don't push me today."]),
    R("irina", "Irina Kostic", "police", 4, [13, 9], ["perception", "wits"], "Inspector. Smiles once a year, on purpose.", ["I already know. I'm waiting for you to tell me.", "Somebody's selling army rifles. I'll find them.", "Papers, please. Yes, you."]),
    R("bogdan", "Bogdan Kral", "enforcer", 2, [18, 10], ["strength", "agility"], "Racket muscle who quotes poetry before he hits.", ["'Do not go gentle.' I won't.", "Your protection payment is late.", "Nice coat. Warm?"]),
    R("vera", "Vera Lund", "courts", 4, [10, 8], ["wits", "charisma"], "Prosecutor. Never lost a case she wanted to win.", ["The law is slow. I am not.", "Bring me evidence, not stories.", "Every crook thinks he's the clever one."]),
    R("oleg", "Oleg Marek", null, 0, [20, 10], ["charisma"], "Pawnbroker. Asks no questions, remembers every answer.", ["Watches, rings, rifles. No questions.", "Somebody pawned a medal today. Shame.", "Everything has a price. Everything."]),
    R("katya", "Katya Orlov", "medicine", 2, [14, 9], ["perception"], "Field medic. Prefers bullets to paperwork.", ["The army hospital is full. Again.", "Keep pressure on it. No, harder.", "Frostbite or knife? Pick one."]),
    R("stefan", "Stefan Hale", "banking", 3, [9, 9], ["wits"], "Clerk at the state bank. Moves money like weather.", ["Money leaves Ironmoor on Tuesdays.", "A deposit that large needs a story.", "The vault is cold. So is the manager."]),
    R("dusan", "Dušan Petrov", "vigilante", 1, [23, 8], ["agility"], "Teenager with a camera and a death wish.", ["I've got pictures. Lots of pictures.", "Somebody tell the paper about the rail yard.", "They can't arrest all of us."]),
    R("yuri", "Yuri Sokol", "enforcer", 3, [16, 10], ["toughness", "strength"], "Runs the rail yard card game. Never loses, never smiles.", ["Sit. Play. Lose quietly.", "The rail yard has its own law.", "You looking for work or trouble?"]),
    HEAVY(R("hraba", "Colonel Radek Hraba", "military", 7, [5, 10], ["strength", "toughness", "nerve"], "Commands the Ironmoor garrison and sells its rifles out the back door.", ["Order is a product. I sell it.", "The rail yard answers to me.", "You have papers? Good. Now you owe me."]), 200, [350, 800]),
    HEAVY(R("sorokina", "Mila Sorokina", "enforcer", 6, [20, 9], ["agility", "wits", "nerve"], "Runs the foundry rackets. Nobody has seen her lose a fight.", ["Everyone in Ironmoor works for me. Some just don't know it.", "Pay on Friday. Always Friday.", "I remember every face."]), 155, [250, 650]),
  ],
  meridian: [
    R("sloane", "Sloane Avery", "banking", 4, [13, 10], ["wits", "charisma"], "Halcyon hedge fund partner. Owns three penthouses and no conscience.", ["Markets are just crime with better lighting.", "Lunch is at the club. Members only.", "I don't launder money. I diversify it."]),
    R("jules", "Jules Moreau", null, 0, [16, 10], ["charisma", "agility"], "Valet at the Meridian Grand. Knows whose car went where.", ["Keys, please. Tip, please.", "A senator left with someone who wasn't his wife.", "Nice car. Shame about the dent."]),
    R("kai", "Kai Nakamura", "police", 3, [10, 10], ["perception", "agility"], "Financial crimes detective. Follows money, not people.", ["Money always leaves a trail.", "Somebody in this city is very rich and very nervous.", "Receipts. I love receipts."]),
    R("dex", "Dex Calder", "enforcer", 3, [21, 9], ["strength", "charisma"], "Nightclub 'security consultant'. The club pays him to exist.", ["Velvet rope's for you. Not for me.", "VIP means very intimidated person.", "Club's packed tonight. So are my pockets."]),
    R("noor", "Noor Haddad", "courts", 3, [12, 9], ["wits", "charisma"], "Corporate lawyer. Billing at 900 an hour, talking at 1200.", ["That'll be billed.", "Settle. Always settle.", "The contract said nothing about bodies."]),
    R("finn", "Finn Delgado", "medicine", 4, [8, 9], ["wits", "perception"], "Plastic surgeon to the rich and the wanted.", ["New face? New life? Same price.", "My clients value discretion.", "The best wounds are the ones nobody sees."]),
    R("zara", "Zara Quinn", "vigilante", 4, [1, 8], ["agility", "perception"], "Rooftop runner. Halcyon's tabloids call her the Glass Ghost.", ["Halcyon's rooftops are mine.", "That penthouse isn't paid for with clean money.", "See you on the news."]),
    R("milo2", "Milo Grant", null, 0, [18, 10], ["agility"], "Rideshare driver. Drove a getaway car once, by accident.", ["Where to? No questions. Mostly.", "Five stars or I remember your face.", "Traffic's bad by the stock exchange."]),
    R("reed", "Reed Holloway", "military", 3, [6, 9], ["toughness", "strength"], "Private contractor. Ex-army, ex-everything.", ["Security detail. Don't stand so close.", "I've been to worse places. Not many.", "Contracts pay better than medals."]),
    R("tess", "Tess Laurent", "enforcer", 1, [19, 10], ["charisma"], "Card sharp who works the casino floor.", ["Pick a card. Any card. That one's mine.", "The casino lets me win. Small.", "Never play with a man who counts out loud."]),
    HEAVY(R("vale", "Augustin Vale", "banking", 7, [12, 10], ["wits", "charisma", "perception"], "Chairman of the Meridian Exchange. Launders more money than the central bank prints.", ["Money has no smell. I made sure.", "Every crisis is an opportunity, for me.", "My lawyers have lawyers."]), 220, [500, 1000]),
    HEAVY(R("thorne", "Marcus Thorne", "enforcer", 6, [21, 9], ["strength", "agility", "nerve"], "Vale's fixer. Problems in Halcyon tend to vanish around him.", ["Mr. Vale doesn't like loose ends.", "I'm just here to talk. For now.", "Halcyon is a clean city. I keep it that way."]), 160, [300, 700]),
  ],
};

export const regularId = (country: CountryId, key: string) => `${REGULARS.idPrefix}${country}-${key}`;
export const isRegularId = (id: unknown) => typeof id === "string" && id.startsWith(REGULARS.idPrefix);
export const isRegular = (p: Player | null | undefined) => !!p?.regular;

/** A small stable hash for schedules and refills. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

export function defFor(p: Player): RegularDef | null {
  if (!p.regular) return null;
  return ROSTER[p.regular.country]?.find((d) => d.key === p.regular!.key) ?? null;
}

/** Is this regular out on the streets at this hour (by their routine)? */
export function scheduledOut(def: RegularDef, now: number): boolean {
  const hour = new Date(now).getUTCHours();
  const [start, len] = def.hours;
  return (hour - start + 24) % 24 < len;
}

/**
 * Which regulars are out right now, given how many real players are on the street. Stable within
 * an hour, so the list doesn't shuffle on every refresh.
 */
export function regularsOut(all: Player[], realOnline: number, now: number, inHospitalOrJail: (p: Player) => boolean): Player[] {
  const room = Math.max(0, REGULARS.busyStreet - realOnline);
  const slot = Math.floor(now / (60 * 60_000));
  const scheduled = all
    .filter((p) => !p.dead && !inHospitalOrJail(p))
    .filter((p) => {
      const d = defFor(p);
      return !!d && scheduledOut(d, now);
    })
    .sort((a, b) => hash(a.id + slot) - hash(b.id + slot));
  // The heavies keep their own hours, however busy the street is.
  const heavies = scheduled.filter((p) => defFor(p)?.heavy);
  return [...heavies, ...scheduled.filter((p) => !defFor(p)?.heavy).slice(0, room)];
}

export const isHeavy = (p: Player) => !!defFor(p)?.heavy;

/** Keeps a regular in shape: pocket money refills every few hours, and they don't hold heat. */
/** Each regular is drawn as their career's character (the street, without one). */
export const regularPhoto = (country: string, key: string) => {
  const def = ROSTER[country as CountryId]?.find((d) => d.key === key);
  return rankPortrait(def?.path ?? null, def?.rank ?? 1, key, regularGender(key));
};

export function regularUpkeep(p: Player, now: number) {
  if (!p.regular) return;
  if ((p.regular.v ?? 1) < REGULAR_VERSION) {
    const def = defFor(p);
    if (def) {
      p.stats = { ...p.stats, ...regularStats(def) };
      p.reputation = def.heavy?.rep ?? 5 + def.rank * 8;
    }
    p.regular.v = REGULAR_VERSION;
  }
  const photo = regularPhoto(p.regular.country, p.regular.key);
  if (p.profile?.photo !== photo) p.profile = { ...(p.profile ?? {}), photo };
  const slot = Math.floor(now / REGULARS.refillMs);
  if (p.regular.slot !== slot) {
    p.regular.slot = slot;
    const [lo, hi] = defFor(p)?.heavy?.cash ?? [REGULARS.cashMin, REGULARS.cashMax];
    p.cash = Math.round(lo + hash(p.id + slot) * (hi - lo));
    p.dirty = 0;
    p.bank = 0;
  }
  p.heat = 0;
  p.energy = Math.max(p.energy, 50);
  p.sightings = [];
}

/** Experience for a regular's stats: rank sets the level, their leanings add more. */
/**
 * Experience for a regular's stats, calibrated to how real players grow: a regular of rank N is
 * about as strong as a player who reached rank N, in the stats their career uses. Heavies are a
 * step above, a target for top players and crews.
 */
export function regularStats(def: RegularDef): Record<StatKey, number> {
  const base = 6 * def.rank ** 2 + 4;
  return Object.fromEntries(
    STAT_KEYS.map((k) => [k, Math.round(base * (0.8 + hash(def.key + k) * 0.4) * (def.leans.includes(k) ? (def.heavy ? 1.3 : 1.6) : 0.6))]),
  ) as Record<StatKey, number>;
}

/** Bump when regularStats changes: existing regulars are recalibrated on their next update. */
export const REGULAR_VERSION = 2;

/** A line for city chat, or null if it isn't time yet. */
export function chatLine(out: Player[], lastAt: number, now: number): { who: Player; text: string } | null {
  if (!out.length || now - lastAt < REGULARS.chatGapMs) return null;
  const slot = Math.floor(now / REGULARS.chatGapMs);
  const who = out[Math.floor(hash(`chat${slot}`) * out.length)];
  const def = defFor(who);
  if (!def) return null;
  return { who, text: def.lines[Math.floor(hash(`${who.id}${slot}`) * def.lines.length)] };
}

/** Ops that may target a regular. Everything else is refused. */
export const REGULAR_OPS = new Set(["attack", "crime", "ambush_hire", "ambush_plan", "regular_service"]);

const DOING: Record<string, string[]> = {
  police: ["is walking a beat in", "is asking questions around", "stopped a car in"],
  enforcer: ["was seen collecting in", "is leaning on a shopkeeper in", "is hanging around"],
  courts: ["is grabbing a coffee in", "is meeting a client in", "is reading files in a café in"],
  medicine: ["is on a smoke break in", "is heading to a house call in", "is patching someone up in"],
  banking: ["is counting money in", "is lunching with a client in", "is closing a deal in"],
  military: ["is on patrol in", "is off duty in", "is running drills near"],
  vigilante: ["is watching the rooftops over", "is following someone in", "was spotted in"],
  none: ["is hustling in", "is killing time in", "is selling something in"],
};

/** A few lines of street life from the regulars who are out, one every 15 minutes or so. */
export function ambientLines(out: Player[], districts: string[], now: number): { at: number; text: string }[] {
  if (!out.length || !districts.length) return [];
  const slotMs = 15 * 60_000;
  const slot = Math.floor(now / slotMs);
  return [0, 1, 2].map((back) => {
    const s = slot - back;
    // Rotate through who's out so consecutive lines are about different people.
    const who = out[(s * 7 + Math.floor(hash(`amb${s}`) * out.length)) % out.length];
    const verbs = DOING[who.path ?? "none"] ?? DOING.none;
    const verb = verbs[Math.floor(hash(`${who.id}v${s}`) * verbs.length)];
    const where = districts[Math.floor(hash(`${who.id}d${s}`) * districts.length)];
    return { at: s * slotMs + Math.floor(hash(`t${s}`) * slotMs * 0.8), text: `${who.name} ${verb} ${where}.` };
  }).filter((l) => l.at <= now);
}
