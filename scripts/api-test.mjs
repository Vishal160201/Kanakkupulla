#!/usr/bin/env node
/**
 * End-to-End API Test Suite for Kanakkupulla
 * Tests every API endpoint: auth, transactions (CRUD, filtering, pagination)
 */

const BASE = "http://localhost:3000";
const TEST_EMAIL = `test_api_${Date.now()}@kanakku.test`;
const TEST_PASSWORD = "TestPass123!";
const TEST_NAME = "API Test User";

let passed = 0;
let failed = 0;
let sessionCookie = "";
let createdTxId = "";

function log(icon, label, detail = "") {
  const color = icon === "✅" ? "\x1b[32m" : icon === "❌" ? "\x1b[31m" : "\x1b[33m";
  console.log(`${color}${icon}\x1b[0m ${label}${detail ? " — " + detail : ""}`);
}

function section(title) {
  console.log(`\n\x1b[1m\x1b[34m━━━ ${title} ━━━\x1b[0m`);
}

async function req(method, path, body, cookies) {
  const headers = { "Content-Type": "application/json" };
  if (cookies) headers["Cookie"] = cookies;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  let data = null;
  try { data = await res.json(); } catch { data = await res.text().catch(() => null); }
  return { status: res.status, data, headers: res.headers };
}

function assert(name, condition, detail = "") {
  if (condition) {
    log("✅", name, detail);
    passed++;
  } else {
    log("❌", name, detail);
    failed++;
  }
}

async function run() {
  console.log("\x1b[1m\x1b[35m╔══════════════════════════════════════════╗");
  console.log("║   Kanakkupulla — API End-to-End Tests   ║");
  console.log("╚══════════════════════════════════════════╝\x1b[0m\n");

  // ─────────────────────────────────────────
  section("1. AUTH — Registration");
  // ─────────────────────────────────────────

  // 1a. Missing fields
  const r_missing = await req("POST", "/api/auth/register", { email: TEST_EMAIL });
  assert("Register: rejects missing fields", r_missing.status === 400, `status=${r_missing.status}`);

  // 1b. Successful registration
  const r_reg = await req("POST", "/api/auth/register", {
    email: TEST_EMAIL, name: TEST_NAME, password: TEST_PASSWORD
  });
  assert("Register: creates user", r_reg.status === 200, `status=${r_reg.status}`);
  assert("Register: returns user object", r_reg.data?.email === TEST_EMAIL, `email=${r_reg.data?.email}`);
  assert("Register: does not return password", !r_reg.data?.password, "password field absent");

  // 1c. Duplicate registration
  const r_dup = await req("POST", "/api/auth/register", {
    email: TEST_EMAIL, name: TEST_NAME, password: TEST_PASSWORD
  });
  assert("Register: rejects duplicate email", r_dup.status >= 400 && r_dup.status < 600, `status=${r_dup.status}`);

  // ─────────────────────────────────────────
  section("2. AUTH — Sign In via NextAuth credentials");
  // ─────────────────────────────────────────

  // NextAuth CSRF token
  const r_csrf = await fetch(`${BASE}/api/auth/csrf`);
  const csrf_data = await r_csrf.json();
  const csrfToken = csrf_data.csrfToken;
  const csrfCookie = r_csrf.headers.get("set-cookie") || "";
  assert("Auth: CSRF token retrieved", !!csrfToken, `token=${csrfToken?.slice(0, 10)}...`);

  // Sign in
  const signInBody = new URLSearchParams({
    csrfToken,
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    json: "true",
  });
  const r_signin = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": csrfCookie,
    },
    body: signInBody.toString(),
    redirect: "manual",
  });
  // Extract session cookie
  const setCookie = r_signin.headers.get("set-cookie") || "";
  const sessionMatch = setCookie.match(/(next-auth\.session-token=[^;]+)/);
  if (sessionMatch) {
    sessionCookie = csrfCookie + "; " + sessionMatch[1];
  }
  assert("Auth: sign-in accepted (3xx redirect)", r_signin.status >= 200 && r_signin.status < 400, `status=${r_signin.status}`);
  assert("Auth: session cookie set", !!sessionMatch, sessionMatch ? "✓ cookie present" : "✗ no cookie");

  // Verify session
  const r_session = await fetch(`${BASE}/api/auth/session`, {
    headers: { Cookie: sessionCookie },
  });
  const session = await r_session.json();
  assert("Auth: session is valid", !!session?.user?.email, `email=${session?.user?.email}`);

  // ─────────────────────────────────────────
  section("3. TRANSACTIONS — Auth Guard");
  // ─────────────────────────────────────────

  const r_unauth = await req("GET", "/api/transactions");
  assert("GET /api/transactions: blocks unauthenticated", r_unauth.status === 401, `status=${r_unauth.status}`);

  const r_post_unauth = await req("POST", "/api/transactions", { amount: 100, type: "INCOME", date: "2024-01-01", category: "Misc", paymentMode: "Cash" });
  assert("POST /api/transactions: blocks unauthenticated", r_post_unauth.status === 401, `status=${r_post_unauth.status}`);

  // ─────────────────────────────────────────
  section("4. TRANSACTIONS — Validation");
  // ─────────────────────────────────────────

  async function authReq(method, path, body) {
    return req(method, path, body, sessionCookie);
  }

  // Missing amount
  const r_val1 = await authReq("POST", "/api/transactions", {
    type: "INCOME", date: "2024-01-15", category: "Misc", paymentMode: "Cash"
  });
  assert("POST: rejects missing amount", r_val1.status === 422, `status=${r_val1.status}`);

  // Negative amount
  const r_val2 = await authReq("POST", "/api/transactions", {
    amount: -500, type: "INCOME", date: "2024-01-15", category: "Misc", paymentMode: "Cash"
  });
  assert("POST: rejects negative amount", r_val2.status === 422, `status=${r_val2.status}`);

  // NaN amount
  const r_val3 = await authReq("POST", "/api/transactions", {
    amount: "not-a-number", type: "INCOME", date: "2024-01-15", category: "Misc", paymentMode: "Cash"
  });
  assert("POST: rejects NaN amount", r_val3.status === 422, `status=${r_val3.status}`);

  // Invalid type
  const r_val4 = await authReq("POST", "/api/transactions", {
    amount: 1000, type: "TRANSFER", date: "2024-01-15", category: "Misc", paymentMode: "Cash"
  });
  assert("POST: rejects invalid type", r_val4.status === 422, `status=${r_val4.status}`);

  // Invalid category
  const r_val5 = await authReq("POST", "/api/transactions", {
    amount: 1000, type: "INCOME", date: "2024-01-15", category: "HACKING", paymentMode: "Cash"
  });
  assert("POST: rejects invalid category", r_val5.status === 422, `status=${r_val5.status}`);

  // Invalid paymentMode
  const r_val6 = await authReq("POST", "/api/transactions", {
    amount: 1000, type: "INCOME", date: "2024-01-15", category: "Misc", paymentMode: "Crypto"
  });
  assert("POST: rejects invalid paymentMode", r_val6.status === 422, `status=${r_val6.status}`);

  // Invalid date
  const r_val7 = await authReq("POST", "/api/transactions", {
    amount: 1000, type: "INCOME", date: "not-a-date", category: "Misc", paymentMode: "Cash"
  });
  assert("POST: rejects invalid date", r_val7.status === 422, `status=${r_val7.status}`);

  // ─────────────────────────────────────────
  section("5. TRANSACTIONS — CREATE (POST)");
  // ─────────────────────────────────────────

  const now = new Date().toISOString().split("T")[0];

  const r_c1 = await authReq("POST", "/api/transactions", {
    amount: 5000, type: "INCOME", date: now,
    category: "Photography Session", paymentMode: "UPI",
    description: "Wedding shoot advance — Rahul & Priya", status: "SETTLED"
  });
  assert("POST: creates INCOME transaction", r_c1.status === 201, `status=${r_c1.status}`);
  assert("POST: returns correct amount", r_c1.data?.amount === 5000, `amount=${r_c1.data?.amount}`);
  assert("POST: returns correct type", r_c1.data?.type === "INCOME", `type=${r_c1.data?.type}`);
  assert("POST: returns correct category", r_c1.data?.category === "Photography Session");
  assert("POST: has userId scoped", !!r_c1.data?.userId, `userId=${r_c1.data?.userId}`);
  createdTxId = r_c1.data?.id;
  log("⚡", `Created transaction ID: ${createdTxId}`);

  // Create a second transaction (EXPENSE) for filter tests
  const r_c2 = await authReq("POST", "/api/transactions", {
    amount: 1200, type: "EXPENSE", date: now,
    category: "Equipment", paymentMode: "Cash",
    description: "Lens cleaning kit"
  });
  assert("POST: creates EXPENSE transaction", r_c2.status === 201, `status=${r_c2.status}`);

  // Create a third (different paymentMode)
  const r_c3 = await authReq("POST", "/api/transactions", {
    amount: 800, type: "EXPENSE", date: now,
    category: "Rent", paymentMode: "Bank Transfer"
  });
  assert("POST: creates Bank Transfer transaction", r_c3.status === 201, `status=${r_c3.status}`);

  // ─────────────────────────────────────────
  section("6. TRANSACTIONS — READ (GET) + Pagination");
  // ─────────────────────────────────────────

  const r_g1 = await authReq("GET", "/api/transactions?view=month");
  assert("GET: returns 200", r_g1.status === 200, `status=${r_g1.status}`);
  const isNewShape = r_g1.data && !Array.isArray(r_g1.data) && Array.isArray(r_g1.data.items);
  assert("GET: returns paginated { items, nextCursor } shape", isNewShape, JSON.stringify(Object.keys(r_g1.data || {})));
  assert("GET: items is array", Array.isArray(r_g1.data?.items), `items type=${typeof r_g1.data?.items}`);
  assert("GET: returns max 50 items", (r_g1.data?.items?.length ?? 0) <= 50, `count=${r_g1.data?.items?.length}`);
  assert("GET: cache is private", (r_g1.headers.get("cache-control") || "").includes("no-store"), `header=${r_g1.headers.get("cache-control")}`);

  // Data isolation — verify test user only sees their own data
  if (r_g1.data?.items?.length > 0) {
    const allMine = r_g1.data.items.every(tx => tx.userId === r_c1.data?.userId);
    assert("GET: only returns authenticated user's transactions", allMine, `all items userId=${r_c1.data?.userId}`);
  }

  // ─────────────────────────────────────────
  section("7. TRANSACTIONS — Filtering");
  // ─────────────────────────────────────────

  // Filter by type=INCOME
  const r_f1 = await authReq("GET", `/api/transactions?view=month&type=INCOME`);
  const incomeOnly = r_f1.data?.items?.every(tx => tx.type === "INCOME");
  assert("GET ?type=INCOME: returns only income", incomeOnly !== false, `all INCOME=${incomeOnly}`);

  // Filter by type=EXPENSE
  const r_f2 = await authReq("GET", `/api/transactions?view=month&type=EXPENSE`);
  const expenseOnly = r_f2.data?.items?.every(tx => tx.type === "EXPENSE");
  assert("GET ?type=EXPENSE: returns only expenses", expenseOnly !== false, `all EXPENSE=${expenseOnly}`);

  // Filter by paymentMode=UPI
  const r_f3 = await authReq("GET", `/api/transactions?view=month&paymentMode=UPI`);
  const upiOnly = r_f3.data?.items?.every(tx => tx.paymentMode === "UPI");
  assert("GET ?paymentMode=UPI: returns only UPI", upiOnly !== false, `all UPI=${upiOnly}`);

  // Filter by category
  const r_f4 = await authReq("GET", `/api/transactions?view=month&categories=Equipment`);
  const catOnly = r_f4.data?.items?.every(tx => tx.category === "Equipment");
  assert("GET ?categories=Equipment: returns only Equipment", catOnly !== false, `all Equipment=${catOnly}`);

  // Filter by dateFrom/dateTo
  const r_f5 = await authReq("GET", `/api/transactions?dateFrom=${now}&dateTo=${now}`);
  assert("GET ?dateFrom&dateTo: returns records for today", r_f5.status === 200, `status=${r_f5.status}`);
  assert("GET ?dateFrom&dateTo: finds today's transactions", (r_f5.data?.items?.length ?? 0) >= 3, `count=${r_f5.data?.items?.length}`);

  // Filter by amountMin
  const r_f6 = await authReq("GET", `/api/transactions?view=month&amountMin=2000`);
  const minOk = r_f6.data?.items?.every(tx => tx.amount >= 2000);
  assert("GET ?amountMin=2000: returns amounts ≥ 2000", minOk !== false, `all ≥2000=${minOk}`);

  // Filter by amountMax
  const r_f7 = await authReq("GET", `/api/transactions?view=month&amountMax=1000`);
  const maxOk = r_f7.data?.items?.every(tx => tx.amount <= 1000);
  assert("GET ?amountMax=1000: returns amounts ≤ 1000", maxOk !== false, `all ≤1000=${maxOk}`);

  // view=day
  const r_f8 = await authReq("GET", `/api/transactions?view=day`);
  assert("GET ?view=day: returns 200", r_f8.status === 200, `status=${r_f8.status}`);
  assert("GET ?view=day: finds today's data", (r_f8.data?.items?.length ?? 0) >= 3, `count=${r_f8.data?.items?.length}`);

  // view=week
  const r_f9 = await authReq("GET", `/api/transactions?view=week`);
  assert("GET ?view=week: returns 200", r_f9.status === 200, `status=${r_f9.status}`);

  // type=ALL should not filter
  const r_f10a = await authReq("GET", `/api/transactions?view=month&type=ALL`);
  const r_f10b = await authReq("GET", `/api/transactions?view=month`);
  assert("GET ?type=ALL: behaves same as no type filter", 
    r_f10a.data?.items?.length === r_f10b.data?.items?.length,
    `with ALL=${r_f10a.data?.items?.length} vs without=${r_f10b.data?.items?.length}`
  );

  // ─────────────────────────────────────────
  section("8. TRANSACTIONS — UPDATE (PUT)");
  // ─────────────────────────────────────────

  if (!createdTxId) {
    log("⚠", "Skipping PUT tests — no transaction ID available");
  } else {
    // Valid update
    const r_u1 = await authReq("PUT", `/api/transactions/${createdTxId}`, {
      amount: 7500, type: "INCOME", date: now,
      category: "Photography Session", paymentMode: "Bank Transfer",
      description: "Updated description"
    });
    assert("PUT: updates transaction", r_u1.status === 200, `status=${r_u1.status}`);
    assert("PUT: returns updated amount", r_u1.data?.amount === 7500, `amount=${r_u1.data?.amount}`);
    assert("PUT: returns updated paymentMode", r_u1.data?.paymentMode === "Bank Transfer", `mode=${r_u1.data?.paymentMode}`);

    // Validate — negative amount
    const r_u2 = await authReq("PUT", `/api/transactions/${createdTxId}`, {
      amount: -100, type: "INCOME", date: now,
      category: "Misc", paymentMode: "Cash"
    });
    assert("PUT: rejects negative amount", r_u2.status === 422, `status=${r_u2.status}`);

    // Non-existent ID
    const r_u3 = await authReq("PUT", `/api/transactions/nonexistent_id_999`, {
      amount: 100, type: "INCOME", date: now,
      category: "Misc", paymentMode: "Cash"
    });
    assert("PUT: returns 404 for nonexistent ID", r_u3.status === 404, `status=${r_u3.status}`);
  }

  // ─────────────────────────────────────────
  section("9. TRANSACTIONS — DELETE");
  // ─────────────────────────────────────────

  if (!createdTxId) {
    log("⚠", "Skipping DELETE tests — no transaction ID available");
  } else {
    // Delete nonexistent
    const r_d1 = await authReq("DELETE", `/api/transactions/nonexistent_id_999`);
    assert("DELETE: returns 404 for nonexistent ID", r_d1.status === 404, `status=${r_d1.status}`);

    // Delete existing
    const r_d2 = await authReq("DELETE", `/api/transactions/${createdTxId}`);
    assert("DELETE: deletes transaction", r_d2.status === 200, `status=${r_d2.status}`);
    assert("DELETE: returns success=true", r_d2.data?.success === true, `success=${r_d2.data?.success}`);

    // Verify it's gone
    const r_d3 = await authReq("GET", `/api/transactions?dateFrom=${now}&dateTo=${now}`);
    const stillExists = r_d3.data?.items?.some(tx => tx.id === createdTxId);
    assert("DELETE: transaction no longer exists in GET", !stillExists, `found=${stillExists}`);

    // Delete already-deleted (should 404)
    const r_d4 = await authReq("DELETE", `/api/transactions/${createdTxId}`);
    assert("DELETE: idempotent — returns 404 on re-delete", r_d4.status === 404, `status=${r_d4.status}`);
  }

  // ─────────────────────────────────────────
  section("10. SECURITY — Data Isolation");
  // ─────────────────────────────────────────

  // Sign in as the test@test.com user (existing)
  const r_csrf2 = await fetch(`${BASE}/api/auth/csrf`);
  const csrf_data2 = await r_csrf2.json();
  const csrfCookie2 = r_csrf2.headers.get("set-cookie") || "";

  const signInBody2 = new URLSearchParams({
    csrfToken: csrf_data2.csrfToken,
    email: "test@test.com",
    password: "test",
    json: "true",
  });
  const r_signin2 = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookie2,
    },
    body: signInBody2.toString(),
    redirect: "manual",
  });
  const setCookie2 = r_signin2.headers.get("set-cookie") || "";
  const sessionMatch2 = setCookie2.match(/(next-auth\.session-token=[^;]+)/);
  const otherSession = sessionMatch2 ? csrfCookie2 + "; " + sessionMatch2[1] : "";

  if (otherSession && r_c2.data?.id) {
    // Try to delete test user's transaction as "other" user
    const r_iso = await req("DELETE", `/api/transactions/${r_c2.data.id}`, null, otherSession);
    assert("Security: user cannot delete another user's transaction", r_iso.status === 404, `status=${r_iso.status}`);

    // Try to update test user's transaction as "other" user
    const r_iso2 = await req("PUT", `/api/transactions/${r_c2.data.id}`, {
      amount: 999, type: "EXPENSE", date: now, category: "Misc", paymentMode: "Cash"
    }, otherSession);
    assert("Security: user cannot update another user's transaction", r_iso2.status === 404, `status=${r_iso2.status}`);
  } else {
    log("⚠", "Skipping isolation test — test@test.com login unavailable (expected)");
  }

  // ─────────────────────────────────────────
  // RESULTS
  // ─────────────────────────────────────────
  const total = passed + failed;
  console.log(`\n\x1b[1m═══════════════════════════════════════════`);
  console.log(`  RESULTS: ${passed}/${total} tests passed`);
  console.log(`═══════════════════════════════════════════\x1b[0m`);
  if (failed > 0) {
    console.log(`\x1b[31m  ${failed} test(s) FAILED\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m  All tests passed! 🎉\x1b[0m`);
    process.exit(0);
  }
}

run().catch(err => {
  console.error("\x1b[31m\nFATAL ERROR:", err.message, "\x1b[0m");
  process.exit(1);
});
