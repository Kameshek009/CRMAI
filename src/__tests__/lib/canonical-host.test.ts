import { describe, it, expect } from "vitest";

/**
 * Lightweight smoke-test of the canonical-host parser logic the proxy uses.
 * The middleware itself is tightly coupled to Clerk + Next runtime; we
 * recreate just the host-matching predicate here so the rule is locked.
 */
function parseRedirectConfig(canonical?: string, hosts?: string): {
  canonical: string | null;
  hosts: string[];
} {
  return {
    canonical: canonical?.trim() || null,
    hosts: (hosts || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  };
}

function shouldRedirect(host: string, canonical: string | null, hosts: string[]): boolean {
  if (!canonical || hosts.length === 0) return false;
  const lower = host.toLowerCase();
  return hosts.includes(lower) && lower !== canonical;
}

describe("canonical-host redirect logic", () => {
  it("redirects vercel.app to custom domain", () => {
    const cfg = parseRedirectConfig("nexxuscrm.com", "crmai-xi.vercel.app");
    expect(shouldRedirect("crmai-xi.vercel.app", cfg.canonical, cfg.hosts)).toBe(true);
  });

  it("does not redirect the canonical host itself", () => {
    const cfg = parseRedirectConfig("nexxuscrm.com", "crmai-xi.vercel.app,nexxuscrm.com");
    expect(shouldRedirect("nexxuscrm.com", cfg.canonical, cfg.hosts)).toBe(false);
  });

  it("does not redirect unrelated hosts (preview deployments etc.)", () => {
    const cfg = parseRedirectConfig("nexxuscrm.com", "crmai-xi.vercel.app");
    expect(shouldRedirect("crmai-preview-abc.vercel.app", cfg.canonical, cfg.hosts)).toBe(false);
  });

  it("disabled when CANONICAL_HOST empty", () => {
    const cfg = parseRedirectConfig("", "crmai-xi.vercel.app");
    expect(shouldRedirect("crmai-xi.vercel.app", cfg.canonical, cfg.hosts)).toBe(false);
  });

  it("disabled when NEXXUS_REDIRECT_HOSTS empty", () => {
    const cfg = parseRedirectConfig("nexxuscrm.com", "");
    expect(shouldRedirect("crmai-xi.vercel.app", cfg.canonical, cfg.hosts)).toBe(false);
  });

  it("is case-insensitive on host", () => {
    const cfg = parseRedirectConfig("nexxuscrm.com", "crmai-xi.vercel.app");
    expect(shouldRedirect("CRMAI-XI.vercel.app", cfg.canonical, cfg.hosts)).toBe(true);
    expect(shouldRedirect("Nexxuscrm.COM", cfg.canonical, cfg.hosts)).toBe(false);
  });

  it("supports multiple redirect hosts comma-separated", () => {
    const cfg = parseRedirectConfig("nexxuscrm.com", "foo.com, bar.com, crmai-xi.vercel.app");
    expect(cfg.hosts).toEqual(["foo.com", "bar.com", "crmai-xi.vercel.app"]);
    expect(shouldRedirect("foo.com", cfg.canonical, cfg.hosts)).toBe(true);
    expect(shouldRedirect("bar.com", cfg.canonical, cfg.hosts)).toBe(true);
  });

  it("ignores extraneous whitespace in CANONICAL_HOST", () => {
    const cfg = parseRedirectConfig("  nexxuscrm.com  ", "crmai-xi.vercel.app");
    expect(cfg.canonical).toBe("nexxuscrm.com");
  });
});
