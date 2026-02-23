import { NextResponse } from "next/server";

interface ApiErrorOptions {
  status: number;
  code?: string;
  details?: unknown;
}

/** Standardized success response */
export function apiSuccess(
  data: unknown,
  options?: { status?: number; total?: number; headers?: Record<string, string> }
): NextResponse {
  const body: Record<string, unknown> = { success: true, data };
  if (options?.total !== undefined) body.total = options.total;
  return NextResponse.json(body, {
    status: options?.status || 200,
    headers: options?.headers,
  });
}

/** Standardized error response */
export function apiError(message: string, options: ApiErrorOptions): NextResponse {
  const body: Record<string, unknown> = { success: false, error: message };
  if (options.code) body.code = options.code;
  if (options.details) body.details = options.details;
  return NextResponse.json(body, { status: options.status });
}

export const api400 = (msg: string, details?: unknown) =>
  apiError(msg, { status: 400, details });
export const api401 = (msg = "Unauthorized") =>
  apiError(msg, { status: 401 });
export const api403 = (msg = "Permission denied") =>
  apiError(msg, { status: 403 });
export const api404 = (msg = "Not found") =>
  apiError(msg, { status: 404 });
export const api409 = (msg: string) =>
  apiError(msg, { status: 409 });
export const api429 = (msg = "Too many requests") =>
  apiError(msg, { status: 429 });
export const api500 = (msg = "Internal server error") =>
  apiError(msg, { status: 500 });
