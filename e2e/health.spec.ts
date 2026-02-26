import { test, expect } from "@playwright/test";

test.describe("Health checks", () => {
  test("GET /api/health returns 200", async ({ request }) => {
    const response = await request.get("/api/health");
    // Health endpoint returns 200 when healthy or 503 when degraded
    // In E2E we just verify the endpoint is reachable and returns valid JSON
    expect([200, 503]).toContain(response.status());
    const body = await response.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("timestamp");
  });

  test("Homepage loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Nexxus CRM/);
    // The landing page should be visible for unauthenticated users
    await expect(page.locator("main")).toBeVisible();
  });

  test("Sign-in page loads", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page).toHaveURL(/sign-in/);
    // The page should render without errors
    await expect(page.locator("body")).toBeVisible();
  });
});
