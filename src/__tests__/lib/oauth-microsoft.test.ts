import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildMicrosoftAuthorizeUrl,
  exchangeMicrosoftCode,
  fetchMicrosoftUserInfo,
  refreshMicrosoftToken,
} from "@/lib/oauth/microsoft";
import { DEFAULT_MS_SCOPES } from "@/lib/oauth/microsoft";

function setEnv() {
  process.env.MICROSOFT_OAUTH_CLIENT_ID = "ms-client";
  process.env.MICROSOFT_OAUTH_CLIENT_SECRET = "ms-secret";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
}

function clearEnv() {
  delete process.env.MICROSOFT_OAUTH_CLIENT_ID;
  delete process.env.MICROSOFT_OAUTH_CLIENT_SECRET;
  delete process.env.NEXT_PUBLIC_APP_URL;
}

type FetchFn = typeof globalThis.fetch;
const originalFetch: FetchFn | undefined = globalThis.fetch;

function mockFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const fn = vi.fn(impl) as unknown as FetchFn;
  globalThis.fetch = fn;
  return fn as unknown as ReturnType<typeof vi.fn>;
}

describe("oauth/microsoft", () => {
  beforeEach(() => setEnv());
  afterEach(() => {
    clearEnv();
    if (originalFetch) globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("buildMicrosoftAuthorizeUrl includes prompt=consent and full default scope set", () => {
    const url = new URL(buildMicrosoftAuthorizeUrl({ state: "s-1" }));
    expect(url.origin + url.pathname).toBe(
      "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    );
    expect(url.searchParams.get("client_id")).toBe("ms-client");
    expect(url.searchParams.get("state")).toBe("s-1");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://app.example.com/api/oauth/microsoft/callback",
    );
    const scope = url.searchParams.get("scope")!;
    for (const s of DEFAULT_MS_SCOPES) expect(scope.split(" ")).toContain(s);
  });

  it("buildMicrosoftAuthorizeUrl throws when env missing", () => {
    clearEnv();
    expect(() => buildMicrosoftAuthorizeUrl({ state: "x" })).toThrow();
  });

  it("exchangeMicrosoftCode posts form-encoded body and parses response", async () => {
    const fetchMock = mockFetch(async () =>
      new Response(
        JSON.stringify({
          access_token: "ms-access",
          refresh_token: "ms-refresh",
          expires_in: 3600,
          scope: "Mail.Read offline_access",
          token_type: "Bearer",
          id_token: "ms-id",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const out = await exchangeMicrosoftCode("authcode");
    expect(out.accessToken).toBe("ms-access");
    expect(out.refreshToken).toBe("ms-refresh");
    expect(out.expiresIn).toBe(3600);
    const call = fetchMock.mock.calls[0] as [unknown, RequestInit];
    const body = call[1].body as string;
    expect(body).toContain("code=authcode");
    expect(body).toContain("grant_type=authorization_code");
    expect(body).toContain("Mail.Read");
  });

  it("refreshMicrosoftToken posts refresh_token grant", async () => {
    const fetchMock = mockFetch(async () =>
      new Response(
        JSON.stringify({
          access_token: "ms-access-new",
          refresh_token: "ms-refresh-new",
          expires_in: 3600,
          scope: "Mail.Read",
          token_type: "Bearer",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const out = await refreshMicrosoftToken("rt-1");
    expect(out.accessToken).toBe("ms-access-new");
    const call = fetchMock.mock.calls[0] as [unknown, RequestInit];
    const body = call[1].body as string;
    expect(body).toContain("grant_type=refresh_token");
    expect(body).toContain("refresh_token=rt-1");
  });

  it("fetchMicrosoftUserInfo prefers mail over userPrincipalName", async () => {
    mockFetch(async () =>
      new Response(
        JSON.stringify({
          id: "ms-user-1",
          mail: "User@CONTOSO.com",
          userPrincipalName: "fallback@contoso.com",
          displayName: "User One",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const info = await fetchMicrosoftUserInfo("access");
    expect(info.id).toBe("ms-user-1");
    expect(info.email).toBe("user@contoso.com");
    expect(info.displayName).toBe("User One");
  });

  it("fetchMicrosoftUserInfo falls back to userPrincipalName", async () => {
    mockFetch(async () =>
      new Response(
        JSON.stringify({ id: "x", userPrincipalName: "fallback@contoso.com" }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const info = await fetchMicrosoftUserInfo("access");
    expect(info.email).toBe("fallback@contoso.com");
  });
});
