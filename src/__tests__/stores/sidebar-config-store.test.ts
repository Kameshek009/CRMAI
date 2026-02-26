import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  useSidebarConfigStore,
  getEffectiveItems,
  getAllItemsForEditor,
} from "@/stores/sidebar-config-store";
import type { SidebarConfig } from "@/types/sidebar";

const FakeIcon = (() => null) as any;

const staticItems = [
  { key: "contacts", labelKey: "nav.contacts", href: "/contacts", icon: FakeIcon },
  { key: "deals", labelKey: "nav.deals", href: "/deals", icon: FakeIcon },
  { key: "tasks", labelKey: "nav.tasks", href: "/tasks", icon: FakeIcon },
];

describe("getEffectiveItems", () => {
  it("null config -> all items visible in original order", () => {
    const result = getEffectiveItems("crm", staticItems, null);

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.key)).toEqual(["contacts", "deals", "tasks"]);
    expect(result.every((r) => r.visible)).toBe(true);
  });

  it("config without matching groupKey -> all items visible", () => {
    const config: SidebarConfig = [
      { groupKey: "tools", items: [{ key: "contacts", visible: false }] },
    ];

    const result = getEffectiveItems("crm", staticItems, config);

    expect(result).toHaveLength(3);
    expect(result.every((r) => r.visible)).toBe(true);
  });

  it("config with matching group -> respects item order from config", () => {
    const config: SidebarConfig = [
      {
        groupKey: "crm",
        items: [
          { key: "tasks", visible: true },
          { key: "deals", visible: true },
          { key: "contacts", visible: true },
        ],
      },
    ];

    const result = getEffectiveItems("crm", staticItems, config);

    expect(result.map((r) => r.key)).toEqual(["tasks", "deals", "contacts"]);
  });

  it("hidden items in config -> visible=false", () => {
    const config: SidebarConfig = [
      {
        groupKey: "crm",
        items: [
          { key: "contacts", visible: true },
          { key: "deals", visible: false },
          { key: "tasks", visible: true },
        ],
      },
    ];

    const result = getEffectiveItems("crm", staticItems, config);

    expect(result.find((r) => r.key === "deals")?.visible).toBe(false);
    expect(result.find((r) => r.key === "contacts")?.visible).toBe(true);
    expect(result.find((r) => r.key === "tasks")?.visible).toBe(true);
  });

  it("new static items not in config -> appended at end, visible=true", () => {
    const config: SidebarConfig = [
      {
        groupKey: "crm",
        items: [{ key: "contacts", visible: true }],
      },
    ];

    const result = getEffectiveItems("crm", staticItems, config);

    expect(result).toHaveLength(3);
    expect(result[0].key).toBe("contacts");
    expect(result[1].key).toBe("deals");
    expect(result[1].visible).toBe(true);
    expect(result[2].key).toBe("tasks");
    expect(result[2].visible).toBe(true);
  });

  it("config references item not in static -> skipped", () => {
    const config: SidebarConfig = [
      {
        groupKey: "crm",
        items: [
          { key: "nonexistent", visible: true },
          { key: "contacts", visible: true },
        ],
      },
    ];

    const result = getEffectiveItems("crm", staticItems, config);

    expect(result).toHaveLength(3);
    expect(result[0].key).toBe("contacts");
    expect(result.find((r) => r.key === "nonexistent")).toBeUndefined();
  });

  it("getAllItemsForEditor delegates to getEffectiveItems", () => {
    const config: SidebarConfig = [
      {
        groupKey: "crm",
        items: [
          { key: "tasks", visible: false },
          { key: "contacts", visible: true },
        ],
      },
    ];

    const effective = getEffectiveItems("crm", staticItems, config);
    const editor = getAllItemsForEditor("crm", staticItems, config);

    expect(editor).toEqual(effective);
  });
});

describe("useSidebarConfigStore", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    useSidebarConfigStore.setState({
      config: null,
      source: "default",
      isLoading: true,
    });
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("initial state: config=null, source='default', isLoading=true", () => {
    const state = useSidebarConfigStore.getState();

    expect(state.config).toBeNull();
    expect(state.source).toBe("default");
    expect(state.isLoading).toBe(true);
  });

  it("fetch: sets config and source from API response", async () => {
    const mockConfig: SidebarConfig = [
      { groupKey: "crm", items: [{ key: "contacts", visible: true }] },
    ];

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: { config: mockConfig, source: "team" },
      }),
    } as Response);

    await useSidebarConfigStore.getState().fetch();

    const state = useSidebarConfigStore.getState();
    expect(state.config).toEqual(mockConfig);
    expect(state.source).toBe("team");
    expect(state.isLoading).toBe(false);
  });

  it("update: optimistic update sets config and source='user'", async () => {
    const newConfig: SidebarConfig = [
      { groupKey: "crm", items: [{ key: "deals", visible: false }] },
    ];

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
    } as Response);

    await useSidebarConfigStore.getState().update(newConfig);

    const state = useSidebarConfigStore.getState();
    expect(state.config).toEqual(newConfig);
    expect(state.source).toBe("user");
  });

  it("update: rollback on API failure restores previous config and source", async () => {
    const prevConfig: SidebarConfig = [
      { groupKey: "crm", items: [{ key: "contacts", visible: true }] },
    ];
    useSidebarConfigStore.setState({ config: prevConfig, source: "team" });

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Server error" }),
    } as Response);

    const newConfig: SidebarConfig = [
      { groupKey: "crm", items: [{ key: "deals", visible: false }] },
    ];

    await expect(
      useSidebarConfigStore.getState().update(newConfig)
    ).rejects.toThrow("Server error");

    const state = useSidebarConfigStore.getState();
    expect(state.config).toEqual(prevConfig);
    expect(state.source).toBe("team");
  });

  it("reset: calls DELETE then re-fetches", async () => {
    const freshConfig: SidebarConfig = [
      { groupKey: "crm", items: [{ key: "tasks", visible: true }] },
    ];

    vi.mocked(globalThis.fetch)
      // DELETE call
      .mockResolvedValueOnce({ ok: true } as Response)
      // re-fetch GET call
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: { config: freshConfig, source: "default" },
        }),
      } as Response);

    await useSidebarConfigStore.getState().reset();

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      "/api/account/sidebar",
      { method: "DELETE" }
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      "/api/account/sidebar"
    );

    const state = useSidebarConfigStore.getState();
    expect(state.config).toEqual(freshConfig);
    expect(state.source).toBe("default");
    expect(state.isLoading).toBe(false);
  });
});
