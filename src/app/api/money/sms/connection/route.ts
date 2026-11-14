import { json, moneyRoute } from "@/lib/money/server/route";
import { createSmsToken, revokeSmsToken, smsConnection } from "@/lib/money/server/sms";

const siteUrl = (request: Request) => (process.env.NEXTAUTH_URL || new URL(request.url).origin).replace(/\/$/, "");

// GET — is a phone connected, when it last sent something, and what the last messages did
export const GET = moneyRoute("GET /api/money/sms/connection", async ({ user, request }) =>
  json({ ...(await smsConnection(user.id)), url: `${siteUrl(request)}/api/money/sms` }),
);

// POST — a new phone key (shown once; the old one stops working)
export const POST = moneyRoute("POST /api/money/sms/connection", async ({ user, request }) =>
  json({ token: await createSmsToken(user.id), url: `${siteUrl(request)}/api/money/sms` }, { status: 201 }),
);

// DELETE — disconnect the phone
export const DELETE = moneyRoute("DELETE /api/money/sms/connection", async ({ user }) => {
  await revokeSmsToken(user.id);
  return json({ ok: true });
});
