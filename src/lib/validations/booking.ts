import { z } from "zod";

export const bookingSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Client name is required"),
  category: z.string(),
  date: z.string(),
  time: z.string(),
  location: z.string().min(1, "Location is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  package: z.string().optional(),
  advance: z.string().optional(),
  due: z.string().optional(),
  status: z.enum(['Confirmed', 'Pending', 'Partial']),
});

export type BookingFormData = z.infer<typeof bookingSchema>;
