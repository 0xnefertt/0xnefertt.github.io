#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const postsRoot = path.join(repoRoot, "_posts");

async function walkMarkdownFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const target = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walkMarkdownFiles(target)));
      continue;
    }

    if (entry.isFile() && /\.mdx?$/.test(entry.name)) {
      files.push(target);
    }
  }

  return files;
}

function getFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return "";
  }

  return match[1];
}

function getBody(content) {
  const match = content.match(/^---\n[\s\S]*?\n---\n?/);
  if (!match) {
    return content;
  }

  return content.slice(match[0].length);
}

function getScalar(frontmatter, key) {
  const pattern = new RegExp(`^${key}:\\s*(.+)$`, "m");
  const match = frontmatter.match(pattern);
  if (!match) {
    return "";
  }

  return match[1].trim();
}

function hasListBlock(frontmatter, key) {
  const blockPattern = new RegExp(`^${key}:\\s*$([\\s\\S]*?)(?=^\\S|$)`, "m");
  const match = frontmatter.match(blockPattern);
  if (!match) {
    return false;
  }

  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .some((line) => line.startsWith("- ") && line.slice(2).trim().length > 0);
}

function hasMeaningfulField(frontmatter, key) {
  const scalar = getScalar(frontmatter, key);
  if (scalar && scalar !== "[]") {
    return true;
  }

  return hasListBlock(frontmatter, key);
}

function stripWrapping(target) {
  let output = target.trim();
  if (output.startsWith("<") && output.endsWith(">")) {
    output = output.slice(1, -1).trim();
  }

  if (!output) {
    return output;
  }

  const firstSpace = output.search(/\s/);
  if (firstSpace > 0) {
    return output.slice(0, firstSpace);
  }

  return output;
}

function resolveImagePath(rawTarget, sourceFile) {
  const target = stripWrapping(rawTarget);
  if (!target) {
    return null;
  }

  if (/^(https?:|data:|mailto:|#)/i.test(target)) {
    return null;
  }

  if (target.startsWith("/")) {
    return path.join(repoRoot, target.replace(/^\/+/, ""));
  }

  return path.resolve(path.dirname(sourceFile), target);
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function collectImageTargets(body) {
  const matches = [];
  const regex = /!\[[^\]]*\]\(([^)]+)\)/g;

  let match;
  while ((match = regex.exec(body)) !== null) {
    matches.push(match[1]);
  }

  return matches;
}

async function run() {
  const files = await walkMarkdownFiles(postsRoot);
  const errors = [];
  const warnings = [];

  for (const filePath of files) {
    const relativePath = path.relative(repoRoot, filePath);
    const content = await fs.readFile(filePath, "utf8");
    const frontmatter = getFrontmatter(content);
    const body = getBody(content);

    if (!frontmatter) {
      errors.push(`${relativePath}: missing frontmatter block`);
      continue;
    }

    for (const requiredKey of ["title", "date", "description", "tags", "categories"]) {
      if (!hasMeaningfulField(frontmatter, requiredKey)) {
        errors.push(`${relativePath}: missing required frontmatter '${requiredKey}'`);
      }
    }

    const titleValue = getScalar(frontmatter, "title").replace(/^['"]|['"]$/g, "");
    const descriptionValue = getScalar(frontmatter, "description").replace(/^['"]|['"]$/g, "");

    if (titleValue.length > 90) {
      warnings.push(`${relativePath}: title length ${titleValue.length} > 90`);
    }

    if (descriptionValue.length > 170) {
      warnings.push(`${relativePath}: description length ${descriptionValue.length} > 170`);
    }

    const images = collectImageTargets(body);
    for (const imageTarget of images) {
      const resolvedPath = resolveImagePath(imageTarget, filePath);
      if (!resolvedPath) {
        continue;
      }

      if (!(await exists(resolvedPath))) {
        errors.push(`${relativePath}: image not found -> ${imageTarget}`);
        continue;
      }

      const normalizedTarget = stripWrapping(imageTarget);
      if (normalizedTarget.startsWith("/assets/") && !normalizedTarget.startsWith("/assets/img/posts/")) {
        warnings.push(`${relativePath}: image path should prefer /assets/img/posts/<slug>/... -> ${normalizedTarget}`);
      }
    }
  }

  if (warnings.length > 0) {
    console.log("\n[post-check] warnings");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (errors.length > 0) {
    console.error("\n[post-check] errors");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`\n[post-check] OK (${files.length} posts validated)`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
