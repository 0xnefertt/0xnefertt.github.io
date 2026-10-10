# Site languages

English uses the existing root URLs (`/`, `/about/`, `/blog/`, `/books/`, `/projects/`, `/resources/`). Korean uses `/ko/`, `/ko/about/`, `/ko/blog/`, `/ko/books/`, `/ko/projects/`, and `/ko/resources/`.
The URL determines the page language; browser language and old local storage preferences do not override it.

Category settings store an English name (`name`) and an optional Korean name (`name_ko`) for each parent and child category.
The administrator has separate **영어 이름** and **한국어 이름** inputs. Public navigation, filters, category pages, breadcrumbs, search and RSS use the content language.
Category addresses (`slug`) stay shared and unchanged when names change. A missing Korean name falls back to the English name for older settings.

All content has `lang: en` or `lang: ko`. Lists, categories, recommendations, pagination, search indexes, and RSS contain only published content in that language.
Existing Korean article URLs redirect to their Korean canonical URL. English translations can subsequently use the English route.

## Writing and translations

The shared `/admin/` supports a language filter and a content language selector. A published item's language and source path stay fixed.
Use **다른 언어 버전 추가** to create a blank private draft linked to the original. Write and publish each version separately.
Both versions use the same `translation_key`, even when their slugs differ. Each collection permits only one published version per language and translation key.
Untranslated items link to the other language's collection index and do not advertise a nonexistent translation through `hreflang`.

English About is stored in `_pages/about.md`; Korean About is in `_pages/ko/about.md`. Open either with the two About buttons in the editor.
Profile text and photos can be edited in each language's About document. The initial photos use the same asset.
The dedicated About pages show the full introduction; the blog home shows a short profile linking to About. Both read these same administrator-editable documents.

New administrator content uses `_posts/<lang>/<category>/<date>-<slug>.md`, `_books/<lang>/<slug>.md`, or `_projects/<lang>/<slug>.md`.
Existing source files retain their paths so existing working copies can still be opened. Legacy private drafts infer a language until saved with explicit metadata.
CLI authors can use `npm run post:new -- --lang ko ...` or `--lang en` (default).

RSS: `/rss.xml` for English, `/ko/rss.xml` for Korean. Search indexes and sitemap are generated from the same language-aware content.

Verification: `npm run writer:check`, `npm run writer:test`, `npm run verify:content`, `npm run verify:build`, and `npm run format:check`.
