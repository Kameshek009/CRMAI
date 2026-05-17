import type { Operator } from "./types";

// Walks a dotted path. Returns undefined as soon as any intermediate hop is
// nullish or non-object, so callers can treat undefined as "missing".
export function getFieldValue(row: unknown, path: string): unknown {
  if (!path) return undefined;
  const parts = path.split(".");
  let cur: unknown = row;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (v instanceof Date) return v.getTime();
  return null;
}

function asString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

// Loose equality with type coercion appropriate for CRM data:
// "5" eq 5, "true" eq true, but no coercion across object/array boundaries.
function looseEq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  const sa = asString(a);
  const sb = asString(b);
  if (sa !== null && sb !== null) return sa.toLowerCase() === sb.toLowerCase();
  return false;
}

// Returns whether the operator considers (fieldValue, target) a match.
// Unknown operators return false rather than throw — keeps a single bad
// rule from breaking the whole score recompute.
export function evaluateOperator(
  fieldValue: unknown,
  operator: Operator,
  target: unknown,
): boolean {
  switch (operator) {
    case "exists":
      return fieldValue !== undefined && fieldValue !== null;
    case "not_exists":
      return fieldValue === undefined || fieldValue === null;
    case "empty":
      return isEmpty(fieldValue);
    case "not_empty":
      return !isEmpty(fieldValue);
    case "eq":
      return looseEq(fieldValue, target);
    case "ne":
      return !looseEq(fieldValue, target);
    case "gt":
    case "lt":
    case "gte":
    case "lte": {
      const a = toNumber(fieldValue);
      const b = toNumber(target);
      if (a === null || b === null) return false;
      if (operator === "gt") return a > b;
      if (operator === "lt") return a < b;
      if (operator === "gte") return a >= b;
      return a <= b;
    }
    case "contains": {
      const s = asString(fieldValue);
      const t = asString(target);
      if (Array.isArray(fieldValue) && t !== null) {
        return fieldValue.some((el) => looseEq(el, target));
      }
      if (s !== null && t !== null) return s.toLowerCase().includes(t.toLowerCase());
      return false;
    }
    case "not_contains": {
      return !evaluateOperator(fieldValue, "contains", target);
    }
    case "starts_with": {
      const s = asString(fieldValue);
      const t = asString(target);
      return s !== null && t !== null && s.toLowerCase().startsWith(t.toLowerCase());
    }
    case "ends_with": {
      const s = asString(fieldValue);
      const t = asString(target);
      return s !== null && t !== null && s.toLowerCase().endsWith(t.toLowerCase());
    }
    case "in": {
      if (!Array.isArray(target)) return false;
      return target.some((el) => looseEq(fieldValue, el));
    }
    case "not_in": {
      if (!Array.isArray(target)) return true;
      return !target.some((el) => looseEq(fieldValue, el));
    }
    case "regex": {
      const s = asString(fieldValue);
      if (s === null || typeof target !== "string") return false;
      try {
        let pattern = target;
        let flags = "";
        // PCRE-style inline flags like `(?i)` aren't valid JS regex syntax;
        // extract them and pass via the flags argument so users can write
        // the more common form they've seen elsewhere.
        const inline = pattern.match(/^\(\?([imsu]+)\)/);
        if (inline && inline[1]) {
          flags = inline[1];
          pattern = pattern.slice(inline[0].length);
        }
        return new RegExp(pattern, flags).test(s);
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}
