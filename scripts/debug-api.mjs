#!/usr/bin/env node
// Detailed POST debug with session from previous flow
const BASE = "http://localhost:3000";
const EMAIL = `dbg2_${Date.now()}@test.local`;
const PASS = "Debug123!";

async function main() {
  // Register fresh user
  await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, name: "Debug2", password: PASS }),
  });

  // CSRF + Login
  const r_csrf = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await r_csrf.json();
  const csrfCookies = r_csrf.headers.get("set-cookie") || "";

  const loginBody = new URLSearchParams({ csrfToken, email: EMAIL, password: PASS, json: "true" });
  const r_login = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: csrfCookies },
    body: loginBody.toString(),
    redirect: "manual",
  });
  const setCookies = r_login.headers.get("set-cookie") || "";
  const tokenMatch = setCookies.match(/(next-auth\.session-token=[^;,]+)/);
  const sessionCookie = tokenMatch ? csrfCookies + "; " + tokenMatch[1] : csrfCookies;

  console.log("All cookies being sent:", sessionCookie.replace(/(?<=token=)[^;]+/, "[REDACTED]"));

  // Check session resolves correctly
  const sessionResp = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: sessionCookie } });
  const session = await sessionResp.json();
  console.log("User ID from session:", session?.user?.id);

  // Try the actual POST
  const payload = {
    amount: 1000,
    type: "INCOME",
    date: new Date().toISOString().split("T")[0],
    category: "Misc",
    paymentMode: "Cash",
    description: "test",
    status: "SETTLED"
  };
  console.log("Sending payload:", JSON.stringify(payload));

  const r = await fetch(`${BASE}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: sessionCookie },
    body: JSON.stringify(payload),
  });
  
  const text = await r.text();
  console.log("Status:", r.status);
  console.log("Response:", text);
}

main().catch(console.error);
