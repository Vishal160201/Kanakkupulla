import { z } from "zod";
import { jsonObject, jsonValue } from "./common";

export const FORM_KEYS = ["BOOKING_FORM", "TRANSACTION_FORM", "FERTILIZER_TRANSACTION_FORM", "CABLE_TRANSACTION_FORM", "GIFT_ORDER_FORM"] as const;

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

const text = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters`).optional();
const pattern = (re: RegExp, message: string, max = 40) =>
  z.string().trim().toUpperCase().max(max).optional().refine((v) => !v || re.test(v), message);

/** PUT /api/settings/invoice — every field optional; an empty value falls back to the default. */
export const invoiceSettingsSchema = z
  .object({
    studio_name: text(80),
    studio_tagline: text(60),
    studio_address: text(300),
    studio_phone: text(30),
    studio_email: z.string().trim().max(120).optional().refine((v) => !v || z.email().safeParse(v).success, "Enter a valid email"),
    studio_gstin: pattern(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "A GSTIN is 15 characters, like 33ABCDE1234F1Z5"),
    studio_upi_id: z.string().trim().max(80).optional().refine((v) => !v || /^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(v), "A UPI ID looks like name@bank"),
    studio_bank_account_name: text(80),
    studio_bank_account_number: z.string().trim().max(20).optional().refine((v) => !v || /^\d{9,18}$/.test(v), "Account numbers are 9–18 digits"),
    studio_bank_ifsc: pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/, "An IFSC is 11 characters, like HDFC0001234", 11),
    studio_bank_name: text(80),
    studio_instagram: text(120),
    studio_website: text(120),
    studio_review_url: z.string().trim().max(500).optional().refine((v) => !v || /^https:\/\/\S+$/.test(v), "Paste the full https:// review link"),
    studio_terms: text(2000),
  })
  .strict();
