import { Marked } from "marked";
import DOMPurify from "dompurify";
import Turndown from "turndown";
import { youtubeFrameAttributes, youtubeVideo } from "../../shared/youtube.mjs";

// Marked emits block-level text instead of paragraphs inside tight lists.
function renderVideoParagraph(token: { text: string; tokens?: unknown[] }): string | false {
  const video = token.tokens?.length === 1 && youtubeVideo(token.text.trim());
  return video ? `<p data-youtube="true">${video.url}</p>\n` : false;
}
const markdown = new Marked({ renderer: { paragraph: renderVideoParagraph, text: renderVideoParagraph } });

export function videoFrame(video: NonNullable<ReturnType<typeof youtubeVideo>>) {
  const frame = document.createElement("iframe");
  for (const [name, value] of Object.entries(youtubeFrameAttributes(video))) frame.setAttribute(name, value);
  return frame;
}

const converter = new Turndown({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-", emDelimiter: "*" });
converter.addRule("youtube", {
  filter: (node) => node.nodeName === "P" && node.hasAttribute("data-youtube") && !!youtubeVideo(node.textContent ?? ""),
  replacement: (_content, node) => `\n\n${node.textContent}\n\n`,
});
converter.keep(["u", "mark", "span", "table"]);
converter.addRule("imageLayout", {
  filter: (node) =>
    (node.nodeName === "P" && node.getAttribute("data-image-pair") === "true") ||
    (node.nodeName === "IMG" && ["data-image-width", "width", "height"].some((attr) => node.hasAttribute(attr))),
  replacement: (_content, node) => `\n\n${(node as HTMLElement).outerHTML}\n\n`,
});
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
function bodyTemplate(value: string) {
  const template = document.createElement("template");
  template.innerHTML = cleanHtml(markdown.parse(value, { async: false }) as string);
  return template;
}
export function editorBody(value: string): string {
  const template = bodyTemplate(value);
  // ProseMirror list items require a leading paragraph before block media.
  for (const video of template.content.querySelectorAll("li > p[data-youtube]:first-child")) video.before(document.createElement("p"));
  return template.innerHTML;
}
export function previewBody(value: string): DocumentFragment {
  const template = bodyTemplate(value);
  for (const marker of template.content.querySelectorAll("p[data-youtube]")) {
    const video = youtubeVideo(marker.textContent ?? "");
    if (video) marker.replaceWith(videoFrame(video));
  }
  return template.content;
}
export function richToMarkdown(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = cleanHtml(html);
  // Tiptap stores standalone images as block nodes. Keep their paragraph breaks in Markdown.
  for (const image of Array.from(template.content.children)) {
    if (image.tagName !== "IMG") continue;
    const paragraph = image.ownerDocument.createElement("p");
    image.replaceWith(paragraph);
    paragraph.append(image);
  }
  return converter.turndown(template.content);
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
