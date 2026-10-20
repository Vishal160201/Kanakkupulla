import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ShopError } from "@/lib/shops";
import { INVENTORY_LEDGER_CATEGORIES, PRODUCE_LEDGER_CATEGORIES } from "@/lib/shopModules";

/** Include this on transaction queries to know whether an entry was posted by the inventory. */
export const ledgerSourceInclude = {
  inventoryBill: { select: { id: true, billNumber: true, kind: true } },
  customerPayment: { select: { id: true } },
  producePayment: { select: { id: true } },
  produceSale: { select: { id: true, saleNumber: true } },
  produceReceipt: { select: { id: true } },
} satisfies Prisma.TransactionInclude;

export type LedgerSource =
  | { kind: "SALE" | "PURCHASE"; id: string; billNumber: string }
  | { kind: "PRODUCE_SALE"; id: string; billNumber: string }
  | { kind: "CREDIT_PAYMENT" | "PRODUCE_PAYMENT" | "PRODUCE_RECEIPT"; id: string }
  | null;

type WithSourceRelations = {
  inventoryBill?: { id: string; billNumber: string; kind: "SALE" | "PURCHASE" } | null;
  customerPayment?: { id: string } | null;
  producePayment?: { id: string } | null;
  produceSale?: { id: string; saleNumber: string } | null;
  produceReceipt?: { id: string } | null;
};

type SourceRelationKey = keyof WithSourceRelations;

/** Replaces the raw relations with a compact `source` field for API responses. */
export function withSource<T extends WithSourceRelations>(tx: T): Omit<T, SourceRelationKey> & { source: LedgerSource } {
  const { inventoryBill, customerPayment, producePayment, produceSale, produceReceipt, ...rest } = tx;
  const source: LedgerSource = inventoryBill
    ? { kind: inventoryBill.kind, id: inventoryBill.id, billNumber: inventoryBill.billNumber }
    : customerPayment
      ? { kind: "CREDIT_PAYMENT", id: customerPayment.id }
      : produceSale
        ? { kind: "PRODUCE_SALE", id: produceSale.id, billNumber: produceSale.saleNumber }
        : producePayment
          ? { kind: "PRODUCE_PAYMENT", id: producePayment.id }
          : produceReceipt
            ? { kind: "PRODUCE_RECEIPT", id: produceReceipt.id }
            : null;
  return { ...rest, source };
}

/** Entries posted by the inventory can only be changed by voiding the bill or payment. */
export async function assertNotInventoryLinked(transactionId: string) {
  const [bill, payment, producePayment, produceSale, produceReceipt] = await Promise.all([
    prisma.inventoryBill.findUnique({ where: { transactionId }, select: { id: true } }),
    prisma.customerPayment.findUnique({ where: { transactionId }, select: { id: true } }),
    prisma.producePayment.findUnique({ where: { transactionId }, select: { id: true } }),
    prisma.produceSale.findUnique({ where: { transactionId }, select: { id: true } }),
    prisma.produceReceipt.findUnique({ where: { transactionId }, select: { id: true } }),
  ]);
  if (bill || payment || producePayment || produceSale || produceReceipt) {
    throw new ShopError("This entry was created by Fertilizer Inventory, Farmers or Produce. Change or void it there.", 409);
  }
}

const INVENTORY_ONLY_MESSAGES: Record<string, string> = {
  [INVENTORY_LEDGER_CATEGORIES.SALE]: "Record fertilizer sales with New Sale in Fertilizer Inventory, so stock goes down.",
  [INVENTORY_LEDGER_CATEGORIES.PURCHASE]: "Record stock purchases with New Purchase in Fertilizer Inventory, so stock goes up.",
  [INVENTORY_LEDGER_CATEGORIES.CREDIT_PAYMENT]: "Record repayments from the farmer's page in Farmers, so their credit goes down.",
  [PRODUCE_LEDGER_CATEGORIES.FARMER_PAYMENT]: "Pay farmers for produce from their page in Farmers, so what you owe them goes down.",
  [PRODUCE_LEDGER_CATEGORIES.SALE]: "Record produce sales with Sell Produce in Produce, so produce stock goes down.",
  [PRODUCE_LEDGER_CATEGORIES.SALE_COLLECTION]: "Collect buyer dues from the buyer's page in Produce, so their balance goes down.",
};

/**
 * In fertilizer shops these categories are posted only by the inventory (keeps stock and credit right).
 * `unchanged` lists categories the entry already had in the same shop; they may stay as they are.
 */
export async function assertNotInventoryCategory(shopId: string, categories: (string | null | undefined)[], unchanged: (string | null | undefined)[] = []) {
  const blocked = categories.find(c => c && Object.hasOwn(INVENTORY_ONLY_MESSAGES, c) && !unchanged.includes(c));
  if (!blocked) return;
  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { type: true } });
  if (shop?.type === "FERTILIZER") throw new ShopError(INVENTORY_ONLY_MESSAGES[blocked], 422);
}
