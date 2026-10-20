import { z } from "zod";
import type { Prisma } from "@prisma/client";

/** Columns that must never be copied from a request body into a model's data / customData. */
export const RESERVED_KEYS: ReadonlySet<string> = new Set([
  "id",
  "userId",
  "recordDate",
  "deletedAt",
  "groupId",
  "transactionId",
  "shopId",
  "createdAt",
  "updatedAt",
]);

/** Any JSON value (request bodies are JSON, so dynamic custom fields are validated as such). */
export const jsonValue = z.json();
export type JsonValue = z.infer<typeof jsonValue>;
export type JsonRecord = Record<string, JsonValue>;

/** A JSON object (not an array / primitive). */
export const jsonObject = z.record(z.string(), jsonValue);

/**
 * Copies dynamic custom fields (e.g. `fld_*`) out of a body, dropping reserved columns,
 * server-action keys and any explicitly excluded keys.
 */
export function pickCustomFields(
  source: Record<string, unknown>,
  exclude: Iterable<string> = []
): JsonRecord {
  const skip = new Set(exclude);
  const out: JsonRecord = {};
  for (const [key, value] of Object.entries(source)) {
    if (RESERVED_KEYS.has(key) || skip.has(key) || key.startsWith("$ACTION") || value === undefined) continue;
    const parsed = jsonValue.safeParse(value);
    if (parsed.success) out[key] = parsed.data;
  }
  return out;
}

/** Reads a stored Json column as a plain object ({} for null / arrays / primitives / bad strings). */
export function asJsonRecord(value: Prisma.JsonValue | null | undefined): JsonRecord {
  let current: unknown = value;
  if (typeof current === "string") {
    try {
      current = JSON.parse(current);
    } catch {
      return {};
    }
  }
  return current && typeof current === "object" && !Array.isArray(current) ? { ...(current as JsonRecord) } : {};
}

/** Non-empty trimmed id string. */
export const idSchema = z.string().trim().min(1, "ID is required.");
export const idParams = z.object({ id: idSchema });

/** Optional id: "" / null become undefined. */
export const optionalId = z
  .string()
  .nullish()
  .transform(v => (v ? v : undefined));

/** Number that may arrive as a string (commas allowed, e.g. "1,500.00"). */
export function numeric(message = "Must be a number.") {
  return z.union([z.number(), z.string()], { message }).transform((value, ctx) => {
    const n = typeof value === "number" ? value : parseFloat(value.replace(/,/g, "").trim());
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return n;
  });
}

/** Strictly positive amount (strings accepted). */
export function positiveAmount(message = "Amount must be a positive number.") {
  return numeric(message).refine(n => n > 0, { message });
}

/** Non-negative amount (strings accepted). */
export function nonNegativeAmount(message = "Amount must be zero or more.") {
  return numeric(message).refine(n => n >= 0, { message });
}

const DMY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

/** Parses ISO / YYYY-MM-DD / DD/MM/YYYY / timestamps. Returns null when invalid. */
export function parseDateInput(value: string | number | Date): Date | null {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dmy = DMY.exec(trimmed);
  if (dmy) {
    const [, day, month, year] = dmy.map(Number);
    const d = new Date(year, month - 1, day);
    return d.getMonth() === month - 1 && d.getDate() === day ? d : null;
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

/** Required date input → Date. */
export function dateInput(message = "A valid date is required.") {
  return z.union([z.string(), z.number(), z.date()], { message }).transform((value, ctx) => {
    const d = parseDateInput(value);
    if (!d) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return d;
  });
}

/** Optional date input: undefined / null / "" → undefined, otherwise must be a valid date. */
export function optionalDateInput(message = "Invalid date.") {
  return z
    .union([z.string(), z.number(), z.date()], { message })
    .nullish()
    .transform((value, ctx) => {
      if (value === undefined || value === null || value === "") return undefined;
      const d = parseDateInput(value);
      if (!d) {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
      return d;
    });
}

/** Query-string boolean ("true"/"false"/"1"/"0"). */
export const queryBoolean = z
  .enum(["true", "false", "1", "0"])
  .optional()
  .transform(v => (v === undefined ? undefined : v === "true" || v === "1"));

/** Query-string integer with default and bounds; out-of-range values are clamped, garbage → default. */
export function queryInt(defaultValue: number, min: number, max: number) {
  return z
    .string()
    .optional()
    .transform(v => {
      const n = v === undefined ? NaN : parseInt(v, 10);
      if (!Number.isFinite(n)) return defaultValue;
      return Math.min(Math.max(n, min), max);
    });
}

/** Optional query string; "" becomes undefined. */
export const queryString = z
  .string()
  .optional()
  .transform(v => (v ? v : undefined));

/** Optional numeric query param; "" → undefined, non-numeric → 422. */
export const queryNumber = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (v === undefined || v.trim() === "") return undefined;
    const n = Number(v);
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: "custom", message: "Must be a number." });
      return z.NEVER;
    }
    return n;
  });

/** Optional query date (any parseable date string); invalid → 422. */
export const queryDate = optionalDateInput("Invalid date.");

/** `limit` / `offset` query params (garbage → defaults, out of range → clamped). */
export function paginationQuery(defaultLimit: number, maxLimit: number) {
  return z.object({
    limit: queryInt(defaultLimit, 0, maxLimit),
    offset: queryInt(0, 0, Number.MAX_SAFE_INTEGER),
  });
}
