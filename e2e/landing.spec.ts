import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("has correct title", async ({ page }) => {
    await expect(page).toHaveTitle(/Nexxus CRM/);
  });

  test("has pricing section", async ({ page }) => {
    const pricingSection = page.locator("section#pricing");
    await expect(pricingSection).toBeAttached();
    // Scroll to pricing and verify it becomes visible
    await pricingSection.scrollIntoViewIfNeeded();
    await expect(pricingSection).toBeVisible();
  });

  test("navigation links work", async ({ page }) => {
    // Verify key navigation links are present in the header
    const header = page.locator("header").first();
    await expect(header).toBeVisible();

    // Check that Pricing link exists and navigates correctly
    const pricingLink = header.getByRole("link", { name: /pricing/i });
    await expect(pricingLink).toBeVisible();
    await pricingLink.click();
    await expect(page).toHaveURL(/pricing/);

    // Go back to landing and check Sign In link
    await page.goto("/");
    const signInLink = header.getByRole("link", { name: /sign in|log in/i });
    await expect(signInLink).toBeVisible();
    await signInLink.click();
    await expect(page).toHaveURL(/sign-in/);
  });
});
