import { before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

let collectionEditor;
before(async () => {
  await mkdir(".test-build", { recursive: true });
  await build({
    entryPoints: ["src/collection-editor.ts"],
    outfile: ".test-build/collection-editor.mjs",
    bundle: true,
    format: "esm",
    platform: "node",
    banner: { js: 'import {createRequire} from "node:module"; const require=createRequire(import.meta.url);' },
  });
  ({ collectionEditor } = await import("../.test-build/collection-editor.mjs"));
});
function setup() {
  const dom = new JSDOM('<fieldset id="collection-fields"></fieldset>');
  for (const key of ["document", "HTMLInputElement", "HTMLTextAreaElement"]) globalThis[key] = dom.window[key];
  let changes = 0;
  const editor = collectionEditor(() => changes++);
  return { editor, dom, changes: () => changes };
}
test("book forms preserve untouched legacy metadata and serialize changed fields", () => {
  const { editor, dom, changes } = setup();
  const original = {
    author: "Original",
    isbn: 7539967447,
    released: 1969,
    categories: "classics crime",
    stars: 3,
    cover: "assets/img/cover.jpg",
    custom: { retained: true },
  };
  editor.load("books", original);
  assert.deepEqual(editor.read(original), original);
  const author = document.getElementById("metadata-author");
  author.value = "Updated";
  author.dispatchEvent(new dom.window.Event("input"));
  document.getElementById("metadata-stars").value = "4.5";
  document.getElementById("metadata-cover").value = "";
  const changed = editor.read(original);
  assert.equal(changed.author, "Updated");
  assert.equal(changed.stars, 4.5);
  assert.equal(changed.cover, undefined);
  assert.equal(changed.isbn, original.isbn);
  assert.deepEqual(changed.custom, original.custom);
  assert.equal(changes(), 1);
});
test("project forms keep optional details without imposing tasks, lessons or link sections", () => {
  const { editor } = setup();
  const original = {
    period: 2026,
    stack: ["Astro", "GitHub Actions"],
    highlights: ["One"],
    links: [{ label: "Repository", url: "https://example.com" }],
    related_publications: false,
  };
  editor.load("projects", original);
  assert.deepEqual(editor.read(original), original);
  document.getElementById("metadata-stack").value = "Astro, Workers";
  assert.equal(document.getElementById("metadata-highlights"), null);
  assert.equal(document.getElementById("metadata-lessons"), null);
  assert.equal(document.querySelector(".collection-links"), null);
  editor.setImage("img", "/api/media/private-cover");
  const changed = editor.read(original);
  assert.deepEqual(changed.stack, ["Astro", "Workers"]);
  assert.deepEqual(changed.highlights, original.highlights);
  assert.deepEqual(changed.links, original.links);
  assert.equal(changed.img, "/api/media/private-cover");
  assert.equal(changed.period, 2026);
  assert.equal(changed.related_publications, false);
  editor.load("books", {});
  assert.deepEqual(editor.read({}), {});
  assert.equal(document.querySelector(".collection-links"), null);
});

test("about fields edit nested profile data without losing home settings or altering the source object", () => {
  const { editor } = setup();
  const original = {
    profile: { image: "prof_pic.jpg", align: "right", image_circular: false, more_info: "<p>Developer</p><p>Canada</p>" },
    subtitle: "Original subtitle",
    latest_posts: { limit: 5 },
    useful_info: { location: "Vancouver, BC" },
  };
  const copy = structuredClone(original);
  editor.load("about", original);
  assert.equal(document.getElementById("metadata-profile-name").value, "0xnefertt");
  assert.equal(document.getElementById("metadata-profile-more_info").value, "Developer\nCanada");
  assert.deepEqual(editor.read(original), original);
  document.getElementById("metadata-profile-name").value = "새 이름";
  document.getElementById("metadata-profile-bio").value = "새 소개";
  document.getElementById("metadata-profile-location").value = "";
  document.getElementById("metadata-profile-more_info").value = "Developer\n<script>alert(1)</script>";
  editor.setImage("profile.image", "/api/media/private-avatar");
  const changed = editor.read(original);
  assert.equal(changed.profile.name, "새 이름");
  assert.equal(changed.profile.bio, "새 소개");
  assert.equal(changed.profile.location, "");
  assert.equal(changed.profile.image, "/api/media/private-avatar");
  assert.equal(changed.profile.more_info, "<p>Developer</p>\n<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
  assert.equal(changed.profile.align, "right");
  assert.deepEqual(changed.latest_posts, original.latest_posts);
  assert.deepEqual(original, copy);
  editor.load("books", {});
  assert.equal(document.getElementById("metadata-profile-name"), null);
});
