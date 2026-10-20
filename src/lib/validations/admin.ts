import { z } from "zod";
import { ROLES } from "./users";
import { queryInt, queryString } from "./common";

/** PUT /api/permissions */
export const permissionUpdateSchema = z.object({
  role: z.enum(ROLES, { message: "role, permission, and enabled are required" }),
  permission: z
    .string({ message: "role, permission, and enabled are required" })
    .min(1, "role, permission, and enabled are required")
    .max(100),
  enabled: z.boolean({ message: "role, permission, and enabled are required" }),
});

/** GET /api/system-logs */
export const systemLogQuerySchema = z.object({
  limit: queryInt(100, 1, 500),
  action: queryString,
});

/** GET /api/search */
export const searchQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .transform(v => (v ?? "").trim().slice(0, 100)),
});
