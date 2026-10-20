import { z } from "zod";
import { ACCESS_LEVELS } from "../access";
import { queryInt, queryString } from "./common";

const levelMap = z.record(z.string(), z.enum(ACCESS_LEVELS));
const notificationMap = z.record(z.string(), z.boolean());

/** PUT /api/roles/[id] */
export const roleUpdateSchema = z
  .object({
    permissions: levelMap.optional(),
    notifications: notificationMap.optional(),
    description: z.string().trim().max(300).nullish(),
  })
  .refine(d => d.permissions || d.notifications || d.description !== undefined, { message: "Nothing to update" });

/** PUT /api/roles/owner */
export const ownerNotificationsSchema = z.object({ notifications: notificationMap });

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
