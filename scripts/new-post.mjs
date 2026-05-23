#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";

const repoRoot = process.cwd();
const postsRoot = path.join(repoRoot, "_posts");

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parseCategoryPath(input) {
  const segments = String(input || "")
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    throw new Error("Invalid --category value");
  }

  if (segments.length > 2) {
    throw new Error("--category supports up to 2 levels (e.g. engineering or engineering/frontend)");
  }

  const slugs = segments.map((item) => slugify(item));
  if (slugs.some((item) => !item)) {
    throw new Error("Invalid --category value");
  }

  return {
    names: segments,
    slugs,
    label: segments.join("/"),
  };
}

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

function parseList(input) {
  if (!input) {
    return [];
  }

  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(input) {
  if (input == null || input === "") {
    return undefined;
  }

  const normalized = String(input).trim().toLowerCase();
  if (["true", "1", "y", "yes"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "n", "no"].includes(normalized)) {
    return false;
  }

  throw new Error(`Invalid boolean value: ${input}`);
}

function ensureDate(input) {
  if (!input) {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    throw new Error("Date must follow YYYY-MM-DD");
  }

  return input;
}

function quoteYaml(input) {
  return `"${String(input).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function toYamlList(values) {
  if (values.length === 0) {
    return " []";
  }

  return `\n${values.map((item) => `  - ${quoteYaml(item)}`).join("\n")}`;
}

async function ask(rl, label, defaultValue = "") {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = await rl.question(`${label}${suffix}: `);
  const normalized = answer.trim();
  return normalized || defaultValue;
}

function validateRequired(input, name) {
  if (!input || !String(input).trim()) {
    throw new Error(`Missing required --${name}`);
  }
}

function seoTitleCandidates(title) {
  const base = title.trim();
  return [base, `${base} | 0xnefertt`];
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const interactiveRequested = parseBoolean(args.interactive) === true;

  let title = args.title?.trim() ?? "";
  let description = args.description?.trim() ?? "";
  let category = args.category?.trim() ?? "";
  let tagsInput = args.tags?.trim() ?? "";
  let date = ensureDate(args.date);
  let slugInput = args.slug?.trim() ?? "";
  let extraCategoriesInput = args.extraCategories?.trim() ?? "";
  let series = args.series?.trim() ?? "";
  let draft = parseBoolean(args.draft) ?? false;
  let cover = args.cover?.trim() ?? "";
  let canonical = args.canonical?.trim() ?? "";

  const missingRequired = !title || !description || !category || !tagsInput;

  if ((interactiveRequested || missingRequired) && process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      title = await ask(rl, "Title", title);
      description = await ask(rl, "Description", description);
      category = await ask(rl, "Primary category (supports parent/child)", category);
      tagsInput = await ask(rl, "Tags (comma-separated)", tagsInput);
      date = ensureDate(await ask(rl, "Date (YYYY-MM-DD)", date));
      const suggestedSlug = slugInput || slugify(title);
      slugInput = await ask(rl, "Slug", suggestedSlug);
      extraCategoriesInput = await ask(rl, "Extra categories (comma-separated)", extraCategoriesInput);
      series = await ask(rl, "Series (optional)", series);

      const draftAnswer = await ask(rl, "Draft? (y/n)", draft ? "y" : "n");
      draft = parseBoolean(draftAnswer) ?? false;

      const defaultCover = cover || `/assets/img/posts/${slugify(slugInput || title)}/cover.png`;
      cover = await ask(rl, "Cover image path (optional)", defaultCover);
      canonical = await ask(rl, "Canonical URL (optional)", canonical);
    } finally {
      rl.close();
    }
  }

  validateRequired(title, "title");
  validateRequired(description, "description");
  validateRequired(category, "category");
  validateRequired(tagsInput, "tags");

  const slug = slugInput ? slugify(slugInput) : slugify(title);
  if (!slug) {
    throw new Error("Could not generate slug. Provide --slug explicitly.");
  }

  const primaryCategory = parseCategoryPath(category);

  const tags = parseList(tagsInput);
  if (tags.length === 0) {
    throw new Error("Missing required --tags (comma-separated)");
  }

  const extraCategories = parseList(extraCategoriesInput);
  const categories = [primaryCategory.label, ...extraCategories];

  const normalizedCover = cover.trim();
  const normalizedCanonical = canonical.trim();

  const categoryDir = path.join(postsRoot, ...primaryCategory.slugs);
  const filename = `${date}-${slug}.md`;
  const filePath = path.join(categoryDir, filename);

  fs.mkdirSync(categoryDir, { recursive: true });

  if (fs.existsSync(filePath)) {
    throw new Error(`Post already exists: ${path.relative(repoRoot, filePath)}`);
  }

  const tagsField = toYamlList(tags);
  const categoriesField = toYamlList(categories);

  const optionalFrontmatter = [];
  if (draft) {
    optionalFrontmatter.push("draft: true");
  }
  if (series) {
    optionalFrontmatter.push(`series: ${quoteYaml(series)}`);
  }
  if (normalizedCover) {
    optionalFrontmatter.push(`thumbnail: ${quoteYaml(normalizedCover)}`);
  }
  if (normalizedCanonical) {
    optionalFrontmatter.push(`canonical: ${quoteYaml(normalizedCanonical)}`);
  }

  const frontmatterOptionalBlock = optionalFrontmatter.length > 0 ? `${optionalFrontmatter.join("\n")}\n` : "";

  const content = `---
layout: post
title: ${quoteYaml(title)}
date: ${date}
description: ${quoteYaml(description)}
tags:${tagsField}
categories:${categoriesField}
${frontmatterOptionalBlock}---

## Summary

Short summary of the post.

## Key points

- Point 1
- Point 2
- Point 3

## Details

Write your detailed content here.

![Optional cover image](/assets/img/posts/${slug}/cover.png)

## Conclusion

Final takeaway.
`;

  fs.writeFileSync(filePath, content, "utf8");

  const [seoPrimary, seoSecondary] = seoTitleCandidates(title);
  console.log(`Created ${path.relative(repoRoot, filePath)}`);
  console.log(`SEO title candidate 1: ${seoPrimary}`);
  console.log(`SEO title candidate 2: ${seoSecondary}`);
  console.log(`Description length: ${description.length}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
