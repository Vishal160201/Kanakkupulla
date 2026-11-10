import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { encryptOptional, encryptText } from "@/lib/money/crypto";
import { dec, money } from "@/lib/money/decimal";
import { matchSelfTransfers, type MatchTxn } from "@/lib/money/matching";
import { applyRules } from "@/lib/money/rules";
import { dateFromIso, extractCounterparty } from "@/lib/money/text";
import { json, moneyRoute } from "@/lib/money/server/route";
import { manualDedupeKey } from "@/lib/money/server/importer";
import { loadAccounts, loadRules, loadTxns, toTxnDTO } from "@/lib/money/server/rows";
import { parseJsonBody, parseSearchParams } from "@/lib/validations/http";
import { moneyManualTxnSchema, moneyTxnQuerySchema } from "@/lib/validations/money";

export const dynamic = "force-dynamic";

/**
 * GET /api/money/transactions — every account in one timeline, newest first.
 * Filters: from, to, accountId, categoryId ("none" = uncategorised), kind, q (text), hideSelf=1,
 * view=unmatched (transfers with no other side yet). Text search runs after decryption.
 */
export const GET = moneyRoute("GET /api/money/transactions", async ({ user, request }) => {
  const parsed = parseSearchParams(request, moneyTxnQuerySchema);
  if (parsed.error) return parsed.error;
  const f = parsed.data;
  const where: Prisma.MoneyTransactionWhereInput = {
    ...(f.from || f.to ? { txnDate: { ...(f.from ? { gte: dateFromIso(f.from) } : {}), ...(f.to ? { lte: dateFromIso(f.to) } : {}) } } : {}),
    ...(f.accountId ? { accountId: f.accountId } : {}),
    ...(f.categoryId ? { categoryId: f.categoryId === "none" ? null : f.categoryId } : {}),
    ...(f.kind ? { kind: f.kind } : f.hideSelf === "1" ? { kind: { not: "SELF_TRANSFER" } } : {}),
  };

  let rows = await loadTxns(user.id, where);
  if (f.view === "unmatched") {
    const accounts = await loadAccounts(user.id);
    const all = f.from || f.to || f.accountId ? await loadTxns(user.id, { account: { type: "BANK" } }) : rows;
    const unmatched = new Set(matchSelfTransfers(all as MatchTxn[], accounts).unmatched);
    rows = rows.filter((r) => unmatched.has(r.id));
  }
  if (f.q) {
    const q = f.q.toUpperCase();
    const amountQ = q.replace(/[₹,\s]/g, "");
    rows = rows.filter(
      (r) =>
        r.narration.toUpperCase().includes(q) ||
        (r.counterparty ?? "").toUpperCase().includes(q) ||
        (r.upiId ?? "").toUpperCase().includes(q) ||
        (r.note ?? "").toUpperCase().includes(q) ||
        r.refNo.includes(amountQ) ||
        (/^\d+(\.\d+)?$/.test(amountQ) && r.amount.startsWith(amountQ)),
    );
  }

  rows.reverse();
  const totalIn = rows.filter((r) => r.direction === "CREDIT" && r.kind !== "SELF_TRANSFER").reduce((s, r) => s.plus(r.amount), dec(0));
  const totalOut = rows.filter((r) => r.direction === "DEBIT" && r.kind !== "SELF_TRANSFER").reduce((s, r) => s.plus(r.amount), dec(0));
  const page = rows.slice((f.page - 1) * f.pageSize, f.page * f.pageSize);

  // The other side of each self transfer / pass-through on this page
  const linkIds = page.map((r) => r.linkedTxnId).filter(Boolean) as string[];
  const linked = linkIds.length
    ? (await prisma.moneyTransaction.findMany({ where: { userId: user.id, id: { in: linkIds } } })).map(toTxnDTO)
    : [];

  return json({
    rows: page,
    total: rows.length,
    page: f.page,
    pageSize: f.pageSize,
    totals: { in: money(totalIn), out: money(totalOut) },
    linked: Object.fromEntries(linked.map((l) => [l.id, { id: l.id, accountId: l.accountId, txnDate: l.txnDate, narration: l.narration }])),
  });
});

// POST /api/money/transactions — a spend (or refund) typed in by hand, mostly for cards.
export const POST = moneyRoute("POST /api/money/transactions", async ({ user, request }) => {
  const parsed = await parseJsonBody(request, moneyManualTxnSchema);
  if (parsed.error) return parsed.error;
  const d = parsed.data;
  const account = await prisma.moneyAccount.findFirst({ where: { id: d.accountId, userId: user.id } });
  if (!account) return json({ error: "Account not found", errors: { accountId: "Choose an account." } }, { status: 422 });
  if (d.categoryId && !(await prisma.moneyCategory.findFirst({ where: { id: d.categoryId, userId: user.id }, select: { id: true } }))) {
    return json({ error: "Category not found", errors: { categoryId: "Choose a category." } }, { status: 422 });
  }
  const isCard = account.type === "CREDIT_CARD";
  const parties = isCard ? { counterparty: d.narration.toUpperCase(), upiId: null } : extractCounterparty(d.narration);
  const ruled = applyRules({ narration: d.narration, counterparty: parties.counterparty, upiId: parties.upiId, direction: d.direction }, await loadRules(user.id));
  const row = await prisma.moneyTransaction.create({
    data: {
      userId: user.id,
      accountId: account.id,
      txnDate: dateFromIso(d.txnDate),
      txnTime: d.txnTime,
      seq: 0,
      narration: encryptText(d.narration),
      amount: d.amount,
      direction: d.direction,
      counterparty: encryptOptional(parties.counterparty),
      upiId: encryptOptional(parties.upiId),
      categoryId: d.categoryId ?? ruled.categoryId,
      kind: isCard ? (d.direction === "DEBIT" ? "EXPENSE" : "INCOME") : ruled.kind,
      counterAccountId: isCard ? null : ruled.counterAccountId,
      note: encryptOptional(d.note),
      dedupeKey: manualDedupeKey(),
    },
  });
  return json(toTxnDTO(row), { status: 201 });
});
