import prisma from "@/lib/prisma";
import { matchSelfTransfers, passThroughSuggestions, scheduleSuggestions, type MatchTxn } from "@/lib/money/matching";
import { json, moneyRoute, notFound } from "@/lib/money/server/route";
import { addDismissed, getPreferences } from "@/lib/money/server/prefs";
import { loadAccounts, loadCommitments, loadTxns } from "@/lib/money/server/rows";
import { slimTxn } from "@/lib/money/server/overview";
import { payOut } from "@/lib/money/server/commitmentsWrite";
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

  // Savings goals paying out: a debit about the goal's size near its pay-out date (LIC premium)
  const payout = commitments
    .filter((c) => c.type === "SAVINGS_GOAL" && c.status !== "COMPLETED" && c.payoutDate)
    .flatMap((c) => {
      const target = Number(c.totalAmount);
      const hit = txns
        .filter((t) => t.direction === "DEBIT" && t.kind !== "SELF_TRANSFER" && !t.commitmentId)
        .filter((t) => Math.abs(Number(t.amount) - target) <= Math.max(1, target * 0.02))
        .filter((t) => Math.abs(Date.parse(t.txnDate) - Date.parse(c.payoutDate as string)) <= 15 * 86_400_000)
        .filter((t) => !c.matchPattern || t.narration.toUpperCase().replace(/\s+/g, "").includes(c.matchPattern.toUpperCase().replace(/\s+/g, "")))
        .find((t) => !dismissed.has(`payout:${c.id}:${t.id}`));
      return hit ? [{ commitmentId: c.id, commitmentName: c.name, payoutDate: c.payoutDate as string, amount: c.totalAmount, repeats: !!c.repeatMonths, txn: slimTxn(hit) }] : [];
    });

  return json({ passThrough: pass, schedule, unmatched, payout });
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

  if (s.type === "payout") {
    if (s.action === "dismiss") {
      await addDismissed(user.id, `payout:${s.commitmentId}:${s.txnId}`);
      return json({ ok: true });
    }
    const txn = await prisma.moneyTransaction.findFirst({ where: { id: s.txnId, userId: user.id }, select: { txnDate: true } });
    if (!txn) return notFound("Transaction not found");
    const result = await payOut(user.id, s.commitmentId, { paidOn: txn.txnDate.toISOString().slice(0, 10), transactionId: s.txnId });
    return result ? json({ ok: true, ...result }) : notFound("Savings goal not found");
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
