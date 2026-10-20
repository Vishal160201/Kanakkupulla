import { z } from "zod";

export const USER_STATUSES = ["ACTIVE", "PENDING", "INACTIVE"] as const;

/** Per-shop role assignment (members only; owners need none). */
const assignment = z.object({ shopId: z.string().trim().min(1), roleId: z.string().trim().min(1) });
const assignments = z.array(assignment).max(100, "Too many shops.");

/** POST /api/users (owner invites a team member) */
export const userCreateSchema = z
  .object({
    name: z.string({ message: "Name and email are required" }).trim().min(1, "Name and email are required"),
    email: z
      .string({ message: "Name and email are required" })
      .trim()
      .toLowerCase()
      .min(1, "Name and email are required")
      .pipe(z.email("Invalid email address")),
    phone: z.string().trim().max(20).nullish().transform(v => v || null),
    isOwner: z.boolean().default(false),
    assignments: assignments.default([]),
  })
  .refine(d => d.isOwner || d.assignments.length > 0, {
    message: "Give the person access to at least one shop.",
    path: ["assignments"],
  });

/** PUT /api/users/[id] */
export const userUpdateSchema = z
  .object({
    status: z.enum(USER_STATUSES, { message: "Invalid status" }).optional().or(z.literal("").transform(() => undefined)),
    name: z.string().trim().nullish(),
    phone: z.string().trim().nullish(),
    isOwner: z.boolean().optional(),
    assignments: assignments.optional(),
  })
  .refine(
    d => d.status !== undefined || d.name !== undefined || d.phone !== undefined || d.isOwner !== undefined || d.assignments !== undefined,
    { message: "No valid fields provided" }
  );

/** PATCH /api/users/me/preferences */
export const userPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
});
