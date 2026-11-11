import type { MoneyAccount, MoneyTransaction, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { decryptOptional, decryptText } from "../crypto";
import type { AAccount, ATxn } from "../analytics";
import type { CommitmentInput } from "../commitments";
import type { RuleInput } from "../rules";
import { isoDate } from "../text";

/** Loading and decrypting tracker rows. Every query is scoped by userId. */

const d2 = (v: Prisma.Decimal | null | undefined) => (v == null ? null : v.toFixed(2));
const day = (v: Date | null | undefined) => (v ? isoDate(v) : null);

export function toAAccount(a: MoneyAccount): AAccount {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    isPool: a.isPool,
    lowBalanceAlert: a.lowBalanceAlert.toFixed(2),
    manualBalance: d2(a.manualBalance),
    manualBalanceAsOf: day(a.manualBalanceAsOf),
    outstanding: d2(a.outstanding),
    outstandingAsOf: day(a.outstandingAsOf),
    cycleStartDay: a.cycleStartDay,
    dueDay: a.dueDay,
    creditLimit: d2(a.creditLimit),
  };
}

export interface TxnDTO extends ATxn {
  refNo: string;
  valueDate: string | null;
  upiId: string | null;
  note: string | null;
  linkedTxnId: string | null;
  commitmentId: string | null;
  importId: string | null;
}

export function toTxnDTO(t: MoneyTransaction): TxnDTO {
  return {
    id: t.id,
    accountId: t.accountId,
    txnDate: isoDate(t.txnDate),
    txnTime: t.txnTime,
    seq: t.seq,
    valueDate: day(t.valueDate),
    narration: decryptText(t.narration),
    refNo: t.refNo,
    amount: t.amount.toFixed(2),
    direction: t.direction,
    balanceAfter: d2(t.balanceAfter),
    counterparty: decryptOptional(t.counterparty),
    upiId: decryptOptional(t.upiId),
    categoryId: t.categoryId,
    kind: t.kind,
    linkedTxnId: t.linkedTxnId,
    counterAccountId: t.counterAccountId,
    commitmentId: t.commitmentId,
    note: decryptOptional(t.note),
    importId: t.importId,
  };
}

export async function loadAccounts(userId: string) {
  return prisma.moneyAccount.findMany({ where: { userId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
}

export async function loadTxns(userId: string, where: Prisma.MoneyTransactionWhereInput = {}): Promise<TxnDTO[]> {
  const rows = await prisma.moneyTransaction.findMany({
    where: { userId, ...where },
    orderBy: [{ txnDate: "asc" }, { seq: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toTxnDTO);
}

export async function loadRules(userId: string): Promise<(RuleInput & { createdAt: string })[]> {
  const rules = await prisma.moneyRule.findMany({ where: { userId }, orderBy: [{ priority: "asc" }, { createdAt: "asc" }] });
  return rules.map((r) => ({
    id: r.id,
    priority: r.priority,
    field: r.field,
    pattern: decryptText(r.pattern),
    isRegex: r.isRegex,
    direction: r.direction,
    categoryId: r.categoryId,
    kind: r.kind,
    targetAccountId: r.targetAccountId,
    createdAt: r.createdAt.toISOString(),
  }));
}

export interface CommitmentDTO extends CommitmentInput {
  accountId: string | null;
  notes: string | null;
  matchPattern: string | null;
  sortOrder: number;
  payoutDate: string | null;
  repeatMonths: number | null;
  paidOutOn: string | null;
  payoutTxnId: string | null;
}

export async function loadCommitments(userId: string): Promise<CommitmentDTO[]> {
  const rows = await prisma.moneyCommitment.findMany({
    where: { userId },
    include: { schedule: { orderBy: { dueDate: "asc" } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((c) => ({
    id: c.id,
    name: decryptText(c.name),
    type: c.type,
    status: c.status,
    totalAmount: c.totalAmount.toFixed(2),
    linkedCommitmentId: c.linkedCommitmentId,
    accountId: c.accountId,
    notes: decryptOptional(c.notes),
    matchPattern: decryptOptional(c.matchPattern),
    sortOrder: c.sortOrder,
    payoutDate: day(c.payoutDate),
    repeatMonths: c.repeatMonths,
    paidOutOn: day(c.paidOutOn),
    payoutTxnId: c.payoutTxnId,
    schedule: c.schedule.map((s) => ({
      id: s.id,
      dueDate: isoDate(s.dueDate),
      amount: s.amount.toFixed(2),
      paidAmount: s.paidAmount.toFixed(2),
      paidOn: day(s.paidOn),
      transactionId: s.transactionId,
    })),
  }));
}

export async function loadCategories(userId: string) {
  return prisma.moneyCategory.findMany({ where: { userId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}
