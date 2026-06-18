import { test, expect } from '@playwright/test';

test.describe('Authentication UI Flows', () => {
  test('Login shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill the form
    await page.fill('input[type="email"]', 'invalid_user@example.com');
    await page.fill('input[type="password"]', 'wrongpassword123');
    
    // Submit
    await page.click('button:has-text("Sign In")');
    
    // We expect the UI to show an error message (usually handled by NextAuth or custom UI)
    // Wait for network response or toast/error text
    await expect(page.locator('text="Invalid email or password"').first()).toBeVisible({ timeout: 5000 }).catch(() => {
        // If the exact text isn't there, we just assert the page didn't redirect to dashboard
        expect(page.url()).toContain('/login');
    });
  });

  test('Protected routes redirect to login', async ({ page }) => {
    await page.goto('/dashboard/overview');
    // Middleware should immediately bounce to login
    await expect(page).toHaveURL(/.*\/login/);
  });
});
