import prisma from "@/lib/prisma";
import { matchSelfTransfers, type MatchTxn } from "../matching";
import { defaultKind } from "../rules";
import { loadAccounts, loadTxns } from "./rows";

/**
 * Runs after every import: pairs self transfers between your bank accounts (both sides become
 * SELF_TRANSFER and point at each other). Returns how many new pairs were made.
 */
export async function runSelfTransferMatching(userId: string): Promise<number> {
  const [accounts, txns] = await Promise.all([loadAccounts(userId), loadTxns(userId, { account: { type: "BANK" } })]);
  const { pairs } = matchSelfTransfers(txns as MatchTxn[], accounts);
  if (pairs.length === 0) return 0;
  await prisma.$transaction(
    pairs.flatMap(([debitId, creditId]) => [
      prisma.moneyTransaction.update({ where: { id: debitId }, data: { kind: "SELF_TRANSFER", linkedTxnId: creditId, categoryId: null } }),
      prisma.moneyTransaction.update({ where: { id: creditId }, data: { kind: "SELF_TRANSFER", linkedTxnId: debitId, categoryId: null } }),
    ]),
  );
  return pairs.length;
}

/** Undoes a pair (self transfer or pass-through): both sides go back to plain spending / income. */
export async function unlinkPair(userId: string, txnId: string): Promise<void> {
  const txn = await prisma.moneyTransaction.findFirst({ where: { id: txnId, userId }, select: { id: true, linkedTxnId: true } });
  if (!txn) return;
  const other = txn.linkedTxnId
    ? await prisma.moneyTransaction.findFirst({ where: { id: txn.linkedTxnId, userId }, select: { id: true, direction: true } })
    : await prisma.moneyTransaction.findFirst({ where: { linkedTxnId: txn.id, userId }, select: { id: true, direction: true } });
  await prisma.$transaction([
    prisma.moneyTransaction.update({ where: { id: txn.id }, data: { linkedTxnId: null } }),
    ...(other
      ? [prisma.moneyTransaction.update({ where: { id: other.id }, data: { linkedTxnId: null, kind: defaultKind(other.direction) } })]
      : []),
  ]);
}
