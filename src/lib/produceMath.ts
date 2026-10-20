// Produce trade (crops bought from farmers, sold to buyers): units and money / quantity
// arithmetic. Pure functions with no database, shared by the server checks, the UI and unit
// tests. Money is rounded to paise, quantities to thousandths of the item's unit.

/** Units a produce item is weighed and priced in. */
export const PRODUCE_UNITS = ["kg", "quintal", "tonne"] as const;
export type ProduceUnit = (typeof PRODUCE_UNITS)[number];

const KG_PER_UNIT: Record<ProduceUnit, number> = { kg: 1, quintal: 100, tonne: 1000 };

export function isProduceUnit(value: unknown): value is ProduceUnit {
  return typeof value === "string" && (PRODUCE_UNITS as readonly string[]).includes(value);
}

/** A quantity in kg (to total stock across items with different units). */
export function toKg(quantity: number, unit: string): number {
  return round3(quantity * (isProduceUnit(unit) ? KG_PER_UNIT[unit] : 1));
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Half a paisa / half a thousandth: differences below this are rounding noise. */
const MONEY_EPS = 0.005;
const QTY_EPS = 0.0005;

const fmtQty = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 3 });

/** "120 kg", "2.5 quintal" */
export function formatQuantity(quantity: number, unit: string): string {
  return `${fmtQty(round3(quantity))} ${unit}`;
}

/** quantity × rate, rounded to paise. */
export function produceAmount(quantity: number, rate: number): number {
  return round2(quantity * rate);
}

/** What the shop owes a farmer: produce bought (all items) minus what was paid (cash + deducted credit). */
export function farmerDue(collectedAmount: number, paidAmount: number): number {
  return round2(collectedAmount - paidAmount);
}

/** Stock of one item: collected from farmers minus sold to buyers (non-voided only). */
export function produceStock(collected: number, sold: number): number {
  return round3(collected - sold);
}

/** What a buyer still owes: unpaid parts of their sales minus later receipts. */
export function buyerDue(salesTotal: number, salesPaid: number, receipts: number): number {
  return round2(salesTotal - salesPaid - receipts);
}

/** Most fertilizer credit that can come off a produce payment: the smaller of the two balances. */
export function maxCreditDeduction(produceDue: number, fertilizerCredit: number): number {
  return round2(Math.max(0, Math.min(produceDue, fertilizerCredit)));
}

export type FarmerPaymentCheck =
  | { ok: true; cash: number; deducted: number; total: number; dueAfter: number; creditAfter: number }
  | { ok: false; errors: Record<string, string> };

/**
 * Checks a farmer payment: cash plus deducted credit must be more than zero and at most the produce
 * due; the deduction can't exceed the farmer's fertilizer credit.
 */
export function checkFarmerPayment(input: { produceDue: number; fertilizerCredit: number; cashAmount: number; creditDeducted: number }): FarmerPaymentCheck {
  const cash = round2(input.cashAmount);
  const deducted = round2(input.creditDeducted);
  const total = round2(cash + deducted);
  const credit = round2(Math.max(0, input.fertilizerCredit));
  const errors: Record<string, string> = {};
  if (cash < 0) errors.cashAmount = "Cash paid can't be negative.";
  if (deducted < 0) errors.creditDeducted = "Deducted credit can't be negative.";
  else if (deducted > credit + MONEY_EPS) errors.creditDeducted = `Only ₹${credit} of fertilizer credit is owed.`;
  if (total <= 0) errors.cashAmount = "Enter an amount to pay.";
  else if (total > round2(input.produceDue) + MONEY_EPS) errors.cashAmount = `Only ₹${round2(Math.max(0, input.produceDue))} is owed for produce.`;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    cash,
    deducted,
    total,
    dueAfter: round2(input.produceDue - total),
    creditAfter: round2(input.fertilizerCredit - deducted),
  };
}

export type ProduceSaleCheck =
  | { ok: true; total: number; paid: number; due: number }
  | { ok: false; errors: Record<string, string> };

/** Checks a sale of one item against that item's stock; paid defaults to the full total. */
export function checkProduceSale(input: {
  quantity: number;
  rate: number;
  paidAmount?: number;
  stock: number;
  item: { name: string; unit: string };
}): ProduceSaleCheck {
  const total = produceAmount(input.quantity, input.rate);
  const paid = round2(input.paidAmount ?? total);
  const errors: Record<string, string> = {};
  if (input.quantity > round3(input.stock) + QTY_EPS) {
    errors.quantity = input.stock <= 0
      ? `No ${input.item.name} in stock.`
      : `Only ${formatQuantity(input.stock, input.item.unit)} of ${input.item.name} in stock.`;
  }
  if (paid < 0 || paid > total + MONEY_EPS) errors.paidAmount = "Paid amount must be between 0 and the sale total.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, total, paid, due: round2(total - paid) };
}

/** True when taking `amount` off `balance` would leave it below zero (beyond rounding). */
export function wouldGoNegative(balance: number, amount: number, kind: "money" | "quantity" = "money"): boolean {
  return balance - amount < -(kind === "quantity" ? QTY_EPS : MONEY_EPS);
}
