import { z } from "zod";
import { normaliseMoney } from "@/lib/money/format";

/** A non-negative amount as a decimal string ("1000", "1,000.5") -> "1000.50". */
const amount = (label: string) =>
  z
    .union([z.string(), z.number()], { message: `${label} is required.` })
    .transform((v, ctx) => {
      const value = normaliseMoney(v);
      if (value == null || value.startsWith("-")) {
        ctx.addIssue({ code: "custom", message: `${label} must be an amount like 1000 or 1000.50.` });
        return z.NEVER;
      }
      return value;
    });

const dayOfMonth = (label: string) =>
  z.number({ message: `${label} must be a day from 1 to 31.` }).int().min(1, `${label} must be a day from 1 to 31.`).max(31, `${label} must be a day from 1 to 31.`);

const text = (label: string, max: number) =>
  z.string({ message: `${label} is required.` }).trim().min(1, `${label} is required.`).max(max, `${label} is too long.`);

export const moneyAccountSchema = z
  .object({
    name: text("Name", 60),
    institution: text("Bank", 60),
    type: z.enum(["BANK", "CREDIT_CARD"], { message: "Choose bank account or credit card." }),
    last4: z
      .string()
      .trim()
      .nullish()
      .transform((v) => v || null)
      .refine((v) => v == null || /^\d{4}$/.test(v), "Enter only the last 4 digits."),
    ownIdentifiers: z
      .array(z.string().trim().min(2, "Identifiers need at least 2 characters.").max(60, "Keep identifiers under 60 characters."))
      .max(20, "Up to 20 identifiers.")
      .default([])
      .transform((list) => [...new Set(list.map((v) => v.toUpperCase()))]),
    isPool: z.boolean().default(false),
    lowBalanceAlert: amount("Low balance alert").default("1000.00"),
    cycleStartDay: dayOfMonth("Cycle start day").nullish(),
    dueDay: dayOfMonth("Due day").nullish(),
    creditLimit: amount("Credit limit").nullish(),
    /** Cards: amount used right now */
    outstanding: amount("Used amount").nullish(),
    /** Bank accounts with no statement yet: balance right now */
    manualBalance: amount("Balance").nullish(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #f97316.").default("#f97316"),
  })
  .transform((data) =>
    // Card-only fields don't apply to bank accounts, and cards aren't "available money"
    data.type === "BANK"
      ? { ...data, cycleStartDay: null, dueDay: null, creditLimit: null, outstanding: null, manualBalance: data.manualBalance ?? null }
      : {
          ...data,
          isPool: false,
          cycleStartDay: data.cycleStartDay ?? null,
          dueDay: data.dueDay ?? null,
          creditLimit: data.creditLimit ?? null,
          outstanding: data.outstanding ?? null,
          manualBalance: null,
        },
  );

export const moneyIdParamsSchema = z.object({ id: z.string().min(1).max(64) });

// ---------------------------------------------------------------------------
// Phases 2-10
// ---------------------------------------------------------------------------

const isoDay = (label: string) =>
  z.string({ message: `${label} is required.` }).regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be a date.`).refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), `${label} must be a date.`);
const positive = (label: string) => amount(label).refine((v) => Number(v) > 0, `${label} must be more than zero.`);
const id = z.string().min(1).max(64);
const KINDS = ["EXPENSE", "INCOME", "SALARY", "INTEREST", "SELF_TRANSFER", "CARD_PAYMENT", "CARD_REFUND", "PASS_THROUGH", "REIMBURSEMENT"] as const;
const COMMITMENT_TYPES = ["SAVINGS_GOAL", "CARD_BILL", "CARD_EMI", "RECEIVABLE", "PAYABLE", "EXPECTED_INCOME"] as const;
const optionalText = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters.`).nullish().transform((v) => v || null);

export const moneyTxnQuerySchema = z.object({
  from: isoDay("From").optional(),
  to: isoDay("To").optional(),
  accountId: id.optional(),
  categoryId: id.optional(),
  kind: z.enum(KINDS).optional(),
  q: z.string().trim().max(100).optional(),
  hideSelf: z.enum(["0", "1"]).optional(),
  view: z.enum(["unmatched", "suggestions"]).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(10).max(200).default(50),
});

export const moneyTxnPatchSchema = z
  .object({
    categoryId: id.nullable().optional(),
    kind: z.enum(KINDS).optional(),
    note: optionalText(500).optional(),
    counterAccountId: id.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");

export const moneyManualTxnSchema = z.object({
  accountId: id,
  txnDate: isoDay("Date"),
  txnTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must look like 18:30.").nullish().transform((v) => (v ? (v.length === 5 ? `${v}:00` : v) : null)),
  narration: z.string({ message: "Merchant is required." }).trim().min(1, "Merchant is required.").max(200, "Keep it under 200 characters."),
  amount: positive("Amount"),
  direction: z.enum(["DEBIT", "CREDIT"]).default("DEBIT"),
  categoryId: id.nullish().transform((v) => v ?? null),
  note: optionalText(500),
});

export const moneyCategorySchema = z.object({
  name: z.string({ message: "Name is required." }).trim().min(1, "Name is required.").max(40, "Keep it under 40 characters."),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #f97316.").default("#64748b"),
  icon: z.string().regex(/^ph-[a-z0-9-]{2,40}$/, "Pick an icon.").default("ph-tag"),
});

export const moneyRuleSchema = z
  .object({
    priority: z.number().int().min(1).max(999).default(100),
    field: z.enum(["NARRATION", "COUNTERPARTY", "UPI_ID", "MERCHANT"]).default("NARRATION"),
    pattern: z.string({ message: "Pattern is required." }).trim().min(2, "Pattern needs at least 2 characters.").max(200, "Keep it under 200 characters."),
    isRegex: z.boolean().default(false),
    direction: z.enum(["DEBIT", "CREDIT"]).nullish().transform((v) => v ?? null),
    categoryId: id.nullish().transform((v) => v ?? null),
    kind: z.enum(KINDS).nullish().transform((v) => v ?? null),
    targetAccountId: id.nullish().transform((v) => v ?? null),
  })
  .refine((r) => r.categoryId || r.kind, { message: "Choose a category or a kind for this rule.", path: ["categoryId"] })
  .refine((r) => {
    if (!r.isRegex) return true;
    try {
      new RegExp(r.pattern, "i");
      return true;
    } catch {
      return false;
    }
  }, { message: "That pattern isn't a valid regular expression.", path: ["pattern"] });

export const moneyAlwaysSchema = z.object({
  txnId: id,
  categoryId: id,
  field: z.enum(["COUNTERPARTY", "UPI_ID", "NARRATION"]).optional(),
  pattern: z.string().trim().min(2).max(200).optional(),
});

const scheduleItem = z.object({
  dueDate: isoDay("Due date"),
  amount: positive("Amount"),
  paidAmount: amount("Paid amount").default("0.00"),
  paidOn: isoDay("Paid on").nullish().transform((v) => v ?? null),
});

export const moneyCommitmentSchema = z.object({
  name: z.string({ message: "Name is required." }).trim().min(1, "Name is required.").max(60, "Keep it under 60 characters."),
  type: z.enum(COMMITMENT_TYPES, { message: "Choose a type." }),
  status: z.enum(["ACTIVE", "COMPLETED", "PAUSED"]).default("ACTIVE"),
  accountId: id.nullish().transform((v) => v ?? null),
  totalAmount: positive("Total"),
  notes: optionalText(500),
  matchPattern: optionalText(80),
  linkedCommitmentId: id.nullish().transform((v) => v ?? null),
  /** Savings goals: when the money goes out, and whether that repeats */
  payoutDate: isoDay("Pay-out date").nullish().transform((v) => v ?? null),
  repeatMonths: z.number().int().min(1, "Repeat every 1 to 24 months.").max(24, "Repeat every 1 to 24 months.").nullish().transform((v) => v ?? null),
  schedule: z.array(scheduleItem).max(120, "Up to 120 schedule entries.").optional(),
});

export const moneyPayoutSchema = z.object({
  paidOn: isoDay("Paid out on"),
  transactionId: id.nullish().transform((v) => v ?? null),
});

export const moneyScheduleCreateSchema = scheduleItem;

export const moneySchedulePatchSchema = z
  .object({
    dueDate: isoDay("Due date").optional(),
    amount: positive("Amount").optional(),
    paidAmount: amount("Paid amount").optional(),
    paidOn: isoDay("Paid on").nullable().optional(),
    transactionId: id.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");

export const moneySuggestionActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("passThrough"), creditId: id, debitId: id, action: z.enum(["accept", "dismiss"]) }),
  z.object({ type: z.literal("schedule"), scheduleId: id, txnId: id, action: z.enum(["accept", "dismiss"]) }),
  z.object({ type: z.literal("unmatched"), txnId: id, action: z.enum(["markTransfer", "dismiss"]) }),
  z.object({ type: z.literal("payout"), commitmentId: id, txnId: id, action: z.enum(["accept", "dismiss"]) }),
]);

export const moneySheetOptionsSchema = z.object({
  firstYear: z.number().int().min(2000).max(2100),
  skip: z.array(z.string().max(120)).max(50).default([]),
  accounts: z.object({ emi: id.nullish(), bill: id.nullish(), pool: id.nullish() }).default({}),
  setPoolBalance: z.boolean().default(true),
});

export const moneyRestoreSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  accounts: z.array(z.record(z.string(), z.unknown())).max(100),
  categories: z.array(z.record(z.string(), z.unknown())).max(500),
  rules: z.array(z.record(z.string(), z.unknown())).max(2000),
  imports: z.array(z.record(z.string(), z.unknown())).max(5000),
  transactions: z.array(z.record(z.string(), z.unknown())).max(200000),
  commitments: z.array(z.record(z.string(), z.unknown())).max(1000),
  preferences: z.unknown().optional(),
});

export const moneyTransferSchema = z
  .object({
    fromAccountId: id,
    toAccountId: id,
    txnDate: isoDay("Date"),
    amount: positive("Amount"),
    note: optionalText(500),
  })
  .refine((t) => t.fromAccountId !== t.toAccountId, { message: "Pick two different accounts.", path: ["toAccountId"] });
