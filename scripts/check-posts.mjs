#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const postsRoot = path.join(repoRoot, "_posts");
const fileNamePattern = /^(\d{4})-\d{2}-\d{2}-(.+)\.mdx?$/;

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

function parseBoolean(input, fallback = false) {
  if (input == null || input === "") {
    return fallback;
  }

  const normalized = String(input).trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "n"].includes(normalized)) {
    return false;
  }

  return fallback;
}

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

function extractRouteKey(filePath) {
  const fileName = path.basename(filePath);
  const match = fileName.match(fileNamePattern);
  if (!match) {
    return null;
  }

  const year = match[1];
  const slug = match[2];
  return `${year}/${slug}`;
}

function markdownReport({ checkedFiles, strictMode, errors, warnings }) {
  const status = errors.length > 0 ? "FAILED" : "PASSED";
  const checkedAt = new Date().toISOString();

  const lines = [
    "# Content Check Report",
    "",
    `- Status: **${status}**`,
    `- Checked at: ${checkedAt}`,
    `- Files checked: ${checkedFiles}`,
    `- Mode: ${strictMode ? "publish-strict" : "default"}`,
    `- Errors: ${errors.length}`,
    `- Warnings: ${warnings.length}`,
    "",
  ];

  lines.push("## Errors");
  if (errors.length === 0) {
    lines.push("", "- None", "");
  } else {
    lines.push("", ...errors.map((entry) => `- ${entry}`), "");
  }

  lines.push("## Warnings");
  if (warnings.length === 0) {
    lines.push("", "- None", "");
  } else {
    lines.push("", ...warnings.map((entry) => `- ${entry}`), "");
  }

  return lines.join("\n");
}

async function writeReport(reportPath, content) {
  const outputPath = path.isAbsolute(reportPath) ? reportPath : path.join(repoRoot, reportPath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, content, "utf8");
}

function toRelativeFromRepo(targetPath) {
  return path.relative(repoRoot, targetPath).replace(/\\/g, "/");
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const strictMode = parseBoolean(args["publish-mode"], false);
  const reportPath = args.report?.trim() || "reports/content-check.md";
  const targetFile = args.file ? path.resolve(repoRoot, args.file) : undefined;

  const files = await walkMarkdownFiles(postsRoot);
  const metadata = [];

  for (const filePath of files) {
    const content = await fs.readFile(filePath, "utf8");
    const relativePath = toRelativeFromRepo(filePath);

    metadata.push({
      filePath,
      relativePath,
      content,
      frontmatter: getFrontmatter(content),
      body: getBody(content),
      routeKey: extractRouteKey(filePath),
    });
  }

  if (targetFile) {
    const targetExists = metadata.some((item) => path.resolve(item.filePath) === targetFile);
    if (!targetExists) {
      throw new Error(`Target post was not found: ${toRelativeFromRepo(targetFile)}`);
    }
  }

  const errors = [];
  const warnings = [];

  const routeMap = new Map();
  for (const item of metadata) {
    if (!item.routeKey) {
      continue;
    }

    if (!routeMap.has(item.routeKey)) {
      routeMap.set(item.routeKey, []);
    }

    routeMap.get(item.routeKey).push(item.relativePath);
  }

  for (const [routeKey, filesWithRoute] of routeMap.entries()) {
    if (filesWithRoute.length < 2) {
      continue;
    }

    const includesTarget = !targetFile || filesWithRoute.includes(toRelativeFromRepo(targetFile));
    if (!includesTarget) {
      continue;
    }

    errors.push(`duplicate route '${routeKey}' -> ${filesWithRoute.join(", ")}`);
  }

  const filesToCheck = targetFile ? metadata.filter((item) => path.resolve(item.filePath) === targetFile) : metadata;

  for (const item of filesToCheck) {
    const { relativePath, frontmatter, body } = item;

    if (!frontmatter) {
      errors.push(`${relativePath}: missing frontmatter block`);
      continue;
    }

    const isDraft = !strictMode && parseBoolean(getScalar(frontmatter, "draft"), false);

    const requiredForPublished = ["title", "date", "description", "tags", "categories"];
    const requiredForDraft = ["title", "date", "categories"];

    const requiredFields = isDraft ? requiredForDraft : requiredForPublished;

    for (const requiredKey of requiredFields) {
      if (!hasMeaningfulField(frontmatter, requiredKey)) {
        errors.push(`${relativePath}: missing required frontmatter '${requiredKey}'`);
      }
    }

    if (isDraft) {
      for (const relaxedKey of ["description", "tags"]) {
        if (!hasMeaningfulField(frontmatter, relaxedKey)) {
          warnings.push(`${relativePath}: draft post is missing '${relaxedKey}'`);
        }
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
      const resolvedPath = resolveImagePath(imageTarget, item.filePath);
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

  const report = markdownReport({
    checkedFiles: filesToCheck.length,
    strictMode,
    errors,
    warnings,
  });

  await writeReport(reportPath, report);

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

    console.error(`\n[post-check] report written to ${reportPath}`);
    process.exit(1);
  }

  console.log(`\n[post-check] OK (${filesToCheck.length} posts validated)`);
  console.log(`[post-check] report written to ${reportPath}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
