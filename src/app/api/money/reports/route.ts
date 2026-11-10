import { z } from "zod";
import { json, moneyRoute } from "@/lib/money/server/route";
import { reportsView } from "@/lib/money/server/reports";
import { parseSearchParams } from "@/lib/validations/http";

export const dynamic = "force-dynamic";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const query = z.object({ type: z.enum(["cycle", "cards", "recurring", "people"]).default("cycle"), from: day.optional(), to: day.optional() });

// GET /api/money/reports?type=cycle|cards|recurring|people&from&to
export const GET = moneyRoute("GET /api/money/reports", async ({ user, request }) => {
  const parsed = parseSearchParams(request, query);
  if (parsed.error) return parsed.error;
  if (parsed.data.from && parsed.data.to && parsed.data.from > parsed.data.to) return json({ error: "The start date is after the end date." }, { status: 422 });
  return json(await reportsView(user.id, parsed.data));
});
