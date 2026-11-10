import prisma from "@/lib/prisma";
import { encryptOptional, encryptText } from "../crypto";
import { parseCommitmentSheet, planFromSheet, type SheetPlan } from "../sheet";
import { dateFromIso } from "../text";
import { todayInIndia } from "../accounts";
import { loadAccounts } from "./rows";

interface SheetOptions {
  firstYear: number;
  skip: string[];
  accounts: { emi?: string | null; bill?: string | null; pool?: string | null };
  setPoolBalance: boolean;
}

async function plan(userId: string, bytes: Uint8Array, options: SheetOptions): Promise<SheetPlan & { months: string[] }> {
  const sheet = await parseCommitmentSheet(bytes, options.firstYear);
  const accounts = await loadAccounts(userId);
  const today = todayInIndia().toISOString().slice(0, 10);
  const base = planFromSheet(sheet, accounts, today);
  // Your account choices override the guesses
  const pick = (id: string | null | undefined) => (id && accounts.some((a) => a.id === id) ? id : undefined);
  const commitments = base.commitments.map((c) => {
    if (c.type === "CARD_EMI" && pick(options.accounts.emi)) return { ...c, accountId: pick(options.accounts.emi) as string };
    if (c.type === "CARD_BILL" && pick(options.accounts.bill)) return { ...c, accountId: pick(options.accounts.bill) as string };
    if ((c.type === "SAVINGS_GOAL" || c.type === "RECEIVABLE") && pick(options.accounts.pool)) return { ...c, accountId: pick(options.accounts.pool) as string };
    return c;
  });
  const poolId = pick(options.accounts.pool) ?? base.poolBalance?.accountId;
  const pool = poolId ? accounts.find((a) => a.id === poolId) : undefined;
  return {
    months: sheet.months,
    commitments,
    poolBalance: sheet.pool && pool ? { accountId: pool.id, amount: sheet.pool.amount, label: pool.name } : base.poolBalance,
  };
}

export async function previewSheet(userId: string, bytes: Uint8Array, options: SheetOptions) {
  return { type: "sheet" as const, ...(await plan(userId, bytes, options)) };
}

/** Creates the planned commitments (skipping the ones you unticked) and, if asked, the pool balance. */
export async function commitSheet(userId: string, bytes: Uint8Array, options: SheetOptions) {
  const p = await plan(userId, bytes, options);
  const chosen = p.commitments.filter((c) => !options.skip.includes(c.key));
  const last = await prisma.moneyCommitment.findFirst({ where: { userId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const today = todayInIndia();

  const created = await prisma.$transaction(async (tx) => {
    const ids = new Map<string, string>();
    let order = (last?.sortOrder ?? -1) + 1;
    // Card EMIs first, so receivables can link to them
    for (const c of [...chosen].sort((a, b) => (a.linkKey ? 1 : 0) - (b.linkKey ? 1 : 0))) {
      const row = await tx.moneyCommitment.create({
        data: {
          userId,
          name: encryptText(c.name),
          type: c.type,
          accountId: c.accountId,
          totalAmount: c.totalAmount,
          notes: encryptOptional(c.note),
          matchPattern: encryptOptional(c.matchPattern),
          linkedCommitmentId: c.linkKey ? ids.get(c.linkKey) ?? null : null,
          sortOrder: order++,
          schedule: {
            create: c.schedule.map((s) => ({
              dueDate: dateFromIso(s.dueDate),
              amount: s.amount,
              paidAmount: s.paidAmount,
              paidOn: Number(s.paidAmount) > 0 ? dateFromIso(s.dueDate) : null,
            })),
          },
        },
      });
      ids.set(c.key, row.id);
    }
    if (options.setPoolBalance && p.poolBalance) {
      await tx.moneyAccount.updateMany({
        where: { id: p.poolBalance.accountId, userId },
        data: { manualBalance: p.poolBalance.amount, manualBalanceAsOf: today },
      });
    }
    return ids.size;
  });
  return { created, poolBalanceSet: !!(options.setPoolBalance && p.poolBalance) };
}
