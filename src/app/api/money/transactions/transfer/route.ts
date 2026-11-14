import prisma from "@/lib/prisma";
import { decryptText, encryptOptional, encryptText } from "@/lib/money/crypto";
import { dateFromIso } from "@/lib/money/text";
import { json, moneyRoute } from "@/lib/money/server/route";
import { manualDedupeKey } from "@/lib/money/server/importer";
import { parseJsonBody } from "@/lib/validations/http";
import { moneyTransferSchema } from "@/lib/validations/money";

/**
 * POST /api/money/transactions/transfer — money moved between your accounts, typed in.
 * Bank -> bank: both sides, linked as a self transfer (left out of income and spending).
 * Bank -> card: a card bill payment, which lowers the card's used amount. With scheduleEntryId it
 * also pays that card bill or EMI part, so the commitment stops counting in Bal for EMI.
 * When the statements arrive, their rows replace these typed ones (see replaceTypedEntries).
 */
export const POST = moneyRoute("POST /api/money/transactions/transfer", async ({ user, request }) => {
  const parsed = await parseJsonBody(request, moneyTransferSchema);
  if (parsed.error) return parsed.error;
  const d = parsed.data;
  const [from, to] = await Promise.all([
    prisma.moneyAccount.findFirst({ where: { id: d.fromAccountId, userId: user.id } }),
    prisma.moneyAccount.findFirst({ where: { id: d.toAccountId, userId: user.id } }),
  ]);
  if (!from || !to) return json({ error: "Account not found" }, { status: 422 });
  if (from.type !== "BANK") return json({ error: "Transfers start from a bank account.", errors: { fromAccountId: "Pick a bank account." } }, { status: 422 });

  const base = { userId: user.id, txnDate: dateFromIso(d.txnDate), amount: d.amount, seq: 0, note: encryptOptional(d.note) };

  if (to.type === "CREDIT_CARD") {
    const entry = d.scheduleEntryId
      ? await prisma.moneyCommitmentSchedule.findFirst({ where: { id: d.scheduleEntryId, commitment: { userId: user.id } }, include: { commitment: true } })
      : null;
    if (d.scheduleEntryId) {
      const bad = (msg: string) => json({ error: msg, errors: { scheduleEntryId: msg } }, { status: 422 });
      if (!entry) return bad("That bill or EMI part wasn't found.");
      if (entry.commitment.type !== "CARD_EMI" && entry.commitment.type !== "CARD_BILL") return bad("Pick a card bill or EMI part.");
      if (entry.commitment.accountId && entry.commitment.accountId !== to.id) return bad(`That part belongs to another card, not ${to.name}.`);
      if (entry.transactionId) return bad("That part is already linked to a payment.");
    }
    const bill = await prisma.moneyCategory.findFirst({ where: { userId: user.id, name: "Card Bills" }, select: { id: true } });
    const id = await prisma.$transaction(async (tx) => {
      const row = await tx.moneyTransaction.create({
        data: {
          ...base, accountId: from.id, direction: "DEBIT", kind: "CARD_PAYMENT", counterAccountId: to.id, categoryId: bill?.id ?? null,
          narration: encryptText(entry ? `${decryptText(entry.commitment.name)} paid: ${to.name}` : `Card bill paid: ${to.name}`),
          dedupeKey: manualDedupeKey(), commitmentId: entry?.commitmentId ?? null,
        },
      });
      if (entry) {
        const paid = entry.paidAmount.plus(d.amount);
        await tx.moneyCommitmentSchedule.update({
          where: { id: entry.id },
          data: { transactionId: row.id, paidAmount: (paid.greaterThan(entry.amount) ? entry.amount : paid).toFixed(2), paidOn: base.txnDate },
        });
      }
      return row.id;
    });
    return json({ ids: [id], kind: "CARD_PAYMENT", paidFor: entry ? decryptText(entry.commitment.name) : null }, { status: 201 });
  }

  const ids = await prisma.$transaction(async (tx) => {
    const out = await tx.moneyTransaction.create({
      data: { ...base, accountId: from.id, direction: "DEBIT", kind: "SELF_TRANSFER", narration: encryptText(`Transfer to ${to.name}`), dedupeKey: manualDedupeKey() },
    });
    const into = await tx.moneyTransaction.create({
      data: { ...base, accountId: to.id, direction: "CREDIT", kind: "SELF_TRANSFER", narration: encryptText(`Transfer from ${from.name}`), dedupeKey: manualDedupeKey(), linkedTxnId: out.id },
    });
    await tx.moneyTransaction.update({ where: { id: out.id }, data: { linkedTxnId: into.id } });
    return [out.id, into.id];
  });
  return json({ ids, kind: "SELF_TRANSFER" }, { status: 201 });
});
