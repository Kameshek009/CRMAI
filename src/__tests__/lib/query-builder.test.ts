import { describe, it, expect } from "vitest";
import { parseListParams } from "@/lib/crm/query-builder";

function makeURL(params: Record<string, string> = {}): URL {
  const url = new URL("https://example.com/api/test");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return url;
}

describe("parseListParams", () => {
  it("returns empty object for no params", () => {
    const result = parseListParams(makeURL());
    expect(result).toEqual({});
  });

  it("parses search from 'search' param", () => {
    const result = parseListParams(makeURL({ search: "hello" }));
    expect(result.search).toBe("hello");
  });

  it("parses search from 'q' param", () => {
    const result = parseListParams(makeURL({ q: "test" }));
    expect(result.search).toBe("test");
  });

  it("parses sort_by", () => {
    const result = parseListParams(makeURL({ sort_by: "created_at" }));
    expect(result.sort_by).toBe("created_at");
  });

  it("parses sort_order asc", () => {
    const result = parseListParams(makeURL({ sort_order: "asc" }));
    expect(result.sort_order).toBe("asc");
  });

  it("parses sort_order desc", () => {
    const result = parseListParams(makeURL({ sort_order: "desc" }));
    expect(result.sort_order).toBe("desc");
  });

  it("ignores invalid sort_order", () => {
    const result = parseListParams(makeURL({ sort_order: "random" }));
    expect(result.sort_order).toBeUndefined();
  });

  it("parses page with min 1", () => {
    const result = parseListParams(makeURL({ page: "0" }));
    expect(result.page).toBe(1);
  });

  it("parses valid page", () => {
    const result = parseListParams(makeURL({ page: "5" }));
    expect(result.page).toBe(5);
  });

  it("parses limit with max 100", () => {
    const result = parseListParams(makeURL({ limit: "500" }));
    expect(result.limit).toBe(100);
  });

  it("parses limit 0 as fallback 50 then clamped to min 1", () => {
    // parseInt("0") || 50 = 50 (0 is falsy), then Math.min(100, Math.max(1, 50)) = 50
    const result = parseListParams(makeURL({ limit: "0" }));
    expect(result.limit).toBe(50);
  });

  it("parses filter_* prefixed params", () => {
    const result = parseListParams(makeURL({ filter_status: "active", filter_source: "web" }));
    expect(result.filters).toEqual({ status: "active", source: "web" });
  });

  it("ignores non-filter params in filters", () => {
    const result = parseListParams(makeURL({ search: "hi", filter_status: "open" }));
    expect(result.filters).toEqual({ status: "open" });
    expect(result.search).toBe("hi");
  });
});
