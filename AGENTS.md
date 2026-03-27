# Repository Guidelines

## Project Structure & Module Organization
This repository is a Jekyll site based on `al-folio`.
- Content: `_pages/` (site pages), `_posts/` (blog posts), `_projects/`, `_news/`, `_books/`.
- Presentation: `_layouts/` (page templates), `_includes/` (reusable Liquid partials), `_sass/` (SCSS partials), `assets/` (images, JS, CSS, fonts, media).
- Data/config: `_data/*.yml` and `_config.yml`.
- Automation: `bin/` scripts and `.github/workflows/` CI/CD pipelines.
- Generated output: `_site/` (do not edit directly).

## Build, Test, and Development Commands
Use these from the repository root:
- `bundle install`: install Ruby/Jekyll dependencies.
- `npm install`: install formatter dependencies.
- `npm run serve`: run local dev server with livereload (`http://localhost:4000`).
- `npm run build`: build the static site into `_site/`.
- `npm run format`: apply Prettier formatting.
- `npm run format:check`: verify formatting (matches CI check).
- `bundle exec jekyll build`: direct Jekyll build (same behavior as `npm run build`).

## Coding Style & Naming Conventions
- Formatting is enforced with Prettier + `@shopify/prettier-plugin-liquid` (`.prettierrc`, print width 150).
- Use 2-space indentation in Liquid/HTML/YAML/Markdown files, following existing templates.
- Keep keys in YAML/Liquid data files alphabetically sorted when extending structured lists (e.g., socials).
- Blog posts should follow `YYYY-MM-DD-title.md` in `_posts/` with valid front matter.
- Keep reusable UI logic in `_includes/`; page-specific content belongs in `_pages/` or collection files.

## Testing Guidelines
There is no unit-test suite in this repo. Validate changes with:
- `npm run format:check`
- `npm run build`
- Optional local smoke test via `npm run serve`
CI additionally runs formatting, link checks, and deployment builds. Treat a clean local build/format check as the minimum bar before opening a PR.

## Commit & Pull Request Guidelines
- Match existing commit style: short, imperative, sentence-case summaries (e.g., `Fix Prettier formatting issues`, `Add analysis post for ...`).
- Keep commits focused by concern (content vs. config vs. tooling).
- For new features/bug fixes, open or reference a GitHub issue before submitting PRs (per `CONTRIBUTING.md`).
- In PRs, include: purpose, key files changed, verification steps run, and screenshots for UI-visible changes.
