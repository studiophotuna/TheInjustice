/* eslint-disable @next/next/no-img-element */

/** Items and businesses with a photo (see public/items/PHOTOS.md). */
const ART = new Set([
  "sandwich", "hot_meal", "steak_dinner", "medkit", "sleeping_bag", "room", "apartment", "townhouse", "penthouse",
  "pipe", "knuckles", "switchblade", "revolver", "shotgun", "service_pistol", "service_rifle", "machine_gun", "army_rifle", "army_lmg",
  "jacket", "vest", "riot_gear", "tactical_plate", "police_vest", "combat_armor", "heavy_armor",
  "laundromat", "corner_bar", "beach_kiosk", "boutique_hotel", "coal_depot", "black_market_stall", "repair_shop", "server_rack", "nightclub", "steel_mill",
]);

/** An item's art tile, or its emoji when it has none. `tier` adds a rarity frame by price. */
export function ItemArt({ id, icon, name, price, className = "" }: { id: string; icon: string; name: string; price?: number; className?: string }) {
  const tier = price === undefined ? "" : price >= 10_000 ? " tier-4" : price >= 1_000 ? " tier-3" : price >= 100 ? " tier-2" : " tier-1";
  if (!ART.has(id)) return <span className={`item-art emoji${tier} ${className}`} aria-hidden>{icon}</span>;
  return <img className={`item-art photo${tier} ${className}`} src={`/items/${id}.jpg`} alt={name} loading="lazy" draggable={false} />;
}
