# Personal writing space

The writing interface lives at the blog's `/admin/` URL, with `/edit/` as an alias. Astro builds the shared editor into the GitHub Pages site.
Cloudflare Workers handles GitHub login, private D1 storage, and repository publication. A separate authoring website is not needed. The Worker still
serves a compatible standalone editor for older links.

## Provisioned resources

- Cloudflare account: `0xnefertt` (`c21794f0c62dc68f2ed8cc370f9fbf98`).
- Worker: `nefertt-writer`.
- URL: <https://nefertt-writer.0xnefertt-writer.workers.dev>.
- D1 database: `nefertt-writer` (`7106355a-00d4-492d-8b33-c5a7c919ab83`).
- GitHub repository and publication branch: `0xnefertt/0xnefertt.github.io`, `main`.
- Allowed GitHub user ID: `170924802`. Authorization uses this immutable ID rather than the account name.
- GitHub OAuth App: `0xnefertt Writer`, managed at <https://github.com/settings/applications/3918864>.

## GitHub login setup

1. Deploy the Worker to get its HTTPS address.
2. Register a GitHub OAuth App at <https://github.com/settings/applications/new>:
   - Application name: `0xnefertt Writer`.
   - Homepage URL: the Worker HTTPS address.
   - Authorization callback URL: `<worker-address>/auth/callback`.
3. Set the app's Client ID in `vars.GITHUB_CLIENT_ID` in `wrangler.jsonc`.
4. Store the Client Secret using `wrangler secret put GITHUB_CLIENT_SECRET` from this directory. Do not put it in source, chat, or public environment variables.
5. Generate a random secret of at least 32 characters and store it with `wrangler secret put SESSION_SECRET`.
6. Deploy again. The app refuses login until all required configuration is present.

The app requests the GitHub `public_repo` scope so the owner can publish to this public repository. GitHub OAuth grants that scope across the owner's public repositories; this server only calls the configured repository. Only the configured owner's ID can obtain a session.

## Development and verification

From the repository root:

```sh
npm run writer:setup
npm run writer:check
npm run writer:test
npm run writer:build
```

For local development, copy `.dev.vars.example` to `.dev.vars` in this directory, fill in the two secrets, and use a separate GitHub OAuth App with `http://localhost:8787/auth/callback` as its callback. Set its Client ID locally without committing credentials. Initialize local storage with `npm --prefix writer run db:local`, then run `npm run writer:dev`. Local storage is separate from production.

Tests use the real Workers runtime and D1 SQLite implementation with simulated GitHub responses. They do not create public posts or send credentials to GitHub.

## Deploying updates

Use the `0xnefertt` Wrangler auth profile activated for this directory. If it needs re-authentication:

```sh
cd writer
npx wrangler auth create 0xnefertt
npx wrangler auth activate 0xnefertt
npm run db:remote
npm run deploy
```

The public site renders the complete editor at `/admin/`. `PUBLIC_WRITER_URL` configures its backend API origin and defaults to the Worker address
above. To override it, set the repository Actions variable; `.github/workflows/deploy.yml` passes it to Astro. The Worker allows API requests only from
its own origin and the origin configured in `SITE_URL`.
Never put the GitHub Client Secret or the session secret in a `PUBLIC_` variable.

## Saving and publication

- Draft documents and images stay in D1, and every data endpoint requires a valid owner session. Drafts never enter the public repository.
- The server stores opaque session identifiers as hashes. The GitHub access token is encrypted at rest; it is never returned to browser JavaScript. Cookies are HttpOnly, Secure on HTTPS, and SameSite=Lax. Mutations require a same-origin request and a session CSRF token. API and HTML responses are not cached.
- For the blog's editor, OAuth returns to a fixed `/admin/` URL with an opaque session ID in the fragment and a client nonce. The browser validates
  the nonce, removes the fragment, and stores the opaque session in sessionStorage. API requests send it as a bearer token and omit cross-site
  cookies. This supports browsers that block third-party cookies. A strict Content Security Policy is used on the editor, with no analytics or ads.
- Draft versions use optimistic concurrency. A stale edit is rejected instead of overwriting another device's work. If there is a conflict, download the local text before reopening the latest draft.
- Markdown previews are sanitized. Raw HTML scripts and event handlers cannot execute. The preview shares the site's CSS, but it is not a full Astro build: legacy template syntax and custom Markdown processing may render differently.
- Images accept PNG, JPEG, GIF, or WebP up to 1 MiB each, with up to 20 private attachments per working copy. Images share D1 storage; large image libraries should move to object storage. Downloading a draft exports text only; images remain in its private working copy.
- Publication validates required fields, image references, and source revisions; formats Markdown with the repository's Prettier version; creates one Git commit containing the post and only its referenced images; and advances `main` without force. Removed or unused attachments stay private.
- Existing posts retain their filename and unrelated front matter. Category changes write `category_override` and `legacy_categories` metadata;
  Astro lists the post in its new category and keeps its previous category URLs available with the new canonical URL. Changing the date or slug, or
  editing a redirect/external-link post, requires direct repository editing.
- The publication button reports the repository commit and links to deployment status. The site becomes live only after the existing GitHub Actions checks and deployment succeed. Other invalid posts or formatting failures can still block deployment.
- Publication keeps a private working copy tied to the new source revision. GitHub and D1 are separate systems: if GitHub succeeds but the subsequent D1 write fails, inspect the repository before retrying. Publication never force-overwrites a changed repository.

Secrets, local database state, generated UI bundles, and test bundles are ignored by Git.
`worker-configuration.d.ts` is also generated and ignored; `npm run writer:check` regenerates it before checking Worker types.

Use **초안 삭제** to move a working copy to **휴지통**. Clicking its entry in Trash restores the document and private attachments. Published GitHub content and public images remain untouched.
Trash requires migration `0002_draft_trash.sql` before deploying the updated Worker. Deletion/restoration require the current revision and CSRF, and are blocked during publication.
Published copies are labeled **발행된 글의 작업본** because saving a private change and publishing it are separate actions.

## Post editor

The visual editor supports headings, fonts, sizes, line spacing, bold, italic, underline, strikethrough, colors, highlighting, alignment, lists, quotes, code, links, images, and tables. Images can also be pasted or dropped into the body. Table controls add or remove rows and columns, toggle header rows, and merge or split cells. Undo history is isolated to the open post.

Source editing and sanitized preview remain available. Opening a post or saving metadata preserves its original Markdown; editing the visual body produces Markdown with HTML for formatting that Markdown cannot express. Posts containing custom embeds, templates, or unsupported syntax open in source mode to preserve their content. Private image URLs remain private until publication, including images inside HTML tables.

## Site management

`/admin/` includes Posts, Bookshelf, Projects, About/Profile, Categories, and Favorites. Books and projects reuse the private drafts, rich text editor, image attachments,
optimistic concurrency, and publication workflow. Each content section has its own draft and existing-item lists.

Bookshelf edits the publication date, cover, and a freeform review body. Author and category inputs have been removed; older book metadata is preserved when saving. Projects edits
the description, image, status, period, role, ordering, stack, and a freeform body. Optional project details are collapsed by default. Tasks, lessons,
links, headings, images, and tables can be placed anywhere in the body using the same editor as blog posts. Legacy highlights, lessons, and links
are moved into editable body lists when a project or old private draft is opened; publishing removes those separate metadata fields. Older public
content remains visible in the body without preset section headings. Cover attachments stay private until publication.
Book reviews allow a custom publication date. Leaving it blank records the first publication date automatically; later edits retain it unless explicitly changed and update `last_updated`. Translated reviews start without a publication date.
The cover thumbnail is visible while writing. Attachment uploads immediately save their reference; the cover reaches the public site after publication.
Older book working copies can retain their edits when the repository changed only by adding the initial publication date. Any other remote change still requires conflict resolution.
New books are written to `_books/<lang>/<slug>.md`, and new projects to `_projects/<lang>/<slug>.md`. Existing filenames and unrelated metadata are preserved,
including Unicode book filenames and numeric legacy fields. Books and projects do not require blog dates, tags, or blog categories, and are excluded
from the blog category-usage checks. No D1 migration is needed because the content kind is stored in the draft JSON; old drafts default to blog posts.

About/Profile opens `_pages/about.md` for English or `_pages/ko/about.md` for Korean as separate private working copies. It edits the profile name, location, short bio, photo, subtitle, additional
profile lines, search description, and introduction body. Photos use the same private attachment workflow and publish atomically with the page. The
homepage and owner byline use the saved profile. Other page settings (latest posts, weather/exchange configuration, layout and permalink) are retained.
Only these two About paths are editable; other `_pages/` files and new About pages are rejected. No database migration is required.

Deploy both the Worker backend and the Astro site to enable the new admin sections in production. Building only the editor does not update the API.

Category names and ordering are independent of their stable URL slugs. Each parent and child has separate English and Korean names; the public site and post editor use the selected language.
Add parents or children, rename display names, reorder entries, or remove an
unused category. Categories referenced by published blog posts or private blog drafts cannot be removed until those posts are reassigned.

Favorites supports group and link names, URLs, optional notes, ordering, addition, and removal. Groups and links appear on `/resources/` and `/ko/resources/`; empty groups are retained in admin but hidden on Resources. The initial migration preserves every link from `_pages/about.md`.

Both settings sections share a working copy. “저장하고 반영” commits `_data/site-settings.json` to the configured repository and starts the existing site deployment. Settings are explicit-save, while post drafts continue to autosave. Export unsaved settings before reloading after a conflict. Authentication, owner checks, CSRF, bounded requests, and non-forced Git ref updates apply to settings as well as posts. The API uses batched GraphQL reads pinned to the repository head to check category usage.
