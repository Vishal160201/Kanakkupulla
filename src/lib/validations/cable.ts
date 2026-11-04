import { z } from "zod";
import { dateInput, idSchema, numeric } from "./common";
import { INVENTORY_PAYMENT_MODES } from "../shopModules";

const money = (message: string) => numeric(message).refine((n) => n >= 0, { message }).transform((n) => Math.round(n * 100) / 100);
const optionalText = (max: number) => z.string().trim().max(max).nullish().transform((v) => v || null);

export const cableShopQuery = z.object({ shopId: idSchema });
export const cableReportQuery = z.object({ shopId: idSchema, provider: z.enum(["TIC_FIBER", "TCCL"]) });
export const cableShopBody = z.object({ shopId: idSchema });

/** What the browser extension posts: the portal report as heading → cell text rows (parsed on the server). */
export const cableSyncSchema = z.object({
  provider: z.enum(["TIC_FIBER", "TCCL"]),
  rows: z.array(z.record(z.string().max(100), z.string().max(1000))).max(10_000),
  /** Partner wallet balance, when the extension could read it */
  wallet: z.number().finite().nullable().optional(),
});

export const cablePaymentSchema = z.object({
  amount: money("Enter the amount received.").refine((n) => n > 0, { message: "Enter the amount received." }),
  date: dateInput("Pick a date."),
  paymentMode: z.enum(INVENTORY_PAYMENT_MODES, { message: "Pick a payment mode." }),
  notes: optionalText(300),
});

export const renewalAmountSchema = z.object({ amount: money("Amount must be 0 or more.") });

export const planPriceSchema = z.object({ price: money("Price must be 0 or more.").nullable() });

export const cableSettingsSchema = z.object({
  shopId: idSchema,
  upiId: optionalText(100).optional(),
  contactPhone: optionalText(20).optional(),
  lowWalletAlert: money("Enter 0 or more.").nullable().optional(),
  smsFrom: optionalText(20).optional(),
  smsAutoReminders: z.boolean().optional(),
  smsLanguage: z.enum(["en", "ta"]).optional(),
});

/** Shop edits to a subscriber. A blank phone goes back to the portal's number on the next sync. */
export const subscriberEditSchema = z.object({
  name: z.string({ message: "Enter the name." }).trim().min(1, "Enter the name.").max(100, "Keep the name under 100 characters."),
  tamilName: optionalText(100),
  phone: z
    .string()
    .nullish()
    .transform((v) => v?.replace(/[\s-]/g, "") || null)
    .refine((v) => v === null || /^\+?\d{10,13}$/.test(v), { message: "Enter a 10-digit mobile number." }),
  oldVcNumber: z
    .string()
    .nullish()
    .transform((v) => v?.replace(/\s/g, "") || null)
    .refine((v) => v === null || /^\d{6,20}$/.test(v), { message: "A VC number is digits only." }),
  groupName: optionalText(60),
});

/** Renames a subscriber group (area / line) for everyone in it. */
export const groupRenameSchema = z.object({
  shopId: idSchema,
  from: z.string().trim().min(1).max(60),
  to: z.string({ message: "Enter the new name." }).trim().min(1, "Enter the new name.").max(60, "Keep it under 60 characters."),
});

const cell = (max: number) => z.string().trim().max(max).nullable();
/** Rows read from an imported sheet; `apply: false` only previews the matches. */
export const subscriberImportSchema = z.object({
  shopId: idSchema,
  apply: z.boolean(),
  rows: z
    .array(z.object({ sheet: cell(100).optional(), line: z.number().int(), name: cell(100), tamilName: cell(100), vcNumber: cell(30), oldVcNumber: cell(30), phone: cell(20), groupName: cell(60).optional() }))
    .min(1, "The file has no subscriber rows.")
    .max(10_000, "Import at most 10,000 rows at a time."),
});

export const cableSmsSchema = z.object({ text: z.string().trim().min(1, "Enter a message.").max(2000) });
export const outboxReportSchema = z.object({ id: idSchema, ok: z.boolean(), reason: z.string().max(200).optional() });
export const cableRemindersSchema = z.object({ shopId: idSchema, provider: z.enum(["TIC_FIBER", "TCCL"]).optional() });

export const complaintCreateSchema = z.object({
  issue: z.string({ message: "Describe the problem." }).trim().min(1, "Describe the problem.").max(200, "Keep it under 200 characters."),
  notes: optionalText(1000),
  assignedToId: z.string().trim().nullish().transform((v) => v || null),
});

export const complaintUpdateSchema = z.object({
  notes: optionalText(1000).optional(),
  assignedToId: z.string().trim().nullish().transform((v) => v || null).optional(),
  fixed: z.boolean().optional(),
});
