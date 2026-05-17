import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

/**
 * Lazy OpenAPI registry.
 *
 * `extendZodWithOpenApi` mutates the zod prototype, and `registry.register`
 * touches schemas that may not yet have the extended `.openapi()` method
 * if module bodies are evaluated in an unexpected order at build time
 * (observed under Next 16 + Turbopack page-data collection). To avoid
 * that ordering hazard, do all the work the first time `getRegistry()`
 * is called rather than at module init.
 */

let registry: OpenAPIRegistry | null = null;

export function getRegistry(): OpenAPIRegistry {
  if (registry) return registry;
  extendZodWithOpenApi(z);
  registry = new OpenAPIRegistry();
  registry.registerComponent("securitySchemes", "apiKey", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "Nexxus API key (nxk_live_*)",
    description:
      "Pass an API key as `Authorization: Bearer nxk_live_<token>`. Keys are created in Nexxus admin and carry scoped permissions (e.g. `contacts:read`). Required scopes are listed on each route.",
  });
  return registry;
}

let routesLoaded = false;

export async function buildOpenAPIDocument() {
  // Touch the registry to force lazy init, then run all path registrations.
  getRegistry();
  if (!routesLoaded) {
    routesLoaded = true;
    await import("./routes");
  }

  const generator = new OpenApiGeneratorV31(getRegistry().definitions);
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

/** @internal — tests reset between cases so each suite starts clean. */
export function __resetOpenApiRegistry(): void {
  registry = null;
  routesLoaded = false;
}
