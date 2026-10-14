import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "parse5";

const root = path.resolve("astro/dist");
const defaults = JSON.parse(await fs.readFile("_data/site-defaults.json", "utf8"));
const settings = { ...defaults, ...JSON.parse(await fs.readFile("_data/site-settings.json", "utf8")) };
const attr = (node, key) => node?.attrs?.find((item) => item.name === key)?.value;
const all = (node, predicate) => [...(predicate(node) ? [node] : []), ...(node.childNodes ?? []).flatMap((child) => all(child, predicate))];
const text = (node) => (node?.nodeName === "#text" ? node.value : (node?.childNodes ?? []).map(text).join(""));
const sitemap = await fs.readFile(path.join(root, "sitemap.xml"), "utf8");
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1].replaceAll("&amp;", "&"));
let articles = 0;
for (const url of urls) {
  const pathname = new URL(url).pathname;
  const document = parse(await fs.readFile(path.join(root, decodeURIComponent(pathname), "index.html"), "utf8"));
  const elements = (tag) => all(document, (node) => node.tagName === tag);
  const meta = (name) =>
    attr(
      elements("meta").find((node) => attr(node, "name") === name || attr(node, "property") === name),
      "content"
    );
  const title = text(elements("title")[0]);
  assert.ok(title && meta("description"), `${url}: title and search description are required`);
  assert.equal(elements("h1").length, 1, `${url}: one main heading`);
  assert.equal(
    attr(
      elements("link").find((node) => attr(node, "rel") === "canonical"),
      "href"
    ),
    url,
    `${url}: canonical URL`
  );
  const locale = pathname.startsWith("/ko/") ? "ko" : "en";
  assert.equal(attr(elements("html")[0], "lang"), locale, `${url}: page language`);

  if (pathname === "/" || pathname === "/ko/") {
    assert.equal(meta("description"), locale === "ko" ? settings.seoDescriptionKo : settings.seoDescription);
    const introduction = all(document, (node) => attr(node, "class")?.split(" ").includes("blog-masthead-description"))[0];
    assert.equal(text(introduction).trim(), locale === "ko" ? settings.blogDescriptionKo : settings.blogDescription);
  }
  if (pathname === "/ko/blog/") assert.ok(title.startsWith("블로그 |"), "Korean blog title must be localized");
  if (pathname === "/ko/books/") assert.ok(title.startsWith("책장 |"), "Korean bookshelf title must be localized");
  if (pathname === "/ko/projects/") assert.ok(title.startsWith("프로젝트 |"), "Korean projects title must be localized");
  if (pathname.startsWith("/ko/blog/category/"))
    assert.ok(!meta("description").startsWith("Posts in"), "Korean category descriptions must be localized");
  for (const script of elements("script").filter((node) => attr(node, "type") === "application/ld+json")) {
    const schema = JSON.parse(text(script));
    if (schema["@type"] !== "Article") continue;
    articles++;
    assert.ok(schema.headline && schema.author?.name && schema.description, `${url}: article metadata`);
    assert.ok(schema.image?.length, `${url}: article image`);
    assert.equal(schema.image[0], meta("og:image"), `${url}: article and sharing images must match`);
    assert.equal(schema.mainEntityOfPage, url, `${url}: article canonical`);
  }
}
console.log(
  `[verify-seo] ${urls.length} canonical pages and ${articles} articles: localized metadata, independent search descriptions and article images OK`
);
