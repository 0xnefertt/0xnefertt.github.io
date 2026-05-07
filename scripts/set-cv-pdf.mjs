#!/usr/bin/env node

import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const assetsPdfDir = path.join(repoRoot, "assets", "pdf");
const cvMetaPath = path.join(repoRoot, "_data", "cv-meta.yml");

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

function ensurePdfName(fileName) {
  if (!fileName) {
    return "resume.pdf";
  }

  const trimmed = fileName.trim();
  if (!trimmed) {
    return "resume.pdf";
  }

  if (!trimmed.toLowerCase().endsWith(".pdf")) {
    return `${trimmed}.pdf`;
  }

  return trimmed;
}

function toPublicPdfPath(fileName) {
  return `/assets/pdf/${fileName}`;
}

function setResumePdfInMeta(content, publicPdfPath) {
  if (/^resume_pdf:\s*.+$/m.test(content)) {
    return content.replace(/^resume_pdf:\s*.+$/m, `resume_pdf: ${publicPdfPath}`);
  }

  return `resume_pdf: ${publicPdfPath}\n${content}`;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const inputFile = args.file ? path.resolve(args.file) : "";

  if (!inputFile) {
    throw new Error("Missing required --file. Example: npm run cv:pdf -- --file ~/Downloads/cv.pdf");
  }

  if (!inputFile.toLowerCase().endsWith(".pdf")) {
    throw new Error("--file must be a PDF");
  }

  const targetName = ensurePdfName(args.name);
  const targetPath = path.join(assetsPdfDir, targetName);
  const publicPdfPath = toPublicPdfPath(targetName);

  await mkdir(assetsPdfDir, { recursive: true });
  await copyFile(inputFile, targetPath);

  const currentMeta = await readFile(cvMetaPath, "utf-8").catch(() => "");
  const updatedMeta = setResumePdfInMeta(currentMeta, publicPdfPath);
  await writeFile(cvMetaPath, updatedMeta, "utf-8");

  console.log(`Uploaded CV PDF to ${path.relative(repoRoot, targetPath)}`);
  console.log(`Updated _data/cv-meta.yml => resume_pdf: ${publicPdfPath}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
