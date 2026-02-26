import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithRetry } from "@/lib/fetch-with-retry";

describe("fetchWithRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns response on successful fetch", async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse);

    const result = await fetchWithRetry("/api/test");

    expect(result.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("returns 4xx response without retrying", async () => {
    const mockResponse = new Response("Not found", { status: 404 });
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse);

    const result = await fetchWithRetry("/api/test");

    expect(result.status).toBe(404);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 5xx and eventually succeeds", async () => {
    const error500 = new Response("Server Error", { status: 500 });
    const success = new Response("OK", { status: 200 });

    vi.mocked(fetch)
      .mockResolvedValueOnce(error500)
      .mockResolvedValueOnce(success);

    const promise = fetchWithRetry("/api/test", { baseDelay: 100 });

    // Advance past first retry delay (100ms)
    await vi.advanceTimersByTimeAsync(100);

    const result = await promise;
    expect(result.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("returns 5xx response after max retries exhausted", async () => {
    const error500 = new Response("Server Error", { status: 500 });

    vi.mocked(fetch).mockResolvedValue(error500);

    const promise = fetchWithRetry("/api/test", { maxRetries: 2, baseDelay: 100 });

    // Advance through all retry delays: 100ms, 200ms
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result.status).toBe(500);
    expect(fetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("retries on network errors and throws after max retries", async () => {
    vi.useRealTimers();
    vi.mocked(fetch).mockImplementation(() => Promise.reject(new Error("Network error")));

    await expect(
      fetchWithRetry("/api/test", { maxRetries: 2, baseDelay: 1 })
    ).rejects.toThrow("Network error");
    expect(fetch).toHaveBeenCalledTimes(3);
    vi.useFakeTimers();
  });

  it("recovers from network error on retry", async () => {
    const success = new Response("OK", { status: 200 });

    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(success);

    const promise = fetchWithRetry("/api/test", { baseDelay: 100 });

    await vi.advanceTimersByTimeAsync(100);

    const result = await promise;
    expect(result.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("uses exponential backoff delays", async () => {
    const error500 = new Response("Error", { status: 500 });
    const success = new Response("OK", { status: 200 });

    vi.mocked(fetch)
      .mockResolvedValueOnce(error500)
      .mockResolvedValueOnce(error500)
      .mockResolvedValueOnce(success);

    const promise = fetchWithRetry("/api/test", { baseDelay: 1000 });

    // First delay: 1000ms
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetch).toHaveBeenCalledTimes(2);

    // Second delay: 2000ms
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetch).toHaveBeenCalledTimes(3);

    const result = await promise;
    expect(result.status).toBe(200);
  });

  it("passes fetch options through", async () => {
    const mockResponse = new Response("OK", { status: 200 });
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse);

    await fetchWithRetry("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: 1 }),
    });

    expect(fetch).toHaveBeenCalledWith("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: 1 }),
    });
  });

  it("defaults to 3 max retries", async () => {
    vi.useRealTimers();
    vi.mocked(fetch).mockImplementation(() => Promise.reject(new Error("fail")));

    await expect(
      fetchWithRetry("/api/test", { baseDelay: 1 })
    ).rejects.toThrow("fail");
    expect(fetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    vi.useFakeTimers();
  });
});
