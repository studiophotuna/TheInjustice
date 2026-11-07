import type { Action, CountryId, PathId, TravelMode } from "@/game/types";
import { GameError } from "@/game/types";
import { PATHS } from "@/game/content/paths";
import { isBackground } from "@/game/backgrounds";
import type { BackgroundId } from "@/game/types";

// Every career, straight from the career list, so a new one is never left out.
const PATH_IDS = Object.keys(PATHS) as PathId[];
const COUNTRY_IDS: CountryId[] = ["varrow", "solmarra", "kestrova", "meridian"];
const MODES: TravelMode[] = ["bus", "train", "plane"];
const str = (v: unknown, max = 40): string => {
  if (typeof v !== "string" || v.length === 0 || v.length > max) throw new GameError("Bad request.");
  return v;
};

/** Validates untrusted request bodies into a typed Action. */
export function parseAction(body: unknown): Action {
  if (!body || typeof body !== "object") throw new GameError("Bad request.");
  const b = body as Record<string, unknown>;
  switch (b.type) {
    case "create":
      if (b.country !== undefined && !COUNTRY_IDS.includes(b.country as CountryId)) throw new GameError("Bad request.");
      if (b.background !== undefined && !isBackground(b.background)) throw new GameError("Bad request.");
      return { type: "create", name: str(b.name, 60), country: b.country as CountryId | undefined, background: b.background as BackgroundId | undefined };
    case "travel":
      if (!COUNTRY_IDS.includes(b.to as CountryId) || !MODES.includes(b.mode as TravelMode)) throw new GameError("Bad request.");
      return { type: "travel", to: b.to as CountryId, mode: b.mode as TravelMode };
    case "stash": {
      if (b.op !== "put" && b.op !== "take" && b.op !== "put_all") throw new GameError("Bad request.");
      if (b.op !== "put_all" && !["cash", "dirty", "herb", "pills", "powder"].includes(b.what as string)) throw new GameError("Bad request.");
      const amount = b.amount === undefined || b.amount === null ? undefined : Number(b.amount);
      return { type: "stash", op: b.op, what: b.what as "cash" | undefined, amount };
    }
    case "drive":
      if (!COUNTRY_IDS.includes(b.to as CountryId)) throw new GameError("Bad request.");
      return { type: "drive", to: b.to as CountryId, carId: str(b.carId) };
    case "car_buy":
      if (!["hatch", "sedan", "van", "coupe", "suv"].includes(b.model as string)) throw new GameError("Bad request.");
      return { type: "car_buy", model: b.model as "hatch" };
    case "car_sell":
    case "car_repair":
    case "car_compartment":
    case "car_chop":
    case "car_plates":
      return { type: b.type, carId: str(b.carId) };
    case "fit_alarm":
      return { type: "fit_alarm" };
    case "dog_buy":
      if (!["mutt", "shepherd", "mastiff"].includes(b.breed as string)) throw new GameError("Bad request.");
      return { type: "dog_buy", breed: b.breed as "mutt", name: str(b.name, 40) };
    case "scrub_set":
      if (typeof b.open !== "boolean") throw new GameError("Bad request.");
      return { type: "scrub_set", open: b.open, fee: Number(b.fee) };
    case "tunnel_dig":
    case "make_shank":
    case "parole_hearing":
      return { type: b.type };
    case "garage_set":
      if (typeof b.open !== "boolean") throw new GameError("Bad request.");
      return { type: "garage_set", open: b.open, rate: Number(b.rate) };
    case "dog_feed":
    case "dog_give_away":
      return { type: b.type };
    case "cargo_buy":
    case "cargo_sell":
      if (!["smokes", "liquor", "phones", "pistols"].includes(b.good as string)) throw new GameError("Bad request.");
      return { type: b.type, carId: str(b.carId), good: b.good as "smokes", qty: Number(b.qty) };
    case "ack_arrival":
      return { type: "ack_arrival" };
    case "claim_daily":
      return { type: "claim_daily" };
    case "buy_property":
      return { type: "buy_property", id: str(b.id) };
    case "collect_property":
      return { type: "collect_property", id: str(b.id) };
    case "read_inbox":
      return { type: "read_inbox" };
    case "claim_contract":
      return { type: "claim_contract", id: str(b.id) };
    case "train":
      if (b.stat !== "strength" && b.stat !== "toughness" && b.stat !== "agility") throw new GameError("Bad request.");
      return { type: "train", stat: b.stat };
    case "job":
      return { type: "job", jobId: str(b.jobId) };
    case "buy":
      return { type: "buy", itemId: str(b.itemId), maxPrice: typeof b.maxPrice === "number" && Number.isFinite(b.maxPrice) ? b.maxPrice : undefined };
    case "use":
      return { type: "use", itemId: str(b.itemId) };
    case "equip":
      return { type: "equip", itemId: str(b.itemId) };
    case "repair":
      return { type: "repair", itemId: str(b.itemId) };
    case "leave_career":
      return { type: "leave_career" };
    case "start_exit":
      return { type: "start_exit" };
    case "field_dressing":
      return { type: "field_dressing" };
    case "community_service":
      return { type: "community_service", task: str(b.task) };
    case "argue_sentence":
      return { type: "argue_sentence" };
    case "promo_choice":
      if (b.pick !== "a" && b.pick !== "b") throw new GameError("Bad request.");
      return { type: "promo_choice", pick: b.pick };
    case "abandon_exit":
      return { type: "abandon_exit" };
    case "profile":
      return {
        type: "profile",
        ...(typeof b.bio === "string" ? { bio: b.bio } : {}),
        ...(b.photo === null || typeof b.photo === "string" ? { photo: b.photo as string | null } : {}),
      };
    case "buy_cosmetic":
      return { type: "buy_cosmetic", id: str(b.id) };
    case "casino": {
      const games = ["roulette", "seven", "deal", "hit", "stand", "double", "break"] as const;
      const game = games.find((g) => g === b.game);
      if (!game) throw new GameError("Bad request.");
      const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.floor(v) : undefined);
      return {
        type: "casino",
        game,
        ...(typeof b.bet === "string" && b.bet.length < 12 ? { bet: b.bet } : {}),
        ...(num(b.number) !== undefined ? { number: num(b.number) } : {}),
        ...(num(b.stake) !== undefined ? { stake: num(b.stake) } : {}),
        ...(num(b.days) !== undefined ? { days: num(b.days) } : {}),
      };
    }
    case "pass_buy":
      return { type: "pass_buy" };
    case "pass_claim":
      if (typeof b.level !== "number" || (b.track !== "free" && b.track !== "paid")) throw new GameError("Bad request.");
      return { type: "pass_claim", level: b.level, track: b.track };
    case "equip_cosmetic":
      if (b.kind !== "frame" && b.kind !== "color" && b.kind !== "banner" && b.kind !== "paint" && b.kind !== "decor") throw new GameError("Bad request.");
      return { type: "equip_cosmetic", kind: b.kind, id: b.id === null ? null : str(b.id) };
    case "hire_bodyguards":
      return { type: "hire_bodyguards" };
    case "lie_low":
      return { type: "lie_low" };
    case "unequip":
      if (b.slot !== "weapon" && b.slot !== "armor") throw new GameError("Bad request.");
      return { type: "unequip", slot: b.slot };
    case "fight":
      return { type: "fight", npcId: str(b.npcId) };
    case "rebirth":
      return { type: "rebirth", name: b.name === undefined ? undefined : str(b.name, 60) };
    case "apply":
      return { type: "apply", school: str(b.school) };
    case "enroll":
      return { type: "enroll" };
    case "dismiss_application":
      return { type: "dismiss_application" };
    case "assess":
      return { type: "assess" };
    case "flag":
      return { type: "flag", flag: str(b.flag) };
    case "launder":
      if (b.method !== "laundromat" && b.method !== "business" && b.method !== "bank") throw new GameError("Bad request.");
      return { type: "launder", method: b.method, amount: Number(b.amount) };
    case "drug_buy":
    case "drug_sell":
      if (!["herb", "pills", "powder"].includes(b.drug as string)) throw new GameError("Bad request.");
      return { type: b.type, drug: b.drug as "herb", qty: Number(b.qty) };
    case "buy_supplies":
      return { type: "buy_supplies", qty: Number(b.qty) };
    case "cook":
      if (!["herb", "pills", "powder"].includes(b.drug as string)) throw new GameError("Bad request.");
      return { type: "cook", drug: b.drug as "herb" };
    case "tutorial":
      return { type: "tutorial", step: str(b.step) };
    case "encounter": {
      const choice = Number(b.choice);
      if (!Number.isInteger(choice) || choice < 0 || choice > 5) throw new GameError("Bad request.");
      return { type: "encounter", choice };
    }
    case "bank": {
      const op = b.op;
      if (op !== "open" && op !== "deposit" && op !== "withdraw") throw new GameError("Bad request.");
      const amount = b.amount === undefined ? undefined : Number(b.amount);
      return { type: "bank", op, amount };
    }
    case "offer": {
      if (!PATH_IDS.includes(b.path as PathId) || typeof b.accept !== "boolean") {
        throw new GameError("Bad request.");
      }
      return { type: "offer", path: b.path as PathId, accept: b.accept };
    }
    default:
      throw new GameError("Unknown action.");
  }
}
