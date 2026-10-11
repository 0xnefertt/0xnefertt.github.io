import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const source = await readFile(new URL("../../astro/dist/sitemap.xml", import.meta.url), "utf8");
assert.match(source, /^<\?xml version="1.0" encoding="UTF-8"\?>\n/);
const dom = new JSDOM(source, { contentType: "application/xml" });
const document = dom.window.document;
const namespace = "http://www.sitemaps.org/schemas/sitemap/0.9";
assert.equal(document.documentElement.localName, "urlset");
assert.equal(document.documentElement.namespaceURI, namespace);
assert.doesNotMatch(source, /<\?xml-stylesheet\b/, "Sitemap must use the browser's native XML viewer");
for (const element of document.getElementsByTagName("*")) {
  assert.equal(element.namespaceURI, namespace, "HTML or other rendering namespaces disable the native XML viewer");
}
const urls = [...document.getElementsByTagNameNS(namespace, "url")];
assert.ok(urls.length > 0);
const locations = new Set();
let dates = 0;
for (const entry of urls) {
  const location = entry.getElementsByTagNameNS(namespace, "loc")[0]?.textContent;
  assert.ok(location && !locations.has(location), "Sitemap URLs must be present and unique");
  locations.add(location);
  const url = new URL(location);
  assert.equal(url.origin, "https://0xnefertt.github.io");
  const modified = entry.getElementsByTagNameNS(namespace, "lastmod")[0]?.textContent;
  if (modified) {
    assert.match(modified, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    assert.ok(!Number.isNaN(Date.parse(modified)));
    dates++;
  }
  if (/^\/(?:ko\/)?(?:books|projects)\/[^/]+\/$/.test(url.pathname)) assert.ok(modified, "Content URLs must record their modification date");
}
assert.ok(
  [...locations].some((location) => new URL(location).pathname.startsWith("/ko/")),
  "Sitemap must retain Korean URLs"
);
assert.ok(
  [...locations].some((location) => !new URL(location).pathname.startsWith("/ko/")),
  "Sitemap must retain English URLs"
);
assert.ok(dates > 0, "Sitemap must include content modification dates");
dom.window.close();
console.log(`[verify-sitemap] Native-viewer-compatible UTF-8 XML: ${urls.length} canonical URLs, ${dates} modification dates; EN/KO URLs retained`);
