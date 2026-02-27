import { NextRequest, NextResponse } from "next/server";
import type { WorkspaceContext } from "@/types/team";

/** Local equivalent of the unexported WorkspaceContextResult from team-helpers */
type WorkspaceContextResult =
  | { context: WorkspaceContext; error: null }
  | { context: null; error: NextResponse };

/**
 * Default workspace context for testing CRM API routes.
 */
export function mockTeamContext(
  overrides?: Partial<WorkspaceContext>,
): WorkspaceContextResult {
  return {
    context: {
      accountId: "acc-test-123",
      workspaceId: "ws-test-456",
      teamId: "ws-test-456",
      memberId: "mem-test-789",
      tier: "pro" as const,
      fixedRole: "admin" as const,
      role: {
        id: "role-test-001",
        workspaceId: "ws-test-456",
        teamId: "ws-test-456",
        name: "Admin",
        color: "#f59e0b",
        priority: 900,
        permissions: {
          contacts: { read: true, create: true, update: true, delete: true },
          companies: { read: true, create: true, update: true, delete: true },
          deals: { read: true, create: true, update: true, delete: true },
          tasks: { read: true, create: true, update: true, delete: true },
          call_logs: { read: true, create: true, update: true, delete: true },
          notes: { read: true, create: true, update: true, delete: true },
          leads: { read: true, create: true, update: true, delete: true },
          pipeline: { read: true, manage: true },
          analytics: { read: true },
          team_settings: { read: true, manage: false },
          ai_chat: { allowed: true },
        },
        isSystem: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
      isOwner: true,
      isDirector: true,
      permissions: {
        contacts: { read: true, create: true, update: true, delete: true },
        companies: { read: true, create: true, update: true, delete: true },
        deals: { read: true, create: true, update: true, delete: true },
        tasks: { read: true, create: true, update: true, delete: true },
        call_logs: { read: true, create: true, update: true, delete: true },
        notes: { read: true, create: true, update: true, delete: true },
        leads: { read: true, create: true, update: true, delete: true },
        pipeline: { read: true, manage: true },
        analytics: { read: true },
        team_settings: { read: true, manage: true },
        ai_chat: { allowed: true },
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
  const noPerms = { read: false, create: false, update: false, delete: false };
  return mockTeamContext({
    isOwner: false,
    isDirector: false,
    fixedRole: "viewer",
    permissions: {
      contacts: noPerms,
      companies: noPerms,
      deals: noPerms,
      tasks: noPerms,
      call_logs: noPerms,
      notes: noPerms,
      leads: noPerms,
      pipeline: { read: false, manage: false },
      analytics: { read: false },
      team_settings: { read: false, manage: false },
      ai_chat: { allowed: false },
    },
  });
}

/**
 * Context that simulates auth failure.
 */
export function mockAuthError(): WorkspaceContextResult {
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
    init.headers = { "Content-Type": "application/json", origin: "http://localhost:3000" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init as never);
}

/**
 * Mock params for [id] routes (Next.js 15+ uses Promise<{ id: string }>)
 */
export function mockParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}
