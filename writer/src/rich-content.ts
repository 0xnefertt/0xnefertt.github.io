import { marked } from "marked";
import DOMPurify from "dompurify";
import Turndown from "turndown";

const converter = new Turndown({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-", emDelimiter: "*" });
converter.keep(["u", "mark", "span", "table"]);
converter.addRule("strike", { filter: ["s", "del"], replacement: (content) => `~~${content}~~` });
converter.addRule("styledBlock", {
  filter: (node) => /^(P|H[1-6])$/.test(node.nodeName) && node.hasAttribute("style"),
  replacement: (_content, node) => `\n\n${(node as HTMLElement).outerHTML}\n\n`,
});

export function safeLink(value: string): boolean {
  if (!value || /[\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    const url = new URL(value, "https://0xnefertt.github.io");
    return ["http:", "https:", "mailto:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}
export function safeImage(value: string): boolean {
  if (value.startsWith("/api/media/") || value.startsWith("/assets/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
export function cleanHtml(value: string): string {
  return DOMPurify.sanitize(value, {
    FORBID_TAGS: ["script", "style", "form", "input", "button", "iframe", "object", "embed"],
    FORBID_ATTR: ["srcset"],
  });
}
export function markdownToHtml(value: string): string {
  return cleanHtml(marked.parse(value, { async: false }) as string);
}
export function richToMarkdown(html: string): string {
  return converter.turndown(cleanHtml(html));
}
// Custom embeds/templates and footnotes stay in source mode to prevent a lossy schema conversion.
export function requiresSource(value: string): boolean {
  const text = value.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, "").replace(/`[^`\n]*`/g, "");
  if (/\{%|\{\{|\[\^|<!--|\$\$/.test(text)) return true;
  const allowed = new Set([
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "del",
    "mark",
    "span",
    "ul",
    "ol",
    "li",
    "blockquote",
    "pre",
    "code",
    "hr",
    "br",
    "a",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "colgroup",
    "col",
  ]);
  if (/<(?:p|h[1-6]|span|img|table|td|th|a)\b[^>]*\b(?:class|id)\s*=/i.test(text)) return true;
  return [...text.matchAll(/<\/?([a-z][a-z0-9-]*)(?:\s[^>]*|\/)?\s*>/gi)].some((match) => !allowed.has(match[1].toLowerCase()));
}
