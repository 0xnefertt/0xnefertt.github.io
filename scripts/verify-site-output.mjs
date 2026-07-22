#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const distRoot = path.join(repoRoot, "astro", "dist");
const requiredFiles = [".nojekyll", "sitemap.xml", "rss.xml", "robots.txt", "blog/search/index.html", "blog/search-index.json"];

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listHtmlFiles(directory) {
  if (!(await exists(directory))) {
    return [];
  }

  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return listHtmlFiles(entryPath);
      }

      return entry.isFile() && entry.name.endsWith(".html") ? [entryPath] : [];
    })
  );

  return nestedFiles.flat();
}

function hasNoindexFollow(html) {
  return /<meta\s+name="robots"\s+content="noindex, follow"\s*\/?\s*>/.test(html);
}

async function run() {
  const missing = [];

  for (const fileName of requiredFiles) {
    const fullPath = path.join(distRoot, fileName);
    if (!(await exists(fullPath))) {
      missing.push(fileName);
    }
  }

  if (missing.length > 0) {
    console.error(`[verify-site-output] missing files: ${missing.join(", ")}`);
    process.exit(1);
  }

  const searchHtml = await fs.readFile(path.join(distRoot, "blog", "search", "index.html"), "utf8");
  const searchScriptSrc = searchHtml.match(/<script[^>]+src="([^"]*blog-search[^"]*)"[^>]*>/)?.[1];
  if (!searchScriptSrc) {
    console.error("[verify-site-output] blog search script reference is missing");
    process.exit(1);
  }

  const searchScriptPath = path.join(distRoot, searchScriptSrc.replace(/^\//, ""));
  if (!(await exists(searchScriptPath))) {
    console.error(`[verify-site-output] blog search script is missing: ${searchScriptSrc}`);
    process.exit(1);
  }

  if (!hasNoindexFollow(searchHtml)) {
    console.error("[verify-site-output] blog search page must be noindex, follow");
    process.exit(1);
  }

  const paginationFiles = (await listHtmlFiles(path.join(distRoot, "blog"))).filter((filePath) => /\/page-\d+\/index\.html$/.test(filePath));
  for (const filePath of paginationFiles) {
    const html = await fs.readFile(filePath, "utf8");
    if (!hasNoindexFollow(html)) {
      console.error(`[verify-site-output] pagination page must be noindex, follow: ${path.relative(distRoot, filePath)}`);
      process.exit(1);
    }
  }

  const categoryFiles = await listHtmlFiles(path.join(distRoot, "blog", "category"));
  for (const filePath of categoryFiles) {
    const html = await fs.readFile(filePath, "utf8");
    if (html.includes("No posts found for this category.")) {
      console.error(`[verify-site-output] empty category page was generated: ${path.relative(distRoot, filePath)}`);
      process.exit(1);
    }
  }

  const sitemap = await fs.readFile(path.join(distRoot, "sitemap.xml"), "utf8");
  if (sitemap.includes("/blog/search/") || /\/page-\d+\//.test(sitemap)) {
    console.error("[verify-site-output] noindex search or pagination URL found in sitemap.xml");
    process.exit(1);
  }

  console.log(`[verify-site-output] OK (${requiredFiles.join(", ")}; search asset; noindex pages; no empty categories)`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
