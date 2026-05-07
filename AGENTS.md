# Repository Guidelines

## Project Structure & Module Organization

This repository runs on Astro.

- Primary app: `astro/` (source and output under `astro/dist/`).
- Content sources: `_pages/`, `_posts/`, `_projects/`, `_news/`, `_books/`.
- Shared assets/data: `assets/`, `_data/`.
- Automation: `.github/workflows/`.
- Generated output: `astro/dist/` (do not edit directly).

## Build, Test, and Development Commands

Use these from repository root unless stated otherwise:

- `npm install`: install root tooling dependencies.
- `npm run serve`: run Astro dev server.
- `npm run build`: build Astro static site.
- `npm run astro:dev`: run Astro dev server from `astro/`.
- `npm run astro:build`: build Astro site into `astro/dist/`.
- `npm run format`: apply Prettier formatting.
- `npm run format:check`: verify formatting.

## Coding Style & Naming Conventions

- Formatting is enforced with Prettier (`.prettierrc`, print width 150).
- Use 2-space indentation in markup/YAML/Markdown.
- Keep keys in structured YAML data files alphabetically sorted when extending lists.
- Blog posts should follow `YYYY-MM-DD-title.md` in `_posts/` with valid front matter.
- Place reusable UI parts under `astro/src/components/` and routes under `astro/src/pages/`.

## Testing Guidelines

There is no unit-test suite in this repo. Minimum verification before PR:

- `npm run format:check`
- `npm run build`

Optional smoke tests:

- `npm run serve`
- `cd astro && npm run build`

## Commit & Pull Request Guidelines

- Use short, imperative, sentence-case commit messages.
- Keep commits focused by concern (content vs. config vs. tooling).
- For new features/bug fixes, open or reference a GitHub issue before submitting PRs.
- In PRs, include: purpose, key files changed, verification steps run, and screenshots for UI-visible changes.
