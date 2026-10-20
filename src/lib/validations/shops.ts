import { z } from "zod";
import { idSchema, queryBoolean } from "./common";

const name = z.string({ message: "Shop name is required." }).trim().min(1, "Shop name is required.").max(60, "Shop name is too long.");
const color = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Colour must be a hex value like #6366f1.");
const icon = z
  .string()
  .trim()
  .max(16, "Icon must be a single emoji.")
  .nullish()
  .transform(v => (v ? v : null));

/** POST /api/shops */
export const shopCreateSchema = z.object({
  name,
  color: color.optional(),
  icon,
  isDefault: z.boolean().optional(),
});

/** PUT /api/shops/[id] */
export const shopUpdateSchema = z.object({
  name: name.optional(),
  color: color.optional(),
  icon: icon.optional(),
  isDefault: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

/** GET /api/shops */
export const shopListQuerySchema = z.object({
  includeArchived: queryBoolean.optional(),
});

/** Optional `?shopId=` read filter; "all" or empty means every shop. */
export const shopIdQuery = z
  .string()
  .trim()
  .max(100)
  .nullish()
  .transform(v => (v && v !== "all" ? v : undefined));

export const shopParamsSchema = z.object({ id: idSchema });
