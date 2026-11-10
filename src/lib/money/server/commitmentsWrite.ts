import prisma, { type AppPrismaClient } from "@/lib/prisma";
import { encryptOptional, encryptText } from "../crypto";
import { dateFromIso } from "../text";
import { ImportError } from "./importer";

type Tx = Omit<AppPrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;

export interface CommitmentWrite {
  name: string;
  type: "SAVINGS_GOAL" | "CARD_BILL" | "CARD_EMI" | "RECEIVABLE" | "PAYABLE" | "EXPECTED_INCOME";
  status: "ACTIVE" | "COMPLETED" | "PAUSED";
  accountId: string | null;
  totalAmount: string;
  notes: string | null;
  matchPattern: string | null;
  linkedCommitmentId: string | null;
}

/**
 * A card EMI and the receivable that pays it are linked by one pointer, kept on the
 * receivable (receivable.linkedCommitmentId = EMI). Either form can set it.
 */
async function setLink(tx: Tx, userId: string, id: string, type: CommitmentWrite["type"], otherId: string | null) {
  // Drop old links touching this commitment
  await tx.moneyCommitment.updateMany({ where: { userId, linkedCommitmentId: id }, data: { linkedCommitmentId: null } });
  await tx.moneyCommitment.update({ where: { id }, data: { linkedCommitmentId: null } });
  if (!otherId) return;
  const other = await tx.moneyCommitment.findFirst({ where: { id: otherId, userId }, select: { id: true, type: true } });
  const ok = other && ((type === "RECEIVABLE" && other.type === "CARD_EMI") || (type === "CARD_EMI" && other.type === "RECEIVABLE"));
  if (!ok) throw new ImportError("A card EMI can only be linked to money someone owes you, and the other way round.");
  const [receivableId, emiId] = type === "RECEIVABLE" ? [id, other.id] : [other.id, id];
  await tx.moneyCommitment.updateMany({ where: { userId, linkedCommitmentId: emiId }, data: { linkedCommitmentId: null } });
  await tx.moneyCommitment.update({ where: { id: receivableId }, data: { linkedCommitmentId: emiId } });
}

async function checkAccount(userId: string, accountId: string | null) {
  if (accountId && !(await prisma.moneyAccount.findFirst({ where: { id: accountId, userId }, select: { id: true } }))) {
    throw new ImportError("That account wasn't found.");
  }
}

export async function createCommitment(userId: string, d: CommitmentWrite & { schedule?: { dueDate: string; amount: string; paidAmount: string; paidOn: string | null }[] }) {
  await checkAccount(userId, d.accountId);
  const last = await prisma.moneyCommitment.findFirst({ where: { userId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  return prisma.$transaction(async (tx) => {
    const row = await tx.moneyCommitment.create({
      data: {
        userId,
        name: encryptText(d.name),
        type: d.type,
        status: d.status,
        accountId: d.accountId,
        totalAmount: d.totalAmount,
        notes: encryptOptional(d.notes),
        matchPattern: encryptOptional(d.matchPattern),
        sortOrder: (last?.sortOrder ?? -1) + 1,
        schedule: d.schedule?.length
          ? { create: d.schedule.map((s) => ({ dueDate: dateFromIso(s.dueDate), amount: s.amount, paidAmount: s.paidAmount, paidOn: s.paidOn ? dateFromIso(s.paidOn) : null })) }
          : undefined,
      },
    });
    if (d.linkedCommitmentId) await setLink(tx, userId, row.id, d.type, d.linkedCommitmentId);
    return row.id;
  });
}

export async function updateCommitment(userId: string, id: string, d: CommitmentWrite) {
  const existing = await prisma.moneyCommitment.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) return false;
  await checkAccount(userId, d.accountId);
  await prisma.$transaction(async (tx) => {
    await tx.moneyCommitment.update({
      where: { id },
      data: {
        name: encryptText(d.name),
        type: d.type,
        status: d.status,
        accountId: d.accountId,
        totalAmount: d.totalAmount,
        notes: encryptOptional(d.notes),
        matchPattern: encryptOptional(d.matchPattern),
      },
    });
    await setLink(tx, userId, id, d.type, d.type === "CARD_EMI" || d.type === "RECEIVABLE" ? d.linkedCommitmentId : null);
  });
  return true;
}
