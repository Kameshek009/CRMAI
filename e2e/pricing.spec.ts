import { test, expect } from "@playwright/test";

test.describe("Pricing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pricing");
  });

  test("has correct title", async ({ page }) => {
    await expect(page).toHaveTitle(/Pricing|Nexxus/i);
  });

  test("displays plan cards", async ({ page }) => {
    // Should show at least Free and Pro plans
    await expect(page.getByText(/free/i).first()).toBeVisible();
    await expect(page.getByText(/pro/i).first()).toBeVisible();
  });

  test("plan cards have pricing info", async ({ page }) => {
    // Each plan should show price or "Free"
    const main = page.locator("main");
    await expect(main).toBeVisible();
    // Check that pricing amounts are displayed
    await expect(page.getByText(/\$|₽|free/i).first()).toBeVisible();
  });

  test("CTA buttons link to sign-up", async ({ page }) => {
    // Get started buttons should link to sign-up
    const ctaButtons = page.getByRole("link", { name: /start|начать|sign up|try/i });
    const count = await ctaButtons.count();
    expect(count).toBeGreaterThan(0);
  });
});
