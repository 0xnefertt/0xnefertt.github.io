import { before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

let settingsModule, managerModule, blogModule, editorHtml;
before(async () => {
  await mkdir(".test-build", { recursive: true });
  const options = {
    bundle: true,
    format: "esm",
    platform: "node",
    banner: { js: 'import {createRequire} from "node:module"; const require=createRequire(import.meta.url);' },
  };
  await build({ ...options, entryPoints: ["src/site-settings.ts"], outfile: ".test-build/category-settings.mjs" });
  await build({ ...options, entryPoints: ["src/site-manager.ts"], outfile: ".test-build/category-manager.mjs" });
  await build({
    ...options,
    entryPoints: ["../astro/src/lib/blog.ts"],
    outfile: ".test-build/category-blog.mjs",
    plugins: [
      {
        name: "custom-category-names",
        setup(build) {
          build.onLoad({ filter: /site-settings\.json$/ }, async ({ path }) => {
            const data = JSON.parse(await readFile(path, "utf8"));
            data.categories[0].name = "Engineering";
            data.categories[0].name_ko = "개발 연구";
            data.categories[0].children[0].name = "Code";
            data.categories[0].children[0].name_ko = "코드";
            return { contents: JSON.stringify(data), loader: "json" };
          });
        },
      },
    ],
  });
  settingsModule = await import("../.test-build/category-settings.mjs");
  managerModule = await import("../.test-build/category-manager.mjs");
  blogModule = await import("../.test-build/category-blog.mjs");
  editorHtml = await readFile("src/editor.html", "utf8");
});

const settings = () => ({
  categories: [{ name: "Engineering", name_ko: "개발 연구", slug: "study-log", children: [{ name: "Code", name_ko: "코드", slug: "dev" }] }],
  favorites: [],
});

test("category translations preserve shared addresses and accept older settings without Korean names", () => {
  const value = settingsModule.validateSettings(settings());
  assert.equal(settingsModule.categoryOptions(value, "en")[1].label, "Engineering / Code");
  assert.equal(settingsModule.categoryOptions(value, "ko")[1].label, "개발 연구 / 코드");
  assert.deepEqual(
    settingsModule.categoryOptions(value, "en").map((item) => item.value),
    settingsModule.categoryOptions(value, "ko").map((item) => item.value)
  );
  delete value.categories[0].name_ko;
  assert.equal(settingsModule.categoryName(settingsModule.validateSettings(value).categories[0], "ko"), "Engineering");
  for (const invalid of [42, ["잘못된 이름"], "x".repeat(101)]) {
    const data = settings();
    data.categories[0].children[0].name_ko = invalid;
    assert.throws(() => settingsModule.validateSettings(data));
  }
});

test("public category trees and post breadcrumbs use configured translations instead of fixed dictionary labels", () => {
  const post = (lang) => ({
    id: lang,
    collection: "blog",
    filePath: `_posts/${lang}/study-log/dev/2026-01-01-post.md`,
    body: "Body",
    data: { lang, title: "Post", categories: ["study-log/dev"], date: new Date("2026-01-01") },
  });
  for (const [lang, parent, child] of [
    ["en", "Engineering", "Code"],
    ["ko", "개발 연구", "코드"],
  ]) {
    const tree = blogModule.listBlogCategoryTree([post(lang)], lang);
    assert.equal(tree[0].name, parent);
    assert.equal(tree[0].children[0].name, child);
    const category = blogModule.getPostCategoryPaths(post(lang))[0];
    assert.equal(category.label, `${parent} / ${child}`);
    assert.deepEqual(category.names, [parent, child]);
    assert.equal(category.key, "study-log/dev");
    assert.equal(category.href, `${lang === "ko" ? "/ko" : ""}/blog/category/study-log/dev/`);
  }
});

test("administrator saves English and Korean names independently and changes selector labels without moving a post", async () => {
  const dom = new JSDOM(editorHtml);
  globalThis.document = dom.window.document;
  globalThis.Option = dom.window.Option;
  const initial = settings();
  let snapshot = { settings: initial, sha: "original", usage: { "study-log/dev": 1 } };
  let resolveSave;
  const saved = new Promise((resolve) => {
    resolveSave = resolve;
  });
  const manager = managerModule.siteManager(
    async (path, init) => {
      assert.equal(path, "/api/site-settings");
      if (init?.method === "PUT") {
        const payload = JSON.parse(init.body);
        snapshot = { ...snapshot, settings: payload.settings, sha: "updated" };
        resolveSave(payload);
        return { ...snapshot, workflowUrl: "https://example.com/build" };
      }
      return snapshot;
    },
    async () => true,
    async () => true
  );
  await manager.load();
  const rows = document.querySelectorAll(".category-row");
  const parent = rows[0].querySelectorAll("input");
  const child = rows[1].querySelectorAll("input");
  parent[1].value = "한국어 변경";
  parent[1].dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  child[0].value = "English edit";
  child[0].dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  assert.ok(parent[2].readOnly && child[2].readOnly);
  document.getElementById("settings-save").click();
  const payload = await saved;
  assert.equal(payload.settings.categories[0].name, "Engineering");
  assert.equal(payload.settings.categories[0].name_ko, "한국어 변경");
  assert.equal(payload.settings.categories[0].children[0].name, "English edit");
  assert.equal(payload.settings.categories[0].children[0].name_ko, "코드");
  assert.equal(payload.settings.categories[0].children[0].slug, "dev");
  const select = document.getElementById("category");
  select.value = "study-log/dev";
  document.getElementById("content-language").value = "ko";
  manager.refreshCategories();
  assert.equal(select.selectedOptions[0].textContent, "코드");
  assert.equal(document.getElementById("category-parent").selectedOptions[0].textContent, "한국어 변경");
  assert.equal(select.value, "study-log/dev");
  document.getElementById("content-language").value = "en";
  manager.refreshCategories();
  assert.equal(select.selectedOptions[0].textContent, "English edit");
  assert.equal(document.getElementById("category-parent").selectedOptions[0].textContent, "Engineering");
  assert.equal(select.value, "study-log/dev");
  assert.deepEqual(initial, settings());
});

test("writing selects only configured children and changing parents clears the old child without reintroducing aggregate usage", async () => {
  const dom = new JSDOM(editorHtml);
  globalThis.document = dom.window.document;
  globalThis.Option = dom.window.Option;
  const initial = settings();
  initial.categories.push({
    name: "Money",
    name_ko: "돈 이야기",
    slug: "money-talk",
    children: [{ name: "Finance", name_ko: "금융", slug: "finance" }],
  });
  const manager = managerModule.siteManager(
    async () => ({ settings: initial, sha: "original", usage: { "study-log": 9, "study-log/dev": 8, retired: 3 } }),
    async () => true,
    async () => true
  );
  document.getElementById("workspace").dataset.collection = "blog";
  await manager.load();
  const parent = document.getElementById("category-parent"),
    child = document.getElementById("category");
  assert.equal(child.value, "study-log/dev");
  assert.ok(![...child.options].some((option) => option.value === "study-log" || option.value === "retired"));
  document.getElementById("editor").hidden = false;
  parent.value = "money-talk";
  parent.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  assert.equal(child.value, "");
  assert.deepEqual(
    [...child.options].map((option) => option.value),
    ["", "money-talk/finance"]
  );
  assert.equal(document.getElementById("new-post").disabled, true);
  child.value = "money-talk/finance";
  child.dispatchEvent(new dom.window.Event("change"));
  assert.equal(document.getElementById("new-post").disabled, false);
  child.add(new dom.window.Option("Legacy parent", "study-log"));
  child.value = "study-log";
  manager.refreshCategories();
  assert.equal(child.value, "study-log");
  assert.equal(child.selectedOptions[0].disabled, true);
  assert.equal(parent.value, "study-log");
  assert.equal(document.getElementById("new-post").disabled, true);
  for (const value of ["study-log", "", "study-log/missing"]) assert.throws(() => settingsModule.assertWritableCategory(initial, value));
  assert.doesNotThrow(() => settingsModule.assertWritableCategory(initial, "study-log/dev"));
  dom.window.close();
});

test("public groups aggregate child posts once, remove redundant parent assignments and retain zero-count configured children", () => {
  const post = {
    id: "post",
    collection: "blog",
    filePath: "_posts/ko/study-log/dev/2026-01-01-post.md",
    body: "Body",
    data: { lang: "ko", title: "Post", categories: ["study-log", "study-log/dev"], date: new Date("2026-01-01") },
  };
  const paths = blogModule.getPostCategoryPaths(post);
  assert.deepEqual(
    paths.map((item) => item.key),
    ["study-log/dev"]
  );
  const group = blogModule.listBlogCategoryTree([post], "ko").find((group) => group.slug === "study-log");
  assert.equal(group.count, 1);
  assert.equal(group.children.find((child) => child.slug === "dev").count, 1);
  assert.equal(group.children.find((child) => child.slug === "english").count, 0);
  assert.equal(group.children.find((child) => child.slug === "career").count, 0);
});
