import { z } from "zod";
import { nonNegativeAmount, numeric, paginationQuery } from "./common";

const stockInput = numeric("Stock must be a number.").transform(n => Math.trunc(n));

export const productListQuerySchema = paginationQuery(200, 500);

export const productCreateSchema = z.object({
  name: z.string({ message: "Name and price are required" }).trim().min(1, "Name and price are required"),
  description: z.string().nullish(),
  price: nonNegativeAmount("Price must be zero or more."),
  stock: stockInput.nullish().or(z.literal("")),
});

export const productUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").optional(),
  description: z.string().nullish(),
  price: nonNegativeAmount("Price must be zero or more.").optional(),
  stock: stockInput.optional(),
});
