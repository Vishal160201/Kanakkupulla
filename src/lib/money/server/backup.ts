import { z } from "zod";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { decryptOptional, decryptText, encryptOptional, encryptText } from "../crypto";
import { dateFromIso, isoDate } from "../text";
import { dedupeKeyFor, manualDedupeKey } from "./importer";
import { getPreferences, savePreferences } from "./prefs";
import { readPreferences } from "../preferences";

/**
 * Backup = every tracker row as readable JSON (text decrypted), so it survives a change of
 * encryption key. Restore replaces all of your tracker data with the file's contents.
 */

const d2 = (v: Prisma.Decimal | null) => (v == null ? null : v.toFixed(2));
const day = (v: Date | null) => (v ? isoDate(v) : null);

export async function buildBackup(userId: string) {
  const [accounts, categories, rules, imports, txns, commitments, prefs] = await Promise.all([
    prisma.moneyAccount.findMany({ where: { userId } }),
    prisma.moneyCategory.findMany({ where: { userId } }),
    prisma.moneyRule.findMany({ where: { userId } }),
    prisma.moneyImport.findMany({ where: { userId } }),
    prisma.moneyTransaction.findMany({ where: { userId }, orderBy: [{ txnDate: "asc" }, { seq: "asc" }] }),
    prisma.moneyCommitment.findMany({ where: { userId }, include: { schedule: true } }),
    getPreferences(userId),
  ]);
  return {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    accounts: accounts.map((a) => ({
      id: a.id, name: a.name, institution: a.institution, type: a.type, last4: a.last4, ownIdentifiers: a.ownIdentifiers, isPool: a.isPool,
      lowBalanceAlert: a.lowBalanceAlert.toFixed(2), cycleStartDay: a.cycleStartDay, dueDay: a.dueDay, creditLimit: d2(a.creditLimit),
      manualBalance: d2(a.manualBalance), manualBalanceAsOf: day(a.manualBalanceAsOf), outstanding: d2(a.outstanding), outstandingAsOf: day(a.outstandingAsOf),
      color: a.color, sortOrder: a.sortOrder,
    })),
    categories: categories.map((c) => ({ id: c.id, name: c.name, color: c.color, icon: c.icon, parentId: c.parentId, sortOrder: c.sortOrder })),
    rules: rules.map((r) => ({ id: r.id, priority: r.priority, field: r.field, pattern: decryptText(r.pattern), isRegex: r.isRegex, direction: r.direction, categoryId: r.categoryId, kind: r.kind, targetAccountId: r.targetAccountId })),
    imports: imports.map((i) => ({
      id: i.id, accountId: i.accountId, sourceType: i.sourceType, filename: decryptOptional(i.filename), periodFrom: day(i.periodFrom), periodTo: day(i.periodTo),
      openingBalance: d2(i.openingBalance), closingBalance: d2(i.closingBalance), status: i.status, warnings: i.warnings, importedAt: i.importedAt.toISOString(),
    })),
    transactions: txns.map((t) => ({
      id: t.id, accountId: t.accountId, importId: t.importId, txnDate: isoDate(t.txnDate), txnTime: t.txnTime, seq: t.seq, valueDate: day(t.valueDate),
      narration: decryptText(t.narration), refNo: t.refNo, amount: t.amount.toFixed(2), direction: t.direction, balanceAfter: d2(t.balanceAfter),
      counterparty: decryptOptional(t.counterparty), upiId: decryptOptional(t.upiId), categoryId: t.categoryId, kind: t.kind, linkedTxnId: t.linkedTxnId,
      commitmentId: t.commitmentId, counterAccountId: t.counterAccountId, note: decryptOptional(t.note),
    })),
    commitments: commitments.map((c) => ({
      id: c.id, name: decryptText(c.name), type: c.type, status: c.status, accountId: c.accountId, totalAmount: c.totalAmount.toFixed(2),
      notes: decryptOptional(c.notes), matchPattern: decryptOptional(c.matchPattern), linkedCommitmentId: c.linkedCommitmentId, sortOrder: c.sortOrder,
      payoutDate: day(c.payoutDate), repeatMonths: c.repeatMonths, paidOutOn: day(c.paidOutOn), payoutTxnId: c.payoutTxnId,
      schedule: c.schedule.map((s) => ({ id: s.id, dueDate: isoDate(s.dueDate), amount: s.amount.toFixed(2), paidAmount: s.paidAmount.toFixed(2), paidOn: day(s.paidOn), transactionId: s.transactionId })),
    })),
    preferences: prefs,
  };
}

// ---------------------------------------------------------------------------

const id = z.string().min(1).max(64);
const amt = z.string().regex(/^-?\d{1,12}(\.\d{1,2})?$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const KINDS = ["EXPENSE", "INCOME", "SALARY", "INTEREST", "SELF_TRANSFER", "CARD_PAYMENT", "CARD_REFUND", "PASS_THROUGH", "REIMBURSEMENT"] as const;

const backupSchema = z.object({
  version: z.literal(1),
  accounts: z.array(z.object({
    id, name: z.string().min(1).max(60), institution: z.string().min(1).max(60), type: z.enum(["BANK", "CREDIT_CARD"]), last4: z.string().regex(/^\d{4}$/).nullable(),
    ownIdentifiers: z.array(z.string().max(60)).max(20), isPool: z.boolean(), lowBalanceAlert: amt, cycleStartDay: z.number().int().min(1).max(31).nullable(),
    dueDay: z.number().int().min(1).max(31).nullable(), creditLimit: amt.nullable(), manualBalance: amt.nullable(), manualBalanceAsOf: date.nullable(),
    outstanding: amt.nullable(), outstandingAsOf: date.nullable(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/), sortOrder: z.number().int(),
  })).max(100),
  categories: z.array(z.object({ id, name: z.string().min(1).max(40), color: z.string().regex(/^#[0-9a-fA-F]{6}$/), icon: z.string().max(50), parentId: id.nullable(), sortOrder: z.number().int() })).max(500),
  rules: z.array(z.object({
    id, priority: z.number().int(), field: z.enum(["NARRATION", "COUNTERPARTY", "UPI_ID", "MERCHANT"]), pattern: z.string().min(1).max(200), isRegex: z.boolean(),
    direction: z.enum(["DEBIT", "CREDIT"]).nullable(), categoryId: id.nullable(), kind: z.enum(KINDS).nullable(), targetAccountId: id.nullable(),
  })).max(2000),
  imports: z.array(z.object({
    id, accountId: id, sourceType: z.enum(["PDF", "CSV", "MANUAL", "XLSX", "AA_JSON", "OCR"]), filename: z.string().max(200).nullable(), periodFrom: date.nullable(), periodTo: date.nullable(),
    openingBalance: amt.nullable(), closingBalance: amt.nullable(), status: z.enum(["OK", "NEEDS_REVIEW"]), warnings: z.unknown(), importedAt: z.string(),
  })).max(5000),
  transactions: z.array(z.object({
    id, accountId: id, importId: id.nullable(), txnDate: date, txnTime: z.string().max(8).nullable(), seq: z.number().int(), valueDate: date.nullable(), narration: z.string().max(1000),
    refNo: z.string().max(64), amount: amt, direction: z.enum(["DEBIT", "CREDIT"]), balanceAfter: amt.nullable(), counterparty: z.string().max(200).nullable(), upiId: z.string().max(120).nullable(),
    categoryId: id.nullable(), kind: z.enum(KINDS), linkedTxnId: id.nullable(), commitmentId: id.nullable(), counterAccountId: id.nullable(), note: z.string().max(500).nullable(),
  })).max(200000),
  commitments: z.array(z.object({
    id, name: z.string().min(1).max(60), type: z.enum(["SAVINGS_GOAL", "CARD_BILL", "CARD_EMI", "RECEIVABLE", "PAYABLE", "EXPECTED_INCOME"]), status: z.enum(["ACTIVE", "COMPLETED", "PAUSED"]),
    accountId: id.nullable(), totalAmount: amt, notes: z.string().max(500).nullable(), matchPattern: z.string().max(80).nullable(), linkedCommitmentId: id.nullable(), sortOrder: z.number().int(),
    payoutDate: date.nullable().optional(), repeatMonths: z.number().int().min(1).max(24).nullable().optional(), paidOutOn: date.nullable().optional(), payoutTxnId: id.nullable().optional(),
    schedule: z.array(z.object({ id, dueDate: date, amount: amt, paidAmount: amt, paidOn: date.nullable(), transactionId: id.nullable() })).max(120),
  })).max(1000),
  preferences: z.unknown().optional(),
});

export type MoneyBackup = z.infer<typeof backupSchema>;

export function parseBackup(raw: unknown) {
  return backupSchema.safeParse(raw);
}

/** Replaces all of this user's tracker data with the backup. Ids are kept so every link survives. */
export async function restoreBackup(userId: string, b: MoneyBackup): Promise<{ accounts: number; transactions: number; commitments: number }> {
  const importSource = new Map(b.imports.map((i) => [i.id, i.sourceType]));
  const known = <T extends string | null>(ids: Set<string>, v: T) => (v && ids.has(v) ? v : null);
  const accountIds = new Set(b.accounts.map((a) => a.id));
  const categoryIds = new Set(b.categories.map((c) => c.id));
  const txnIds = new Set(b.transactions.map((t) => t.id));
  const commitmentIds = new Set(b.commitments.map((c) => c.id));
  const importIds = new Set(b.imports.filter((i) => accountIds.has(i.accountId)).map((i) => i.id));

  await prisma.$transaction(async (tx) => {
    await tx.moneyCommitmentSchedule.deleteMany({ where: { commitment: { userId } } });
    await tx.moneyCommitment.updateMany({ where: { userId }, data: { linkedCommitmentId: null } });
    await tx.moneyCommitment.deleteMany({ where: { userId } });
    await tx.moneyTransaction.updateMany({ where: { userId }, data: { linkedTxnId: null } });
    await tx.moneyTransaction.deleteMany({ where: { userId } });
    await tx.moneyImport.deleteMany({ where: { userId } });
    await tx.moneyRule.deleteMany({ where: { userId } });
    await tx.moneyCategory.deleteMany({ where: { userId } });
    await tx.moneyAccount.deleteMany({ where: { userId } });

    await tx.moneyAccount.createMany({
      data: b.accounts.map((a) => ({
        ...a, userId,
        manualBalanceAsOf: a.manualBalanceAsOf ? dateFromIso(a.manualBalanceAsOf) : null,
        outstandingAsOf: a.outstandingAsOf ? dateFromIso(a.outstandingAsOf) : null,
      })),
    });
    await tx.moneyCategory.createMany({ data: b.categories.map((c) => ({ ...c, parentId: null, userId })) });
    for (const c of b.categories.filter((c) => c.parentId && categoryIds.has(c.parentId))) {
      await tx.moneyCategory.update({ where: { id: c.id }, data: { parentId: c.parentId } });
    }
    await tx.moneyRule.createMany({
      data: b.rules.map((r) => ({ ...r, userId, pattern: encryptText(r.pattern), categoryId: known(categoryIds, r.categoryId), targetAccountId: known(accountIds, r.targetAccountId) })),
    });
    await tx.moneyImport.createMany({
      data: b.imports.filter((i) => importIds.has(i.id)).map((i) => ({
        id: i.id, userId, accountId: i.accountId, sourceType: i.sourceType, filename: encryptOptional(i.filename), fileHash: null,
        periodFrom: i.periodFrom ? dateFromIso(i.periodFrom) : null, periodTo: i.periodTo ? dateFromIso(i.periodTo) : null,
        openingBalance: i.openingBalance, closingBalance: i.closingBalance, status: i.status,
        warnings: (Array.isArray(i.warnings) ? i.warnings : []) as Prisma.InputJsonValue, importedAt: new Date(i.importedAt),
      })),
    });
    const txns = b.transactions.filter((t) => accountIds.has(t.accountId));
    for (let i = 0; i < txns.length; i += 1000) {
      await tx.moneyTransaction.createMany({
        skipDuplicates: true,
        data: txns.slice(i, i + 1000).map((t) => {
          const source = t.importId ? importSource.get(t.importId) : undefined;
          const row = { txnDate: t.txnDate, txnTime: t.txnTime, narration: t.narration, refNo: t.refNo, amount: t.amount, direction: t.direction, balanceAfter: t.balanceAfter };
          return {
            id: t.id, userId, accountId: t.accountId, importId: known(importIds, t.importId), txnDate: dateFromIso(t.txnDate), txnTime: t.txnTime, seq: t.seq,
            valueDate: t.valueDate ? dateFromIso(t.valueDate) : null, narration: encryptText(t.narration), refNo: t.refNo, amount: t.amount, direction: t.direction,
            balanceAfter: t.balanceAfter, counterparty: encryptOptional(t.counterparty), upiId: encryptOptional(t.upiId), categoryId: known(categoryIds, t.categoryId),
            kind: t.kind, counterAccountId: known(accountIds, t.counterAccountId), note: encryptOptional(t.note),
            // Re-made with the current key, so future imports still spot duplicates
            dedupeKey: !source || source === "MANUAL" ? manualDedupeKey() : dedupeKeyFor(row, source === "CSV" ? "card" : "bank"),
          };
        }),
      });
    }
    for (const t of txns.filter((t) => t.linkedTxnId && txnIds.has(t.linkedTxnId))) {
      await tx.moneyTransaction.update({ where: { id: t.id }, data: { linkedTxnId: t.linkedTxnId } });
    }
    for (const c of b.commitments) {
      await tx.moneyCommitment.create({
        data: {
          id: c.id, userId, name: encryptText(c.name), type: c.type, status: c.status, accountId: known(accountIds, c.accountId), totalAmount: c.totalAmount,
          notes: encryptOptional(c.notes), matchPattern: encryptOptional(c.matchPattern), sortOrder: c.sortOrder,
          payoutDate: c.payoutDate ? dateFromIso(c.payoutDate) : null, repeatMonths: c.repeatMonths ?? null,
          paidOutOn: c.paidOutOn ? dateFromIso(c.paidOutOn) : null, payoutTxnId: known(txnIds, c.payoutTxnId ?? null),
          schedule: { create: c.schedule.map((s) => ({ id: s.id, dueDate: dateFromIso(s.dueDate), amount: s.amount, paidAmount: s.paidAmount, paidOn: s.paidOn ? dateFromIso(s.paidOn) : null, transactionId: known(txnIds, s.transactionId) })) },
        },
      });
    }
    for (const c of b.commitments.filter((c) => c.linkedCommitmentId && commitmentIds.has(c.linkedCommitmentId))) {
      await tx.moneyCommitment.update({ where: { id: c.id }, data: { linkedCommitmentId: c.linkedCommitmentId } });
    }
    for (const t of txns.filter((t) => t.commitmentId && commitmentIds.has(t.commitmentId))) {
      await tx.moneyTransaction.update({ where: { id: t.id }, data: { commitmentId: t.commitmentId } });
    }
  }, { timeout: 120_000, maxWait: 10_000 });

  if (b.preferences) await savePreferences(userId, readPreferences(b.preferences));
  return { accounts: b.accounts.length, transactions: b.transactions.length, commitments: b.commitments.length };
}
