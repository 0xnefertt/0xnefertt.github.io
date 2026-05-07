# 0xnefertt.github.io

Personal site and blog built with Astro.

## Tech stack

- Astro (static output)
- Markdown content collections
- Node.js + npm
- GitHub Pages deployment via GitHub Actions

## Project layout

- `astro/`: main Astro project
  - `astro/src/pages`: routes
  - `astro/src/content.config.ts`: content collections
- Content sources consumed by Astro:
  - `_pages/`
  - `_posts/` (category-based folders)
  - `_projects/`
  - `_news/`
  - `_books/`
- Shared assets/data:
  - `assets/`
  - `_data/`

## Prerequisites

- Node.js 22+
- npm 10+

## Quick start

From repository root:

```bash
npm run setup
npm run serve
```

- `npm run setup`: installs root + Astro dependencies
- `npm run serve`: runs Astro dev server

## Build

From repository root:

```bash
npm run build
```

Build output: `astro/dist/`

## Blog post scaffolding

Posts are organized by category directory under `_posts`.

Create a new post:

```bash
npm run post:new -- --title "My New Post" --category "engineering" --tags "astro,notes"
```

Optional flags:

- `--date YYYY-MM-DD`
- `--slug custom-slug`
- `--extraCategories "frontend,notes"`

Generated path format:

- `_posts/<category-slug>/YYYY-MM-DD-<slug>.md`

Notes:

- The site merges `frontmatter categories` and folder path categories.
- If a post has no `categories` frontmatter, folder-based category inference still works.

## CV content guide

The `/cv/` page reads structured data from:

- `assets/json/resume.json`

Recommended minimum sections:

- `basics`: name, label, email, url, location
- `work`: position, organization, startDate/endDate, highlights
- `education`: studyType, area, institution, dates
- `skills`: skill name + keywords

Optional sections:

- `awards`, `certificates`, `projects`, `publications`, `volunteer`, `languages`, `interests`, `references`

## Upload CV PDF

The CV page can show a PDF download button when a file is configured and present.

1. Upload/replace CV PDF into the repo:

```bash
npm run cv:pdf -- --file ~/Downloads/cv.pdf
```

2. Optional custom output filename:

```bash
npm run cv:pdf -- --file ~/Downloads/cv.pdf --name sungjun-won-cv.pdf
```

This command:

- copies the file to `assets/pdf/...`
- updates `_data/cv-meta.yml` (`resume_pdf` path)
- enables the button on `/cv/` automatically

## Verification commands

```bash
npm run astro:build
npm run format:check
```

## Available npm scripts

- `npm run setup`: install root + Astro dependencies
- `npm run setup:ci`: clean install root + Astro dependencies (`ci`)
- `npm run serve`: Astro dev server (default)
- `npm run build`: Astro build (default)
- `npm run astro:dev`: direct Astro dev
- `npm run astro:build`: direct Astro build

## CI/CD

- Deploy: `.github/workflows/deploy.yml` (deploys `astro/dist`)
- Link check after deploy: `.github/workflows/broken-links-site.yml`
- Accessibility check (manual): `.github/workflows/axe.yml`
