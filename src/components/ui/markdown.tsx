'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, Copy } from 'lucide-react';
import hljs from 'highlight.js/lib/core';

// Register only the languages we need
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import markdown from 'highlight.js/lib/languages/markdown';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);

// Types for content segments
type Segment =
  | { type: 'text'; html: string }
  | { type: 'code'; lang: string; code: string };

interface MarkdownProps {
  content: string;
  className?: string;
}

/**
 * Enhanced Markdown renderer with syntax-highlighted code blocks
 */
export function Markdown({ content, className }: MarkdownProps) {
  if (!content) return null;

  const segments = useMemo(() => parseSegments(content), [content]);

  return (
    <div className={cn('markdown-content text-sm', className)}>
      {segments.map((seg, i) =>
        seg.type === 'code' ? (
          <CodeBlock key={i} language={seg.lang} code={seg.code} />
        ) : (
          <div key={i} dangerouslySetInnerHTML={{ __html: seg.html }} />
        )
      )}
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const highlightedHtml = useMemo(() => {
    if (language && hljs.getLanguage(language)) {
      return hljs.highlight(code, { language }).value;
    }
    try {
      return hljs.highlightAuto(code).value;
    } catch {
      return escapeHtml(code);
    }
  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-block-lang">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors"
          style={{ color: copied ? '#4ade80' : '#8b8fa3', background: 'transparent' }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="code-block-body">
        <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
      </pre>
    </div>
  );
}

// --- Parsing logic ---

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  const lines = text.split('\n');
  let textLines: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockContent: string[] = [];

  function flushText() {
    if (textLines.length > 0) {
      const html = renderMarkdownLines(textLines);
      if (html.trim()) {
        segments.push({ type: 'text', html });
      }
      textLines = [];
    }
  }

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('```')) {
      if (!inCodeBlock) {
        flushText();
        inCodeBlock = true;
        codeBlockLang = trimmedLine.slice(3).trim();
        codeBlockContent = [];
      } else {
        inCodeBlock = false;
        segments.push({
          type: 'code',
          lang: codeBlockLang,
          code: codeBlockContent.join('\n'),
        });
        codeBlockLang = '';
        codeBlockContent = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
    } else {
      textLines.push(line);
    }
  }

  // Flush remaining
  if (inCodeBlock) {
    // Unclosed code block - render as code anyway
    segments.push({
      type: 'code',
      lang: codeBlockLang,
      code: codeBlockContent.join('\n'),
    });
  }
  flushText();

  return segments;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function applyInlineFormatting(str: string): string {
  let result = str;
  // Inline code `code`
  result = result.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  // Bold **text**
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic *text*
  result = result.replace(/(^|\s)\*([^*]+)\*(?=\s|$)/g, '$1<em>$2</em>');
  // Links [text](url)
  result = result.replace(
    /\[([^\]]+)\]\((https?:[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer" class="text-primary hover:underline">$1</a>'
  );
  return result;
}

function parseTableRow(row: string): string[] {
  const trimmed = row.trim().replace(/^\||\|$/g, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\|?\s*[-:]+\s*(\|\s*[-:]+\s*)+\|?$/.test(line.trim());
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') || (trimmed.includes('|') && !trimmed.startsWith('#'));
}

function renderMarkdownLines(lines: string[]): string {
  const out: string[] = [];
  let inList = false;
  let inOrderedList = false;
  let inBlockquote = false;
  let tableBuffer: string[] = [];

  function flushTable() {
    if (tableBuffer.length === 0) return;

    if (tableBuffer.length >= 2 && isTableSeparator(tableBuffer[1])) {
      const headerCells = parseTableRow(tableBuffer[0]);

      let tableHtml = '<table class="markdown-table"><thead><tr>';
      headerCells.forEach((cell) => {
        tableHtml += '<th>' + applyInlineFormatting(escapeHtml(cell)) + '</th>';
      });
      tableHtml += '</tr></thead><tbody>';

      for (let i = 2; i < tableBuffer.length; i++) {
        const cells = parseTableRow(tableBuffer[i]);
        tableHtml += '<tr>';
        cells.forEach((cell) => {
          tableHtml += '<td>' + applyInlineFormatting(escapeHtml(cell)) + '</td>';
        });
        tableHtml += '</tr>';
      }

      tableHtml += '</tbody></table>';
      out.push(tableHtml);
    } else {
      tableBuffer.forEach((line) => {
        if (line.trim().length) {
          out.push('<p>' + applyInlineFormatting(escapeHtml(line)) + '</p>');
        }
      });
    }

    tableBuffer = [];
  }

  function flushBlockquote() {
    if (inBlockquote) {
      out.push('</blockquote>');
      inBlockquote = false;
    }
  }

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    // Blockquote
    if (trimmedLine.startsWith('> ') || trimmedLine === '>') {
      if (inList) { out.push('</ul>'); inList = false; }
      if (inOrderedList) { out.push('</ol>'); inOrderedList = false; }
      if (tableBuffer.length > 0) flushTable();
      if (!inBlockquote) {
        out.push('<blockquote>');
        inBlockquote = true;
      }
      const bqContent = trimmedLine.replace(/^>\s?/, '');
      if (bqContent.length) {
        out.push('<p>' + applyInlineFormatting(escapeHtml(bqContent)) + '</p>');
      }
      return;
    }

    if (inBlockquote) flushBlockquote();

    // Table handling
    if (isTableRow(trimmedLine) || (tableBuffer.length > 0 && isTableSeparator(trimmedLine))) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (inOrderedList) { out.push('</ol>'); inOrderedList = false; }
      tableBuffer.push(line);
      return;
    }

    if (tableBuffer.length > 0) {
      flushTable();
    }

    const escapedLine = escapeHtml(trimmedLine);
    const formattedLine = applyInlineFormatting(escapedLine);

    // Headings
    if (/^######\s+/.test(trimmedLine)) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (inOrderedList) { out.push('</ol>'); inOrderedList = false; }
      out.push('<h6 class="text-xs font-semibold mt-3 mb-1">' + applyInlineFormatting(escapeHtml(trimmedLine.replace(/^######\s+/, ''))) + '</h6>');
    } else if (/^#####\s+/.test(trimmedLine)) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (inOrderedList) { out.push('</ol>'); inOrderedList = false; }
      out.push('<h5 class="text-sm font-semibold mt-3 mb-1">' + applyInlineFormatting(escapeHtml(trimmedLine.replace(/^#####\s+/, ''))) + '</h5>');
    } else if (/^####\s+/.test(trimmedLine)) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (inOrderedList) { out.push('</ol>'); inOrderedList = false; }
      out.push('<h4 class="text-sm font-semibold mt-4 mb-1">' + applyInlineFormatting(escapeHtml(trimmedLine.replace(/^####\s+/, ''))) + '</h4>');
    } else if (/^###\s+/.test(trimmedLine)) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (inOrderedList) { out.push('</ol>'); inOrderedList = false; }
      out.push('<h3 class="text-base font-semibold mt-4 mb-2">' + applyInlineFormatting(escapeHtml(trimmedLine.replace(/^###\s+/, ''))) + '</h3>');
    } else if (/^##\s+/.test(trimmedLine)) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (inOrderedList) { out.push('</ol>'); inOrderedList = false; }
      out.push('<h2 class="text-lg font-semibold mt-4 mb-2">' + applyInlineFormatting(escapeHtml(trimmedLine.replace(/^##\s+/, ''))) + '</h2>');
    } else if (/^#\s+/.test(trimmedLine)) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (inOrderedList) { out.push('</ol>'); inOrderedList = false; }
      out.push('<h1 class="text-xl font-semibold mt-4 mb-2">' + applyInlineFormatting(escapeHtml(trimmedLine.replace(/^#\s+/, ''))) + '</h1>');
    }
    // Horizontal rule
    else if (/^[-*_]{3,}$/.test(trimmedLine)) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (inOrderedList) { out.push('</ol>'); inOrderedList = false; }
      out.push('<hr class="my-3 border-border" />');
    }
    // Ordered list
    else if (/^\d+\.\s+/.test(trimmedLine)) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (!inOrderedList) { out.push('<ol class="list-decimal list-inside space-y-1 my-2">'); inOrderedList = true; }
      out.push('<li>' + applyInlineFormatting(escapeHtml(trimmedLine.replace(/^\d+\.\s+/, ''))) + '</li>');
    }
    // Unordered list
    else if (/^[-*]\s+/.test(trimmedLine) && !isTableSeparator(trimmedLine)) {
      if (inOrderedList) { out.push('</ol>'); inOrderedList = false; }
      if (!inList) { out.push('<ul class="list-disc list-inside space-y-1 my-2">'); inList = true; }
      out.push('<li>' + applyInlineFormatting(escapeHtml(trimmedLine.replace(/^[-*]\s+/, ''))) + '</li>');
    }
    // Regular paragraph
    else {
      if (inList) { out.push('</ul>'); inList = false; }
      if (inOrderedList) { out.push('</ol>'); inOrderedList = false; }
      if (trimmedLine.length) {
        out.push('<p class="my-1">' + formattedLine + '</p>');
      }
    }
  });

  // Flush remaining
  flushTable();
  flushBlockquote();
  if (inList) out.push('</ul>');
  if (inOrderedList) out.push('</ol>');

  return out.join('');
}
