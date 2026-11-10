import { json, moneyRoute } from "@/lib/money/server/route";
import { commitmentsView } from "@/lib/money/server/overview";
import { createCommitment } from "@/lib/money/server/commitmentsWrite";
import { parseJsonBody } from "@/lib/validations/http";
import { moneyCommitmentSchema } from "@/lib/validations/money";

export const dynamic = "force-dynamic";

// GET /api/money/commitments — commitments with schedules, the month grid and Bal for EMI line by line.
export const GET = moneyRoute("GET /api/money/commitments", async ({ user }) => json(await commitmentsView(user.id)));

export const POST = moneyRoute("POST /api/money/commitments", async ({ user, request }) => {
  const parsed = await parseJsonBody(request, moneyCommitmentSchema);
  if (parsed.error) return parsed.error;
  return json({ id: await createCommitment(user.id, parsed.data) }, { status: 201 });
});
