import { NextRequest } from "next/server";

/**
 * Default workspace context for testing CRM API routes.
 */
export function mockTeamContext(overrides?: Record<string, unknown>) {
  return {
    context: {
      accountId: "acc-test-123",
      workspaceId: "ws-test-456",
      teamId: "ws-test-456",
      memberId: "mem-test-789",
      tier: "pro" as const,
      fixedRole: "admin" as const,
      isOwner: true,
      isDirector: true,
      permissions: {
        contacts: { read: true, create: true, update: true, delete: true },
        companies: { read: true, create: true, update: true, delete: true },
        deals: { read: true, create: true, update: true, delete: true },
        tasks: { read: true, create: true, update: true, delete: true },
        notes: { read: true, create: true, update: true, delete: true },
        activities: { read: true },
        team_settings: { manage: true },
        analytics: { read: true },
      },
      visibilityGroupIds: [],
      ...overrides,
    },
    error: null,
  };
}

/**
 * Context with no permissions (viewer-like).
 */
export function mockNoPermContext() {
  return mockTeamContext({
    isOwner: false,
    isDirector: false,
    fixedRole: "viewer",
    permissions: {
      contacts: {},
      companies: {},
      deals: {},
      tasks: {},
      notes: {},
      activities: {},
      team_settings: {},
      analytics: {},
    },
  });
}

/**
 * Context that simulates auth failure.
 */
export function mockAuthError() {
  const { NextResponse } = require("next/server");
  return {
    context: null,
    error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
  };
}

/**
 * Create a test NextRequest.
 */
export function createTestRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>
): NextRequest {
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

/**
 * Mock params for [id] routes (Next.js 15+ uses Promise<{ id: string }>)
 */
export function mockParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}
