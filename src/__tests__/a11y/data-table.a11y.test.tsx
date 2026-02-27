import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { DataTable } from "@/components/frappe/data-table";
import type { Column } from "@/components/frappe/data-table";

// Mock i18n
vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === "crm.dataTable.rowCount") return `${params?.count} rows`;
      if (key === "crm.dataTable.noData") return "No data found";
      if (key === "crm.dataTable.showing") return `Showing ${params?.start}-${params?.end} of ${params?.total}`;
      if (key === "crm.dataTable.previous") return "Previous";
      if (key === "crm.dataTable.next") return "Next";
      return key;
    },
    locale: "en",
  }),
}));

// Mock checkbox
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: (props: { checked?: boolean; onCheckedChange?: () => void }) => (
    <input type="checkbox" checked={props.checked} onChange={props.onCheckedChange} />
  ),
}));

// Mock virtualizer
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
  }),
}));

afterEach(() => { cleanup(); });

interface TestItem { id: string; name: string; email: string }

const columns: Column<TestItem>[] = [
  { key: "name", label: "Name", sortable: true },
  { key: "email", label: "Email", sortable: true },
];

const data: TestItem[] = [
  { id: "1", name: "Alice", email: "alice@test.com" },
  { id: "2", name: "Bob", email: "bob@test.com" },
];

describe("DataTable a11y", () => {
  it("renders proper table structure with thead and tbody", () => {
    const { container } = render(
      <DataTable columns={columns} data={data} />
    );
    expect(container.querySelector("table")).toBeTruthy();
    expect(container.querySelector("thead")).toBeTruthy();
    expect(container.querySelector("tbody")).toBeTruthy();
  });

  it("column headers use th elements", () => {
    const { container } = render(
      <DataTable columns={columns} data={data} />
    );
    const ths = container.querySelectorAll("th");
    expect(ths.length).toBe(2);
    expect(ths[0]?.textContent).toContain("Name");
    expect(ths[1]?.textContent).toContain("Email");
  });

  it("sortable columns have aria-sort attribute", () => {
    const { container } = render(
      <DataTable columns={columns} data={data} sortBy="name" sortOrder="asc" />
    );
    const ths = container.querySelectorAll("th");
    expect(ths[0]?.getAttribute("aria-sort")).toBe("ascending");
    expect(ths[1]?.getAttribute("aria-sort")).toBe("none");
  });

  it("aria-sort changes with sortOrder", () => {
    const { container } = render(
      <DataTable columns={columns} data={data} sortBy="email" sortOrder="desc" />
    );
    const ths = container.querySelectorAll("th");
    expect(ths[0]?.getAttribute("aria-sort")).toBe("none");
    expect(ths[1]?.getAttribute("aria-sort")).toBe("descending");
  });

  it("has aria-busy when loading", () => {
    const { container } = render(
      <DataTable columns={columns} data={[]} loading={true} />
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.getAttribute("aria-busy")).toBe("true");
  });

  it("does not have aria-busy when not loading", () => {
    const { container } = render(
      <DataTable columns={columns} data={data} loading={false} />
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.getAttribute("aria-busy")).toBeNull();
  });

  it("has aria-live region for row count", () => {
    const { container } = render(
      <DataTable columns={columns} data={data} />
    );
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
    expect(liveRegion?.textContent).toContain("2 rows");
  });

  it("clickable rows have tabIndex and keyboard handler", () => {
    const { container } = render(
      <DataTable columns={columns} data={data} onRowClick={vi.fn()} />
    );
    const rows = container.querySelectorAll("tbody tr");
    expect(rows[0]?.getAttribute("tabindex")).toBe("0");
    expect(rows[0]?.getAttribute("role")).toBe("button");
  });
});
