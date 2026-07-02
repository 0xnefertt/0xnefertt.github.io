#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();

function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      args[key] = "true";
      continue;
    }

    args[key] = value;
    i += 1;
  }

  return args;
}

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function sanitizeFileName(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

function extractSlugFromPostPath(postPath) {
  const base = path.basename(postPath);
  const match = base.match(/^\d{4}-\d{2}-\d{2}-(.+)\.mdx?$/);
  if (match) {
    return slugify(match[1]);
  }

  return slugify(base.replace(/\.mdx?$/, ""));
}

function extractTitle(frontmatter) {
  const match = frontmatter.match(/^title:\s*(.+)$/m);
  if (!match) {
    return undefined;
  }

  return match[1].trim().replace(/^['"]|['"]$/g, "");
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const postArg = args.post?.trim();
  const srcArg = args.src?.trim();

  if (!postArg) {
    throw new Error("Missing required --post");
  }

  if (!srcArg) {
    throw new Error("Missing required --src");
  }

  const postFilePath = path.resolve(repoRoot, postArg);
  const sourceImagePath = path.resolve(repoRoot, srcArg);

  const postContent = await fs.readFile(postFilePath, "utf8").catch(() => null);
  if (!postContent) {
    throw new Error(`Post file not found: ${postArg}`);
  }

  await fs.access(sourceImagePath).catch(() => {
    throw new Error(`Image file not found: ${srcArg}`);
  });

  const slug = extractSlugFromPostPath(postFilePath);
  if (!slug) {
    throw new Error("Could not determine post slug from file name.");
  }

  const ext = path.extname(sourceImagePath) || ".png";
  const nameFromArg = args.name ? sanitizeFileName(args.name) : "";
  const sourceBase = sanitizeFileName(path.basename(sourceImagePath, ext));
  const targetBaseName = nameFromArg || sourceBase || "image";
  const targetFileName = targetBaseName.endsWith(ext.toLowerCase()) ? targetBaseName : `${targetBaseName}${ext.toLowerCase()}`;

  const relativeAssetDir = path.join("assets", "img", "posts", slug);
  const targetDir = path.join(repoRoot, "astro", "public", relativeAssetDir);
  const targetPath = path.join(targetDir, targetFileName);

  await fs.mkdir(targetDir, { recursive: true });
  await fs.copyFile(sourceImagePath, targetPath);

  const frontmatterMatch = postContent.match(/^---\n([\s\S]*?)\n---\n?/);
  const titleFromFrontmatter = frontmatterMatch ? extractTitle(frontmatterMatch[1]) : undefined;

  const altText = args.alt?.trim() || `${titleFromFrontmatter || slug} image`;
  const publicPath = `/${path.join(relativeAssetDir, targetFileName).replace(/\\/g, "/")}`;

  console.log(`Copied image -> ${publicPath}`);
  console.log("Markdown snippet:");
  console.log(`![${altText}](${publicPath})`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
