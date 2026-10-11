import { before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

let settingsModule, managerModule, siteModule, markup;
before(async () => {
  await mkdir(".test-build", { recursive: true });
  const options = {
    bundle: true,
    format: "esm",
    platform: "node",
    banner: { js: 'import {createRequire} from "node:module"; const require=createRequire(import.meta.url);' },
  };
  await build({ ...options, entryPoints: ["src/site-settings.ts"], outfile: ".test-build/description-settings.mjs" });
  await build({ ...options, entryPoints: ["src/site-manager.ts"], outfile: ".test-build/description-manager.mjs" });
  await build({
    ...options,
    entryPoints: ["../astro/src/lib/site.ts"],
    outfile: ".test-build/description-site.mjs",
    define: { "import.meta.env": "{}" },
    plugins: [
      {
        name: "configured-blog-descriptions",
        setup(build) {
          build.onResolve({ filter: /^astro:content$/ }, () => ({ path: "content", namespace: "fixture" }));
          build.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const getCollection = async () => [];" }));
          build.onLoad({ filter: /site-settings\.json$/ }, async ({ path }) => ({
            contents: JSON.stringify({
              ...JSON.parse(await readFile(path, "utf8")),
              blogDescription: "Custom English introduction",
              blogDescriptionKo: "직접 작성한 한국어 소개",
              siteTitle: "Configured site name",
              blogName: "Configured blog name",
              email: "custom@example.com",
              githubUrl: "https://github.com/custom",
              xUrl: "https://x.com/custom",
            }),
            loader: "json",
          }));
        },
      },
    ],
  });
  settingsModule = await import("../.test-build/description-settings.mjs");
  managerModule = await import("../.test-build/description-manager.mjs");
  siteModule = await import("../.test-build/description-site.mjs");
  markup = await readFile("src/editor.html", "utf8");
});

test("blog descriptions retain legacy defaults and validate each language independently", () => {
  const legacy = { categories: [], favorites: [] };
  const defaults = settingsModule.validateSettings(legacy);
  for (const field of ["blogDescription", "blogDescriptionKo"]) {
    assert.equal(defaults[field], settingsModule.DEFAULT_SITE_CONTENT[field]);
    const custom = settingsModule.validateSettings({ ...legacy, [field]: "  New introduction  " });
    assert.equal(custom[field], "New introduction");
    const other = field === "blogDescription" ? "blogDescriptionKo" : "blogDescription";
    assert.equal(custom[other], defaults[other]);
    for (const invalid of [null, 42, [], "", "   ", "x".repeat(501)]) {
      assert.throws(() => settingsModule.validateSettings({ ...legacy, [field]: invalid }));
    }
  }
});

test("public site reads custom English and Korean descriptions from the saved settings", () => {
  assert.equal(siteModule.siteConfig.blogDescription, "Custom English introduction");
  assert.equal(siteModule.siteConfig.blogDescriptionKo, "직접 작성한 한국어 소개");
  assert.equal(siteModule.siteConfig.title, "Configured site name");
  assert.equal(siteModule.siteConfig.blogName, "Configured blog name");
  assert.deepEqual(
    siteModule.siteConfig.socialLinks.map((link) => link.href),
    ["mailto:custom@example.com", "https://github.com/custom", "https://x.com/custom"]
  );
});

test("site content validates contact URLs, coordinates, currencies, dates and preserves migration defaults", () => {
  const valid = settingsModule.validateSettings({ categories: [], favorites: [] });
  assert.equal(valid.siteTitle, settingsModule.DEFAULT_SITE_CONTENT.siteTitle);
  assert.equal(settingsModule.validateSettings({ ...valid, email: "", githubUrl: "", xUrl: "" }).email, "");
  const invalid = [
    { email: "unsafe\r\n@example.com" },
    { githubUrl: "javascript:alert(1)" },
    { xUrl: "https://user:password@example.com" },
    { defaultOgImage: "//example.com/image.png" },
    { defaultOgImage: "/api/media/private-image" },
    { defaultOgImage: "https://writer.example.com/api/media/private-image" },
    { latestPostsLimit: 21 },
    { latestPostsLimit: 1.5 },
    { usefulInfo: { ...valid.usefulInfo, latitude: 91 } },
    { usefulInfo: { ...valid.usefulInfo, longitude: -181 } },
    { usefulInfo: { ...valid.usefulInfo, enabled: "false" } },
    { usefulInfo: { ...valid.usefulInfo, targetCurrencies: ["CAD", "CAD"] } },
    { usefulInfo: { ...valid.usefulInfo, targetCurrencies: ["USD"] } },
    { privacy: { ...valid.privacy, updated: "2026-99-99" } },
  ];
  for (const change of invalid)
    assert.throws(
      () => settingsModule.validateSettings({ ...valid, ...change }),
      (error) => error.status === 422
    );
});

test("site, Resources and Privacy edits share a working copy and survive save and reload", async () => {
  const dom = new JSDOM(markup);
  globalThis.document = dom.window.document;
  globalThis.Option = dom.window.Option;
  const initial = settingsModule.validateSettings({ categories: [], favorites: [] });
  let snapshot = { settings: initial, sha: "revision", usage: {} },
    saved;
  const manager = managerModule.siteManager(
    async (_, init) => {
      if (init?.method === "PUT") {
        saved = JSON.parse(init.body);
        snapshot = { ...snapshot, settings: saved.settings };
      }
      return { ...snapshot, workflowUrl: "https://example.com/deploy" };
    },
    async () => true,
    async () => true
  );
  const flush = () => new Promise(setImmediate);
  const fill = (id, value) => {
    const field = document.getElementById(id);
    field.value = value;
    field.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  };
  try {
    await manager.load();
    document.getElementById("manage-site").click();
    await flush();
    fill("setting-siteTitle", "My custom site");
    fill("setting-email", "owner@example.com");
    fill("setting-latestPostsLimit", "3");
    document.getElementById("manage-resources").click();
    await flush();
    fill("setting-usefulInfo-location", "Toronto");
    fill("setting-usefulInfo-latitude", "43.65");
    fill("setting-usefulInfo-longitude", "-79.38");
    fill("setting-usefulInfo-targetCurrencies", "cad, krw");
    const enabled = document.getElementById("setting-usefulInfo-enabled");
    enabled.checked = false;
    enabled.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    document.getElementById("manage-privacy").click();
    await flush();
    fill("setting-privacy-body", "## Updated English\n\nMy privacy information.");
    document.getElementById("settings-save").click();
    await flush();
    assert.equal(saved.sha, "revision");
    assert.equal(saved.settings.siteTitle, "My custom site");
    assert.equal(saved.settings.latestPostsLimit, 3);
    assert.equal(saved.settings.usefulInfo.location, "Toronto");
    assert.equal(saved.settings.usefulInfo.enabled, false);
    assert.deepEqual(saved.settings.usefulInfo.targetCurrencies, ["CAD", "KRW"]);
    assert.equal(saved.settings.privacy.bodyKo, initial.privacy.bodyKo);
    assert.deepEqual(saved.settings.categories, initial.categories);
    assert.deepEqual(saved.settings.favorites, initial.favorites);
    assert.equal(initial.siteTitle, settingsModule.DEFAULT_SITE_CONTENT.siteTitle);
    await manager.load();
    assert.equal(document.getElementById("setting-siteTitle").value, "My custom site");
    assert.equal(document.getElementById("setting-usefulInfo-enabled").checked, false);
    assert.equal(document.getElementById("setting-privacy-body").value, saved.settings.privacy.body);
  } finally {
    dom.window.close();
  }
});

test("admin description edits survive section changes, save with the revision and reload without changing categories or favorites", async () => {
  const dom = new JSDOM(markup);
  globalThis.document = dom.window.document;
  globalThis.Option = dom.window.Option;
  const initial = {
    blogDescription: "Original English",
    blogDescriptionKo: "기존 한국어 소개",
    categories: [{ name: "Notes", slug: "notes", children: [{ name: "Code", slug: "code" }] }],
    favorites: [{ name: "Links", items: [{ title: "Example", href: "https://example.com" }] }],
  };
  let snapshot = { settings: initial, sha: "original", usage: {} };
  let saved;
  const manager = managerModule.siteManager(
    async (path, init) => {
      assert.equal(path, "/api/site-settings");
      if (init?.method === "PUT") {
        saved = JSON.parse(init.body);
        snapshot = { ...snapshot, settings: saved.settings, sha: "updated" };
        return { ...snapshot, workflowUrl: "https://example.com/deployment" };
      }
      return snapshot;
    },
    async () => true,
    async () => true
  );
  const flush = () => new Promise(setImmediate);
  try {
    await manager.load();
    document.getElementById("manage-description").click();
    await flush();
    assert.equal(document.getElementById("blog-description-manager").hidden, false);
    assert.equal(document.getElementById("category-manager").hidden, true);
    assert.equal(document.getElementById("manager-heading").textContent, "블로그 소개");
    for (const [id, value] of [
      ["blog-description-en", "Edited English"],
      ["blog-description-ko", "수정한 한국어 소개"],
    ]) {
      const field = document.getElementById(id);
      field.value = value;
      field.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    }
    assert.equal(manager.isDirty(), true);
    document.getElementById("manage-categories").click();
    await flush();
    document.getElementById("manage-description").click();
    await flush();
    assert.equal(document.getElementById("blog-description-en").value, "Edited English");
    document.getElementById("settings-save").click();
    await flush();
    assert.equal(saved.sha, "original");
    assert.equal(saved.settings.blogDescription, "Edited English");
    assert.equal(saved.settings.blogDescriptionKo, "수정한 한국어 소개");
    assert.deepEqual(saved.settings.categories, initial.categories);
    assert.deepEqual(saved.settings.favorites, initial.favorites);
    assert.equal(initial.blogDescription, "Original English");
    assert.equal(manager.isDirty(), false);
    await manager.load();
    assert.equal(document.getElementById("blog-description-ko").value, "수정한 한국어 소개");
  } finally {
    dom.window.close();
  }
});
