# 0xnefertt.github.io

Personal site and blog built with Astro.

## Tech stack

- Astro (static output)
- Markdown content collections
- GA4-compatible analytics events
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
npm run post:new -- --title "My New Post" --description "One-line summary for preview cards" --category "engineering" --tags "astro,notes"
```

Interactive mode:

```bash
npm run post:new -- --interactive
```

Optional flags:

- `--date YYYY-MM-DD`
- `--slug custom-slug`
- `--extraCategories "frontend,notes"`
- `--series "Infra Notes"`
- `--draft true`
- `--cover "/assets/img/posts/<slug>/cover.png"`
- `--canonical "https://external.example.com/original"`

Generated path format:

- `_posts/<category-slug>/YYYY-MM-DD-<slug>.md`

Notes:

- The site merges `frontmatter categories` and folder path categories.
- If a post has no `categories` frontmatter, folder-based category inference still works.
- `--description` and `--tags` are required for scaffolding.
- New post template includes `Summary / Key points / Details / Conclusion` sections.
- Recommended image location: `/assets/img/posts/<post-slug>/...`
- `post:new` prints two SEO title candidates and description length.

## Draft and publish flow

- `draft: true` posts are excluded from:
  - blog lists
  - category pages
  - blog search index
  - RSS feed
  - sitemap
- Publish a draft (strict check + draft flag removal):

```bash
npm run post:publish -- --file _posts/<category>/YYYY-MM-DD-slug.md
```

## Image helper

Attach an image to a post asset folder and get markdown snippet:

```bash
npm run post:image -- --post _posts/<category>/YYYY-MM-DD-slug.md --src ~/Downloads/chart.png
```

## SEO and feeds

Generated at build time:

- `/sitemap.xml`
- `/rss.xml`
- `/feed.xml` (alias of RSS for compatibility)
- `/robots.txt`

The layout now emits canonical, Open Graph, and Twitter metadata by default.
Blog post pages also emit `Article` JSON-LD.

## Analytics and comments

Optional environment variables:

- `PUBLIC_GA_MEASUREMENT_ID` (enables `search_used`, `post_opened`, `outbound_click`, `adsense_click_placeholder`)
- `PUBLIC_GISCUS_REPO`
- `PUBLIC_GISCUS_REPO_ID`
- `PUBLIC_GISCUS_CATEGORY`
- `PUBLIC_GISCUS_CATEGORY_ID`

You can start from `.env.example` at repository root.

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
npm run verify:content
npm run report:content
npm run verify:build
npm run format:check
```

What they validate:

- `verify:content`: frontmatter/image checks + route-duplicate detection + section guidance
- `report:content`: writes `reports/content-check.md`
- `verify:build`: Astro build + required output files (`sitemap.xml`, `rss.xml`, `robots.txt`)

## Publishing checklist

1. `npm run verify:content`
2. `npm run verify:build`
3. `npm run format:check`
4. Confirm `/blog/search/`, `/rss.xml`, `/sitemap.xml` locally
5. After deploy, confirm Search Console indexing and GA4 event inflow

## Available npm scripts

- `npm run setup`: install root + Astro dependencies
- `npm run setup:ci`: clean install root + Astro dependencies (`ci`)
- `npm run serve`: Astro dev server (default)
- `npm run build`: Astro build (default)
- `npm run astro:dev`: direct Astro dev
- `npm run astro:build`: direct Astro build
- `npm run post:publish`: publish a draft post
- `npm run post:image`: copy image into post asset directory + print markdown snippet
- `npm run verify:content`: post quality checks
- `npm run report:content`: generate content report artifact
- `npm run verify:site-output`: output artifact checks
- `npm run verify:build`: build + output checks

## CI/CD

- Deploy: `.github/workflows/deploy.yml` (deploys `astro/dist`)
- Link check after deploy: `.github/workflows/broken-links-site.yml`
- Weekly content health report: `.github/workflows/content-health.yml`
- Accessibility check (manual): `.github/workflows/axe.yml`
