import { z } from "zod";

export const bookingSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Client name is required"),
  category: z.string(),
  date: z.string().optional().or(z.literal("")),
  time: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  package: z.string().optional(),
  advance: z.string().optional(),
  due: z.string().optional(),
  installments: z.string().optional(),
  status: z.string(),
  albumStatus: z.string().optional().or(z.literal("")),
  galleryDelivered: z.union([z.boolean(), z.string()]).optional(),
}).catchall(z.unknown()); // dynamic layout fields (fld_*), typed as unknown

export type BookingFormData = z.infer<typeof bookingSchema>;

// ---------- API route schemas (/api/bookings/*) ----------

export const ALBUM_STATUSES = ["PENDING", "IN_PROGRESS", "DELIVERED"] as const;

/** Accepts "Pending" / "In Progress" / "IN_PROGRESS" etc. */
export const albumStatusInput = z
  .string()
  .transform(v => v.trim().toUpperCase().replace(/[\s-]+/g, "_"))
  .pipe(z.enum(ALBUM_STATUSES, { message: "Invalid album status." }));

const jsonObjectInput = z.record(z.string(), z.json());
const optionalString = z.string().nullish();

const requiredDate = z
  .union([z.string(), z.number()], { message: "A valid date is required." })
  .refine(v => !isNaN(new Date(v).getTime()), { message: "A valid date is required." });

export const bookingCreateApiSchema = z.object({
  clientId: z.string({ message: "Missing required fields" }).min(1, "Missing required fields"),
  category: optionalString,
  date: requiredDate,
  time: z.string({ message: "Missing required fields" }).min(1, "Missing required fields"),
  location: z.string({ message: "Missing required fields" }).min(1, "Missing required fields"),
  status: optionalString,
  galleryUrl: optionalString,
  contractUrl: optionalString,
  customData: jsonObjectInput.nullish(),
});

export const bookingUpdateApiSchema = z.object({
  category: z.string().optional(),
  date: requiredDate.nullish().or(z.literal("")),
  time: z.string().optional(),
  location: z.string().optional(),
  status: z.string().optional(),
  galleryUrl: optionalString,
  contractUrl: optionalString,
  customData: jsonObjectInput.nullish(),
  packageName: optionalString,
  inclusions: z.json().optional(),
  notes: optionalString,
  attachments: z.json().optional(),
  photographers: z.json().optional(),
});

export const bookingStatusApiSchema = z.object({
  status: z.string({ message: "Status is required" }).trim().min(1, "Status is required"),
  albumStatus: albumStatusInput.nullish(),
  customData: jsonObjectInput.nullish(),
});

export const bookingListQuerySchema = z.object({
  includeDeleted: z.string().optional().transform(v => v === "true"),
  startDate: z.string().optional().refine(v => !v || !isNaN(new Date(v).getTime()), "Invalid startDate"),
  endDate: z.string().optional().refine(v => !v || !isNaN(new Date(v).getTime()), "Invalid endDate"),
  limit: z.string().optional().transform(v => {
    const n = parseInt(v ?? "", 10);
    return Number.isFinite(n) ? Math.min(Math.max(n, 1), 500) : 100;
  }),
  offset: z.string().optional().transform(v => {
    const n = parseInt(v ?? "", 10);
    return Number.isFinite(n) ? Math.max(n, 0) : 0;
  }),
});

export const bookingDeleteQuerySchema = z.object({
  hard: z.string().optional().transform(v => v === "true"),
});
