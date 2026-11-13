import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
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

test("the video dialog validates URLs and keeps the player across Markdown, preview and reopening", () => {
  adapter.load("본문입니다.");
  const dialog = document.getElementById("insert-dialog");
  dialog.showModal = () => dialog.setAttribute("open", "");
  dialog.close = () => dialog.removeAttribute("open");
  document.getElementById("rich-video").click();
  const url = document.getElementById("insert-url");
  const submit = () => document.getElementById("insert-form").dispatchEvent(new dom.window.Event("submit", { cancelable: true }));
  url.value = "https://youtube.com.example.org/watch?v=U0TXIXTzJEY";
  submit();
  assert.ok(dialog.open);
  assert.match(document.getElementById("insert-error").textContent, /YouTube/);
  url.value = "https://www.youtube.com/watch?v=U0TXIXTzJEY&t=1m30s";
  submit();
  assert.ok(!dialog.open);
  const src = "https://www.youtube-nocookie.com/embed/U0TXIXTzJEY?start=90";
  assert.equal(document.querySelector(".tiptap iframe").src, src);
  const markdown = adapter.getBody();
  assert.match(markdown, /^https:\/\/youtu\.be\/U0TXIXTzJEY\?t=90$/m);
  assert.match(markdown, /본문입니다\./);
  adapter.load(markdown);
  assert.equal(adapter.isSource(), false);
  assert.equal(document.querySelector(".tiptap iframe").src, src);
  const preview = content.previewBody(markdown);
  assert.equal(preview.querySelector("iframe").src, src);
  assert.equal(preview.querySelector("iframe").getAttribute("referrerpolicy"), "strict-origin-when-cross-origin");
});

test("pasting a video into an empty paragraph inserts an undoable video block", () => {
  adapter.load("");
  const event = new dom.window.Event("paste", { bubbles: true, cancelable: true });
  const data = { files: [], getData: (type) => (type === "text/plain" ? "https://www.youtube.com/shorts/U0TXIXTzJEY" : "") };
  Object.defineProperty(event, "clipboardData", { value: data });
  document.querySelector(".tiptap").dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(document.querySelector(".tiptap iframe").src, "https://www.youtube-nocookie.com/embed/U0TXIXTzJEY");
  document.getElementById("rich-undo").click();
  assert.equal(document.querySelector(".tiptap iframe"), null);
});

test("only standalone video URLs become frames in Markdown preview", () => {
  const url = "https://youtu.be/U0TXIXTzJEY";
  const markdown = [
    url,
    `참고 ${url}`,
    `[영상](${url})`,
    `\`${url}\``,
    `\`\`\`\n${url}\n\`\`\``,
    "https://www.youtube.com/@channel",
    '<iframe src="https://example.com" srcdoc="anything"></iframe>',
    '<p data-youtube="true">https://example.com</p>',
  ].join("\n\n");
  const preview = content.previewBody(markdown);
  assert.equal(preview.querySelectorAll("iframe").length, 1);
  assert.equal(preview.querySelectorAll("a").length, 3);
  assert.equal(preview.querySelectorAll("code").length, 2);
});

test("videos in lists and rich table cells survive editing, preview and site rendering", async () => {
  const { markdownYoutube } = await import("../../astro/markdown-youtube.mjs");
  const astroRequire = createRequire(new URL("../../astro/package.json", import.meta.url));
  const { createMarkdownProcessor } = await import(astroRequire.resolve("@astrojs/markdown-remark"));
  const url = "https://youtu.be/U0TXIXTzJEY";
  const marker = `<p data-youtube="true" data-width="320">${url}</p>`;
  const html = `${marker}<ul><li>${marker}</li></ul><table><tbody><tr><td>${marker}</td></tr></tbody></table>`;
  const markdown = content.richToMarkdown(html);
  adapter.load(markdown);
  const processor = await createMarkdownProcessor({ remarkPlugins: [markdownYoutube] });
  const published = new JSDOM((await processor.render(markdown)).code);
  for (const root of [document.querySelector(".tiptap"), content.previewBody(markdown), published.window.document]) {
    assert.deepEqual(
      [...root.querySelectorAll("iframe")].map((frame) => frame.getAttribute("width")),
      ["320", "320", "320"]
    );
    for (const container of ["li", "td"]) {
      assert.equal(root.querySelector(`${container} iframe`)?.src, "https://www.youtube-nocookie.com/embed/U0TXIXTzJEY");
    }
  }
  published.window.close();
});
