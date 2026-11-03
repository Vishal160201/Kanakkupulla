import prisma, { toNumber } from "@/lib/prisma";
import type { SessionUser } from "@/lib/authz";
import { ShopError } from "@/lib/shops";
import { InventoryValidationError, postLedgerEntry, type Tx } from "@/lib/inventory";
import { getCableShop } from "@/lib/cableSync";
import { CABLE_LEDGER_CATEGORIES } from "@/lib/shopModules";

// Money side of a cable & internet shop: each renewal the sync detects is owed at the plan's price;
// payments collected against it post to Daily Kanakku in the same transaction.

const round2 = (n: number) => Math.round(n * 100) / 100;

/** What each subscriber owes: renewal amounts minus non-voided payments (negative = paid in advance). */
export async function subscriberDues(db: Tx, shopId: string, subscriberIds?: string[]) {
  const idFilter = subscriberIds ? { subscriberId: { in: subscriberIds } } : {};
  const [billed, paid] = await Promise.all([
    db.cableRenewal.groupBy({ by: ["subscriberId"], where: { subscriber: { shopId }, ...idFilter }, _sum: { amount: true } }),
    db.cablePayment.groupBy({ by: ["subscriberId"], where: { shopId, voidedAt: null, ...idFilter }, _sum: { amount: true } }),
  ]);
  const dues = new Map<string, number>();
  for (const r of billed) dues.set(r.subscriberId, toNumber(r._sum.amount));
  for (const p of paid) dues.set(p.subscriberId, (dues.get(p.subscriberId) ?? 0) - toNumber(p._sum.amount));
  for (const [id, v] of dues) dues.set(id, round2(v));
  return dues;
}

async function subscriberForWrite(user: SessionUser, subscriberId: string, db: Tx = prisma) {
  const subscriber = await db.cableSubscriber.findUnique({ where: { id: subscriberId } });
  if (!subscriber) throw new ShopError("Subscriber not found.", 404);
  await getCableShop(user, subscriber.shopId, "MANAGE");
  return subscriber;
}

export async function recordCablePayment(
  user: SessionUser,
  subscriberId: string,
  input: { amount: number; date: Date; paymentMode: string; notes?: string | null }
) {
  return prisma.$transaction(async (tx) => {
    const subscriber = await subscriberForWrite(user, subscriberId, tx);
    const amount = round2(input.amount);
    if (amount <= 0) throw new InventoryValidationError("Enter the amount received.", 422, { amount: "Enter the amount received." });
    const transactionId = await postLedgerEntry(tx, {
      shopId: subscriber.shopId,
      userId: user.id,
      type: "INCOME",
      category: CABLE_LEDGER_CATEGORIES.RENEWAL,
      amount,
      date: input.date,
      paymentMode: input.paymentMode,
      description: `Internet renewal - ${subscriber.name} (${subscriber.externalId})`,
    });
    return tx.cablePayment.create({
      data: {
        shopId: subscriber.shopId,
        subscriberId,
        amount,
        date: input.date,
        paymentMode: input.paymentMode,
        notes: input.notes?.trim() || null,
        transactionId,
        createdById: user.id,
      },
      select: { id: true },
    });
  });
}

export async function voidCablePayment(user: SessionUser, paymentId: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.cablePayment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new ShopError("Payment not found.", 404);
    await getCableShop(user, payment.shopId, "MANAGE");
    if (payment.voidedAt) throw new ShopError("This payment is already void.", 409);
    const now = new Date();
    if (payment.transactionId) await tx.transaction.update({ where: { id: payment.transactionId }, data: { deletedAt: now } });
    await tx.systemLog.create({ data: { action: "CABLE_PAYMENT_VOIDED", details: `Voided cable payment ${paymentId}`, userId: user.id } });
    return tx.cablePayment.update({ where: { id: paymentId }, data: { voidedAt: now }, select: { id: true } });
  });
}

/** Changes what one renewal is charged (0 waives it). */
export async function setRenewalAmount(user: SessionUser, renewalId: string, amount: number) {
  const renewal = await prisma.cableRenewal.findUnique({ where: { id: renewalId }, select: { subscriberId: true } });
  if (!renewal) throw new ShopError("Renewal not found.", 404);
  await subscriberForWrite(user, renewal.subscriberId);
  return prisma.cableRenewal.update({ where: { id: renewalId }, data: { amount: round2(amount) }, select: { id: true } });
}

/** Sets a plan's price; renewals of that plan still without an amount get it too. */
export async function setPlanPrice(user: SessionUser, planId: string, price: number | null) {
  const plan = await prisma.cablePlan.findUnique({ where: { id: planId } });
  if (!plan) throw new ShopError("Plan not found.", 404);
  await getCableShop(user, plan.shopId, "MANAGE");
  const value = price === null ? null : round2(price);
  return prisma.$transaction(async (tx) => {
    await tx.cablePlan.update({ where: { id: planId }, data: { price: value } });
    const filled =
      value === null
        ? { count: 0 }
        : await tx.cableRenewal.updateMany({
            where: { amount: null, plan: plan.name, subscriber: { shopId: plan.shopId, provider: plan.provider } },
            data: { amount: value },
          });
    return { filledRenewals: filled.count };
  });
}

export async function updateCableSettings(
  user: SessionUser,
  shopId: string,
  input: { upiId?: string | null; contactPhone?: string | null; lowWalletAlert?: number | null }
) {
  await getCableShop(user, shopId, "MANAGE");
  return prisma.shop.update({
    where: { id: shopId },
    data: {
      ...(input.upiId !== undefined ? { upiId: input.upiId?.trim() || null } : {}),
      ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone?.trim() || null } : {}),
      ...(input.lowWalletAlert !== undefined ? { lowWalletAlert: input.lowWalletAlert === null ? null : round2(input.lowWalletAlert) } : {}),
    },
    select: { id: true },
  });
}

// ---------------------------------------------------------------------------
// Complaints
// ---------------------------------------------------------------------------

export async function createComplaint(user: SessionUser, subscriberId: string, input: { issue: string; notes?: string | null; assignedToId?: string | null }) {
  const subscriber = await subscriberForWrite(user, subscriberId);
  return prisma.cableComplaint.create({
    data: {
      shopId: subscriber.shopId,
      subscriberId,
      issue: input.issue.trim(),
      notes: input.notes?.trim() || null,
      assignedToId: input.assignedToId || null,
      createdById: user.id,
    },
    select: { id: true },
  });
}

export async function updateComplaint(
  user: SessionUser,
  complaintId: string,
  input: { notes?: string | null; assignedToId?: string | null; fixed?: boolean }
) {
  const complaint = await prisma.cableComplaint.findUnique({ where: { id: complaintId } });
  if (!complaint) throw new ShopError("Complaint not found.", 404);
  await getCableShop(user, complaint.shopId, "MANAGE");
  return prisma.cableComplaint.update({
    where: { id: complaintId },
    data: {
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
      ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId || null } : {}),
      ...(input.fixed !== undefined ? { fixedAt: input.fixed ? complaint.fixedAt ?? new Date() : null } : {}),
    },
    select: { id: true },
  });
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

const monthKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" });
/** "2026-11" in India time. */
export const toMonth = (d: Date) => monthKey.format(d).slice(0, 7);

/** The last `count` months, oldest first ("2026-06" … "2026-11"). */
export function lastMonths(count: number, now = new Date()) {
  const [y, m] = toMonth(now).split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

export async function cableReport(shopId: string, months = 6) {
  const keys = lastMonths(months);
  // Start of the oldest month in India time
  const [y, m] = keys[0].split("-").map(Number);
  const since = new Date(Date.UTC(y, m - 1, 1) - 330 * 60_000);

  const [renewals, payments, topUps, subscribers] = await Promise.all([
    prisma.cableRenewal.findMany({
      where: { subscriber: { shopId }, createdAt: { gte: since } },
      select: { amount: true, plan: true, renewedAt: true, createdAt: true },
    }),
    prisma.cablePayment.findMany({
      where: { shopId, voidedAt: null, date: { gte: since } },
      select: { amount: true, date: true, subscriber: { select: { area: true } } },
    }),
    prisma.transaction.findMany({
      where: { shopId, deletedAt: null, type: "EXPENSE", category: CABLE_LEDGER_CATEGORIES.WALLET_TOP_UP, date: { gte: since } },
      select: { amount: true, date: true },
    }),
    prisma.cableSubscriber.groupBy({ by: ["status"], where: { shopId, goneAt: null }, _count: { _all: true } }),
  ]);

  const monthly = new Map(keys.map((k) => [k, { month: k, renewals: 0, billed: 0, collected: 0, walletTopUps: 0, margin: 0 }]));
  const byPlan = new Map<string, { plan: string; renewals: number; billed: number }>();
  const byArea = new Map<string, { area: string; collected: number }>();

  for (const r of renewals) {
    const row = monthly.get(toMonth(r.renewedAt ?? r.createdAt));
    const amount = toNumber(r.amount);
    if (row) {
      row.renewals += 1;
      row.billed += amount;
    }
    const plan = r.plan ?? "Unknown plan";
    const p = byPlan.get(plan) ?? { plan, renewals: 0, billed: 0 };
    p.renewals += 1;
    p.billed += amount;
    byPlan.set(plan, p);
  }
  for (const p of payments) {
    const row = monthly.get(toMonth(p.date));
    if (row) row.collected += toNumber(p.amount);
    const area = p.subscriber.area ?? "No area";
    const a = byArea.get(area) ?? { area, collected: 0 };
    a.collected += toNumber(p.amount);
    byArea.set(area, a);
  }
  for (const t of topUps) {
    const row = monthly.get(toMonth(t.date));
    if (row) row.walletTopUps += toNumber(t.amount);
  }
  for (const row of monthly.values()) {
    row.billed = round2(row.billed);
    row.collected = round2(row.collected);
    row.walletTopUps = round2(row.walletTopUps);
    row.margin = round2(row.collected - row.walletTopUps);
  }

  const gone = await prisma.cableSubscriber.count({ where: { shopId, goneAt: { not: null } } });
  return {
    months: [...monthly.values()],
    byPlan: [...byPlan.values()].map((p) => ({ ...p, billed: round2(p.billed) })).sort((a, b) => b.billed - a.billed || b.renewals - a.renewals),
    byArea: [...byArea.values()].map((a) => ({ ...a, collected: round2(a.collected) })).sort((a, b) => b.collected - a.collected),
    statusCounts: subscribers.map((s) => ({ status: s.status, count: s._count._all })),
    removed: gone,
  };
}
