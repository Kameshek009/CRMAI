import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("should call console.warn with formatted output", async () => {
    const { logger } = await import("../../lib/logger");
    logger.warn("TEST", "warning message");

    expect(console.warn).toHaveBeenCalledWith("[TEST]", "warning message", "");
  });

  it("should call console.error with formatted output", async () => {
    const { logger } = await import("../../lib/logger");
    logger.error("TEST", "error message");

    expect(console.error).toHaveBeenCalledWith("[TEST]", "error message", "");
  });

  it("should call console.log in development environment", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();

    const { logger } = await import("../../lib/logger");
    logger.info("TEST", "info message");

    expect(console.log).toHaveBeenCalledWith("[TEST]", "info message", "");
  });

  it("should NOT call console.log in production environment", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();

    const { logger } = await import("../../lib/logger");
    logger.info("TEST", "info message");

    expect(console.log).not.toHaveBeenCalled();
  });

  it("should pass empty string when meta is not provided", async () => {
    const { logger } = await import("../../lib/logger");
    logger.warn("TEST", "message without meta");

    expect(console.warn).toHaveBeenCalledWith("[TEST]", "message without meta", "");
  });

  it("should pass meta value when provided", async () => {
    const { logger } = await import("../../lib/logger");
    const meta = { userId: 123, action: "delete" };
    logger.error("TEST", "message with meta", meta);

    expect(console.error).toHaveBeenCalledWith("[TEST]", "message with meta", meta);
  });
});
