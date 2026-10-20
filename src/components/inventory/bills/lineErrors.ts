import type { BillLineError } from "@/types/inventory";

interface SubmittedLine {
  key: number;
  productId: string;
}

const messageOf = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const v = value as BillLineError;
    const msg = v.message ?? v.error;
    if (typeof msg === "string") return msg;
    if (typeof v.available === "number") return `Only ${v.available} in stock.`;
  }
  return null;
};

/**
 * Maps the 409 `errors` payload of POST /api/inventory/bills to the submitted lines (by key).
 * Accepts an array (of BillLineError or strings, positional), or an object keyed by line
 * index, "lines.<i>[.field]" or productId.
 */
export function parseLineErrors(errors: unknown, lines: SubmittedLine[]): Record<number, string> {
  const out: Record<number, string> = {};
  if (!errors) return out;

  const assignByIndex = (index: number, message: string | null) => {
    const line = lines[index];
    if (line && message) out[line.key] = message;
  };
  const assignByProduct = (productId: string, message: string | null) => {
    const line = lines.find((l) => l.productId === productId);
    if (line && message) out[line.key] = message;
  };

  if (Array.isArray(errors)) {
    errors.forEach((entry, i) => {
      const message = messageOf(entry);
      if (entry && typeof entry === "object") {
        const e = entry as BillLineError;
        if (typeof e.index === "number") return assignByIndex(e.index, message);
        if (typeof e.lineIndex === "number") return assignByIndex(e.lineIndex, message);
        if (typeof e.productId === "string") return assignByProduct(e.productId, message);
      }
      assignByIndex(i, message);
    });
    return out;
  }

  if (typeof errors === "object") {
    for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
      const message = messageOf(value);
      const indexMatch = /^(?:lines?[.[])?(\d+)/.exec(key);
      if (indexMatch) assignByIndex(Number(indexMatch[1]), message);
      else assignByProduct(key, message);
    }
  }
  return out;
}
