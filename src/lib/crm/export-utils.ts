export const CHUNK_SIZE = 1000;

export const ENTITY_CONFIG: Record<string, { table: string; columns: string[] }> = {
  contacts: {
    table: "contacts",
    columns: ["id", "first_name", "last_name", "email", "phone", "status", "source", "created_at"],
  },
  deals: {
    table: "deals",
    columns: ["id", "title", "value", "currency", "stage", "probability", "expected_close_date", "created_at"],
  },
  companies: {
    table: "companies",
    columns: ["id", "name", "industry", "size", "domain", "created_at"],
  },
  tasks: {
    table: "tasks",
    columns: ["id", "title", "description", "status", "priority", "due_date", "created_at"],
  },
};

export function escapeCsvValue(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function rowToCsv(row: Record<string, unknown>, columns: string[]): string {
  return columns.map((col) => escapeCsvValue(row[col])).join(",");
}
