import { z } from "zod";
import { jsonObject, numeric, optionalDateInput, parseDateInput, queryString } from "./common";

const dmyDate = z
  .string()
  .regex(/^\d{1,2}\/\d{1,2}\/\d{4}$/, "Date must be DD/MM/YYYY")
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalPage = z
  .string()
  .optional()
  .transform(v => {
    const n = v === undefined ? NaN : parseInt(v, 10);
    return Number.isFinite(n) && n >= 1 ? n : null;
  });

/** GET /api/gifts/orders */
export const giftOrderListQuerySchema = z.object({
  status: queryString,
  excludeStatus: queryString,
  productId: queryString,
  paymentStatus: queryString,
  startDate: dmyDate,
  endDate: dmyDate,
  page: optionalPage,
  pageSize: z
    .string()
    .optional()
    .transform(v => Math.min(Math.max((v ? parseInt(v, 10) : 25) || 25, 1), 200)),
});

/** Money values in an order's customData may be numbers, numeric strings, "" or absent. */
const looseAmount = z.union([z.number(), z.string(), z.null()]).optional();

/** POST /api/gifts/orders */
export const giftOrderCreateSchema = z.object({
  productId: z.string({ message: "Missing required fields" }).min(1, "Missing required fields"),
  clientName: z.string({ message: "Missing required fields" }).trim().min(1, "Missing required fields"),
  clientPhone: z.string().nullish(),
  quantity: numeric("Quantity must be greater than 0")
    .refine(n => n > 0, { message: "Quantity must be greater than 0" })
    .nullish()
    .or(z.literal("")),
  dueDate: optionalDateInput("Invalid due date."),
  recordDate: optionalDateInput("Invalid record date."),
  advanceDate: optionalDateInput("Invalid advance date."),
  customData: jsonObject.nullish(),
  createTransaction: z.boolean().optional(),
  amount: looseAmount,
  advanceAmount: looseAmount,
  dueAmount: looseAmount,
  paymentMode: z.string().nullish(),
});

/** PATCH /api/gifts/orders/[id] — only these fields may change. */
export const giftOrderPatchSchema = z.object({
  status: z.string().trim().optional(),
  quantity: numeric("Quantity must be a number.")
    .transform(n => Math.trunc(n))
    .refine(n => n >= 1, { message: "Quantity must be at least 1." })
    .optional(),
  clientName: z.string().trim().optional(),
  clientPhone: z.string().nullish(),
  dueDate: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((value, ctx) => {
      if (value === undefined) return undefined;
      if (value === null || value === "") return null;
      const d = parseDateInput(value);
      if (!d) {
        ctx.addIssue({ code: "custom", message: "Invalid due date." });
        return z.NEVER;
      }
      return d;
    }),
  discountAmount: numeric("Discount must be a number.")
    .refine(n => n >= 0, { message: "Discount must be zero or more." })
    .optional(),
  customData: jsonObject.optional(),
});
