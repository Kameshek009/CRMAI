'use client';

import { cn } from '@/lib/utils';

interface MarkdownProps {
  content: string;
  className?: string;
}

/**
 * Simple Markdown renderer matching desktop formatting
 * Supports: bold, italic, inline code, links, headings, lists, tables, code blocks
 */
export function Markdown({ content, className }: MarkdownProps) {
  if (!content) return null;

  const html = renderMarkdown(content);

  return (
    <div
      className={cn('markdown-content', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
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

function renderMarkdown(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let inList = false;
  let inOrderedList = false;
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockContent: string[] = [];
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

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    // Code block start/end
    if (trimmedLine.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = trimmedLine.slice(3).trim();
        codeBlockContent = [];
        if (inList) { out.push('</ul>'); inList = false; }
        if (inOrderedList) { out.push('</ol>'); inOrderedList = false; }
      } else {
        inCodeBlock = false;
        const langClass = codeBlockLang ? ` language-${codeBlockLang}` : '';
        out.push(
          `<pre class="code-block${langClass}"><code>${escapeHtml(codeBlockContent.join('\n'))}</code></pre>`
        );
        codeBlockLang = '';
        codeBlockContent = [];
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      return;
    }

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
  if (inCodeBlock) {
    out.push(`<pre class="code-block"><code>${escapeHtml(codeBlockContent.join('\n'))}</code></pre>`);
  }
  if (inList) out.push('</ul>');
  if (inOrderedList) out.push('</ol>');

  return out.join('');
}
