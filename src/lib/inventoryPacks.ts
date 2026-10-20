// Product pack types for Fertilizer Inventory: what one unit of stock is (a 1 L bottle, a 50 kg
// bag, a kg sold loose…). Shared by the client (forms, labels) and the server (validation).
// Keep free of server-only imports.

export const PACK_TYPES = ["Bottle", "Packet", "Bag", "Loose", "Piece"] as const;
export type PackType = (typeof PACK_TYPES)[number];

/**
 * Per pack type: the units its size can be given in (sized types), or the measure it is sold by
 * (Loose). Piece has neither.
 */
export const PACK_UNITS: Record<PackType, readonly string[]> = {
  Bottle: ["ml", "L"],
  Packet: ["g", "kg"],
  Bag: ["kg"],
  Loose: ["kg", "L", "tonne"],
  Piece: [],
};

/** Pack types whose size (e.g. 50 kg) is asked for. */
export const SIZED_PACK_TYPES: readonly PackType[] = ["Bottle", "Packet", "Bag"];

export const PACK_TYPE_HINTS: Record<PackType, string> = {
  Bottle: "Liquid in bottles (ml / litre)",
  Packet: "Packets by weight (g / kg)",
  Bag: "Bags / sacks by weight (kg)",
  Loose: "Sold by weight or volume",
  Piece: "Counted one by one",
};

export function isPackType(value: unknown): value is PackType {
  return typeof value === "string" && (PACK_TYPES as readonly string[]).includes(value);
}

export function isSizedPackType(type: string): boolean {
  return (SIZED_PACK_TYPES as readonly string[]).includes(type);
}

type PackFields = { unit: string; packSize?: number | null; packUnit?: string | null };

const formatSize = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 3 });

/** "1 L bottle", "50 kg bag", "per kg", "piece"; "Bag" when the size isn't set; old units as-is. */
export function packLabel(product: PackFields): string {
  const { unit, packSize, packUnit } = product;
  if (unit === "Loose") return packUnit ? `per ${packUnit}` : "loose";
  if (unit === "Piece") return "piece";
  if (isSizedPackType(unit)) {
    return packSize && packUnit ? `${formatSize(packSize)} ${packUnit} ${unit.toLowerCase()}` : unit;
  }
  return unit;
}

/** What stock and bill quantities are counted in: "kg" for loose, "bag" / "bottle" for packs. */
export function quantityUnit(product: PackFields, quantity?: number): string {
  if (product.unit === "Loose") return product.packUnit || "unit";
  if (isPackType(product.unit)) {
    const word = product.unit.toLowerCase();
    return quantity !== undefined && quantity !== 1 ? `${word}s` : word;
  }
  return product.unit;
}

/**
 * Checks pack fields together. Returns the normalised fields, or field errors keyed like the
 * product form (`unit`, `packSize`, `packUnit`).
 */
export function validatePack(input: { unit: string; packSize?: number | null; packUnit?: string | null }):
  | { ok: true; value: { unit: PackType; packSize: number | null; packUnit: string | null } }
  | { ok: false; errors: Record<string, string> } {
  if (!isPackType(input.unit)) return { ok: false, errors: { unit: "Pick a pack type." } };
  const unit = input.unit;
  const allowedUnits = PACK_UNITS[unit];
  if (unit === "Piece") return { ok: true, value: { unit, packSize: null, packUnit: null } };

  const packUnit = input.packUnit ?? null;
  if (!packUnit || !allowedUnits.includes(packUnit)) {
    return {
      ok: false,
      errors: { packUnit: unit === "Loose" ? "Pick what it's sold by." : `Pick ${allowedUnits.join(" or ")}.` },
    };
  }
  if (unit === "Loose") return { ok: true, value: { unit, packSize: null, packUnit } };

  const packSize = input.packSize ?? null;
  if (packSize === null || !Number.isFinite(packSize) || packSize <= 0) {
    return { ok: false, errors: { packSize: `Enter the ${unit.toLowerCase()} size.` } };
  }
  return { ok: true, value: { unit, packSize: Math.round(packSize * 1000) / 1000, packUnit } };
}
