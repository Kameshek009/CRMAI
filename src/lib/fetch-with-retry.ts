/**
 * Fetch wrapper with exponential backoff retry for transient errors.
 * Retries only on 5xx and network errors, NOT on 4xx.
 */

interface FetchWithRetryOptions extends RequestInit {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelay?: number;
}

export async function fetchWithRetry(
  url: string,
  options?: FetchWithRetryOptions,
): Promise<Response> {
  const { maxRetries = 3, baseDelay = 1000, ...fetchOptions } = options ?? {};

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      // Don't retry on client errors (4xx) — only on server errors (5xx)
      if (response.status < 500) {
        return response;
      }

      // On last attempt, return the 5xx response as-is
      if (attempt === maxRetries) {
        return response;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // On last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }
    }

    // Exponential backoff: 1s, 2s, 4s
    const delay = baseDelay * Math.pow(2, attempt);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  // This shouldn't be reached, but TypeScript needs it
  throw lastError ?? new Error("Fetch failed after retries");
}
