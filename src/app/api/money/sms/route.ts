import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, MINUTE } from "@/lib/rateLimit";
import { ingestSms, userForSmsToken } from "@/lib/money/server/sms";

const NO_STORE = { "Cache-Control": "private, no-store" };
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: NO_STORE });

const body = z.object({ text: z.string().trim().min(1).max(2000) });

/**
 * POST /api/money/sms — a bank SMS forwarded by the phone (iPhone Shortcuts automation).
 * Signs in with the phone key from My Wallet → Settings → iPhone SMS, not a browser session.
 * Accepts JSON { text } (also "message" / "content"), or the SMS as the plain body.
 */
export async function POST(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const user = token ? await userForSmsToken(token) : null;
  if (!user) return reply({ error: "Not found" }, 404);
  if (!(await rateLimit(`money-sms:${user.id}`, 120, 15 * MINUTE))) return reply({ error: "Too many messages. Try again in a few minutes." }, 429);

  const raw = await request.text().catch(() => "");
  if (raw.length > 8000) return reply({ error: "That message is too long." }, 413);
  let text = raw;
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const v = j.text ?? j.message ?? j.content ?? j.body;
    if (typeof v === "string") text = v;
  } catch {
    /* plain text body */
  }
  const parsed = body.safeParse({ text });
  if (!parsed.success) return reply({ error: "Send the SMS text as { \"text\": \"…\" }." }, 422);
  try {
    const result = await ingestSms(user.id, parsed.data.text);
    return reply(result);
  } catch (error) {
    console.error("POST /api/money/sms failed", (error as Error)?.name);
    return reply({ error: "Couldn't save that message" }, 500);
  }
}
