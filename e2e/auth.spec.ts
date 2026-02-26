import { test, expect } from "@playwright/test";

test.describe("Auth redirects", () => {
  test("/dashboard redirects to sign-in when not authenticated", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    // Clerk middleware redirects unauthenticated users to /sign-in
    await expect(page).toHaveURL(/sign-in/);
  });

  test("/api/crm/contacts redirects to sign-in without auth", async ({
    request,
  }) => {
    const response = await request.get("/api/crm/contacts", {
      maxRedirects: 0,
    });
    // Clerk middleware returns a redirect (307) to /sign-in for protected API routes
    expect(response.status()).toBe(307);
    const location = response.headers()["location"];
    expect(location).toContain("/sign-in");
  });
});
