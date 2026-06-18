import { test, expect } from '@playwright/test';

test.describe('Navigation Sidebar UI Tests', () => {
  // Use a login bypass or start at a route assuming we bypass auth for now,
  // or test the UI elements directly. For UI test, we can just navigate to login.
  test('Login Page UI Elements Render', async ({ page }) => {
    await page.goto('/login');
    
    // Check if the logo is visible
    await expect(page.locator('img[alt="Kanakkupulla Logo"]')).toBeVisible();
    
    // Check if form is visible
    await expect(page.locator('form')).toBeVisible();
    
    // Check for "Sign In" button
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
    
    // Check for email input
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('Signup Page UI Elements Render', async ({ page }) => {
    await page.goto('/signup');
    
    await expect(page.locator('img[alt="Kanakkupulla Logo"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeVisible();
  });
});
