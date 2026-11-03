import { expect, test } from "@playwright/test";

// Signed-out checks only: they need the app running but no test account or seeded data.

test("signed-out visitors are sent to the login page", async ({ page }) => {
  for (const path of ["/", "/dashboard/overview", "/transactions", "/inventory", "/settings"]) {
    await page.goto(path);
    await expect(page, `${path} should redirect`).toHaveURL(/\/login/);
  }
});

test("login page renders the sign-in form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("APIs reject requests without a session", async ({ request }) => {
  for (const path of ["/api/transactions", "/api/bookings", "/api/users", "/api/inventory/bills", "/api/shops"]) {
    const res = await request.get(path);
    expect([401, 403], `${path} returned ${res.status()}`).toContain(res.status());
  }
});

test("cron endpoints reject requests without the secret", async ({ request }) => {
  const res = await request.get("/api/cron/daily-reminders");
  expect(res.status()).toBe(403);
});
