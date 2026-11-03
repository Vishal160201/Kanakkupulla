import { z } from "zod";

/** POST /api/auth/forgot-password (`email` may also be a username; the field name is kept for the sign-in page) */
export const forgotPasswordSchema = z.object({
  email: z
    .string({ message: "Email or username is required" })
    .trim()
    .toLowerCase()
    .min(1, "Email or username is required")
    .max(320),
});

/** POST /api/auth/reset-password */
export const resetPasswordSchema = z.object({
  token: z.string({ message: "Missing required fields" }).min(1, "Missing required fields").max(512),
  password: z
    .string({ message: "Missing required fields" })
    .min(6, "Password must be at least 6 characters")
    .max(200, "Password is too long"),
});
