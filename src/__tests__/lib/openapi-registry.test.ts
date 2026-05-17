import { describe, it, expect } from "vitest";
import { buildOpenAPIDocument } from "@/lib/openapi/registry";
import "@/lib/openapi/routes";

describe("OpenAPI document", () => {
  const doc = buildOpenAPIDocument();

  it("is OpenAPI 3.1.0", () => {
    expect(doc.openapi).toBe("3.1.0");
  });

  it("has info block with title and version", () => {
    expect(doc.info.title).toMatch(/Nexxus/i);
    expect(doc.info.version).toBeTruthy();
  });

  it("registers the four contacts endpoints", () => {
    expect(doc.paths).toBeDefined();
    expect(doc.paths!["/api/crm/contacts"]).toBeDefined();
    expect(doc.paths!["/api/crm/contacts"]!.get).toBeDefined();
    expect(doc.paths!["/api/crm/contacts"]!.post).toBeDefined();
    expect(doc.paths!["/api/crm/contacts/{id}"]).toBeDefined();
    expect(doc.paths!["/api/crm/contacts/{id}"]!.get).toBeDefined();
    expect(doc.paths!["/api/crm/contacts/{id}"]!.patch).toBeDefined();
  });

  it("references reusable component schemas for Contact and request bodies", () => {
    expect(doc.components?.schemas?.Contact).toBeDefined();
    expect(doc.components?.schemas?.CreateContactRequest).toBeDefined();
    expect(doc.components?.schemas?.UpdateContactRequest).toBeDefined();
    expect(doc.components?.schemas?.ErrorResponse).toBeDefined();
  });

  it("tags contacts endpoints with the Contacts tag", () => {
    const get = doc.paths!["/api/crm/contacts"]!.get!;
    expect(get.tags).toContain("Contacts");
  });

  it("documents validation/auth error responses on create endpoint", () => {
    const post = doc.paths!["/api/crm/contacts"]!.post!;
    expect(post.responses!["400"]).toBeDefined();
    expect(post.responses!["401"]).toBeDefined();
  });
});
