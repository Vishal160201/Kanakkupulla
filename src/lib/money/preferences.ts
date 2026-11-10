import { z } from "zod";
import { normaliseMoney } from "./format";

/** Tracker settings (Rules & Settings page). Stored as JSON in MoneyPreference. */

const amount = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    const m = normaliseMoney(v);
    if (m == null || m.startsWith("-")) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 3000." });
      return z.NEVER;
    }
    return m;
  });

export const moneyPreferencesSchema = z.object({
  /** Spends above this are "large one-offs", left out of the daily card average */
  largeSpendThreshold: amount.default("3000.00"),
  /** Days the forecast looks ahead */
  forecastDays: z.number().int().min(7).max(90).default(30),
  /** Count the expected salary in the forecast of available money */
  salaryInForecast: z.boolean().default(true),
  /** Warn this many days before a card bill or EMI is due */
  dueSoonDays: z.number().int().min(1).max(30).default(7),
  /** Pass-through / schedule suggestions you dismissed ("creditId:debitId", "scheduleId:txnId") */
  dismissed: z.array(z.string().max(80)).max(2000).default([]),
});

export type MoneyPreferences = z.output<typeof moneyPreferencesSchema>;

export const DEFAULT_PREFERENCES: MoneyPreferences = moneyPreferencesSchema.parse({});

/** Stored JSON -> preferences, falling back field by field so an old or damaged value still works. */
export function readPreferences(raw: unknown): MoneyPreferences {
  const parsed = moneyPreferencesSchema.safeParse(raw ?? {});
  if (parsed.success) return parsed.data;
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_PREFERENCES };
  for (const key of Object.keys(DEFAULT_PREFERENCES) as (keyof MoneyPreferences)[]) {
    const one = moneyPreferencesSchema.shape[key].safeParse(obj[key]);
    if (one.success) (out as Record<string, unknown>)[key] = one.data;
  }
  return out;
}
