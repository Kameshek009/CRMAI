import { describe, it, expect } from "vitest";
import { sanitizeLLMResponse, sanitizeLLMJson } from "@/lib/sanitize";

describe("sanitizeLLMResponse", () => {
  it("preserves plain text", () => {
    expect(sanitizeLLMResponse("Hello world")).toBe("Hello world");
  });

  it("preserves markdown", () => {
    const md = "# Title\n\n- item 1\n- item 2\n\n**bold** and *italic*";
    expect(sanitizeLLMResponse(md)).toBe(md);
  });

  it("strips script tags and content", () => {
    expect(sanitizeLLMResponse('Hello<script>alert("xss")</script>World')).toBe("HelloWorld");
  });

  it("strips iframe tags", () => {
    expect(sanitizeLLMResponse('Text<iframe src="evil.com"></iframe>End')).toBe("TextEnd");
  });

  it("strips on* event handlers", () => {
    expect(sanitizeLLMResponse('<img onerror="alert(1)" src="x">')).toBe("");
  });

  it("strips javascript: URLs", () => {
    const input = 'Click [here](javascript:alert(1))';
    expect(sanitizeLLMResponse(input)).not.toContain("javascript:");
  });

  it("strips data:text/html", () => {
    const input = '<a href="data:text/html,<script>alert(1)</script>">X</a>';
    const result = sanitizeLLMResponse(input);
    expect(result).not.toContain("data:text/html");
    expect(result).not.toContain("<script>");
  });

  it("strips object/embed/applet tags and their content", () => {
    expect(sanitizeLLMResponse('A<object data="x">B</object>C')).toBe("AC");
    expect(sanitizeLLMResponse('A<embed src="x">B</embed>C')).toBe("AC");
  });

  it("handles case-insensitive patterns", () => {
    expect(sanitizeLLMResponse('<SCRIPT>alert(1)</SCRIPT>')).toBe("");
    expect(sanitizeLLMResponse('<Script>alert(1)</Script>')).toBe("");
  });
});

describe("sanitizeLLMJson", () => {
  it("sanitizes string values in objects", () => {
    const input = { text: 'Hello<script>alert("xss")</script>', num: 42 };
    const result = sanitizeLLMJson(input);
    expect(result.text).toBe("Hello");
    expect(result.num).toBe(42);
  });

  it("sanitizes nested objects", () => {
    const input = { outer: { inner: '<iframe src="x"></iframe>Clean' } };
    const result = sanitizeLLMJson(input);
    expect(result.outer.inner).toBe("Clean");
  });

  it("sanitizes arrays", () => {
    const input = ['<script>x</script>', 'safe'];
    const result = sanitizeLLMJson(input);
    expect(result).toEqual(["", "safe"]);
  });

  it("preserves non-string values", () => {
    const input = { a: 42, b: true, c: null };
    expect(sanitizeLLMJson(input)).toEqual({ a: 42, b: true, c: null });
  });
});
