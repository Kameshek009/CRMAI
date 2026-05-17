import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

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
