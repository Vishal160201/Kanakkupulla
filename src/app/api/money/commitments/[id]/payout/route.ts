import { json, moneyRoute, notFound } from "@/lib/money/server/route";
import { payOut } from "@/lib/money/server/commitmentsWrite";
import { parseJsonBody } from "@/lib/validations/http";
import { moneyPayoutSchema } from "@/lib/validations/money";

// POST /api/money/commitments/:id/payout — a savings goal's money went out (optionally the paying transaction).
export const POST = moneyRoute<{ id: string }>("POST /api/money/commitments/:id/payout", async ({ user, request, params }) => {
  const parsed = await parseJsonBody(request, moneyPayoutSchema);
  if (parsed.error) return parsed.error;
  const result = await payOut(user.id, params.id, parsed.data);
  return result ? json(result) : notFound("Savings goal not found");
});
