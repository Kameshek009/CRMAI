import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildGoogleAuthorizeUrl,
  exchangeCodeForTokens,
  expiresInToTimestamp,
  fetchGoogleUserInfo,
  refreshAccessToken,
  revokeGoogleToken,
} from "@/lib/oauth/google";
import { DEFAULT_GOOGLE_SCOPES } from "@/lib/oauth/config";

function setEnv() {
  process.env.GOOGLE_OAUTH_CLIENT_ID = "client-abc";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "secret-xyz";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
}

function clearEnv() {
  delete process.env.GOOGLE_OAUTH_CLIENT_ID;
  delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  delete process.env.NEXT_PUBLIC_APP_URL;
}

type FetchFn = typeof globalThis.fetch;
const originalFetch: FetchFn | undefined = globalThis.fetch;

function mockFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const fn = vi.fn(impl) as unknown as FetchFn;
  globalThis.fetch = fn;
  return fn as unknown as ReturnType<typeof vi.fn>;
}

describe("oauth/google", () => {
  beforeEach(() => {
    setEnv();
  });
  afterEach(() => {
    clearEnv();
    if (originalFetch) globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("buildGoogleAuthorizeUrl includes required params", () => {
    const url = new URL(buildGoogleAuthorizeUrl({ state: "s-123" }));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("client-abc");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.example.com/api/oauth/google/callback");
    expect(url.searchParams.get("state")).toBe("s-123");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("include_granted_scopes")).toBe("true");
    const scope = url.searchParams.get("scope")!;
    for (const s of DEFAULT_GOOGLE_SCOPES) expect(scope.split(" ")).toContain(s);
  });

  it("buildGoogleAuthorizeUrl respects custom scopes & login_hint", () => {
    const url = new URL(
      buildGoogleAuthorizeUrl({
        state: "x",
        scopes: ["openid", "email"],
        loginHint: "alice@example.com",
      }),
    );
    expect(url.searchParams.get("scope")).toBe("openid email");
    expect(url.searchParams.get("login_hint")).toBe("alice@example.com");
  });

  it("buildGoogleAuthorizeUrl throws when env missing", () => {
    clearEnv();
    expect(() => buildGoogleAuthorizeUrl({ state: "x" })).toThrow();
  });

  it("buildGoogleAuthorizeUrl strips trailing slash in app URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com/";
    const url = new URL(buildGoogleAuthorizeUrl({ state: "x" }));
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.example.com/api/oauth/google/callback");
  });

  it("exchangeCodeForTokens posts form-encoded body and parses response", async () => {
    const fetchMock = mockFetch(async () =>
      new Response(
        JSON.stringify({
          access_token: "ya29.access",
          refresh_token: "1//refresh",
          expires_in: 3600,
          scope: "openid email",
          token_type: "Bearer",
          id_token: "id.token",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const out = await exchangeCodeForTokens("code-from-google");
    expect(out.accessToken).toBe("ya29.access");
    expect(out.refreshToken).toBe("1//refresh");
    expect(out.expiresIn).toBe(3600);
    expect(out.idToken).toBe("id.token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0] as [unknown, RequestInit];
    const body = call[1].body as string;
    expect(body).toContain("code=code-from-google");
    expect(body).toContain("client_id=client-abc");
    expect(body).toContain("grant_type=authorization_code");
  });

  it("exchangeCodeForTokens throws on non-2xx with body in message", async () => {
    mockFetch(async () => new Response("invalid_grant", { status: 400 }));
    await expect(exchangeCodeForTokens("bad")).rejects.toThrow(/400.*invalid_grant/);
  });

  it("refreshAccessToken posts refresh_token grant", async () => {
    const fetchMock = mockFetch(async () =>
      new Response(
        JSON.stringify({
          access_token: "ya29.NEW",
          expires_in: 3599,
          scope: "openid email",
          token_type: "Bearer",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const out = await refreshAccessToken("1//refresh");
    expect(out.accessToken).toBe("ya29.NEW");
    expect(out.expiresIn).toBe(3599);
    const call = fetchMock.mock.calls[0] as [unknown, RequestInit];
    const body = call[1].body as string;
    expect(body).toContain("grant_type=refresh_token");
    expect(body).toContain("refresh_token=1%2F%2Frefresh");
  });

  it("fetchGoogleUserInfo returns sub and email", async () => {
    mockFetch(async () =>
      new Response(
        JSON.stringify({
          sub: "1234567",
          email: "u@example.com",
          email_verified: true,
          name: "Alice",
          picture: "https://pic",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const info = await fetchGoogleUserInfo("ya29.access");
    expect(info.sub).toBe("1234567");
    expect(info.email).toBe("u@example.com");
    expect(info.emailVerified).toBe(true);
  });

  it("revokeGoogleToken swallows network errors", async () => {
    mockFetch(async () => {
      throw new Error("boom");
    });
    await expect(revokeGoogleToken("token")).resolves.toBeUndefined();
  });

  it("expiresInToTimestamp gives ISO string within margin", () => {
    const before = Date.now();
    const iso = expiresInToTimestamp(3600, 60);
    const after = Date.now();
    const ts = new Date(iso).getTime();
    expect(ts).toBeGreaterThanOrEqual(before + (3600 - 60) * 1000 - 50);
    expect(ts).toBeLessThanOrEqual(after + (3600 - 60) * 1000 + 50);
  });

  it("expiresInToTimestamp floors negative values to now", () => {
    const iso = expiresInToTimestamp(5, 60);
    expect(new Date(iso).getTime()).toBeLessThanOrEqual(Date.now() + 10);
  });
});
