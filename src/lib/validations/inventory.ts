import { z } from "zod";
import { dateInput, idSchema, numeric, queryBoolean, queryInt, queryString } from "./common";
import { INVENTORY_PAYMENT_MODES } from "../shopModules";
import { PACK_TYPES } from "../inventoryPacks";
import { PRODUCE_UNITS } from "../produceMath";

const shopId = idSchema;
const money = (message: string) => numeric(message).refine(n => n >= 0, { message }).transform(n => Math.round(n * 100) / 100);
const quantity = numeric("Enter a quantity.").refine(n => n > 0, { message: "Quantity must be more than 0." }).transform(n => Math.round(n * 1000) / 1000);
const paymentMode = z.enum(INVENTORY_PAYMENT_MODES, { message: "Pick a payment mode." });
const optionalText = (max: number) => z.string().trim().max(max).nullish().transform(v => v || null);

export const inventoryShopQuery = z.object({ shopId });

export const productListQuery = z.object({ shopId, includeArchived: queryBoolean.optional() });

/** Size of one pack (e.g. 50 for a 50 kg bag); checked against the pack type by validatePack(). */
const packSize = numeric("Enter the pack size.").nullish().transform(v => v ?? null);
const packUnit = z.string().trim().max(10).nullish().transform(v => v || null);

export const productCreateSchema = z.object({
  shopId,
  name: z.string({ message: "Product name is required." }).trim().min(1, "Product name is required.").max(120, "Product name is too long."),
  unit: z.enum(PACK_TYPES, { message: "Pick a pack type." }),
  packSize,
  packUnit,
  price: money("Price must be 0 or more."),
});

export const productUpdateSchema = z.object({
  name: productCreateSchema.shape.name.optional(),
  unit: productCreateSchema.shape.unit.optional(),
  packSize: packSize.optional(),
  packUnit: packUnit.optional(),
  price: money("Price must be 0 or more.").optional(),
  isArchived: z.boolean().optional(),
});

export const adjustmentSchema = z.object({
  shopId,
  productId: idSchema,
  quantity: numeric("Enter a quantity.").refine(n => n !== 0, { message: "Quantity can't be 0." }).transform(n => Math.round(n * 1000) / 1000),
  notes: z.string({ message: "Give a reason for the adjustment." }).trim().min(1, "Give a reason for the adjustment.").max(300),
});

export const billListQuery = z.object({
  shopId,
  kind: z.enum(["SALE", "PURCHASE"]).optional(),
  page: queryInt(1, 1, 100000),
  search: queryString,
});

export const billCreateSchema = z
  .object({
    shopId,
    kind: z.enum(["SALE", "PURCHASE"], { message: "Pick sale or purchase." }),
    date: dateInput("Pick a date."),
    customerId: idSchema.nullish().transform(v => v || undefined),
    supplierName: optionalText(120),
    paidAmount: money("Paid amount must be 0 or more.").optional(),
    paymentMode,
    notes: optionalText(500),
    lines: z
      .array(z.object({ productId: idSchema, quantity, unitPrice: money("Price must be 0 or more.") }), { message: "Add at least one product." })
      .min(1, "Add at least one product.")
      .max(50, "Too many lines on one bill."),
  });

export const customerListQuery = z.object({ shopId, search: queryString });

export const customerCreateSchema = z.object({
  shopId,
  name: z.string({ message: "Customer name is required." }).trim().min(1, "Customer name is required.").max(120),
  phone: z.string().trim().max(20).regex(/^[0-9+\s-]*$/, "Phone can only contain digits.").nullish().transform(v => v || null),
  place: optionalText(120),
});

export const customerUpdateSchema = z.object({
  name: customerCreateSchema.shape.name.optional(),
  phone: customerCreateSchema.shape.phone.optional(),
  place: customerCreateSchema.shape.place.optional(),
  isArchived: z.boolean().optional(),
});

export const paymentCreateSchema = z.object({
  amount: numeric("Enter an amount.").refine(n => n > 0, { message: "Amount must be more than 0." }).transform(n => Math.round(n * 100) / 100),
  date: dateInput("Pick a date."),
  paymentMode,
  notes: optionalText(300),
});

export const inventoryIdParams = z.object({ id: idSchema });

// ---------------------------------------------------------------------------
// Produce: crops bought from farmers and sold to buyers, per produce item
// ---------------------------------------------------------------------------

const produceQuantity = numeric("Enter the quantity.").refine(n => n > 0, { message: "Quantity must be more than 0." }).transform(n => Math.round(n * 1000) / 1000);
const produceRate = numeric("Enter the rate.").refine(n => n > 0, { message: "Rate must be more than 0." }).transform(n => Math.round(n * 100) / 100);
const partyName = (label: string) =>
  z.string({ message: `${label} name is required.` }).trim().min(1, `${label} name is required.`).max(120, "Name is too long.");

export const produceItemListQuery = z.object({ shopId, includeArchived: queryBoolean.optional() });

export const produceItemCreateSchema = z.object({
  shopId,
  name: z.string({ message: "Crop name is required." }).trim().min(1, "Crop name is required.").max(60, "Crop name is too long."),
  unit: z.enum(PRODUCE_UNITS, { message: "Pick kg, quintal or tonne." }).default("kg"),
});

export const produceItemUpdateSchema = z.object({
  name: produceItemCreateSchema.shape.name.optional(),
  unit: z.enum(PRODUCE_UNITS, { message: "Pick kg, quintal or tonne." }).optional(),
  isArchived: z.boolean().optional(),
});

export const produceListQuery = z.object({ shopId, page: queryInt(1, 1, 100000), search: queryString, itemId: queryString });

export const produceCollectionCreateSchema = z.object({
  shopId,
  itemId: idSchema,
  customerId: idSchema,
  date: dateInput("Pick a date."),
  quantity: produceQuantity,
  rate: produceRate,
  notes: optionalText(300),
});

export const produceFarmerListQuery = z.object({ shopId, search: queryString });

export const produceFarmerPaymentSchema = z
  .object({
    cashAmount: money("Cash paid must be 0 or more."),
    creditDeducted: money("Deducted credit must be 0 or more.").optional().transform(v => v ?? 0),
    date: dateInput("Pick a date."),
    paymentMode,
    notes: optionalText(300),
  })
  .refine(v => v.cashAmount + v.creditDeducted > 0, { message: "Enter an amount to pay.", path: ["cashAmount"] });

export const produceBuyerListQuery = z.object({ shopId, search: queryString });

export const produceBuyerCreateSchema = z.object({
  shopId,
  name: partyName("Buyer"),
  phone: customerCreateSchema.shape.phone,
  place: optionalText(120),
});

export const produceBuyerUpdateSchema = z.object({
  name: produceBuyerCreateSchema.shape.name.optional(),
  phone: produceBuyerCreateSchema.shape.phone.optional(),
  place: produceBuyerCreateSchema.shape.place.optional(),
  isArchived: z.boolean().optional(),
});

export const produceSaleCreateSchema = z.object({
  shopId,
  itemId: idSchema,
  buyerId: idSchema,
  date: dateInput("Pick a date."),
  quantity: produceQuantity,
  rate: produceRate,
  /** Defaults to the total; the rest is the buyer's due. */
  paidAmount: money("Paid amount must be 0 or more.").optional(),
  paymentMode,
  notes: optionalText(500),
});
