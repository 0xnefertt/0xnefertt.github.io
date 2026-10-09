import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { build } from "esbuild";
import { readFile, mkdir } from "node:fs/promises";

let dom,
  content,
  adapter,
  changes = 0;
before(async () => {
  await mkdir(".test-build", { recursive: true });
  const markup = await readFile("src/editor.html", "utf8");
  dom = new JSDOM(markup, { url: "https://writer.example.com", pretendToBeVisual: true });
  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "Element",
    "Node",
    "MutationObserver",
    "DOMParser",
    "ClipboardEvent",
    "getComputedStyle",
  ]) {
    const value = dom.window[key];
    if (value !== undefined)
      Object.defineProperty(globalThis, key, {
        value: typeof value === "function" && key === "getComputedStyle" ? value.bind(dom.window) : value,
        configurable: true,
      });
  }
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  await build({
    entryPoints: ["src/rich-editor.ts", "src/rich-content.ts"],
    outdir: ".test-build/rich",
    bundle: true,
    format: "esm",
    platform: "node",
  });
  content = await import("../.test-build/rich/rich-content.js");
  const module = await import("../.test-build/rich/rich-editor.js");
  adapter = module.richEditor({
    onChange: () => changes++,
    onComposition: () => {},
    upload: async () => {},
    imageSrc: async (src) => (src.startsWith("/api/") ? "blob:preview-only" : src),
    report: (error) => {
      throw error;
    },
  });
});
after(() => dom?.window.close());

test("opening Markdown leaves source byte-for-byte unchanged and clears undo between posts", async () => {
  const source = "## Heading\n\n**Bold** and *italic* text.\n\n- One\n- Two\n\n```ts\nconst n = 1;\n```\n";
  changes = 0;
  adapter.load(source);
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(adapter.getBody(), source);
  assert.equal(changes, 0);
  assert.equal(document.getElementById("rich-undo").disabled, true);
  adapter.load("Another post.\n");
  assert.equal(document.getElementById("rich-undo").disabled, true);
  assert.equal(adapter.getBody(), "Another post.\n");
});
test("rich formatting and tables survive Markdown serialization and re-import", () => {
  const html =
    '<h2>Heading</h2><p style="text-align: center"><strong>Bold</strong> <u>underlined</u> <span style="font-size: 24px; font-family: Georgia, serif; color: #ff0000; line-height: 2">Styled</span> <mark data-color="#fff3a3" style="background-color: #fff3a3">Highlight</mark></p><ul><li><p>One</p></li><li><p>Two</p></li></ul><blockquote><p>Quote</p></blockquote><pre><code class="language-ts">const n = 1;</code></pre><table><tbody><tr><th><p>Header</p></th><th><p>Second</p></th></tr><tr><td><p>Cell</p></td><td><p>Value</p></td></tr></tbody></table>';
  const markdown = content.richToMarkdown(html);
  assert.match(markdown, /## Heading/);
  assert.match(markdown, /text-align: center/);
  assert.match(markdown, /font-size: 24px/);
  assert.match(markdown, /font-family: Georgia, serif/);
  assert.match(markdown, /<u>underlined<\/u>/);
  assert.match(markdown, /<mark/);
  assert.match(markdown, /-\s+One/);
  assert.match(markdown, /> Quote/);
  assert.match(markdown, /```ts/);
  assert.match(markdown, /<table>/);
  adapter.load(markdown);
  assert.equal(adapter.isSource(), false);
  assert.equal(document.querySelector(".tiptap p").style.textAlign, "center");
  assert.equal(document.querySelector(".tiptap span").style.fontSize, "24px");
  assert.equal(document.querySelectorAll(".tiptap td").length, 2);
  assert.equal(adapter.getBody(), markdown);
});
test("private images keep their original media reference, including insertion while upload locks editing", async () => {
  adapter.load("Body.\n");
  adapter.setLocked(true);
  adapter.insertImage("/api/media/11111111-1111-4111-8111-111111111111", "Chart");
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.match(adapter.getBody(), /\/api\/media\/11111111/);
  assert.ok(!adapter.getBody().includes("blob:"));
  assert.equal(document.querySelector(".tiptap img").getAttribute("src"), "blob:preview-only");
  adapter.setLocked(false);
});
test("custom embeds use source mode and unsafe pasted content and links are rejected", () => {
  const source = '<div class="video"><iframe src="https://example.com"></iframe></div>\n';
  adapter.load(source);
  assert.equal(adapter.isSource(), true);
  assert.equal(adapter.getBody(), source);
  assert.equal(content.requiresSource("```html\n<div>Code example</div>\n```"), false);
  assert.equal(content.requiresSource("<https://example.com>"), false);
  const cleaned = content.cleanHtml('<script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">Bad</a>');
  assert.ok(!cleaned.includes("<script") && !cleaned.includes("onerror") && !cleaned.includes("javascript:"));
  assert.equal(content.safeLink("javascript:alert(1)"), false);
  assert.equal(content.safeImage("data:image/png;base64,test"), false);
  assert.equal(content.safeImage("https://example.com/image.png"), true);
});
