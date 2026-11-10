import prisma from "@/lib/prisma";
import { matchSelfTransfers, passThroughSuggestions, scheduleSuggestions, type MatchTxn } from "@/lib/money/matching";
import { json, moneyRoute, notFound } from "@/lib/money/server/route";
import { addDismissed, getPreferences } from "@/lib/money/server/prefs";
import { loadAccounts, loadCommitments, loadTxns } from "@/lib/money/server/rows";
import { slimTxn } from "@/lib/money/server/overview";
import { dec } from "@/lib/money/decimal";
import { parseJsonBody } from "@/lib/validations/http";
import { moneySuggestionActionSchema } from "@/lib/validations/money";

export const dynamic = "force-dynamic";

const IN_TYPES = new Set(["RECEIVABLE", "EXPECTED_INCOME"]);

/** GET /api/money/suggestions — pass-throughs to confirm, payments that match a commitment, transfers with no other side. */
export const GET = moneyRoute("GET /api/money/suggestions", async ({ user }) => {
  const [txns, commitments, accounts, prefs] = await Promise.all([loadTxns(user.id), loadCommitments(user.id), loadAccounts(user.id), getPreferences(user.id)]);
  const dismissed = new Set(prefs.dismissed);
  const byId = new Map(txns.map((t) => [t.id, t]));

  const pass = passThroughSuggestions(txns as MatchTxn[], dismissed).map((s) => ({ ...s, credit: slimTxn(byId.get(s.creditId)!), debit: slimTxn(byId.get(s.debitId)!) }));

  const linked = new Set(commitments.flatMap((c) => c.schedule.map((s) => s.transactionId).filter(Boolean)) as string[]);
  const entries = commitments
    .filter((c) => c.status !== "COMPLETED" && c.type !== "SAVINGS_GOAL")
    .flatMap((c) =>
      c.schedule
        .filter((s) => dec(s.paidAmount).lessThan(s.amount) && !s.transactionId)
        .map((s) => ({ scheduleId: s.id, commitmentId: c.id, dueDate: s.dueDate, amount: dec(s.amount).minus(s.paidAmount).toFixed(2), direction: (IN_TYPES.has(c.type) ? "CREDIT" : "DEBIT") as "CREDIT" | "DEBIT", matchPattern: c.matchPattern, name: c.name })),
    );
  const schedule = scheduleSuggestions(txns as MatchTxn[], entries, linked)
    .filter((s) => !dismissed.has(`${s.scheduleId}:${s.txnId}`))
    .map((s) => {
      const e = entries.find((x) => x.scheduleId === s.scheduleId)!;
      return { ...s, commitmentName: e.name, dueDate: e.dueDate, amount: e.amount, txn: slimTxn(byId.get(s.txnId)!) };
    });

  const unmatched = matchSelfTransfers(txns as MatchTxn[], accounts).unmatched
    .filter((id) => !dismissed.has(`unmatched:${id}`))
    .map((id) => slimTxn(byId.get(id)!));

  return json({ passThrough: pass, schedule, unmatched });
});

// POST /api/money/suggestions — accept or dismiss one suggestion.
export const POST = moneyRoute("POST /api/money/suggestions", async ({ user, request }) => {
  const parsed = await parseJsonBody(request, moneySuggestionActionSchema);
  if (parsed.error) return parsed.error;
  const s = parsed.data;

  if (s.type === "passThrough") {
    if (s.action === "dismiss") {
      await addDismissed(user.id, `${s.creditId}:${s.debitId}`);
      return json({ ok: true });
    }
    const pair = await prisma.moneyTransaction.findMany({ where: { userId: user.id, id: { in: [s.creditId, s.debitId] }, linkedTxnId: null } });
    if (pair.length !== 2) return notFound("Those transactions changed. Refresh and try again.");
    await prisma.$transaction([
      prisma.moneyTransaction.update({ where: { id: s.creditId }, data: { kind: "PASS_THROUGH", linkedTxnId: s.debitId } }),
      prisma.moneyTransaction.update({ where: { id: s.debitId }, data: { kind: "PASS_THROUGH", linkedTxnId: s.creditId } }),
    ]);
    return json({ ok: true });
  }

  if (s.type === "schedule") {
    if (s.action === "dismiss") {
      await addDismissed(user.id, `${s.scheduleId}:${s.txnId}`);
      return json({ ok: true });
    }
    const [entry, txn] = await Promise.all([
      prisma.moneyCommitmentSchedule.findFirst({ where: { id: s.scheduleId, commitment: { userId: user.id } } }),
      prisma.moneyTransaction.findFirst({ where: { id: s.txnId, userId: user.id } }),
    ]);
    if (!entry || !txn) return notFound("That entry or transaction wasn't found.");
    await prisma.$transaction([
      prisma.moneyCommitmentSchedule.update({ where: { id: entry.id }, data: { paidAmount: entry.paidAmount.plus(txn.amount).greaterThan(entry.amount) ? entry.amount : entry.paidAmount.plus(txn.amount), paidOn: txn.txnDate, transactionId: txn.id } }),
      prisma.moneyTransaction.update({ where: { id: txn.id }, data: { commitmentId: entry.commitmentId } }),
    ]);
    return json({ ok: true });
  }

  // Unmatched transfer: mark it as a transfer (left out of income and spending), or keep it as is
  if (s.action === "dismiss") {
    await addDismissed(user.id, `unmatched:${s.txnId}`);
    return json({ ok: true });
  }
  const txn = await prisma.moneyTransaction.findFirst({ where: { id: s.txnId, userId: user.id } });
  if (!txn) return notFound("Transaction not found");
  await prisma.moneyTransaction.update({ where: { id: txn.id }, data: { kind: "SELF_TRANSFER", categoryId: null } });
  await addDismissed(user.id, `unmatched:${s.txnId}`);
  return json({ ok: true });
});
