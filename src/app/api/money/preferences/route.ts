import { json, moneyRoute } from "@/lib/money/server/route";
import { getPreferences, savePreferences } from "@/lib/money/server/prefs";
import { moneyPreferencesSchema, type MoneyPreferences } from "@/lib/money/preferences";
import { parseJsonBody } from "@/lib/validations/http";

export const dynamic = "force-dynamic";

/** Everything but the dismissed-suggestion list. */
const publicPrefs = (p: MoneyPreferences) => ({ largeSpendThreshold: p.largeSpendThreshold, forecastDays: p.forecastDays, salaryInForecast: p.salaryInForecast, dueSoonDays: p.dueSoonDays });

export const GET = moneyRoute("GET /api/money/preferences", async ({ user }) => {
  return json(publicPrefs(await getPreferences(user.id)));
});

// PUT /api/money/preferences — thresholds and forecast options (dismissed suggestions are kept).
export const PUT = moneyRoute("PUT /api/money/preferences", async ({ user, request }) => {
  const parsed = await parseJsonBody(request, moneyPreferencesSchema.omit({ dismissed: true }));
  if (parsed.error) return parsed.error;
  const current = await getPreferences(user.id);
  return json(publicPrefs(await savePreferences(user.id, { ...parsed.data, dismissed: current.dismissed })));
});
