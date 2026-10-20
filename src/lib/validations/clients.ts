import { z } from "zod";
import { paginationQuery, queryString } from "./common";

export const clientListQuerySchema = paginationQuery(200, 500).extend({
  search: queryString,
});

export const clientCreateSchema = z.object({
  name: z.string({ message: "Name and phone are required" }).trim().min(1, "Name and phone are required"),
  phone: z.string({ message: "Name and phone are required" }).trim().min(1, "Name and phone are required"),
  email: z.string().trim().nullish(),
});

export const clientUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().nullish(),
});
