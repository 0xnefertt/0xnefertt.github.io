import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve("astro/dist");
async function htmlFiles(folder) {
  return (
    await Promise.all(
      (await fs.readdir(folder, { withFileTypes: true })).map((entry) => {
        const file = path.join(folder, entry.name);
        return entry.isDirectory() ? htmlFiles(file) : entry.name.endsWith(".html") ? [file] : [];
      })
    )
  ).flat();
}
for (const locale of ["en", "ko"]) {
  const prefix = locale === "ko" ? "ko/" : "";
  for (const page of ["", "about/", "blog/", "blog/search/", "books/", "projects/", "privacy/"]) {
    const html = await fs.readFile(path.join(root, prefix, page, "index.html"), "utf8");
    assert.ok(html.includes(`<html lang="${locale}">`), `${prefix}${page} has the wrong HTML language`);
    assert.ok(!html.includes("site-language"), "The URL must control language independently of stored preferences");
    assert.ok(html.includes(`href="/${prefix}rss.xml"`), "Footer RSS must use the current language");
    assert.ok(html.includes('href="/admin/"'), "Both languages must use one admin page");
    assert.ok(html.includes(`href="/${prefix}about/"`), "About navigation must open the localized introduction page");
    if (page === "about/") {
      assert.ok(html.includes('class="about-page"') && html.includes('class="about-photo"'), "About must render the introduction and profile photo");
      assert.ok(!html.includes('class="post-list"') && !html.includes('class="feed-more"'), "About must not render the blog feed");
      assert.ok(
        html.includes(`href="https://0xnefertt.github.io/${prefix === "" ? "ko/" : ""}about/"`),
        "About must link to its translated counterpart"
      );
    }
  }
  const posts = JSON.parse(await fs.readFile(path.join(root, prefix, "blog/search-index.json"), "utf8"));
  for (const post of posts.filter((post) => !post.external)) {
    assert.ok(post.href.startsWith(`/${prefix}blog/`), `Search leaked a different language: ${post.href}`);
    const html = await fs.readFile(path.join(root, decodeURIComponent(post.href), "index.html"), "utf8");
    assert.ok(html.includes(`<html lang="${locale}">`), "Article language differs from search index");
  }
  const rss = await fs.readFile(path.join(root, prefix, "rss.xml"), "utf8");
  assert.ok(rss.includes(`<language>${locale}</language>`));
  for (const match of rss.matchAll(/<guid[^>]*>([^<]+)<\/guid>/g)) {
    assert.ok(new URL(match[1]).pathname.startsWith(`/${prefix}blog/`), "RSS leaked a different language");
  }
  console.log(`[verify-locales] ${locale}: ${posts.length} searchable posts; localized pages, navigation and RSS OK`);
}
for (const file of await htmlFiles(root)) {
  const html = await fs.readFile(file, "utf8");
  if (/http-equiv="refresh"|name="robots" content="noindex, nofollow"/.test(html)) continue;
  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  const expected = relative.startsWith("ko/") ? "ko" : "en";
  assert.ok(html.includes(`<html lang="${expected}">`), `Wrong page language: ${relative}`);
  for (const alternate of html.matchAll(/<link rel="alternate" hreflang="(en|ko)" href="([^"]+)"/g)) {
    const url = new URL(alternate[2]);
    await fs.access(path.join(root, decodeURIComponent(url.pathname), "index.html"));
    assert.equal(url.pathname.startsWith("/ko/"), alternate[1] === "ko", "hreflang points to the wrong language");
  }
}
console.log("[verify-locales] All generated page languages and translation alternatives OK");
