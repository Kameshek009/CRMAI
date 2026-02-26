import { test, expect } from "@playwright/test";

test.describe("Public API endpoints", () => {
  test("health endpoint returns valid JSON", async ({ request }) => {
    const response = await request.get("/api/health");
    expect([200, 503]).toContain(response.status());
    const body = await response.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("timestamp");
    expect(body).toHaveProperty("checks");
  });

  test("protected API returns redirect for unauthenticated", async ({ request }) => {
    const endpoints = [
      "/api/crm/contacts",
      "/api/crm/deals",
      "/api/crm/tasks",
      "/api/crm/companies",
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint, { maxRedirects: 0 });
      // Clerk middleware returns 307 redirect to /sign-in
      expect(response.status()).toBe(307);
    }
  });

  test("POST to protected API returns redirect", async ({ request }) => {
    const response = await request.post("/api/crm/contacts", {
      data: { first_name: "Test" },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
  });

  test("billing webhook accepts POST", async ({ request }) => {
    const response = await request.post("/api/billing/webhook", {
      data: {},
      headers: { "content-type": "application/json" },
    });
    // Should return 400 (bad request) not 500 (server error) for missing stripe signature
    expect([400, 401, 403]).toContain(response.status());
  });
});
