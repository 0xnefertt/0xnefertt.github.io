import { before, afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

let markup,
  dom,
  scenario = 0;
const originalTimeout = globalThis.setTimeout;
const timers = new Set();
before(async () => {
  markup = await readFile("src/editor.html", "utf8");
  await mkdir(".test-build", { recursive: true });
  await build({
    entryPoints: ["src/client.ts"],
    outfile: ".test-build/client-flows.mjs",
    bundle: true,
    format: "esm",
    platform: "node",
    banner: { js: 'import {createRequire} from "node:module"; const require=createRequire(import.meta.url);' },
    plugins: [
      {
        name: "client-ui-fixture",
        setup(build) {
          build.onLoad({ filter: /\.css$/ }, () => ({ contents: "", loader: "js" }));
          build.onResolve({ filter: /editor\.html\?raw$/ }, () => ({ path: "editor", namespace: "markup" }));
          build.onLoad({ filter: /.*/, namespace: "markup" }, () => ({ contents: `export default ${JSON.stringify(markup)}` }));
          build.onResolve({ filter: /^\.\/rich-editor$/ }, () => ({ path: "composer", namespace: "stub" }));
          build.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
            contents: `
        export function richEditor() {
          let body = '';
          return { load(value) {body=value}, getBody() {return body}, characters() {return body.length},
            isComposing() {return false}, isSource() {return false}, setLocked() {}, insertImage() {} };
        }`,
          }));
        },
      },
    ],
  });
});
afterEach(() => {
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
  globalThis.setTimeout = originalTimeout;
  dom?.window.close();
});
const settle = async () => {
  for (let i = 0; i < 8; i++) await new Promise((resolve) => setImmediate(resolve));
};
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function setup() {
  dom = new JSDOM(markup, { url: "http://localhost/", pretendToBeVisual: true });
  for (const key of [
    "window",
    "document",
    "location",
    "history",
    "sessionStorage",
    "Option",
    "InputEvent",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLTextAreaElement",
    "HTMLDetailsElement",
  ]) {
    Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
  }
  globalThis.setTimeout = (...args) => {
    const timer = originalTimeout(...args);
    timers.add(timer);
    return timer;
  };
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  dom.window.HTMLDialogElement.prototype.close = function (value) {
    if (value !== undefined) this.returnValue = value;
    this.open = false;
    this.dispatchEvent(new dom.window.Event("close"));
  };
  const drafts = new Map(),
    calls = [];
  let pendingSave,
    pendingList,
    pendingDrafts,
    id = 0;
  const response = (value) => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input, "http://localhost");
    const payload = init.body ? JSON.parse(init.body) : null;
    calls.push({ path: url.pathname, collection: url.searchParams.get("collection"), method: init.method ?? "GET", payload });
    if (url.pathname === "/api/session") return response({ csrf: "fixture" });
    if (url.pathname === "/api/site-settings")
      return response({
        settings: { categories: [{ name: "Notes", name_ko: "기록", slug: "study-log", children: [] }], favorites: [] },
        sha: "fixture",
        usage: {},
      });
    if (url.pathname === "/api/posts") {
      const kind = url.searchParams.get("collection");
      if (pendingList?.kind === kind) await pendingList.promise;
      return response({ posts: [{ path: kind === "books" ? "_books/book.md" : "_posts/study-log/post.md", sha: "fixture", language: "en" }] });
    }
    if (url.pathname === "/api/drafts" && !payload) {
      if (pendingDrafts?.kind === url.searchParams.get("collection")) await pendingDrafts.promise;
      return response({
        drafts: [...drafts.values()]
          .filter((d) => d.document.collection === url.searchParams.get("collection"))
          .filter((d) => Boolean(d.trashedAt) === (url.searchParams.get("trash") === "1"))
          .map((d) => ({
            id: d.id,
            title: d.document.title,
            language: d.document.metadata.lang,
            sourcePath: d.document.sourcePath,
            updated: d.updated,
            version: d.version,
          })),
      });
    }
    if (url.pathname === "/api/drafts") {
      const draft = { id: `draft-${++id}`, version: 1, updated: new Date().toISOString(), document: payload.document };
      drafts.set(draft.id, draft);
      return response(draft);
    }
    const draft = drafts.get(url.pathname.split("/")[3]);
    if (init.method === "DELETE") {
      draft.trashedAt = new Date().toISOString();
      draft.version++;
      return response({ id: draft.id, trashedAt: draft.trashedAt });
    }
    if (url.pathname.endsWith("/restore")) {
      draft.trashedAt = null;
      draft.version++;
      return response(draft);
    }
    if (init.method === "PUT") {
      if (pendingSave) {
        const wait = pendingSave;
        pendingSave = null;
        await wait.promise;
      }
      draft.document = payload.document;
      draft.version++;
      return response(draft);
    }
    if (url.pathname.endsWith("/publish")) return response({ draft, workflowUrl: "https://example.com/build" });
    return response(draft);
  };
  await import(`../.test-build/client-flows.mjs?scenario=${scenario++}`);
  await settle();
  const click = async (id) => {
    document.getElementById(id).click();
    await settle();
  };
  const edit = (id, value) => {
    const input = document.getElementById(id);
    input.value = value;
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  };
  return {
    calls,
    drafts,
    click,
    edit,
    holdList(kind) {
      pendingList = { kind, ...deferred() };
      return pendingList;
    },
    holdSave() {
      pendingSave = deferred();
      return pendingSave;
    },
    holdDrafts(kind) {
      pendingDrafts = { kind, ...deferred() };
      return pendingDrafts;
    },
  };
}

test("late published-list responses cannot replace another collection's library", async () => {
  const ui = await setup();
  const wait = ui.holdList("blog");
  await ui.click("post-tab");
  await ui.click("manage-books");
  wait.resolve();
  await settle();
  await ui.click("post-tab");
  assert.match(document.getElementById("post-list").textContent, /book/);
  assert.doesNotMatch(document.getElementById("post-list").textContent, /post\.md|study-log/);
  assert.ok(ui.calls.some((call) => call.path === "/api/posts" && call.collection === "books"));
});

test("late draft-list responses cannot replace another collection's library", async () => {
  const ui = await setup();
  await ui.click("new-post");
  ui.edit("title", "Blog draft");
  await ui.click("save");
  const wait = ui.holdDrafts("blog");
  await ui.click("draft-tab");
  await ui.click("manage-books");
  wait.resolve();
  await settle();
  assert.equal(document.getElementById("workspace").dataset.collection, "books");
  assert.doesNotMatch(document.getElementById("post-list").textContent, /Blog draft/);
});

test("publication locks the selected document before saving and reopening then cancelling cannot publish again", async () => {
  const ui = await setup();
  await ui.click("new-post");
  ui.edit("title", "Updated title");
  const wait = ui.holdSave();
  await ui.click("publish");
  const dialog = document.getElementById("publish-dialog");
  dialog.close("publish");
  await settle();
  assert.equal(document.getElementById("publish").disabled, true);
  await ui.click("manage-books");
  assert.equal(document.getElementById("workspace").dataset.collection, "blog");
  assert.equal(ui.calls.filter((call) => call.path.endsWith("/publish")).length, 0);
  wait.resolve();
  await settle();
  const published = ui.calls.filter((call) => call.path.endsWith("/publish"));
  assert.equal(published.length, 1);
  assert.equal(published[0].path, "/api/drafts/draft-1/publish");
  await ui.click("publish");
  assert.equal(dialog.returnValue, "");
  dialog.close();
  await settle();
  assert.equal(ui.calls.filter((call) => call.path.endsWith("/publish")).length, 1);
});

test("clearing an explicit translation key and changing a draft language survive saving and update library filters", async () => {
  const ui = await setup();
  await ui.click("new-post");
  ui.edit("translation-key", "custom-pair");
  await ui.click("save");
  assert.equal(ui.drafts.get("draft-1").document.metadata.translation_key, "custom-pair");
  ui.edit("translation-key", "");
  ui.edit("content-language", "ko");
  await ui.click("save");
  assert.ok(!("translation_key" in ui.drafts.get("draft-1").document.metadata));
  const filter = document.getElementById("language-filter");
  filter.value = "ko";
  filter.dispatchEvent(new dom.window.Event("change"));
  assert.match(document.getElementById("post-list").textContent, /한국어/);
});

test("a custom book publication date survives saving and reopening without restoring removed inputs", async () => {
  const ui = await setup();
  await ui.click("manage-books");
  await ui.click("new-post");
  ui.edit("title", "Book review");
  ui.edit("metadata-date", "2024-11-20");
  await ui.click("save");
  assert.equal(ui.drafts.get("draft-1").document.metadata.date, "2024-11-20");
  document.querySelector("#post-list button.post-item").click();
  await settle();
  assert.equal(document.getElementById("metadata-date").value, "2024-11-20");
  assert.equal(document.getElementById("metadata-author"), null);
  assert.equal(document.getElementById("metadata-categories"), null);
  ui.edit("metadata-date", "");
  await ui.click("save");
  assert.ok(!("date" in ui.drafts.get("draft-1").document.metadata));
});

test("cover thumbnails appear while writing, report failures, and can be cleared after saving", async () => {
  const ui = await setup();
  await ui.click("manage-books");
  await ui.click("new-post");
  assert.match(document.getElementById("cover-status").textContent, /등록된 표지가 없습니다/);
  ui.edit("metadata-cover", "assets/img/cover.jpg");
  await settle();
  const thumbnail = document.getElementById("cover-thumbnail");
  assert.equal(thumbnail.src, "https://0xnefertt.github.io/assets/img/cover.jpg");
  assert.equal(thumbnail.hidden, false);
  assert.equal(document.getElementById("preview-panel").hidden, true);
  thumbnail.dispatchEvent(new dom.window.Event("load"));
  assert.match(document.getElementById("cover-status").textContent, /이미지 확인됨/);
  await ui.click("save");
  ui.edit("metadata-cover", "");
  await ui.click("save");
  assert.ok(!("cover" in ui.drafts.get("draft-1").document.metadata));
  assert.equal(thumbnail.hidden, true);
  ui.edit("metadata-cover", "https://example.com/missing.jpg");
  await settle();
  thumbnail.dispatchEvent(new dom.window.Event("error"));
  assert.equal(thumbnail.hidden, true);
  assert.match(document.getElementById("cover-status").textContent, /불러올 수 없습니다/);
});

test("draft trash confirmation resets on cancel and restores the same saved document", async () => {
  const ui = await setup();
  await ui.click("manage-books");
  await ui.click("new-post");
  ui.edit("title", "Saved review");
  await ui.click("delete-draft");
  document.getElementById("delete-dialog").close("trash");
  await settle();
  assert.ok(ui.drafts.get("draft-1").trashedAt);
  assert.equal(document.getElementById("editor").hidden, true);
  await ui.click("trash-tab");
  assert.match(document.getElementById("post-list").textContent, /Saved review.*복원/s);
  document.querySelector("#post-list .post-item").click();
  await settle();
  assert.equal(ui.drafts.get("draft-1").trashedAt, null);
  assert.equal(document.getElementById("title").value, "Saved review");
  assert.equal(document.getElementById("editor").hidden, false);
  await ui.click("delete-draft");
  assert.equal(document.getElementById("delete-dialog").returnValue, "");
  document.getElementById("delete-dialog").close();
  await settle();
  assert.equal(ui.calls.filter((call) => call.method === "DELETE").length, 1);
});
