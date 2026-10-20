import { Prisma } from "@prisma/client";
import prisma, { toNumber, type AppPrismaClient } from "@/lib/prisma";
import { can, type SessionUser } from "@/lib/authz";
import type { AccessLevel } from "@/lib/access";
import { getAccessibleShop, ShopError } from "@/lib/shops";
import { generateNextTransactionId } from "@/lib/transactionId";
import { INVENTORY_LEDGER_CATEGORIES } from "@/lib/shopModules";
import { quantityUnit } from "@/lib/inventoryPacks";

/** Interactive-transaction client of the extended Prisma client (also satisfied by `prisma`). */
export type Tx = Omit<AppPrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;

/** Money/quantity arithmetic in paise / thousandths to avoid float drift. */
const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * The shop behind an inventory request: must exist, be accessible, be a fertilizer shop, and the
 * user's role there must allow `level` on Fertilizer Inventory.
 */
export async function getInventoryShop(user: SessionUser, shopId: string, level: AccessLevel = "VIEW") {
  const shop = await getAccessibleShop(user, shopId);
  if (shop.type !== "FERTILIZER") throw new ShopError("Inventory is only available for fertilizer shops.", 422);
  if (!(await can(user, "inventory", level, shopId))) {
    throw new ShopError(level === "MANAGE" ? "You can view this shop's inventory but not change it." : "You don't have access to this shop's inventory.", 403);
  }
  return shop;
}

/** Current stock per product (sum of signed, non-voided movements). */
export async function stockByProduct(db: Tx, shopId: string, productIds?: string[]) {
  const rows = await db.stockMovement.groupBy({
    by: ["productId"],
    where: { shopId, voidedAt: null, ...(productIds ? { productId: { in: productIds } } : {}) },
    _sum: { quantity: true },
  });
  return new Map(rows.map(r => [r.productId, round3(toNumber(r._sum.quantity))]));
}

/** Credit owed per customer: unpaid parts of non-voided sales minus non-voided repayments. */
export async function customerBalances(db: Tx, shopId: string, customerIds?: string[]) {
  const customerFilter = customerIds ? { customerId: { in: customerIds } } : {};
  const [sales, payments] = await Promise.all([
    db.inventoryBill.groupBy({
      by: ["customerId"],
      where: { shopId, kind: "SALE", voidedAt: null, customerId: { not: null }, ...customerFilter },
      _sum: { totalAmount: true, paidAmount: true },
    }),
    db.customerPayment.groupBy({
      by: ["customerId"],
      where: { shopId, voidedAt: null, ...customerFilter },
      _sum: { amount: true },
    }),
  ]);
  const balances = new Map<string, number>();
  for (const row of sales) {
    if (!row.customerId) continue;
    balances.set(row.customerId, toNumber(row._sum.totalAmount) - toNumber(row._sum.paidAmount));
  }
  for (const row of payments) {
    balances.set(row.customerId, (balances.get(row.customerId) ?? 0) - toNumber(row._sum.amount));
  }
  for (const [id, value] of balances) balances.set(id, round2(value));
  return balances;
}

/** Locks product rows so concurrent sales can't oversell. */
async function lockProducts(tx: Tx, productIds: string[]) {
  if (productIds.length === 0) return;
  await tx.$queryRaw`SELECT "id" FROM "InventoryProduct" WHERE "id" IN (${Prisma.join(productIds)}) FOR UPDATE`;
}

async function nextBillNumber(tx: Tx, shopId: string, kind: "SALE" | "PURCHASE") {
  const prefix = kind === "SALE" ? "S" : "P";
  const pattern = `^${prefix}-[0-9]+$`;
  const [{ max }] = await tx.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(CAST(SUBSTRING("billNumber" FROM 3) AS INTEGER)) AS max
    FROM "InventoryBill"
    WHERE "shopId" = ${shopId} AND "billNumber" ~ ${pattern}
  `;
  return `${prefix}-${String((max ?? 0) + 1).padStart(4, "0")}`;
}

/** Posts a settled Daily Kanakku entry for an inventory / produce record; returns its id. */
export async function postLedgerEntry(
  tx: Tx,
  input: { shopId: string; userId: string; type: "INCOME" | "EXPENSE"; category: string; amount: number; date: Date; paymentMode: string; description: string }
) {
  const created = await tx.transaction.create({
    data: {
      transactionId: await generateNextTransactionId(),
      amount: input.amount,
      type: input.type,
      date: input.date,
      category: input.category,
      paymentMode: input.paymentMode,
      description: input.description,
      status: "SETTLED",
      shop: { connect: { id: input.shopId } },
      user: { connect: { id: input.userId } },
    },
    select: { id: true },
  });
  return created.id;
}

export type BillLineInput = { productId: string; quantity: number; unitPrice: number };
export type BillInput = {
  shopId: string;
  kind: "SALE" | "PURCHASE";
  date: Date;
  customerId?: string;
  supplierName?: string | null;
  paidAmount?: number;
  paymentMode: string;
  notes?: string | null;
  lines: BillLineInput[];
};

/** Field errors keyed like the bill form (`lines.0.quantity`), thrown as a 409/422. */
export class InventoryValidationError extends ShopError {
  constructor(message: string, status: number, readonly errors: Record<string, string>) {
    super(message, status);
  }
}

/** Product fields bills and stock messages need (name plus how it's packed). */
export const productPackSelect = { id: true, name: true, unit: true, packSize: true, packUnit: true } satisfies Prisma.InventoryProductSelect;

const billInclude = {
  customer: { select: { id: true, name: true } },
  lines: { include: { product: { select: productPackSelect } }, orderBy: { createdAt: "asc" as const } },
  _count: { select: { lines: true } },
} satisfies Prisma.InventoryBillInclude;

/**
 * Records a sale or purchase: stock movements, the bill, and its Daily Kanakku entry
 * (sales post what was paid now; purchases post the full total). All in one transaction.
 */
export async function createBill(user: SessionUser, input: BillInput) {
  const productIds = [...new Set(input.lines.map(l => l.productId))];
  const total = round2(input.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0));
  const paid = input.kind === "PURCHASE" ? total : round2(input.paidAmount ?? total);

  if (paid < 0 || paid > total) {
    throw new InventoryValidationError("Paid amount must be between 0 and the bill total.", 422, { paidAmount: "Paid amount must be between 0 and the bill total." });
  }
  if (input.kind === "SALE" && paid < total && !input.customerId) {
    throw new InventoryValidationError("Pick a customer for a credit sale.", 422, { customerId: "Pick a customer for a credit sale." });
  }

  const bill = await prisma.$transaction(async tx => {
    const products = await tx.inventoryProduct.findMany({
      where: { id: { in: productIds }, shopId: input.shopId },
      select: { ...productPackSelect, isArchived: true },
    });
    if (products.length !== productIds.length) throw new ShopError("A product on this bill doesn't belong to this shop.", 422);
    const archived = products.find(p => p.isArchived);
    if (archived) throw new ShopError(`"${archived.name}" is archived.`, 422);

    if (input.customerId) {
      const customer = await tx.inventoryCustomer.findFirst({ where: { id: input.customerId, shopId: input.shopId }, select: { id: true } });
      if (!customer) throw new ShopError("Customer not found in this shop.", 422);
    }

    if (input.kind === "SALE") {
      await lockProducts(tx, productIds);
      const stock = await stockByProduct(tx, input.shopId, productIds);
      const wanted = new Map<string, number>();
      input.lines.forEach(l => wanted.set(l.productId, round3((wanted.get(l.productId) ?? 0) + l.quantity)));
      const errors: Record<string, string> = {};
      input.lines.forEach((line, i) => {
        const available = stock.get(line.productId) ?? 0;
        if ((wanted.get(line.productId) ?? 0) > available) {
          const product = products.find(p => p.id === line.productId)!;
          errors[`lines.${i}.quantity`] = `Only ${available} ${quantityUnit(product, available)} of ${product.name} in stock.`;
        }
      });
      if (Object.keys(errors).length > 0) throw new InventoryValidationError(Object.values(errors)[0], 409, errors);
    }

    const billNumber = await nextBillNumber(tx, input.shopId, input.kind);
    const customerName = input.customerId
      ? (await tx.inventoryCustomer.findUnique({ where: { id: input.customerId }, select: { name: true } }))?.name
      : null;

    const ledgerAmount = input.kind === "SALE" ? paid : total;
    const transactionId = ledgerAmount > 0
      ? await postLedgerEntry(tx, {
          shopId: input.shopId,
          userId: user.id,
          type: input.kind === "SALE" ? "INCOME" : "EXPENSE",
          category: INVENTORY_LEDGER_CATEGORIES[input.kind],
          amount: ledgerAmount,
          date: input.date,
          paymentMode: input.paymentMode,
          description: input.kind === "SALE"
            ? `Sale ${billNumber}${customerName ? ` - ${customerName}` : ""}${paid < total ? " (part payment)" : ""}`
            : `Purchase ${billNumber}${input.supplierName ? ` - ${input.supplierName}` : ""}`,
        })
      : null;

    return tx.inventoryBill.create({
      data: {
        shopId: input.shopId,
        kind: input.kind,
        billNumber,
        date: input.date,
        customerId: input.kind === "SALE" ? input.customerId ?? null : null,
        supplierName: input.kind === "PURCHASE" ? input.supplierName?.trim() || null : null,
        totalAmount: total,
        paidAmount: paid,
        paymentMode: input.paymentMode,
        notes: input.notes?.trim() || null,
        transactionId,
        createdById: user.id,
        lines: {
          create: input.lines.map(line => ({
            shopId: input.shopId,
            productId: line.productId,
            type: input.kind,
            quantity: input.kind === "SALE" ? -line.quantity : line.quantity,
            unitPrice: line.unitPrice,
            amount: round2(line.quantity * line.unitPrice),
            date: input.date,
            createdById: user.id,
          })),
        },
      },
      include: billInclude,
    });
  });

  return formatBill(bill);
}

/** Voids a bill: reverses its stock, removes its ledger entry and (for sales) its credit. */
export async function voidBill(user: SessionUser, billId: string) {
  const bill = await prisma.$transaction(async tx => {
    const existing = await tx.inventoryBill.findUnique({ where: { id: billId }, include: { lines: true } });
    if (!existing) throw new ShopError("Bill not found.", 404);
    await getInventoryShop(user, existing.shopId, "MANAGE");
    if (existing.voidedAt) throw new ShopError("This bill is already void.", 409);

    if (existing.kind === "PURCHASE") {
      // Removing purchased stock must not leave any product below zero
      const productIds = [...new Set(existing.lines.map(l => l.productId))];
      await lockProducts(tx, productIds);
      const stock = await stockByProduct(tx, existing.shopId, productIds);
      for (const line of existing.lines) {
        if ((stock.get(line.productId) ?? 0) - line.quantity < -0.0005) {
          throw new ShopError("Some of this stock has already been sold, so the purchase can't be voided. Adjust stock instead.", 409);
        }
      }
    }

    if (existing.kind === "SALE" && existing.customerId) {
      const balance = (await customerBalances(tx, existing.shopId, [existing.customerId])).get(existing.customerId) ?? 0;
      const credit = existing.totalAmount - existing.paidAmount;
      if (balance - credit < -0.005) {
        throw new ShopError("The customer has already repaid part of this credit. Void those payments first.", 409);
      }
    }

    const now = new Date();
    await tx.stockMovement.updateMany({ where: { billId }, data: { voidedAt: now } });
    if (existing.transactionId) {
      await tx.transaction.update({ where: { id: existing.transactionId }, data: { deletedAt: now } });
    }
    await tx.systemLog.create({
      data: { action: "INVENTORY_BILL_VOIDED", details: `Voided ${existing.kind.toLowerCase()} bill ${existing.billNumber} (${billId})`, userId: user.id },
    });
    return tx.inventoryBill.update({ where: { id: billId }, data: { voidedAt: now }, include: billInclude });
  });
  return formatBill(bill);
}

/** Manual stock correction (count, damage, return…). `quantity` is signed. */
export async function createAdjustment(user: SessionUser, input: { shopId: string; productId: string; quantity: number; notes: string }) {
  return prisma.$transaction(async tx => {
    const product = await tx.inventoryProduct.findFirst({ where: { id: input.productId, shopId: input.shopId } });
    if (!product) throw new ShopError("Product not found in this shop.", 404);
    if (input.quantity < 0) {
      await lockProducts(tx, [product.id]);
      const stock = (await stockByProduct(tx, input.shopId, [product.id])).get(product.id) ?? 0;
      if (stock + input.quantity < -0.0005) {
        const message = `Only ${stock} ${quantityUnit(product, stock)} in stock.`;
        throw new InventoryValidationError(message, 409, { quantity: message });
      }
    }
    return tx.stockMovement.create({
      data: {
        shopId: input.shopId,
        productId: product.id,
        type: "ADJUSTMENT",
        quantity: input.quantity,
        unitPrice: product.price,
        amount: round2(Math.abs(input.quantity) * product.price),
        date: new Date(),
        notes: input.notes.trim(),
        createdById: user.id,
      },
    });
  });
}

/** Records a credit repayment and its Daily Kanakku income entry. */
export async function recordPayment(
  user: SessionUser,
  customerId: string,
  input: { amount: number; date: Date; paymentMode: string; notes?: string | null }
) {
  return prisma.$transaction(async tx => {
    const customer = await tx.inventoryCustomer.findUnique({ where: { id: customerId } });
    if (!customer) throw new ShopError("Customer not found.", 404);
    await getInventoryShop(user, customer.shopId, "MANAGE");

    await tx.$queryRaw`SELECT "id" FROM "InventoryCustomer" WHERE "id" = ${customerId} FOR UPDATE`;
    const balance = (await customerBalances(tx, customer.shopId, [customerId])).get(customerId) ?? 0;
    if (input.amount > balance + 0.005) {
      throw new InventoryValidationError(`${customer.name} owes only ₹${balance}.`, 422, { amount: `Amount can't be more than the balance (₹${balance}).` });
    }

    const transactionId = await postLedgerEntry(tx, {
      shopId: customer.shopId,
      userId: user.id,
      type: "INCOME",
      category: INVENTORY_LEDGER_CATEGORIES.CREDIT_PAYMENT,
      amount: round2(input.amount),
      date: input.date,
      paymentMode: input.paymentMode,
      description: `Credit payment - ${customer.name}`,
    });

    return tx.customerPayment.create({
      data: {
        shopId: customer.shopId,
        customerId,
        amount: round2(input.amount),
        date: input.date,
        paymentMode: input.paymentMode,
        notes: input.notes?.trim() || null,
        transactionId,
        createdById: user.id,
      },
    });
  });
}

export async function voidPayment(user: SessionUser, paymentId: string) {
  return prisma.$transaction(async tx => {
    const payment = await tx.customerPayment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new ShopError("Payment not found.", 404);
    await getInventoryShop(user, payment.shopId, "MANAGE");
    if (payment.voidedAt) throw new ShopError("This payment is already void.", 409);
    const producePayment = await tx.producePayment.findUnique({ where: { creditPaymentId: paymentId }, select: { id: true } });
    if (producePayment) {
      throw new ShopError("This credit was deducted from a produce payment. Void that payment in Produce instead.", 409);
    }
    const now = new Date();
    if (payment.transactionId) {
      await tx.transaction.update({ where: { id: payment.transactionId }, data: { deletedAt: now } });
    }
    await tx.systemLog.create({
      data: { action: "INVENTORY_PAYMENT_VOIDED", details: `Voided credit payment ${paymentId}`, userId: user.id },
    });
    return tx.customerPayment.update({ where: { id: paymentId }, data: { voidedAt: now } });
  });
}

/** A bill row as the extended client returns it (money already converted to numbers). */
type BillWithRelations = {
  id: string;
  kind: "SALE" | "PURCHASE";
  billNumber: string;
  date: Date;
  customer: { id: string; name: string } | null;
  supplierName: string | null;
  totalAmount: number;
  paidAmount: number;
  paymentMode: string;
  notes: string | null;
  voidedAt: Date | null;
  _count: { lines: number };
  lines: { id: string; product: { id: string; name: string; unit: string; packSize: number | null; packUnit: string | null }; quantity: number; unitPrice: number; amount: number }[];
};

/** API shape of a bill (quantities shown positive). */
export function formatBill(bill: BillWithRelations) {
  return {
    id: bill.id,
    kind: bill.kind,
    billNumber: bill.billNumber,
    date: bill.date,
    customer: bill.customer,
    supplierName: bill.supplierName,
    totalAmount: bill.totalAmount,
    paidAmount: bill.paidAmount,
    dueAmount: bill.kind === "SALE" ? round2(bill.totalAmount - bill.paidAmount) : 0,
    paymentMode: bill.paymentMode,
    notes: bill.notes,
    voidedAt: bill.voidedAt,
    lineCount: bill._count.lines,
    lines: bill.lines.map(line => ({
      id: line.id,
      product: line.product,
      quantity: Math.abs(line.quantity),
      unitPrice: line.unitPrice,
      amount: line.amount,
    })),
  };
}

export { billInclude };
