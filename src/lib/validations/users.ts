import { z } from "zod";

export const ROLES = ["ADMIN", "STAFF", "PHOTOGRAPHER"] as const;
export const USER_STATUSES = ["ACTIVE", "PENDING", "INACTIVE"] as const;

/** POST /api/users (admin invites a team member) */
export const userCreateSchema = z.object({
  name: z.string({ message: "Name and email are required" }).trim().min(1, "Name and email are required"),
  email: z
    .string({ message: "Name and email are required" })
    .trim()
    .toLowerCase()
    .min(1, "Name and email are required")
    .pipe(z.email("Invalid email address")),
  role: z.enum(ROLES, { message: "Invalid role" }),
});

/** PUT /api/users/[id] */
export const userUpdateSchema = z
  .object({
    role: z.enum(ROLES, { message: "Invalid role" }).optional().or(z.literal("").transform(() => undefined)),
    status: z.enum(USER_STATUSES, { message: "Invalid status" }).optional().or(z.literal("").transform(() => undefined)),
    name: z.string().trim().nullish(),
    phone: z.string().trim().nullish(),
  })
  .refine(d => d.role !== undefined || d.status !== undefined || d.name !== undefined || d.phone !== undefined, {
    message: "No valid fields provided",
  });

/** PATCH /api/users/me/preferences */
export const userPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
});
