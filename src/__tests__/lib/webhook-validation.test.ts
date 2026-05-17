import { describe, it, expect } from "vitest";
import {
  isSafeWebhookUrl,
  createWebhookSchema,
  updateWebhookSchema,
} from "@/lib/crm/webhook-validation";

describe("isSafeWebhookUrl", () => {
  it("accepts well-formed https URLs", () => {
    expect(isSafeWebhookUrl("https://api.example.com/webhooks")).toBe(true);
    expect(isSafeWebhookUrl("https://webhook.site/abc123")).toBe(true);
    expect(isSafeWebhookUrl("https://hooks.zapier.com/x/y/z")).toBe(true);
  });

  it("rejects non-https schemes", () => {
    expect(isSafeWebhookUrl("http://api.example.com")).toBe(false);
    expect(isSafeWebhookUrl("ftp://api.example.com")).toBe(false);
    expect(isSafeWebhookUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects loopback hostnames", () => {
    expect(isSafeWebhookUrl("https://localhost")).toBe(false);
    expect(isSafeWebhookUrl("https://localhost:8080/x")).toBe(false);
    expect(isSafeWebhookUrl("https://127.0.0.1")).toBe(false);
    expect(isSafeWebhookUrl("https://127.0.0.1:1234/x")).toBe(false);
    expect(isSafeWebhookUrl("https://0.0.0.0")).toBe(false);
  });

  it("rejects RFC1918 private ranges", () => {
    expect(isSafeWebhookUrl("https://10.0.0.1")).toBe(false);
    expect(isSafeWebhookUrl("https://192.168.1.1")).toBe(false);
    expect(isSafeWebhookUrl("https://172.16.0.1")).toBe(false);
    expect(isSafeWebhookUrl("https://172.31.255.255")).toBe(false);
  });

  it("allows public addresses in 172.x outside the private range", () => {
    expect(isSafeWebhookUrl("https://172.15.0.1")).toBe(true);
    expect(isSafeWebhookUrl("https://172.32.0.1")).toBe(true);
  });

  it("rejects link-local and AWS metadata", () => {
    expect(isSafeWebhookUrl("https://169.254.169.254/latest/meta-data/")).toBe(false);
    expect(isSafeWebhookUrl("https://169.254.0.1")).toBe(false);
  });

  it("rejects CGNAT and 0.0.0.0/8", () => {
    expect(isSafeWebhookUrl("https://100.64.0.1")).toBe(false);
    expect(isSafeWebhookUrl("https://0.1.2.3")).toBe(false);
  });

  it("rejects private IPv6 ranges", () => {
    expect(isSafeWebhookUrl("https://[::1]")).toBe(false);
    expect(isSafeWebhookUrl("https://[fc00::1]")).toBe(false);
    expect(isSafeWebhookUrl("https://[fd12:3456::1]")).toBe(false);
    expect(isSafeWebhookUrl("https://[fe80::1]")).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(isSafeWebhookUrl("not-a-url")).toBe(false);
    expect(isSafeWebhookUrl("")).toBe(false);
  });

  it("normalises 0x7f000001 hex IP form via URL parser", () => {
    // new URL("https://0x7f000001/") normalises to https://127.0.0.1/, so the
    // private check still catches it.
    expect(isSafeWebhookUrl("https://0x7f000001/")).toBe(false);
  });
});

describe("createWebhookSchema", () => {
  it("accepts valid input with all fields", () => {
    const parsed = createWebhookSchema.parse({
      name: "My webhook",
      url: "https://api.example.com/hooks",
      event_types: ["contact.created", "deal.*"],
    });
    expect(parsed.name).toBe("My webhook");
    expect(parsed.event_types).toEqual(["contact.created", "deal.*"]);
  });

  it("defaults event_types to ['*']", () => {
    const parsed = createWebhookSchema.parse({ url: "https://api.example.com" });
    expect(parsed.event_types).toEqual(["*"]);
  });

  it("rejects SSRF-unsafe URLs", () => {
    expect(() => createWebhookSchema.parse({ url: "http://api.example.com" })).toThrow();
    expect(() => createWebhookSchema.parse({ url: "https://localhost" })).toThrow();
    expect(() => createWebhookSchema.parse({ url: "https://10.0.0.1" })).toThrow();
  });

  it("rejects malformed event_types", () => {
    expect(() =>
      createWebhookSchema.parse({
        url: "https://api.example.com",
        event_types: ["DROP TABLE"],
      }),
    ).toThrow();
    expect(() =>
      createWebhookSchema.parse({
        url: "https://api.example.com",
        event_types: ["contact .created"],
      }),
    ).toThrow();
  });

  it("rejects empty / oversized event_types lists", () => {
    expect(() =>
      createWebhookSchema.parse({ url: "https://api.example.com", event_types: [] }),
    ).toThrow();
    const fifty = new Array(51).fill("contact.created");
    expect(() =>
      createWebhookSchema.parse({ url: "https://api.example.com", event_types: fifty }),
    ).toThrow();
  });
});

describe("updateWebhookSchema", () => {
  it("accepts partial updates", () => {
    expect(updateWebhookSchema.parse({ is_active: false })).toEqual({ is_active: false });
    expect(updateWebhookSchema.parse({ name: "renamed" })).toEqual({ name: "renamed" });
  });

  it("rejects empty body", () => {
    expect(() => updateWebhookSchema.parse({})).toThrow();
  });

  it("validates url when provided", () => {
    expect(() => updateWebhookSchema.parse({ url: "https://localhost" })).toThrow();
    expect(updateWebhookSchema.parse({ url: "https://api.example.com" })).toEqual({
      url: "https://api.example.com",
    });
  });
});
