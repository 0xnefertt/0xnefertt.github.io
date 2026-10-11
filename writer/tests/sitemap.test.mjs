import { before, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

let sitemap;
before(async () => {
  await build({ entryPoints: ["../astro/src/lib/sitemap.ts"], outfile: ".test-build/sitemap.mjs", bundle: true, format: "esm", platform: "node" });
  sitemap = await import("../.test-build/sitemap.mjs");
});

test("sitemap preserves UTF-8, escaped URLs and dates without disabling the native XML viewer", () => {
  const location = "https://example.com/ko/books/책/?a=1&b=2";
  const output = sitemap.renderSitemap([{ location, lastmod: "2026-01-02T03:00:00.000Z" }, { location: "https://example.com/books/" }]);
  assert.match(output, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset/);
  assert.match(output, /\n  <url>\n    <loc>/);
  const dom = new JSDOM(output, { contentType: "application/xml" });
  const document = dom.window.document;
  assert.equal(document.documentElement.namespaceURI, "http://www.sitemaps.org/schemas/sitemap/0.9");
  assert.equal(document.querySelector("loc").textContent, location);
  assert.equal(document.querySelector("lastmod").textContent, "2026-01-02T03:00:00.000Z");
  assert.equal(document.querySelectorAll("url").length, 2);
  assert.equal(document.querySelectorAll("lastmod").length, 1);
  for (const element of document.getElementsByTagName("*")) {
    assert.equal(element.namespaceURI, "http://www.sitemaps.org/schemas/sitemap/0.9");
  }
  assert.doesNotMatch(output, /<\?xml-stylesheet\b/);
  dom.window.close();
});

test("lastmod follows source edits, ignores unrelated commits and supports recorded dates without Git history", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "nefertt-sitemap-"));
  const git = (args, date) =>
    execFileSync("git", ["-C", root, ...args], {
      env: { ...process.env, ...(date ? { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : {}) },
      stdio: "ignore",
    });
  try {
    git(["init", "--initial-branch=main"]);
    git(["config", "user.name", "Sitemap fixture"]);
    git(["config", "user.email", "fixture@example.com"]);
    await mkdir(path.join(root, "_posts/en"), { recursive: true });
    await writeFile(path.join(root, "_posts/en/review.md"), "Original article");
    git(["add", "."]);
    git(["commit", "-m", "Publish"], "2026-01-02T03:00:00Z");
    await writeFile(path.join(root, "unrelated.txt"), "Other work");
    git(["add", "."]);
    git(["commit", "-m", "Other work"], "2026-02-02T03:00:00Z");
    const entry = { filePath: "../_posts/en/review.md", data: { date: "2025-01-01", last_updated: "2026-01-01" } };
    assert.equal(sitemap.createLastmodResolver(root)(entry), "2026-01-02T03:00:00.000Z");
    await writeFile(path.join(root, "_posts/en/review.md"), "Edited article");
    git(["add", "."]);
    git(["commit", "-m", "Edit"], "2026-02-03T03:00:00Z");
    const changed = sitemap.createLastmodResolver(root);
    assert.equal(changed(entry), "2026-02-03T03:00:00.000Z");
    assert.equal(sitemap.latestLastmod([changed(entry), "2026-01-01T00:00:00.000Z"]), changed(entry));
    const missing = sitemap.createLastmodResolver(path.join(root, "no-history"));
    assert.equal(missing(entry), "2026-01-01T00:00:00.000Z");
    assert.equal(missing({ data: { date: "2025-01-01" } }), "2025-01-01T00:00:00.000Z");
    assert.equal(missing({ data: { last_updated: "invalid" } }), undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
