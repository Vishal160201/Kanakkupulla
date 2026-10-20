import type { Prisma } from "@prisma/client";
import prisma, { toNumber } from "@/lib/prisma";
import type { SessionUser } from "@/lib/authz";
import { ShopError } from "@/lib/shops";
import { PRODUCE_LEDGER_CATEGORIES } from "@/lib/shopModules";
import { InventoryValidationError, customerBalances, getInventoryShop, postLedgerEntry, type Tx } from "@/lib/inventory";
import {
  buyerDue,
  checkFarmerPayment,
  checkProduceSale,
  farmerDue,
  formatQuantity,
  produceAmount,
  produceStock,
  round2,
  round3,
  toKg,
  wouldGoNegative,
} from "@/lib/produceMath";

// Produce trade of a fertilizer shop: crops (ProduceItem, managed per shop) are bought from farmers
// (InventoryCustomer) at the day's rate per unit and owed to them until paid; they are sold to buyers
// (ProduceBuyer), whose unpaid part is their due. Stock is per item. Every cash movement posts to
// Daily Kanakku in the same transaction.

/** Deducted fertilizer credit is recorded as a credit repayment with this mode (no cash moves). */
export const PRODUCE_ADJUSTMENT_MODE = "Produce adjustment";

// ---------------------------------------------------------------------------
// Items and stock
// ---------------------------------------------------------------------------

export const produceItemSelect = { id: true, name: true, unit: true, isArchived: true } satisfies Prisma.ProduceItemSelect;

/** Stock per item (in its unit): non-voided collections minus non-voided sales. */
export async function stockByItem(db: Tx, shopId: string, itemIds?: string[]) {
  const itemFilter = itemIds ? { itemId: { in: itemIds } } : {};
  const [collected, sold] = await Promise.all([
    db.produceCollection.groupBy({ by: ["itemId"], where: { shopId, voidedAt: null, ...itemFilter }, _sum: { quantity: true } }),
    db.produceSale.groupBy({ by: ["itemId"], where: { shopId, voidedAt: null, ...itemFilter }, _sum: { quantity: true } }),
  ]);
  const soldBy = new Map(sold.map(r => [r.itemId, toNumber(r._sum.quantity)]));
  const stock = new Map<string, number>();
  for (const row of collected) stock.set(row.itemId, produceStock(toNumber(row._sum.quantity), soldBy.get(row.itemId) ?? 0));
  for (const [itemId, qty] of soldBy) if (!stock.has(itemId)) stock.set(itemId, produceStock(0, qty));
  return stock;
}

/** Items of the shop with their stock (archived ones only when asked). */
export async function listProduceItems(db: Tx, shopId: string, includeArchived = false) {
  const [items, stock] = await Promise.all([
    db.produceItem.findMany({
      where: { shopId, ...(includeArchived ? {} : { isArchived: false }) },
      orderBy: [{ isArchived: "asc" }, { name: "asc" }],
      select: produceItemSelect,
    }),
    stockByItem(db, shopId),
  ]);
  return items.map(item => ({ ...item, stock: stock.get(item.id) ?? 0 }));
}

/** Locks an item row so concurrent sales / collection voids can't take its stock below zero. */
async function lockItem(tx: Tx, itemId: string) {
  await tx.$queryRaw`SELECT "id" FROM "ProduceItem" WHERE "id" = ${itemId} FOR UPDATE`;
}

/** Rename, change unit (only before anything is recorded for it) or archive (only with no stock). */
export async function updateProduceItem(user: SessionUser, itemId: string, input: { name?: string; unit?: string; isArchived?: boolean }) {
  return prisma.$transaction(async tx => {
    const item = await tx.produceItem.findUnique({ where: { id: itemId } });
    if (!item) throw new ShopError("Crop not found.", 404);
    await getInventoryShop(user, item.shopId, "MANAGE");

    if (input.name && input.name.toLowerCase() !== item.name.toLowerCase()) {
      const clash = await tx.produceItem.findFirst({
        where: { shopId: item.shopId, name: { equals: input.name, mode: "insensitive" }, id: { not: item.id } },
        select: { id: true },
      });
      if (clash) throw new InventoryValidationError(`"${input.name}" is already in your crop list.`, 409, { name: `"${input.name}" is already in your crop list.` });
    }
    if (input.unit && input.unit !== item.unit) {
      const [collections, sales] = await Promise.all([
        tx.produceCollection.count({ where: { itemId } }),
        tx.produceSale.count({ where: { itemId } }),
      ]);
      if (collections + sales > 0) {
        throw new InventoryValidationError("The unit can't change once collections or sales are recorded for this crop.", 409, {
          unit: "Can't change: collections or sales already use this unit.",
        });
      }
    }
    if (input.isArchived) {
      await lockItem(tx, itemId);
      const stock = (await stockByItem(tx, item.shopId, [itemId])).get(itemId) ?? 0;
      if (Math.abs(stock) > 0.0005) {
        throw new ShopError(`${formatQuantity(stock, item.unit)} of ${item.name} is still in stock. Sell it before archiving.`, 409);
      }
    }
    return tx.produceItem.update({
      where: { id: itemId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
      },
      select: { ...produceItemSelect, shopId: true },
    });
  });
}

/** An active item of the shop, or a field error under `itemId`. */
async function activeItem(db: Tx, shopId: string, itemId: string) {
  const item = await db.produceItem.findFirst({ where: { id: itemId, shopId }, select: produceItemSelect });
  if (!item) throw new InventoryValidationError("Crop not found in this shop.", 422, { itemId: "Pick a crop." });
  if (item.isArchived) throw new InventoryValidationError(`${item.name} is archived.`, 422, { itemId: `${item.name} is archived.` });
  return item;
}

// ---------------------------------------------------------------------------
// Balances
// ---------------------------------------------------------------------------

/** What the shop owes each farmer for produce, across all items (collections minus payments). */
export async function farmerProduceDues(db: Tx, shopId: string, customerIds?: string[]) {
  const customerFilter = customerIds ? { customerId: { in: customerIds } } : {};
  const [collections, payments] = await Promise.all([
    db.produceCollection.groupBy({
      by: ["customerId"],
      where: { shopId, voidedAt: null, ...customerFilter },
      _sum: { amount: true },
      _count: true,
    }),
    db.producePayment.groupBy({
      by: ["customerId"],
      where: { shopId, voidedAt: null, ...customerFilter },
      _sum: { amount: true },
    }),
  ]);
  const paid = new Map(payments.map(p => [p.customerId, toNumber(p._sum.amount)]));
  const dues = new Map<string, { due: number; collectedAmount: number; collections: number }>();
  for (const row of collections) {
    const collectedAmount = toNumber(row._sum.amount);
    dues.set(row.customerId, { due: farmerDue(collectedAmount, paid.get(row.customerId) ?? 0), collectedAmount: round2(collectedAmount), collections: row._count });
  }
  for (const [customerId, amount] of paid) {
    if (!dues.has(customerId)) dues.set(customerId, { due: farmerDue(0, amount), collectedAmount: 0, collections: 0 });
  }
  return dues;
}

/** What each buyer still owes (unpaid parts of non-voided sales minus non-voided receipts). */
export async function buyerDues(db: Tx, shopId: string, buyerIds?: string[]) {
  const buyerFilter = buyerIds ? { buyerId: { in: buyerIds } } : {};
  const [sales, receipts] = await Promise.all([
    db.produceSale.groupBy({
      by: ["buyerId"],
      where: { shopId, voidedAt: null, ...buyerFilter },
      _sum: { totalAmount: true, paidAmount: true },
    }),
    db.produceReceipt.groupBy({
      by: ["buyerId"],
      where: { shopId, voidedAt: null, ...buyerFilter },
      _sum: { amount: true },
    }),
  ]);
  const received = new Map(receipts.map(r => [r.buyerId, toNumber(r._sum.amount)]));
  const dues = new Map<string, number>();
  for (const row of sales) {
    dues.set(row.buyerId, buyerDue(toNumber(row._sum.totalAmount), toNumber(row._sum.paidAmount), received.get(row.buyerId) ?? 0));
  }
  for (const [buyerId, amount] of received) if (!dues.has(buyerId)) dues.set(buyerId, buyerDue(0, 0, amount));
  return dues;
}

/** A farmer's non-voided collections per item: quantity and amount. */
export async function farmerCropBreakdown(db: Tx, customerId: string) {
  const rows = await db.produceCollection.groupBy({
    by: ["itemId"],
    where: { customerId, voidedAt: null },
    _sum: { quantity: true, amount: true },
  });
  if (rows.length === 0) return [];
  const items = await db.produceItem.findMany({ where: { id: { in: rows.map(r => r.itemId) } }, select: produceItemSelect });
  const byId = new Map(items.map(i => [i.id, i]));
  return rows
    .map(r => {
      const item = byId.get(r.itemId);
      return {
        itemId: r.itemId,
        name: item?.name ?? "Unknown crop",
        unit: item?.unit ?? "kg",
        quantity: round3(toNumber(r._sum.quantity)),
        amount: round2(toNumber(r._sum.amount)),
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

async function nextSaleNumber(tx: Tx, shopId: string) {
  const [{ max }] = await tx.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(CAST(SUBSTRING("saleNumber" FROM 4) AS INTEGER)) AS max
    FROM "ProduceSale"
    WHERE "shopId" = ${shopId} AND "saleNumber" ~ '^PS-[0-9]+$'
  `;
  return `PS-${String((max ?? 0) + 1).padStart(4, "0")}`;
}

// ---------------------------------------------------------------------------
// Collections (produce bought from farmers)
// ---------------------------------------------------------------------------

export const collectionSelect = {
  id: true,
  date: true,
  quantity: true,
  rate: true,
  amount: true,
  notes: true,
  voidedAt: true,
  item: { select: { id: true, name: true, unit: true } },
  customer: { select: { id: true, name: true, place: true } },
} satisfies Prisma.ProduceCollectionSelect;

export async function createCollection(
  user: SessionUser,
  input: { shopId: string; itemId: string; customerId: string; date: Date; quantity: number; rate: number; notes?: string | null }
) {
  const [item, farmer] = await Promise.all([
    activeItem(prisma, input.shopId, input.itemId),
    prisma.inventoryCustomer.findFirst({ where: { id: input.customerId, shopId: input.shopId }, select: { id: true, isArchived: true } }),
  ]);
  if (!farmer) throw new InventoryValidationError("Farmer not found in this shop.", 422, { customerId: "Pick a farmer." });
  if (farmer.isArchived) throw new InventoryValidationError("This farmer is archived.", 422, { customerId: "This farmer is archived." });

  return prisma.produceCollection.create({
    data: {
      shopId: input.shopId,
      itemId: item.id,
      customerId: farmer.id,
      date: input.date,
      quantity: round3(input.quantity),
      rate: round2(input.rate),
      amount: produceAmount(input.quantity, input.rate),
      notes: input.notes?.trim() || null,
      createdById: user.id,
    },
    select: collectionSelect,
  });
}

/** Voids a collection unless the farmer was already paid for it or the produce was already sold. */
export async function voidCollection(user: SessionUser, collectionId: string) {
  return prisma.$transaction(async tx => {
    const existing = await tx.produceCollection.findUnique({ where: { id: collectionId }, include: { item: { select: { name: true, unit: true } } } });
    if (!existing) throw new ShopError("Collection not found.", 404);
    await getInventoryShop(user, existing.shopId, "MANAGE");
    if (existing.voidedAt) throw new ShopError("This collection is already void.", 409);

    await lockItem(tx, existing.itemId);
    await tx.$queryRaw`SELECT "id" FROM "InventoryCustomer" WHERE "id" = ${existing.customerId} FOR UPDATE`;
    const due = (await farmerProduceDues(tx, existing.shopId, [existing.customerId])).get(existing.customerId)?.due ?? 0;
    if (wouldGoNegative(due, existing.amount)) {
      throw new ShopError("The farmer has already been paid for this produce. Void those payments first.", 409);
    }
    const stock = (await stockByItem(tx, existing.shopId, [existing.itemId])).get(existing.itemId) ?? 0;
    if (wouldGoNegative(stock, existing.quantity, "quantity")) {
      throw new ShopError(`Some of this ${existing.item.name} has already been sold, so the collection can't be voided.`, 409);
    }

    await tx.systemLog.create({
      data: {
        action: "PRODUCE_COLLECTION_VOIDED",
        details: `Voided produce collection ${collectionId} (${existing.item.name}, ${formatQuantity(existing.quantity, existing.item.unit)})`,
        userId: user.id,
      },
    });
    return tx.produceCollection.update({ where: { id: collectionId }, data: { voidedAt: new Date() }, select: collectionSelect });
  });
}

// ---------------------------------------------------------------------------
// Farmer payments (cash + optional fertilizer credit deduction), across all crops
// ---------------------------------------------------------------------------

export const farmerPaymentSelect = {
  id: true,
  date: true,
  amount: true,
  cashAmount: true,
  creditDeducted: true,
  paymentMode: true,
  notes: true,
  voidedAt: true,
  customer: { select: { id: true, name: true, place: true } },
} satisfies Prisma.ProducePaymentSelect;

/**
 * Pays a farmer for produce. The cash part posts a Daily Kanakku expense; the deducted part is
 * recorded as a fertilizer credit repayment (no cash, no ledger entry), so both balances go down.
 */
export async function recordFarmerPayment(
  user: SessionUser,
  customerId: string,
  input: { cashAmount: number; creditDeducted: number; date: Date; paymentMode: string; notes?: string | null }
) {
  return prisma.$transaction(async tx => {
    const farmer = await tx.inventoryCustomer.findUnique({ where: { id: customerId } });
    if (!farmer) throw new ShopError("Farmer not found.", 404);
    await getInventoryShop(user, farmer.shopId, "MANAGE");

    await tx.$queryRaw`SELECT "id" FROM "InventoryCustomer" WHERE "id" = ${customerId} FOR UPDATE`;
    const [dues, credit] = await Promise.all([
      farmerProduceDues(tx, farmer.shopId, [customerId]),
      customerBalances(tx, farmer.shopId, [customerId]),
    ]);
    const check = checkFarmerPayment({
      produceDue: dues.get(customerId)?.due ?? 0,
      fertilizerCredit: credit.get(customerId) ?? 0,
      cashAmount: input.cashAmount,
      creditDeducted: input.creditDeducted,
    });
    if (!check.ok) throw new InventoryValidationError(Object.values(check.errors)[0], 422, check.errors);

    const transactionId = check.cash > 0
      ? await postLedgerEntry(tx, {
          shopId: farmer.shopId,
          userId: user.id,
          type: "EXPENSE",
          category: PRODUCE_LEDGER_CATEGORIES.FARMER_PAYMENT,
          amount: check.cash,
          date: input.date,
          paymentMode: input.paymentMode,
          description: `Produce payment - ${farmer.name}${check.deducted > 0 ? ` (₹${check.deducted} fertilizer credit deducted)` : ""}`,
        })
      : null;

    const creditPaymentId = check.deducted > 0
      ? (
          await tx.customerPayment.create({
            data: {
              shopId: farmer.shopId,
              customerId,
              amount: check.deducted,
              date: input.date,
              paymentMode: PRODUCE_ADJUSTMENT_MODE,
              notes: "Deducted from produce payment",
              createdById: user.id,
            },
            select: { id: true },
          })
        ).id
      : null;

    return tx.producePayment.create({
      data: {
        shopId: farmer.shopId,
        customerId,
        amount: check.total,
        cashAmount: check.cash,
        creditDeducted: check.deducted,
        date: input.date,
        paymentMode: input.paymentMode,
        notes: input.notes?.trim() || null,
        transactionId,
        creditPaymentId,
        createdById: user.id,
      },
      select: farmerPaymentSelect,
    });
  });
}

/** Voids a farmer payment: removes its ledger expense and puts any deducted credit back. */
export async function voidFarmerPayment(user: SessionUser, paymentId: string) {
  return prisma.$transaction(async tx => {
    const payment = await tx.producePayment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new ShopError("Payment not found.", 404);
    await getInventoryShop(user, payment.shopId, "MANAGE");
    if (payment.voidedAt) throw new ShopError("This payment is already void.", 409);

    const now = new Date();
    if (payment.transactionId) {
      await tx.transaction.update({ where: { id: payment.transactionId }, data: { deletedAt: now } });
    }
    if (payment.creditPaymentId) {
      await tx.customerPayment.update({ where: { id: payment.creditPaymentId }, data: { voidedAt: now } });
    }
    await tx.systemLog.create({
      data: { action: "PRODUCE_PAYMENT_VOIDED", details: `Voided produce payment ${paymentId}`, userId: user.id },
    });
    return tx.producePayment.update({ where: { id: paymentId }, data: { voidedAt: now }, select: farmerPaymentSelect });
  });
}

// ---------------------------------------------------------------------------
// Sales to buyers and later receipts
// ---------------------------------------------------------------------------

export const produceSaleSelect = {
  id: true,
  saleNumber: true,
  date: true,
  quantity: true,
  rate: true,
  totalAmount: true,
  paidAmount: true,
  paymentMode: true,
  notes: true,
  voidedAt: true,
  item: { select: { id: true, name: true, unit: true } },
  buyer: { select: { id: true, name: true, place: true } },
} satisfies Prisma.ProduceSaleSelect;

/** API shape of a sale, with its unpaid part. */
export function formatProduceSale<T extends { totalAmount: number; paidAmount: number }>(sale: T) {
  return { ...sale, dueAmount: round2(sale.totalAmount - sale.paidAmount) };
}

export async function createProduceSale(
  user: SessionUser,
  input: { shopId: string; itemId: string; buyerId: string; date: Date; quantity: number; rate: number; paidAmount?: number; paymentMode: string; notes?: string | null }
) {
  const sale = await prisma.$transaction(async tx => {
    const [item, buyer] = await Promise.all([
      activeItem(tx, input.shopId, input.itemId),
      tx.produceBuyer.findFirst({ where: { id: input.buyerId, shopId: input.shopId }, select: { id: true, name: true, isArchived: true } }),
    ]);
    if (!buyer) throw new InventoryValidationError("Buyer not found in this shop.", 422, { buyerId: "Pick a buyer." });
    if (buyer.isArchived) throw new InventoryValidationError("This buyer is archived.", 422, { buyerId: "This buyer is archived." });

    await lockItem(tx, item.id);
    const stock = (await stockByItem(tx, input.shopId, [item.id])).get(item.id) ?? 0;
    const check = checkProduceSale({ quantity: input.quantity, rate: input.rate, paidAmount: input.paidAmount, stock, item });
    if (!check.ok) throw new InventoryValidationError(Object.values(check.errors)[0], check.errors.quantity ? 409 : 422, check.errors);

    const saleNumber = await nextSaleNumber(tx, input.shopId);
    const transactionId = check.paid > 0
      ? await postLedgerEntry(tx, {
          shopId: input.shopId,
          userId: user.id,
          type: "INCOME",
          category: PRODUCE_LEDGER_CATEGORIES.SALE,
          amount: check.paid,
          date: input.date,
          paymentMode: input.paymentMode,
          description: `Produce sale ${saleNumber} - ${buyer.name} (${item.name}, ${formatQuantity(input.quantity, item.unit)})${check.due > 0 ? " (part payment)" : ""}`,
        })
      : null;

    return tx.produceSale.create({
      data: {
        shopId: input.shopId,
        itemId: item.id,
        buyerId: buyer.id,
        saleNumber,
        date: input.date,
        quantity: round3(input.quantity),
        rate: round2(input.rate),
        totalAmount: check.total,
        paidAmount: check.paid,
        paymentMode: input.paymentMode,
        notes: input.notes?.trim() || null,
        transactionId,
        createdById: user.id,
      },
      select: produceSaleSelect,
    });
  });
  return formatProduceSale(sale);
}

/** Voids a sale (its produce goes back into stock) unless receipts already cover its due. */
export async function voidProduceSale(user: SessionUser, saleId: string) {
  const sale = await prisma.$transaction(async tx => {
    const existing = await tx.produceSale.findUnique({ where: { id: saleId } });
    if (!existing) throw new ShopError("Sale not found.", 404);
    await getInventoryShop(user, existing.shopId, "MANAGE");
    if (existing.voidedAt) throw new ShopError("This sale is already void.", 409);

    await tx.$queryRaw`SELECT "id" FROM "ProduceBuyer" WHERE "id" = ${existing.buyerId} FOR UPDATE`;
    const due = (await buyerDues(tx, existing.shopId, [existing.buyerId])).get(existing.buyerId) ?? 0;
    if (wouldGoNegative(due, round2(existing.totalAmount - existing.paidAmount))) {
      throw new ShopError("The buyer has already paid part of this sale's due. Void those receipts first.", 409);
    }

    const now = new Date();
    if (existing.transactionId) {
      await tx.transaction.update({ where: { id: existing.transactionId }, data: { deletedAt: now } });
    }
    await tx.systemLog.create({
      data: { action: "PRODUCE_SALE_VOIDED", details: `Voided produce sale ${existing.saleNumber} (${saleId})`, userId: user.id },
    });
    return tx.produceSale.update({ where: { id: saleId }, data: { voidedAt: now }, select: produceSaleSelect });
  });
  return formatProduceSale(sale);
}

export const receiptSelect = { id: true, amount: true, date: true, paymentMode: true, notes: true, voidedAt: true } satisfies Prisma.ProduceReceiptSelect;

/** Money received from a buyer against their dues (posts Daily Kanakku income). */
export async function recordBuyerReceipt(
  user: SessionUser,
  buyerId: string,
  input: { amount: number; date: Date; paymentMode: string; notes?: string | null }
) {
  return prisma.$transaction(async tx => {
    const buyer = await tx.produceBuyer.findUnique({ where: { id: buyerId } });
    if (!buyer) throw new ShopError("Buyer not found.", 404);
    await getInventoryShop(user, buyer.shopId, "MANAGE");

    await tx.$queryRaw`SELECT "id" FROM "ProduceBuyer" WHERE "id" = ${buyerId} FOR UPDATE`;
    const due = (await buyerDues(tx, buyer.shopId, [buyerId])).get(buyerId) ?? 0;
    if (round2(input.amount) > due + 0.005) {
      throw new InventoryValidationError(`${buyer.name} owes only ₹${due}.`, 422, { amount: `Amount can't be more than the due (₹${due}).` });
    }

    const transactionId = await postLedgerEntry(tx, {
      shopId: buyer.shopId,
      userId: user.id,
      type: "INCOME",
      category: PRODUCE_LEDGER_CATEGORIES.SALE_COLLECTION,
      amount: round2(input.amount),
      date: input.date,
      paymentMode: input.paymentMode,
      description: `Produce dues received - ${buyer.name}`,
    });

    return tx.produceReceipt.create({
      data: {
        shopId: buyer.shopId,
        buyerId,
        amount: round2(input.amount),
        date: input.date,
        paymentMode: input.paymentMode,
        notes: input.notes?.trim() || null,
        transactionId,
        createdById: user.id,
      },
      select: receiptSelect,
    });
  });
}

export async function voidBuyerReceipt(user: SessionUser, receiptId: string) {
  return prisma.$transaction(async tx => {
    const receipt = await tx.produceReceipt.findUnique({ where: { id: receiptId } });
    if (!receipt) throw new ShopError("Receipt not found.", 404);
    await getInventoryShop(user, receipt.shopId, "MANAGE");
    if (receipt.voidedAt) throw new ShopError("This receipt is already void.", 409);
    const now = new Date();
    if (receipt.transactionId) {
      await tx.transaction.update({ where: { id: receipt.transactionId }, data: { deletedAt: now } });
    }
    await tx.systemLog.create({
      data: { action: "PRODUCE_RECEIPT_VOIDED", details: `Voided produce receipt ${receiptId}`, userId: user.id },
    });
    return tx.produceReceipt.update({ where: { id: receiptId }, data: { voidedAt: now }, select: receiptSelect });
  });
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

/** Produce KPIs: stock per item (and in kg overall), owed to farmers, buyer dues, today's collection. */
export async function produceSummary(db: Tx, shopId: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const [items, farmerDues, dues, today] = await Promise.all([
    listProduceItems(db, shopId, true),
    farmerProduceDues(db, shopId),
    buyerDues(db, shopId),
    db.produceCollection.groupBy({
      by: ["itemId"],
      where: { shopId, voidedAt: null, date: { gte: todayStart, lt: todayEnd } },
      _sum: { quantity: true, amount: true },
      _count: true,
    }),
  ]);

  const todayBy = new Map(today.map(t => [t.itemId, t]));
  // Archived items stay listed only while they still have stock or were collected today
  const itemRows = items
    .map(item => {
      const t = todayBy.get(item.id);
      return {
        ...item,
        todayQuantity: round3(toNumber(t?._sum.quantity)),
        todayAmount: round2(toNumber(t?._sum.amount)),
        todayCollections: t?._count ?? 0,
      };
    })
    .filter(item => !item.isArchived || Math.abs(item.stock) > 0.0005 || item.todayCollections > 0);

  const owed = [...farmerDues.values()].map(d => d.due).filter(v => v > 0.005);
  const buyerOwed = [...dues.values()].filter(v => v > 0.005);
  return {
    items: itemRows,
    stockKg: round3(itemRows.reduce((sum, item) => sum + toKg(Math.max(0, item.stock), item.unit), 0)),
    owedToFarmers: round2(owed.reduce((a, b) => a + b, 0)),
    farmersOwed: owed.length,
    buyerDues: round2(buyerOwed.reduce((a, b) => a + b, 0)),
    buyersWithDues: buyerOwed.length,
    todayCollectedAmount: round2(itemRows.reduce((sum, item) => sum + item.todayAmount, 0)),
    todayCollections: itemRows.reduce((sum, item) => sum + item.todayCollections, 0),
  };
}
