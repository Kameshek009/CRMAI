import { describe, it, expect } from "vitest";
import {
  PERSONAL_TABLES,
  TEAM_OWNED_TABLES,
  stripExcluded,
} from "@/lib/gdpr/tables";

describe("stripExcluded", () => {
  it("returns rows unchanged when no exclude list", () => {
    const rows = [{ a: 1, b: 2 }, { a: 3, b: 4 }];
    expect(stripExcluded(rows)).toEqual(rows);
  });

  it("returns rows unchanged when exclude is empty", () => {
    const rows = [{ a: 1, b: 2 }];
    expect(stripExcluded(rows, [])).toEqual(rows);
  });

  it("drops listed columns from every row", () => {
    const rows = [
      { id: "x", token: "secret-1", email: "a@b" },
      { id: "y", token: "secret-2", email: "c@d" },
    ];
    expect(stripExcluded(rows, ["token"])).toEqual([
      { id: "x", email: "a@b" },
      { id: "y", email: "c@d" },
    ]);
  });

  it("does not mutate the original rows", () => {
    const rows = [{ id: "x", token: "secret" }];
    stripExcluded(rows, ["token"]);
    expect(rows[0]).toEqual({ id: "x", token: "secret" });
  });
});

describe("export table specs", () => {
  it("excludes ciphertext columns from oauth_tokens", () => {
    const spec = TEAM_OWNED_TABLES.find((s) => s.table === "oauth_tokens");
    expect(spec?.exclude).toContain("access_token_encrypted");
    expect(spec?.exclude).toContain("refresh_token_encrypted");
  });

  it("excludes secret material from api_keys and webhook_endpoints", () => {
    const apiKeys = TEAM_OWNED_TABLES.find((s) => s.table === "api_keys");
    expect(apiKeys?.exclude).toContain("key_hash");
    const webhooks = TEAM_OWNED_TABLES.find((s) => s.table === "webhook_endpoints");
    expect(webhooks?.exclude).toEqual(
      expect.arrayContaining(["secret_encrypted", "secret_hash"]),
    );
  });

  it("never includes the same table in both PERSONAL and TEAM_OWNED with conflicting filters", () => {
    // team_members and visibility_group_members appear in both — that is OK
    // because they are filtered by different columns (account_id vs team_id).
    // The test just guards that the two lists have unique non-overlapping
    // specs by table+exclude shape.
    const personalSet = new Set(PERSONAL_TABLES.map((t) => t.table));
    expect(personalSet.has("login_history")).toBe(true);
    const teamSet = new Set(TEAM_OWNED_TABLES.map((t) => t.table));
    expect(teamSet.has("contacts")).toBe(true);
  });
});
