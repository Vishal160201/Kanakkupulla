import prisma from "@/lib/prisma";
import { json, moneyRoute, notFound } from "@/lib/money/server/route";
import { updateCommitment } from "@/lib/money/server/commitmentsWrite";
import { parseJsonBody } from "@/lib/validations/http";
import { moneyCommitmentSchema } from "@/lib/validations/money";

type P = { id: string };

export const PUT = moneyRoute<P>("PUT /api/money/commitments/:id", async ({ user, request, params }) => {
  const parsed = await parseJsonBody(request, moneyCommitmentSchema);
  if (parsed.error) return parsed.error;
  return (await updateCommitment(user.id, params.id, parsed.data)) ? json({ ok: true }) : notFound("Commitment not found");
});

// DELETE — with its schedule; linked transactions stay, unlinked.
export const DELETE = moneyRoute<P>("DELETE /api/money/commitments/:id", async ({ user, params }) => {
  const existing = await prisma.moneyCommitment.findFirst({ where: { id: params.id, userId: user.id }, select: { id: true } });
  if (!existing) return notFound("Commitment not found");
  await prisma.$transaction([
    prisma.moneyCommitment.updateMany({ where: { userId: user.id, linkedCommitmentId: existing.id }, data: { linkedCommitmentId: null } }),
    prisma.moneyCommitment.delete({ where: { id: existing.id } }),
  ]);
  return json({ ok: true });
});
