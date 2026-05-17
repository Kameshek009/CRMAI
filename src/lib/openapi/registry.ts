import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// Security schemes — referenced by routes that accept API key authentication.
registry.registerComponent("securitySchemes", "apiKey", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "Nexxus API key (nxk_live_*)",
  description:
    "Pass an API key as `Authorization: Bearer nxk_live_<token>`. Keys are created in Nexxus admin and carry scoped permissions (e.g. `contacts:read`). Required scopes are listed on each route.",
});

export function buildOpenAPIDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Nexxus CRM API",
      version: "1.0.0",
      description:
        "REST API for Nexxus CRM. Most endpoints require Clerk session authentication; a documented `Authorization: Bearer <token>` flow for the public REST API is planned for Phase 1.",
    },
    servers: [{ url: "/", description: "Current host" }],
  });
}
