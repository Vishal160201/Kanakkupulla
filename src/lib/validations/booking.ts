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
}).catchall(z.any());

export type BookingFormData = z.infer<typeof bookingSchema>;
