#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const postsRoot = path.join(repoRoot, "_posts");

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
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

function toYamlList(values) {
  if (values.length === 0) {
    return "[]";
  }

  return `\n${values.map((item) => `  - ${quoteYaml(item)}`).join("\n")}`;
}

function quoteYaml(input) {
  return `"${input.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function run() {
  const args = parseArgs(process.argv.slice(2));
  const title = args.title?.trim();
  const primaryCategory = args.category?.trim();
  const description = args.description?.trim();
  const date = ensureDate(args.date);

  if (!title) {
    throw new Error("Missing required --title");
  }

  if (!primaryCategory) {
    throw new Error("Missing required --category");
  }

  if (!description) {
    throw new Error("Missing required --description");
  }

  const slug = args.slug ? slugify(args.slug) : slugify(title);
  if (!slug) {
    throw new Error("Could not generate slug. Provide --slug explicitly.");
  }

  const categorySlug = slugify(primaryCategory);
  if (!categorySlug) {
    throw new Error("Invalid --category value");
  }

  const tags = parseList(args.tags);
  if (tags.length === 0) {
    throw new Error("Missing required --tags (comma-separated)");
  }

  const extraCategories = parseList(args.extraCategories);
  const categories = [primaryCategory, ...extraCategories];

  const categoryDir = path.join(postsRoot, categorySlug);
  const filename = `${date}-${slug}.md`;
  const filePath = path.join(categoryDir, filename);

  fs.mkdirSync(categoryDir, { recursive: true });

  if (fs.existsSync(filePath)) {
    throw new Error(`Post already exists: ${path.relative(repoRoot, filePath)}`);
  }

  const tagsField = tags.length > 0 ? toYamlList(tags) : " []";
  const categoriesField = categories.length > 0 ? toYamlList(categories) : " []";

  const content = `---
layout: post
title: ${quoteYaml(title)}
date: ${date}
description: ${quoteYaml(description)}
tags:${tagsField}
categories:${categoriesField}
---

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
  console.log(`Created ${path.relative(repoRoot, filePath)}`);
}

try {
  run();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
