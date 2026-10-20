import { z } from "zod";
import {
  dateInput,
  jsonValue,
  optionalDateInput,
  optionalId,
  parseDateInput,
  positiveAmount,
  queryInt,
  queryNumber,
  queryString,
  queryDate,
} from "./common";
import { shopIdQuery } from "./shops";

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE"] as const;

const requiredText = (message: string) => z.string({ message }).trim().min(1, message);
const optionalText = z.string().nullish();

/** Standard keys of a transaction body; everything else is a dynamic custom field. */
export const TRANSACTION_STANDARD_KEYS = [
  "amount",
  "type",
  "date",
  "category",
  "paymentMode",
  "description",
  "status",
  "productOrderId",
  "bookingId",
  "recordDate",
  "shopId",
] as const;

/** POST /api/transactions */
export const transactionCreateSchema = z
  .object({
    amount: positiveAmount("Amount must be a positive number."),
    type: z.enum(TRANSACTION_TYPES, { message: "Type must be INCOME or EXPENSE." }),
    date: dateInput("A valid date is required."),
    category: requiredText("Category is required."),
    paymentMode: requiredText("Payment mode is required."),
    description: optionalText,
    status: optionalText,
    productOrderId: optionalId,
    bookingId: optionalId,
    recordDate: optionalDateInput("Invalid record date."),
    shopId: optionalId,
  })
  .catchall(jsonValue);

/** PUT /api/transactions (legacy full update; id in body) */
export const transactionReplaceSchema = z
  .object({
    id: z.string({ message: "Transaction ID required" }).min(1, "Transaction ID required"),
    amount: positiveAmount("Amount must be a positive number."),
    type: z.enum(TRANSACTION_TYPES, { message: "Invalid type." }),
    date: dateInput("A valid date is required."),
    category: optionalText,
    paymentMode: optionalText,
    description: optionalText,
    status: optionalText,
    shopId: optionalId,
  })
  .catchall(jsonValue);

/** PUT /api/transactions/[id] (partial update) */
export const transactionUpdateSchema = z
  .object({
    amount: positiveAmount("Amount must be a positive number.").optional(),
    type: z.enum(TRANSACTION_TYPES, { message: "Invalid type." }).nullish(),
    date: optionalDateInput("Invalid date."),
    category: optionalText,
    paymentMode: optionalText,
    description: optionalText,
    status: optionalText,
    shopId: optionalId,
  })
  .catchall(jsonValue);

/** PATCH /api/transactions/[id] — only soft-delete / restore via deletedAt. */
export const transactionPatchSchema = z.object({
  deletedAt: z
    .union([z.string(), z.number(), z.null(), z.boolean()])
    .optional()
    .transform((value, ctx) => {
      if (value === undefined) return undefined;
      if (!value) return null; // null / false / "" / 0 → restore
      if (value === true) return new Date();
      const d = parseDateInput(value);
      if (!d) {
        ctx.addIssue({ code: "custom", message: "Invalid date." });
        return z.NEVER;
      }
      return d;
    }),
});

/** One entry of a bulk create/update (one per category). */
export const bulkTransactionItemSchema = z
  .object({
    amount: positiveAmount("Amount must be a positive number."),
    type: z.enum(TRANSACTION_TYPES, { message: "Type must be INCOME or EXPENSE." }),
    date: dateInput("A valid date is required."),
    category: requiredText("Category is required."),
    paymentMode: requiredText("Payment mode is required."),
    description: optionalText,
    status: optionalText,
    recordDate: optionalDateInput("Invalid record date."),
    shopId: optionalId,
  })
  .catchall(jsonValue);

export const bulkTransactionSchema = z
  .array(bulkTransactionItemSchema, { message: "Expected an array of transactions" })
  .min(1, "No transactions provided")
  .max(100, "Too many transactions in one request")
  .refine(items => new Set(items.map(item => item.type)).size <= 1, { message: "All categories must be same type" })
  .refine(items => new Set(items.map(item => item.shopId ?? "")).size <= 1, { message: "All entries in a group must belong to the same shop" });

/** GET /api/transactions */
export const transactionListQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{1,2}$/, "month must be YYYY-MM")
    .optional(),
  categories: queryString,
  category: queryString,
  view: z.enum(["day", "week", "month"]).optional().catch(undefined),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dateFrom must be YYYY-MM-DD")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dateTo must be YYYY-MM-DD")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  amountMin: queryNumber,
  amountMax: queryNumber,
  type: queryString,
  paymentMode: queryString,
  page: queryInt(1, 1, 100000),
  shopId: shopIdQuery,
});

/** GET /api/transactions/overview */
export const transactionOverviewQuerySchema = z.object({
  startDate: queryDate,
  endDate: queryDate,
  shopId: shopIdQuery,
});

/** GET /api/transactions/[id] — optional shop for the day-impact totals. */
export const transactionDetailQuerySchema = z.object({
  shopId: shopIdQuery,
});
