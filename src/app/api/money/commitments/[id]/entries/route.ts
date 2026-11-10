import prisma from "@/lib/prisma";
import { dateFromIso } from "@/lib/money/text";
import { json, moneyRoute, notFound } from "@/lib/money/server/route";
import { parseJsonBody } from "@/lib/validations/http";
import { moneyScheduleCreateSchema } from "@/lib/validations/money";

// POST /api/money/commitments/:id/entries — add a month to a commitment's schedule.
export const POST = moneyRoute<{ id: string }>("POST /api/money/commitments/:id/entries", async ({ user, request, params }) => {
  const parsed = await parseJsonBody(request, moneyScheduleCreateSchema);
  if (parsed.error) return parsed.error;
  const c = await prisma.moneyCommitment.findFirst({ where: { id: params.id, userId: user.id }, select: { id: true } });
  if (!c) return notFound("Commitment not found");
  const d = parsed.data;
  const row = await prisma.moneyCommitmentSchedule.create({
    data: { commitmentId: c.id, dueDate: dateFromIso(d.dueDate), amount: d.amount, paidAmount: d.paidAmount, paidOn: d.paidOn ? dateFromIso(d.paidOn) : null },
  });
  return json({ id: row.id }, { status: 201 });
});
