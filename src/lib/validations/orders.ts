import { z } from "zod";
import { nonNegativeAmount, numeric, paginationQuery } from "./common";

const amount = (label: string) => nonNegativeAmount(`${label} must be zero or more.`);
const quantity = numeric("Quantity must be a number.")
  .transform(n => Math.trunc(n))
  .refine(n => n >= 1, { message: "Quantity must be at least 1." });

export const orderListQuerySchema = paginationQuery(200, 500);

/** POST /api/orders (booking package orders) */
export const orderCreateSchema = z.object({
  bookingId: z.string({ message: "Booking ID is required" }).min(1, "Booking ID is required"),
  packageAmount: amount("Package amount").nullish(),
  advanceAmount: amount("Advance amount").nullish(),
  dueAmount: amount("Due amount").nullish(),
});

/** PUT /api/orders/[id] */
export const orderUpdateSchema = z.object({
  packageAmount: amount("Package amount").optional(),
  advanceAmount: amount("Advance amount").optional(),
  dueAmount: amount("Due amount").optional(),
});

export const productOrderListQuerySchema = paginationQuery(200, 500);

/** POST /api/product-orders */
export const productOrderCreateSchema = z.object({
  productId: z.string({ message: "Product ID and client name are required" }).min(1, "Product ID and client name are required"),
  clientName: z.string({ message: "Product ID and client name are required" }).trim().min(1, "Product ID and client name are required"),
  clientPhone: z.string().trim().nullish(),
  quantity: quantity.nullish().or(z.literal("")),
  status: z.string().trim().nullish(),
});

/** PUT /api/product-orders/[id] */
export const productOrderUpdateSchema = z.object({
  quantity: quantity.optional(),
  status: z.string().trim().min(1).optional(),
  clientName: z.string().trim().min(1, "Client name cannot be empty").optional(),
  clientPhone: z.string().trim().nullish(),
});
