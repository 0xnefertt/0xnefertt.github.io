#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const distRoot = path.join(repoRoot, "astro", "dist");
const requiredFiles = ["sitemap.xml", "rss.xml", "robots.txt"];

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
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

  console.log(`[verify-site-output] OK (${requiredFiles.join(", ")})`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
