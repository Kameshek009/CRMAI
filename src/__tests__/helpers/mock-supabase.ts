import { vi } from "vitest";

interface MockResult {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}

/**
 * Creates a chainable mock Supabase client for API route testing.
 *
 * Usage:
 *   const { supabase, setResult } = createMockSupabase();
 *   setResult("contacts", { data: [{ id: "1" }], count: 1 });
 *   vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);
 */
export function createMockSupabase() {
  const resultQueues: Record<string, MockResult[]> = {};
  const rpcResults: Record<string, MockResult> = {};
  let currentTable = "";

  /**
   * Queue a result for a table. Multiple calls to setResult for the same table
   * create a queue — each .single() / thenable resolution shifts one result.
   * If only one result remains it is reused for all subsequent calls.
   */
  function setResult(table: string, result: MockResult) {
    if (!resultQueues[table]) {
      resultQueues[table] = [];
    }
    resultQueues[table].push(result);
  }

  function setRpcResult(name: string, result: MockResult) {
    rpcResults[name] = result;
  }

  function getResult(): MockResult & { then?: unknown } {
    const queue = resultQueues[currentTable];
    if (!queue || queue.length === 0) {
      return { data: null, error: null, count: null };
    }
    // If more than one result queued, shift (consume); otherwise reuse the single entry
    if (queue.length > 1) {
      return queue.shift()!;
    }
    return queue[0];
  }

  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  // All chainable methods return the same chain object
  const chainableMethods = [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte",
    "like", "ilike", "is", "in", "or", "not",
    "order", "limit", "range", "match",
  ];

  for (const method of chainableMethods) {
    chain[method] = vi.fn().mockImplementation(() => chainProxy);
  }

  // Terminal methods
  chain.single = vi.fn().mockImplementation(() => {
    const r = getResult();
    return Promise.resolve({ data: r.data, error: r.error });
  });

  chain.maybeSingle = vi.fn().mockImplementation(() => {
    const r = getResult();
    return Promise.resolve({ data: r.data, error: r.error });
  });

  // Make chain thenable (for `await query` without .single())
  const chainProxy = new Proxy(chain, {
    get(target, prop) {
      if (prop === "then") {
        return (resolve: (val: unknown) => void) => {
          const r = getResult();
          return Promise.resolve({ data: r.data, error: r.error, count: r.count }).then(resolve);
        };
      }
      if (prop === "catch") {
        return (reject: (val: unknown) => void) => Promise.resolve().catch(reject);
      }
      return target[prop as string];
    },
  });

  const from = vi.fn().mockImplementation((table: string) => {
    currentTable = table;
    return chainProxy;
  });

  const rpc = vi.fn().mockImplementation((name: string) => {
    const r = rpcResults[name] || { data: null, error: null };
    return Promise.resolve(r);
  });

  const supabase = { from, rpc };

  return { supabase, from, rpc, chain, setResult, setRpcResult };
}
