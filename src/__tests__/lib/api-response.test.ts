import { describe, it, expect } from "vitest";
import {
  apiSuccess,
  apiError,
  api400,
  api401,
  api403,
  api404,
  api409,
  api429,
  api500,
} from "@/lib/api-response";

describe("apiSuccess", () => {
  it("should return success response with default status 200", async () => {
    const data = { id: 1, name: "Test" };
    const response = apiSuccess(data);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true, data });
  });

  it("should return success response with custom status", async () => {
    const data = { id: 1, name: "Test" };
    const response = apiSuccess(data, { status: 201 });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual({ success: true, data });
  });

  it("should include total in response when provided", async () => {
    const data = [{ id: 1 }, { id: 2 }];
    const response = apiSuccess(data, { total: 100 });

    const body = await response.json();
    expect(body).toEqual({ success: true, data, total: 100 });
  });

  it("should include custom headers when provided", async () => {
    const data = { id: 1 };
    const response = apiSuccess(data, { headers: { "X-Custom-Header": "test-value" } });

    expect(response.headers.get("X-Custom-Header")).toBe("test-value");
  });
});

describe("apiError", () => {
  it("should return error response with correct status", async () => {
    const response = apiError("Error message", { status: 400 });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ success: false, error: "Error message" });
  });

  it("should include error code when provided", async () => {
    const response = apiError("Error message", { status: 400, code: "INVALID_INPUT" });

    const body = await response.json();
    expect(body).toEqual({ success: false, error: "Error message", code: "INVALID_INPUT" });
  });

  it("should include details when provided", async () => {
    const details = { field: "email", reason: "invalid format" };
    const response = apiError("Validation error", { status: 400, details });

    const body = await response.json();
    expect(body).toEqual({ success: false, error: "Validation error", details });
  });
});

describe("api400", () => {
  it("should return 400 status with message", async () => {
    const response = api400("Bad request");

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Bad request");
  });

  it("should include details when provided", async () => {
    const details = { field: "email" };
    const response = api400("Invalid input", details);

    const body = await response.json();
    expect(body.details).toEqual(details);
  });
});

describe("api401", () => {
  it("should return 401 status with default message", async () => {
    const response = api401();

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("should accept custom message", async () => {
    const response = api401("Invalid token");

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Invalid token");
  });
});

describe("api403", () => {
  it("should return 403 status with default message", async () => {
    const response = api403();

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Permission denied");
  });

  it("should accept custom message", async () => {
    const response = api403("Access denied");

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Access denied");
  });
});

describe("api404", () => {
  it("should return 404 status with default message", async () => {
    const response = api404();

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Not found");
  });

  it("should accept custom message", async () => {
    const response = api404("Resource not found");

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Resource not found");
  });
});

describe("api409", () => {
  it("should return 409 status with message", async () => {
    const response = api409("Conflict");

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Conflict");
  });
});

describe("api429", () => {
  it("should return 429 status with default message", async () => {
    const response = api429();

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe("Too many requests");
  });

  it("should accept custom message", async () => {
    const response = api429("Rate limit exceeded");

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe("Rate limit exceeded");
  });
});

describe("api500", () => {
  it("should return 500 status with default message", async () => {
    const response = api500();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
  });

  it("should accept custom message", async () => {
    const response = api500("Database error");

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Database error");
  });
});
