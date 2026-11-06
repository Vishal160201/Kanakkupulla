import { z } from "zod";
import { queryInt } from "./common";

/** GET /api/notifications */
export const notificationListQuerySchema = z.object({
  limit: queryInt(50, 1, 200),
  priority: z.enum(["HIGH", "NORMAL", "LOW"]).optional().catch(undefined),
  isRead: z.string().optional(),
});

/** POST /api/notifications/push — a browser PushSubscription JSON. */
/** Chrome/Edge (FCM), Firefox (Mozilla), Edge/Windows (WNS) and Safari (Apple) push services. */
const PUSH_HOST = /^(fcm\.googleapis\.com|(?:[a-z0-9-]+\.)*push\.services\.mozilla\.com|(?:[a-z0-9-]+\.)*notify\.windows\.com|(?:[a-z0-9-]+\.)*push\.apple\.com)$/;

export const pushSubscriptionSchema = z.object({
  // The server POSTs to this URL, so only the browsers' push services are accepted (no requests to internal hosts)
  endpoint: z
    .url({ message: "Invalid subscription" })
    .max(2048)
    .refine((u) => PUSH_HOST.test(new URL(u).hostname) && u.startsWith("https://"), "Invalid subscription"),
  keys: z.object(
    {
      auth: z.string({ message: "Invalid subscription" }).min(1, "Invalid subscription").max(512),
      p256dh: z.string({ message: "Invalid subscription" }).min(1, "Invalid subscription").max(512),
    },
    { message: "Invalid subscription" }
  ),
});
