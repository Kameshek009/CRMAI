/**
 * Sanitize LLM response text to prevent XSS.
 * Strips dangerous HTML while preserving markdown formatting.
 */
export function sanitizeLLMResponse(text: string): string {
  return (
    text
      // Remove script tags and content
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      // Remove iframe tags
      .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
      // Remove object/embed tags
      .replace(/<(object|embed|applet)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
      // Remove on* event handlers (e.g. onerror, onclick)
      .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "")
      // Remove javascript: URLs
      .replace(/javascript\s*:/gi, "")
      // Remove data: URLs with script content
      .replace(/data\s*:\s*text\/html/gi, "")
      // Remove remaining HTML tags (but keep content)
      .replace(/<\/?[a-z][^>]*>/gi, "")
  );
}

/**
 * Sanitize a JSON object from LLM — recursively sanitize all string values.
 */
export function sanitizeLLMJson<T>(obj: T): T {
  if (typeof obj === "string") return sanitizeLLMResponse(obj) as T;
  if (Array.isArray(obj)) return obj.map(sanitizeLLMJson) as T;
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeLLMJson(value);
    }
    return result as T;
  }
  return obj;
}
