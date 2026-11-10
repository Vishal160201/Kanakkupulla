import prisma from "@/lib/prisma";
import { encryptOptional } from "@/lib/money/crypto";
import { json, moneyRoute, notFound } from "@/lib/money/server/route";
import { unlinkPair } from "@/lib/money/server/matching";
import { toTxnDTO } from "@/lib/money/server/rows";
import { parseJsonBody } from "@/lib/validations/http";
import { moneyTxnPatchSchema } from "@/lib/validations/money";

type P = { id: string };

// PATCH /api/money/transactions/:id — category, kind (reimbursement, pass-through, …), note, card paid.
export const PATCH = moneyRoute<P>("PATCH /api/money/transactions/:id", async ({ user, request, params }) => {
  const parsed = await parseJsonBody(request, moneyTxnPatchSchema);
  if (parsed.error) return parsed.error;
  const txn = await prisma.moneyTransaction.findFirst({ where: { id: params.id, userId: user.id } });
  if (!txn) return notFound("Transaction not found");
  const { categoryId, kind, note, counterAccountId } = parsed.data;

  if (categoryId && !(await prisma.moneyCategory.findFirst({ where: { id: categoryId, userId: user.id }, select: { id: true } }))) {
    return json({ error: "Category not found" }, { status: 422 });
  }
  if (counterAccountId && !(await prisma.moneyAccount.findFirst({ where: { id: counterAccountId, userId: user.id, type: "CREDIT_CARD" }, select: { id: true } }))) {
    return json({ error: "Card not found" }, { status: 422 });
  }
  // Leaving a pair (self transfer / pass-through) breaks it on both sides
  const pairedKinds = ["SELF_TRANSFER", "PASS_THROUGH"];
  if (kind && kind !== txn.kind && pairedKinds.includes(txn.kind) && (txn.linkedTxnId || (await prisma.moneyTransaction.count({ where: { linkedTxnId: txn.id } })) > 0)) {
    await unlinkPair(user.id, txn.id);
  }

  const row = await prisma.moneyTransaction.update({
    where: { id: txn.id },
    data: {
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(kind ? { kind } : {}),
      ...(note !== undefined ? { note: encryptOptional(note) } : {}),
      ...(counterAccountId !== undefined ? { counterAccountId } : kind && kind !== "CARD_PAYMENT" ? { counterAccountId: null } : {}),
    },
  });
  return json(toTxnDTO(row));
});

// DELETE /api/money/transactions/:id — only rows you typed in or imported from a CSV.
export const DELETE = moneyRoute<P>("DELETE /api/money/transactions/:id", async ({ user, params }) => {
  const txn = await prisma.moneyTransaction.findFirst({ where: { id: params.id, userId: user.id }, include: { import: { select: { sourceType: true } } } });
  if (!txn) return notFound("Transaction not found");
  if (txn.import && txn.import.sourceType !== "CSV" && txn.import.sourceType !== "MANUAL") {
    return json({ error: "Statement rows can't be deleted one by one. Delete the import instead." }, { status: 409 });
  }
  if (txn.linkedTxnId) await unlinkPair(user.id, txn.id);
  await prisma.$transaction([
    prisma.moneyCommitmentSchedule.updateMany({ where: { transactionId: txn.id }, data: { transactionId: null } }),
    prisma.moneyTransaction.delete({ where: { id: txn.id } }),
  ]);
  return json({ ok: true });
});
