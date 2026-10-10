import { before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

let postShareLinks, initPostShare;
before(async () => {
  await mkdir(".test-build", { recursive: true });
  for (const [name, source] of [
    ["post-share-links", "../astro/src/lib/postShare.ts"],
    ["post-share-ui", "../astro/src/scripts/post-share.ts"],
  ]) {
    await build({ entryPoints: [source], outfile: `.test-build/${name}.mjs`, bundle: true, format: "esm", platform: "node" });
  }
  ({ postShareLinks } = await import("../.test-build/post-share-links.mjs"));
  ({ initPostShare } = await import("../.test-build/post-share-ui.mjs"));
});

test("share destinations preserve Korean titles and canonical locale paths without tracking queries or fragments", () => {
  const title = "개발 기록 & C++ / 한 줄\n다음 줄";
  const input = "https://0xnefertt.github.io/ko/blog/2026/example/?utm_source=test#section";
  const links = postShareLinks(title, input);
  assert.equal(links.url, "https://0xnefertt.github.io/ko/blog/2026/example/");
  assert.equal(new URL(links.facebook).searchParams.get("u"), links.url);
  assert.equal(new URL(links.reddit).searchParams.get("title"), title);
  assert.equal(new URL(links.reddit).searchParams.get("url"), links.url);
  assert.equal(new URL(links.whatsapp).searchParams.get("text"), `${title}\n\n${links.url}`);
  assert.equal(decodeURIComponent(links.email.match(/subject=([^&]+)/)[1]), title);
  assert.equal(decodeURIComponent(links.email.split("&body=")[1]), `${title}\n\n${links.url}`);
  assert.throws(() => postShareLinks(title, "javascript:alert(1)"));
});

function setup(lang, writeText) {
  const url = "https://0xnefertt.github.io/ko/blog/2026/example/";
  const dom = new JSDOM(
    `<html lang="${lang}"><body><div data-post-share data-share-url="${url}"><button data-share-open>Share</button><button data-share-copy>Copy</button><span data-share-status></span><dialog><button data-share-close>Close</button><button data-share-copy>Copy</button><input type="url" class="post-share-url" value="${url}"><p data-share-status></p></dialog></div></body></html>`
  );
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, "navigator", { value: { clipboard: { writeText } }, configurable: true });
  const root = document.querySelector("[data-post-share]");
  const dialog = root.querySelector("dialog");
  let opened = 0;
  dialog.showModal = () => {
    opened++;
    dialog.open = true;
  };
  dialog.close = () => {
    dialog.open = false;
    dialog.dispatchEvent(new dom.window.Event("close"));
  };
  initPostShare(root);
  return { root, dialog, url, opened: () => opened };
}

test("dialog opens once, locks background scrolling, and returns focus to the trigger on close", () => {
  const { root, dialog, opened } = setup("en", async () => {});
  initPostShare(root);
  root.querySelector("[data-share-open]").click();
  assert.equal(opened(), 1);
  assert.ok(dialog.open);
  assert.ok(document.documentElement.classList.contains("post-share-is-open"));
  root.querySelector("[data-share-close]").click();
  assert.ok(!dialog.open);
  assert.ok(!document.documentElement.classList.contains("post-share-is-open"));
  assert.equal(document.activeElement, root.querySelector("[data-share-open]"));
});

test("Tab and Shift+Tab keep keyboard focus inside the dialog", () => {
  const { root, dialog } = setup("en", async () => {});
  root.querySelector("[data-share-open]").click();
  const first = dialog.querySelector("[data-share-close]");
  const last = dialog.querySelector("input");
  first.focus();
  first.dispatchEvent(new document.defaultView.KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true }));
  assert.equal(document.activeElement, last);
  last.dispatchEvent(new document.defaultView.KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
  assert.equal(document.activeElement, first);
});

test("copy buttons copy the canonical URL and report successful copying in the page language", async () => {
  let copied;
  const { root, url } = setup("ko", async (value) => {
    copied = value;
  });
  root.querySelector("[data-share-copy]").click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(copied, url);
  assert.equal(root.querySelector("[data-share-status]").textContent, "링크를 복사했습니다.");
});

test("denied clipboard access opens the dialog and offers the selected URL without claiming success", async () => {
  const { root, dialog } = setup("en", async () => {
    throw new Error("Permission denied");
  });
  root.querySelector("[data-share-copy]").click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(dialog.open);
  assert.equal(document.activeElement, root.querySelector("input"));
  assert.equal(root.querySelector("input").selectionEnd, root.querySelector("input").value.length);
  assert.equal(root.querySelector("[data-share-status]").textContent, "Please copy the selected link.");
});
