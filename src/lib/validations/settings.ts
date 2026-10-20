import { z } from "zod";
import { idSchema, jsonObject, jsonValue, nonNegativeAmount, numeric } from "./common";

export const FORM_KEYS = ["BOOKING_FORM", "TRANSACTION_FORM", "GIFT_ORDER_FORM"] as const;

const formKey = z.string({ message: "Missing required fields" }).trim().min(1, "Missing required fields").max(100);
const nonEmpty = z.string({ message: "Missing required fields" }).min(1, "Missing required fields").max(500);

/** PUT /api/settings/layouts — extra keys the builder sends (id, createdAt, …) are stripped. */
export const layoutUpsertSchema = z.object({
  formKey,
  name: z.string({ message: "Missing required fields" }).trim().min(1, "Missing required fields").max(200),
  description: z.string().max(2000).nullish(),
  schema: jsonObject,
});

/** POST /api/settings/layouts/check-usage */
export const layoutCheckUsageSchema = z.object({
  formKey,
  fieldId: nonEmpty,
  value: nonEmpty,
});

/** POST /api/settings/layouts/migrate-value */
export const layoutMigrateValueSchema = z.object({
  formKey,
  fieldId: nonEmpty,
  oldValue: nonEmpty,
  newValue: nonEmpty,
});

export const layoutParamsSchema = z.object({ formKey: z.string().min(1).max(100) });

/** PUT /api/settings/system — one setting at a time. */
export const systemSettingSchema = z.object({
  key: z
    .string({ message: "Missing required fields" })
    .regex(/^[A-Za-z0-9_.-]{1,100}$/, "Invalid setting key"),
  value: jsonValue.refine(v => v !== null, { message: "Missing required fields" }),
});

const month = numeric("Month must be a number.").pipe(z.number().int().min(1, "Invalid month").max(12, "Invalid month"));
const year = numeric("Year must be a number.").pipe(z.number().int().min(2000, "Invalid year").max(2100, "Invalid year"));

/** GET /api/settings/budgets */
export const budgetListQuerySchema = z.object({
  month: z
    .string()
    .optional()
    .transform(v => (v ? Number(v) : new Date().getMonth() + 1))
    .pipe(z.number().int().min(1, "Invalid month").max(12, "Invalid month")),
  year: z
    .string()
    .optional()
    .transform(v => (v ? Number(v) : new Date().getFullYear()))
    .pipe(z.number().int().min(2000, "Invalid year").max(2100, "Invalid year")),
});

/** POST /api/settings/budgets */
export const budgetUpsertSchema = z.object({
  category: z.string({ message: "Category is required." }).trim().min(1, "Category is required."),
  month,
  year,
  monthlyLimit: nonNegativeAmount("Monthly limit must be zero or more."),
});

/** DELETE /api/settings/budgets?id= */
export const budgetDeleteQuerySchema = z.object({ id: idSchema });
