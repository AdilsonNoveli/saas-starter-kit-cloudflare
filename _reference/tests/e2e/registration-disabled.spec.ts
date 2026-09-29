import { test, expect } from '@playwright/test';

/**
 * E2E Test: Registration Disabled Feature (DISABLE_REGISTRATION)
 * Tests: Registration control when DISABLE_REGISTRATION=true
 *
 * NOTE: These tests require manual setup of DISABLE_REGISTRATION env var
 * For CI/CD, you may want to skip these or run them in a separate environment
 */

test.describe('Registration Disabled Feature', () => {
  test.describe('When registration is enabled (default)', () => {
    test('should show registration form', async ({ page }) => {
      await page.goto('/register');

      // Should show the registration form
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('input[name="name"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should allow user registration', async ({ page }) => {
      const testEmail = `test-${Date.now()}@example.com`;
      const testPassword = 'TestPassword123!';
      const testName = 'Test User';

      await page.goto('/register');

      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.fill('input[name="confirmPassword"]', testPassword);
      await page.fill('input[name="name"]', testName);

      await page.click('button[type="submit"]');

      // Should show success message (either verification email or success)
      await expect(
        page.getByText(/check your email|created successfully/i)
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe.skip('When DISABLE_REGISTRATION=true', () => {
    // These tests require DISABLE_REGISTRATION to be set in the environment
    // Skip by default as they require specific setup
    // To run: Set DISABLE_REGISTRATION=true in .env and remove .skip

    test('should show disabled message when users exist', async ({ page }) => {
      await page.goto('/register');

      // Should show "Registration Disabled" message
      await expect(page.getByText(/registration.*disabled/i)).toBeVisible({
        timeout: 3000,
      });

      // Should NOT show the registration form
      await expect(page.locator('input[name="email"]')).not.toBeVisible();
      await expect(page.locator('input[name="password"]')).not.toBeVisible();
      await expect(page.locator('button[type="submit"]')).not.toBeVisible();

      // Should show link back to login
      await expect(page.getByText(/back to login/i)).toBeVisible();
    });

    test('should allow first user registration when no users exist', async ({ page }) => {
      // This test requires a clean database with no users
      // Typically only useful in isolated test environments

      await page.goto('/register');

      // Should show the registration form (because user count is 0)
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('input[name="name"]')).toBeVisible();

      const testEmail = `first-user-${Date.now()}@example.com`;
      const testPassword = 'FirstUser123!';
      const testName = 'First User';

      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.fill('input[name="confirmPassword"]', testPassword);
      await page.fill('input[name="name"]', testName);

      await page.click('button[type="submit"]');

      // Should complete registration successfully
      await expect(
        page.getByText(/check your email|created successfully/i)
      ).toBeVisible({ timeout: 5000 });
    });

    test('should show disabled message immediately after first user registers', async ({ page }) => {
      // This test assumes the first user has already registered
      // The registration-status endpoint should now return disabled

      await page.goto('/register');

      // Should show "Registration Disabled" message
      await expect(page.getByText(/registration.*disabled/i)).toBeVisible({
        timeout: 3000,
      });

      // Should NOT show the registration form
      await expect(page.locator('input[name="email"]')).not.toBeVisible();
    });

    test('should not allow API registration when disabled', async ({ page: _page, request }) => {
      // Try to register directly via API
      const response = await request.post('/api/auth/register', {
        data: {
          email: `blocked-${Date.now()}@example.com`,
          password: 'BlockedUser123!',
          name: 'Blocked User',
        },
      });

      // Should return 403 Forbidden
      expect(response.status()).toBe(403);

      const body = await response.json();
      expect(body.error).toContain('disabled');
    });

    test('should check status endpoint correctly', async ({ page: _page, request }) => {
      // Check the registration-status endpoint
      const response = await request.get('/api/auth/registration-status');

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.enabled).toBe(false);
      expect(body.message).toBe('Registration is currently disabled');
    });

    test('should allow navigation back to login', async ({ page }) => {
      await page.goto('/register');

      // Wait for disabled message
      await expect(page.getByText(/registration.*disabled/i)).toBeVisible();

      // Click back to login link
      await page.click('a:has-text("Back to login")');

      // Should navigate to login page
      await expect(page).toHaveURL('/login', { timeout: 3000 });
    });
  });
});
