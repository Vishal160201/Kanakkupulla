import { z } from "zod";
import { parseJsonBody } from "@/lib/validations/http";
import { json, moneyRoute } from "@/lib/money/server/route";
import { previewSms } from "@/lib/money/server/sms";

const schema = z.object({ text: z.string({ message: "Paste an SMS." }).trim().min(1, "Paste an SMS.").max(2000, "That's too long for one SMS.") });

// POST /api/money/sms/preview — what a pasted SMS would add, without saving anything
export const POST = moneyRoute("POST /api/money/sms/preview", async ({ user, request }) => {
  const parsed = await parseJsonBody(request, schema);
  if (parsed.error) return parsed.error;
  return json(await previewSms(user.id, parsed.data.text));
});
