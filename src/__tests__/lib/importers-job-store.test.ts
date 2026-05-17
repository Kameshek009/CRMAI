import { describe, it, expect } from "vitest";
import { sumCounters } from "@/lib/importers/job-store";

describe("importers/job-store sumCounters", () => {
  it("returns a when b is undefined", () => {
    expect(sumCounters({ contacts: 5 })).toEqual({ contacts: 5 });
  });

  it("merges and sums numeric entity counts", () => {
    expect(sumCounters({ contacts: 5, companies: 2 }, { contacts: 3, deals: 1 })).toEqual({
      contacts: 8,
      companies: 2,
      deals: 1,
    });
  });

  it("treats missing keys as 0 baseline", () => {
    expect(sumCounters({}, { contacts: 7 })).toEqual({ contacts: 7 });
  });

  it("ignores non-numeric deltas (defensive)", () => {
    const out = sumCounters({ contacts: 5 }, { contacts: "x" as unknown as number });
    expect(out).toEqual({ contacts: 5 });
  });

  it("does not mutate the inputs", () => {
    const a = { contacts: 1 };
    const b = { contacts: 2 };
    sumCounters(a, b);
    expect(a).toEqual({ contacts: 1 });
    expect(b).toEqual({ contacts: 2 });
  });
});
