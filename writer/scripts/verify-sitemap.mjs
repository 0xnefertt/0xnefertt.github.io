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
  for (const link of entry.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "link")) {
    assert.ok(["en", "ko"].includes(link.getAttribute("hreflang")));
    assert.equal(new URL(link.getAttribute("href")).origin, url.origin);
  }
}
assert.ok(dates > 0, "Sitemap must include content modification dates");
dom.window.close();
console.log(`[verify-sitemap] Valid UTF-8 XML: ${urls.length} canonical URLs, ${dates} modification dates, localized alternatives OK`);
