import { json, moneyRoute } from "@/lib/money/server/route";
import { dashboardView } from "@/lib/money/server/overview";

export const dynamic = "force-dynamic";

export const GET = moneyRoute("GET /api/money/dashboard", async ({ user }) => json(await dashboardView(user.id)));
