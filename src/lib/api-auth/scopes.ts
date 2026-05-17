/**
 * Scope matching for API key authorization.
 *
 * Convention: scopes are colon-separated namespaces, e.g. `contacts:read`.
 * Wildcards:
 *   - `*`              — grants everything (super key, use sparingly)
 *   - `contacts:*`     — grants every action under `contacts:`
 *
 * Exact match is otherwise required.
 */

export function hasScope(granted: readonly string[], required: string): boolean {
  for (const s of granted) {
    if (s === "*") return true;
    if (s === required) return true;
    if (s.endsWith(":*")) {
      const ns = s.slice(0, -2);
      if (required === ns) return true;
      if (required.startsWith(`${ns}:`)) return true;
    }
  }
  return false;
}

export function hasAllScopes(granted: readonly string[], required: readonly string[]): boolean {
  return required.every((r) => hasScope(granted, r));
}
