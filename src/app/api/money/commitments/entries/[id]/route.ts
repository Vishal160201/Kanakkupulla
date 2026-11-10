import prisma from "@/lib/prisma";
import { dateFromIso } from "@/lib/money/text";
import { json, moneyRoute, notFound } from "@/lib/money/server/route";
import { parseJsonBody } from "@/lib/validations/http";
import { moneySchedulePatchSchema } from "@/lib/validations/money";

type P = { id: string };

const findEntry = (userId: string, id: string) => prisma.moneyCommitmentSchedule.findFirst({ where: { id, commitment: { userId } } });

/**
 * PATCH /api/money/commitments/entries/:id — mark paid (amount, date) or link a real transaction.
 * Linking a transaction fills paid amount and date from it unless you send them.
 */
export const PATCH = moneyRoute<P>("PATCH /api/money/commitments/entries/:id", async ({ user, request, params }) => {
  const parsed = await parseJsonBody(request, moneySchedulePatchSchema);
  if (parsed.error) return parsed.error;
  const entry = await findEntry(user.id, params.id);
  if (!entry) return notFound("Schedule entry not found");
  const d = parsed.data;

  let fromTxn: { paidAmount?: string; paidOn?: Date } = {};
  if (d.transactionId) {
    const txn = await prisma.moneyTransaction.findFirst({ where: { id: d.transactionId, userId: user.id } });
    if (!txn) return notFound("Transaction not found");
    const amount = txn.amount.greaterThan(entry.amount) ? entry.amount : txn.amount;
    fromTxn = { paidAmount: amount.toFixed(2), paidOn: txn.txnDate };
  }

  await prisma.$transaction([
    prisma.moneyCommitmentSchedule.update({
      where: { id: entry.id },
      data: {
        ...(d.dueDate ? { dueDate: dateFromIso(d.dueDate) } : {}),
        ...(d.amount ? { amount: d.amount } : {}),
        ...(d.transactionId !== undefined ? { transactionId: d.transactionId } : {}),
        ...(d.transactionId === null ? { paidAmount: d.paidAmount ?? "0.00", paidOn: d.paidOn ? dateFromIso(d.paidOn) : null } : {}),
        ...(d.transactionId ? { paidAmount: d.paidAmount ?? fromTxn.paidAmount, paidOn: d.paidOn ? dateFromIso(d.paidOn) : fromTxn.paidOn } : {}),
        ...(d.transactionId === undefined && d.paidAmount !== undefined ? { paidAmount: d.paidAmount } : {}),
        ...(d.transactionId === undefined && d.paidOn !== undefined ? { paidOn: d.paidOn ? dateFromIso(d.paidOn) : null } : {}),
      },
    }),
    ...(d.transactionId ? [prisma.moneyTransaction.update({ where: { id: d.transactionId }, data: { commitmentId: entry.commitmentId } })] : []),
    ...(d.transactionId === null && entry.transactionId
      ? [prisma.moneyTransaction.updateMany({ where: { id: entry.transactionId, userId: user.id }, data: { commitmentId: null } })]
      : []),
  ]);
  return json({ ok: true });
});

export const DELETE = moneyRoute<P>("DELETE /api/money/commitments/entries/:id", async ({ user, params }) => {
  const entry = await findEntry(user.id, params.id);
  if (!entry) return notFound("Schedule entry not found");
  await prisma.moneyCommitmentSchedule.delete({ where: { id: entry.id } });
  return json({ ok: true });
});
