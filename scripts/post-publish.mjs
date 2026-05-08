#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

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

function toRelative(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

function runContentCheck(relativeFilePath) {
  const result = spawnSync(
    process.execPath,
    ["scripts/check-posts.mjs", "--publish-mode", "--file", relativeFilePath, "--report", "reports/content-check.md"],
    {
      cwd: repoRoot,
      stdio: "inherit",
    }
  );

  if (result.status !== 0) {
    throw new Error("Publish check failed. Fix the post issues before publishing.");
  }
}

function stripDraftLine(frontmatter) {
  return frontmatter
    .split("\n")
    .filter((line) => !/^\s*draft:\s*(true|false)\s*$/i.test(line))
    .join("\n");
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const fileArg = args.file?.trim();

  if (!fileArg) {
    throw new Error("Missing required --file");
  }

  const absolutePath = path.resolve(repoRoot, fileArg);
  const relativePath = toRelative(absolutePath);

  const content = await fs.readFile(absolutePath, "utf8").catch(() => null);
  if (!content) {
    throw new Error(`Post file not found: ${relativePath}`);
  }

  runContentCheck(relativePath);

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!frontmatterMatch) {
    throw new Error(`Missing frontmatter block: ${relativePath}`);
  }

  const oldFrontmatter = frontmatterMatch[1];
  const body = content.slice(frontmatterMatch[0].length);
  const newFrontmatter = stripDraftLine(oldFrontmatter);
  const normalizedFrontmatter = newFrontmatter.trimEnd();

  const nextContent = `---\n${normalizedFrontmatter}\n---\n\n${body.replace(/^\n+/, "")}`;
  await fs.writeFile(absolutePath, nextContent, "utf8");

  console.log(`Published ${relativePath}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
