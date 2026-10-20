import { z } from "zod";
import { queryInt } from "./common";

/** GET /api/notifications */
export const notificationListQuerySchema = z.object({
  limit: queryInt(50, 1, 200),
  priority: z.enum(["HIGH", "NORMAL", "LOW"]).optional().catch(undefined),
  isRead: z.string().optional(),
});

/** POST /api/notifications/push — a browser PushSubscription JSON. */
export const pushSubscriptionSchema = z.object({
  endpoint: z.url({ message: "Invalid subscription" }).max(2048),
  keys: z.object(
    {
      auth: z.string({ message: "Invalid subscription" }).min(1, "Invalid subscription").max(512),
      p256dh: z.string({ message: "Invalid subscription" }).min(1, "Invalid subscription").max(512),
    },
    { message: "Invalid subscription" }
  ),
});
