import prisma from "@/lib/prisma";
import { encryptOptional, encryptText } from "@/lib/money/crypto";
import { dateFromIso } from "@/lib/money/text";
import { json, moneyRoute } from "@/lib/money/server/route";
import { manualDedupeKey } from "@/lib/money/server/importer";
import { parseJsonBody } from "@/lib/validations/http";
import { moneyTransferSchema } from "@/lib/validations/money";

/**
 * POST /api/money/transactions/transfer — money moved between your accounts, typed in.
 * Bank -> bank: both sides, linked as a self transfer (left out of income and spending).
 * Bank -> card: a card bill payment, which lowers the card's used amount.
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
    const bill = await prisma.moneyCategory.findFirst({ where: { userId: user.id, name: "Card Bills" }, select: { id: true } });
    const row = await prisma.moneyTransaction.create({
      data: { ...base, accountId: from.id, direction: "DEBIT", kind: "CARD_PAYMENT", counterAccountId: to.id, categoryId: bill?.id ?? null, narration: encryptText(`Card bill paid: ${to.name}`), dedupeKey: manualDedupeKey() },
    });
    return json({ ids: [row.id], kind: "CARD_PAYMENT" }, { status: 201 });
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
