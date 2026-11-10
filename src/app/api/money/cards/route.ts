import { json, moneyRoute } from "@/lib/money/server/route";
import { cardsView } from "@/lib/money/server/overview";

export const dynamic = "force-dynamic";

// GET /api/money/cards — per card: used now, billing cycles, bill estimate, due date, payments made.
export const GET = moneyRoute("GET /api/money/cards", async ({ user }) => json(await cardsView(user.id)));
