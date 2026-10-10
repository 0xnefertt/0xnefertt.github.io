import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import prettier from "prettier";

const origin = "https://writer.example.com";
const originalSha = "a".repeat(40);
const sourcePath = "_posts/study-log/dev/2026-01-01-existing.md";
const existing =
  "---\ntitle: Existing\ndate: 2026-01-01\ndescription: Existing post\ncategories:\n  - study-log/dev\ntags:\n  - astro\nslug: existing\nlang: ko\nseries: Notes\ngiscus_comments: false\n---\n\nOriginal body.\n";
const bookPath = "_books/세상에서_가장_쉬운_본질육아.md";
const projectPath = "_projects/2026-05-06-site-platform.md";
const aboutPath = "_pages/about.md";
const aboutKoPath = "_pages/ko/about.md";
let aboutKoContent;
let aboutContent;
const bookContent =
  "---\ntitle: Existing book\ndate: 2026-01-07\nauthor: Original author\ncover: assets/img/book_covers/세상에서_가장_쉬운_본질육아.png\nisbn: 7539967447\ncategories: parenting education\nfinished: 2025-07-14\nstars: 3\nstatus: Finished\ncustom_marker: keep-this\n---\n\nOriginal book review.\n";
const projectContent =
  "---\ntitle: Existing project\ndescription: Project summary\nimg: assets/img/prof_pic.jpg\nimportance: 1\ncategory: website\nstatus: In progress\nperiod: 2026\nrole: Personal project\nstack: [Astro, TypeScript]\nhighlights: [Original highlight]\nlessons: [Original lesson]\nlinks: [{label: Repository, url: 'https://github.com/0xnefertt/0xnefertt.github.io'}]\nrelated_publications: false\n---\n\nOriginal project body.\n";
let mf;
let ownerId = 170924802;
let failBranch = false;
let calls = [];
const settingsSha = "1".repeat(40);
let configuredSettings;
let auth;

before(async () => {
  aboutContent = await readFile("../_pages/about.md", "utf8");
  aboutKoContent = await readFile("../_pages/ko/about.md", "utf8");
  configuredSettings = JSON.parse(await readFile("../_data/site-settings.json", "utf8"));
  await mkdir(".test-build", { recursive: true });
  await build({
    entryPoints: ["src/worker.ts"],
    outfile: ".test-build/worker.mjs",
    bundle: true,
    format: "esm",
    platform: "neutral",
    conditions: ["workerd", "import", "default"],
    external: ["node:crypto"],
    target: "es2022",
  });
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      scriptPath: ".test-build/worker.mjs",
      compatibilityDate: "2026-10-09",
      compatibilityFlags: ["nodejs_compat"],
      bindings: {
        SITE_URL: "https://0xnefertt.github.io",
        GITHUB_REPOSITORY: "0xnefertt/0xnefertt.github.io",
        GITHUB_BRANCH: "main",
        OWNER_ID: "170924802",
        GITHUB_CLIENT_ID: "test-client",
        GITHUB_CLIENT_SECRET: "test-secret",
        SESSION_SECRET: "test-only-session-key-at-least-32-characters",
      },
      d1Databases: { DB: "test-db" },
      serviceBindings: { ASSETS: () => new Response("Writer UI") },
      outboundService: async (request) => {
        const url = new URL(request.url);
        const data = request.method === "GET" ? null : await request.json();
        calls.push({ path: url.pathname, method: request.method, data });
        const json = (value, status = 200) => Response.json(value, { status });
        if (url.pathname === "/login/oauth/access_token") return json({ access_token: "test-github-token", scope: "public_repo" });
        if (url.pathname === "/user") return json({ id: ownerId, login: "0xnefertt" });
        if (url.pathname.endsWith("/git/ref/heads/main")) return json({ object: { sha: "b".repeat(40) } });
        if (url.pathname.endsWith(`/git/commits/${"b".repeat(40)}`)) return json({ tree: { sha: "c".repeat(40) } });
        if (url.pathname.endsWith(`/git/trees/${"c".repeat(40)}`))
          return json({
            truncated: false,
            tree: [
              { path: sourcePath, sha: originalSha, type: "blob" },
              { path: bookPath, sha: originalSha, type: "blob" },
              { path: projectPath, sha: originalSha, type: "blob" },
              { path: aboutPath, sha: originalSha, type: "blob" },
              { path: aboutKoPath, sha: originalSha, type: "blob" },
              { path: "astro/public/assets/img/prof_pic.jpg", sha: originalSha, type: "blob" },
              { path: "astro/public/assets/img/book_covers/세상에서_가장_쉬운_본질육아.png", sha: originalSha, type: "blob" },
              { path: "_data/site-settings.json", sha: settingsSha, type: "blob" },
            ],
          });
        if (url.pathname.endsWith(`/git/blobs/${settingsSha}`)) {
          const content = JSON.stringify(configuredSettings);
          return json({ content: Buffer.from(content).toString("base64"), size: content.length });
        }
        if (url.pathname === "/graphql")
          return json({
            data: {
              repository: Object.fromEntries(
                Object.keys(data.variables)
                  .filter((key) => /^p\d+$/.test(key))
                  .map((key) => {
                    const path = data.variables[key].split(":").slice(1).join(":");
                    return [
                      key,
                      {
                        text:
                          path === bookPath
                            ? bookContent
                            : path === projectPath
                              ? projectContent
                              : path === aboutPath
                                ? aboutContent
                                : path === aboutKoPath
                                  ? aboutKoContent
                                  : existing,
                      },
                    ];
                  })
              ),
            },
          });
        if (url.pathname.includes("/contents/")) {
          const path = decodeURIComponent(url.pathname.split("/contents/")[1]);
          const content =
            path === bookPath
              ? bookContent
              : path === projectPath
                ? projectContent
                : path === aboutPath
                  ? aboutContent
                  : path === aboutKoPath
                    ? aboutKoContent
                    : existing;
          return json({ content: Buffer.from(content).toString("base64"), sha: originalSha, size: content.length });
        }
        if (url.pathname.endsWith("/git/blobs")) return json({ sha: "d".repeat(40) });
        if (url.pathname.endsWith("/git/trees")) return json({ sha: "e".repeat(40) });
        if (url.pathname.endsWith("/git/commits")) return json({ sha: "f".repeat(40) });
        if (url.pathname.endsWith("/git/refs/heads/main")) return json({}, failBranch ? 422 : 200);
        throw new Error(`Unexpected outbound request: ${url.pathname}`);
      },
    })
  );
  const db = await mf.getD1Database("DB");
  const migration = (await readFile("migrations/0001_writer.sql", "utf8")) + (await readFile("migrations/0002_draft_trash.sql", "utf8"));
  await db.batch(
    migration
      .split(";")
      .map((sql) => sql.trim())
      .filter(Boolean)
      .map((sql) => db.prepare(sql))
  );
  auth = await login();
});
after(async () => {
  await mf?.dispose();
});

async function login({ stateOverride, cookieOverride } = {}) {
  const start = await mf.dispatchFetch(`${origin}/auth/login`, { redirect: "manual" });
  assert.equal(start.status, 302, await start.clone().text());
  const destination = new URL(start.headers.get("Location"));
  assert.equal(destination.searchParams.get("scope"), "public_repo");
  assert.equal(destination.searchParams.get("code_challenge_method"), "S256");
  const cookie = cookieOverride ?? start.headers.get("Set-Cookie").split(";")[0];
  const callback = await mf.dispatchFetch(`${origin}/auth/callback?code=test-code&state=${stateOverride ?? destination.searchParams.get("state")}`, {
    redirect: "manual",
    headers: { Cookie: cookie },
  });
  const cookies = callback.headers.getSetCookie();
  const sessionCookie = cookies.find((value) => value.startsWith("writer_session="))?.split(";")[0];
  if (!sessionCookie) return { response: callback };
  assert.match(
    cookies.find((value) => value.startsWith("writer_session=")),
    /HttpOnly; SameSite=Lax; Max-Age=\d+; Secure/
  );
  const session = await mf.dispatchFetch(`${origin}/api/session`, { headers: { Cookie: sessionCookie } });
  const data = await session.json();
  return { cookie: sessionCookie, csrf: data.csrf, response: callback };
}
function request(path, { method = "GET", data, headers = {}, body } = {}) {
  return mf.dispatchFetch(`${origin}${path}`, {
    method,
    headers: { Cookie: auth.cookie, Origin: origin, "X-CSRF-Token": auth.csrf, ...(data ? { "Content-Type": "application/json" } : {}), ...headers },
    body: data ? JSON.stringify(data) : body,
  });
}
function document(overrides = {}) {
  return {
    title: "A Korean 글",
    description: "A useful summary",
    date: "2026-10-09",
    slug: `test-${crypto.randomUUID().slice(0, 8)}`,
    category: "study-log/dev",
    tags: ["astro", "기록"],
    body: "## Hello\n\nA new post.",
    metadata: {},
    sourcePath: null,
    sourceSha: null,
    ...overrides,
  };
}
async function create(doc = document()) {
  const response = await request("/api/drafts", { method: "POST", data: { document: doc } });
  assert.equal(response.status, 201);
  return response.json();
}

test("private drafts and media cannot be read without a session", async () => {
  const value = await create();
  for (const path of ["/api/session", "/api/site-settings", "/api/drafts", `/api/drafts/${value.id}`, `/api/media/${crypto.randomUUID()}`]) {
    const response = await mf.dispatchFetch(`${origin}${path}`);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
});
test("OAuth rejects mismatched state, tampered cookie, and other GitHub accounts", async () => {
  const wrongState = await login({ stateOverride: "wrong-state" });
  assert.equal(wrongState.response.headers.get("Location"), "/?login=failed");
  const tampered = await login({ cookieOverride: "writer_oauth=invalid" });
  assert.equal(tampered.response.headers.get("Location"), "/?login=failed");
  ownerId = 1234;
  try {
    const wrongOwner = await login();
    assert.equal(wrongOwner.response.headers.get("Location"), "/?login=owner-only");
    assert.equal(wrongOwner.cookie, undefined);
  } finally {
    ownerId = 170924802;
  }
});
test("cross-site and missing-CSRF mutations are denied", async () => {
  for (const headers of [{ Origin: "https://evil.example" }, { "X-CSRF-Token": "" }]) {
    const response = await request("/api/drafts", { method: "POST", data: { document: document() }, headers });
    assert.equal(response.status, 403);
  }
});
test("concurrent edits preserve the first saved revision", async () => {
  const value = await create();
  const first = await request(`/api/drafts/${value.id}`, {
    method: "PUT",
    data: { version: value.version, document: { ...value.document, title: "First device" } },
  });
  assert.equal(first.status, 200);
  const second = await request(`/api/drafts/${value.id}`, {
    method: "PUT",
    data: { version: value.version, document: { ...value.document, title: "Second device" } },
  });
  assert.equal(second.status, 409);
  const latest = await (await request(`/api/drafts/${value.id}`)).json();
  assert.equal(latest.document.title, "First device");
});
test("editing an existing post preserves its path and unrelated metadata", async () => {
  const opened = await request("/api/posts/open", { method: "POST", data: { path: sourcePath } });
  assert.equal(opened.status, 200);
  const value = await opened.json();
  assert.equal(value.document.metadata.giscus_comments, false);
  assert.equal(value.document.metadata.series, "Notes");
  const saved = await (
    await request(`/api/drafts/${value.id}`, {
      method: "PUT",
      data: { version: value.version, document: { ...value.document, title: "Updated title" } },
    })
  ).json();
  calls = [];
  const published = await request(`/api/drafts/${value.id}/publish`, { method: "POST", data: { version: saved.version } });
  assert.equal(published.status, 200);
  const result = await published.json();
  assert.equal(result.path, sourcePath);
  assert.equal(result.draft.document.sourceSha, "d".repeat(40));
  const markdown = calls.find((call) => call.path.endsWith("/git/blobs") && call.data.encoding === "utf-8").data.content;
  assert.match(markdown, /giscus_comments: false/);
  assert.match(markdown, /series: Notes/);
  assert.equal(await prettier.check(markdown, { parser: "markdown", printWidth: 150, trailingComma: "es5" }), true);
});
test("publication commits the post and referenced images together, leaving unused images private", async () => {
  const value = await create();
  const image = async () =>
    (
      await request(`/api/drafts/${value.id}/media`, {
        method: "POST",
        headers: { "Content-Type": "image/png" },
        body: Uint8Array.from([137, 80, 78, 71]),
      })
    ).json();
  const used = await image();
  const unused = await image();
  const anon = await mf.dispatchFetch(`${origin}${used.url}`);
  assert.equal(anon.status, 401);
  const privateImage = await request(used.url);
  assert.equal(privateImage.headers.get("Content-Type"), "image/png");
  assert.deepEqual([...new Uint8Array(await privateImage.arrayBuffer())], [137, 80, 78, 71]);
  const saved = await (
    await request(`/api/drafts/${value.id}`, {
      method: "PUT",
      data: { version: value.version, document: { ...value.document, body: `![image](${used.url})` } },
    })
  ).json();
  calls = [];
  const published = await request(`/api/drafts/${value.id}/publish`, { method: "POST", data: { version: saved.version } });
  assert.equal(published.status, 200);
  const tree = calls.find((call) => call.path.endsWith("/git/trees") && call.method === "POST").data.tree;
  assert.equal(tree.length, 2);
  assert.ok(tree.some((file) => file.path.endsWith(`${used.url.split("/").at(-1)}.png`)));
  assert.ok(!JSON.stringify(tree).includes(unused.url.split("/").at(-1)));
  const branch = calls.find((call) => call.path.endsWith("/git/refs/heads/main"));
  assert.equal(branch.data.force, false);
  const content = calls.find((call) => call.path.endsWith("/git/blobs") && call.data.encoding === "utf-8").data.content;
  assert.ok(!content.includes("/api/media/"));
  assert.match(content, /\/assets\/img\/posts\//);
});
test("invalid posts do not write to GitHub, and concurrent branch updates leave drafts recoverable", async () => {
  const value = await create(document({ date: "2026-13-90" }));
  calls = [];
  const invalid = await request(`/api/drafts/${value.id}/publish`, { method: "POST", data: { version: value.version } });
  assert.equal(invalid.status, 422);
  assert.equal(calls.length, 0);
  const valid = await create();
  failBranch = true;
  try {
    const result = await request(`/api/drafts/${valid.id}/publish`, { method: "POST", data: { version: valid.version } });
    assert.equal(result.status, 409);
  } finally {
    failBranch = false;
  }
  const retry = await request(`/api/drafts/${valid.id}/publish`, { method: "POST", data: { version: valid.version } });
  assert.equal(retry.status, 200);
});
test("the blog can use bearer sessions without cross-site cookies, while other origins are blocked", async () => {
  const token = auth.cookie.split("=")[1];
  const response = await mf.dispatchFetch(`${origin}/api/session`, {
    headers: { Origin: "https://0xnefertt.github.io", Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://0xnefertt.github.io");
  const preflight = await mf.dispatchFetch(`${origin}/api/drafts`, {
    method: "OPTIONS",
    headers: { Origin: "https://0xnefertt.github.io", "Access-Control-Request-Headers": "authorization,content-type,x-csrf-token" },
  });
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get("Access-Control-Allow-Headers"), /Authorization/);
  const blocked = await mf.dispatchFetch(`${origin}/api/drafts`, { method: "OPTIONS", headers: { Origin: "https://evil.example" } });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.headers.get("Access-Control-Allow-Origin"), null);
});
test("site login returns to the fixed admin address with its client nonce", async () => {
  const nonce = crypto.randomUUID();
  const start = await mf.dispatchFetch(`${origin}/auth/login?editor=site&client_state=${nonce}&redirect=https://evil.example`, {
    redirect: "manual",
  });
  const authorization = new URL(start.headers.get("Location"));
  const callback = await mf.dispatchFetch(`${origin}/auth/callback?code=test-code&state=${authorization.searchParams.get("state")}`, {
    redirect: "manual",
    headers: { Cookie: start.headers.get("Set-Cookie").split(";")[0] },
  });
  const target = new URL(callback.headers.get("Location"));
  assert.ok(!callback.headers.getSetCookie().some((value) => value.startsWith("writer_session=")));
  assert.equal(target.origin, "https://0xnefertt.github.io");
  assert.equal(target.pathname, "/admin/");
  const fragment = new URLSearchParams(target.hash.slice(1));
  assert.equal(fragment.get("state"), nonce);
  assert.match(fragment.get("session"), /^[a-f0-9]{64}$/);
});
test("category edits retain the original file and record old category routes", async () => {
  const opened = await (await request("/api/posts/open", { method: "POST", data: { path: sourcePath } })).json();
  await (await mf.getD1Database("DB")).prepare("DELETE FROM drafts WHERE id = ?").bind(opened.id).run();
  const fresh = await (await request("/api/posts/open", { method: "POST", data: { path: sourcePath } })).json();
  const updated = await request(`/api/drafts/${fresh.id}`, {
    method: "PUT",
    data: { version: fresh.version, document: { ...fresh.document, category: "life-thoughts/retrospect" } },
  });
  assert.equal(updated.status, 200);
  const saved = await updated.json();
  const published = await request(`/api/drafts/${fresh.id}/publish`, { method: "POST", data: { version: saved.version } });
  assert.equal(published.status, 200);
  const result = await published.json();
  assert.equal(result.path, sourcePath);
  assert.equal(result.draft.document.category, "life-thoughts/retrospect");
  assert.deepEqual(result.draft.document.metadata.categories, ["life-thoughts/retrospect"]);
  assert.ok(result.draft.document.metadata.legacy_categories.includes("study-log/dev"));
});

test("settings load existing favorites and category usage only for the owner", async () => {
  const response = await request("/api/site-settings");
  assert.equal(response.status, 200);
  const value = await response.json();
  assert.equal(value.sha, settingsSha);
  assert.deepEqual(value.settings.favorites, configuredSettings.favorites);
  assert.ok(value.usage["study-log/dev"] >= 1);
});
test("settings save writes only configuration atomically and refuses stale revisions", async () => {
  const settings = structuredClone(configuredSettings);
  settings.categories[0].name = "Development notes";
  settings.categories[0].name_ko = "개발 기록";
  settings.categories[0].children[0].name_ko = "개발 이야기";
  settings.favorites.reverse();
  settings.favorites.push({ name: "New group", items: [{ title: "Example", href: "https://example.com", note: "A note" }] });
  calls = [];
  const result = await request("/api/site-settings", { method: "PUT", data: { settings, sha: settingsSha } });
  assert.equal(result.status, 200, await result.clone().text());
  const tree = calls.find((call) => call.path.endsWith("/git/trees") && call.method === "POST");
  assert.deepEqual(
    tree.data.tree.map((entry) => entry.path),
    ["_data/site-settings.json"]
  );
  const content = calls.find((call) => call.path.endsWith("/git/blobs") && call.method === "POST").data.content;
  assert.equal(await prettier.check(content, { parser: "json", printWidth: 150, trailingComma: "es5" }), true);
  const parsed = JSON.parse(content);
  assert.equal(parsed.categories[0].name, "Development notes");
  assert.equal(parsed.categories[0].name_ko, "개발 기록");
  assert.equal(parsed.categories[0].children[0].name_ko, "개발 이야기");
  assert.equal(parsed.categories[0].children[0].slug, "dev");
  assert.equal(parsed.favorites.at(-1).items[0].href, "https://example.com");
  assert.equal(calls.find((call) => call.method === "PATCH").data.force, false);
  calls = [];
  assert.equal((await request("/api/site-settings", { method: "PUT", data: { settings, sha: "0".repeat(40) } })).status, 409);
  assert.ok(!calls.some((call) => call.path.endsWith("/git/blobs") && call.method === "POST"));
});
test("settings reject unsafe links, duplicate slugs, deleted used categories, and CSRF", async () => {
  const invalidLink = structuredClone(configuredSettings);
  invalidLink.favorites[0].items[0].href = "javascript:alert(1)";
  const duplicate = structuredClone(configuredSettings);
  duplicate.categories.push(duplicate.categories[0]);
  const removed = structuredClone(configuredSettings);
  removed.categories[0].children = removed.categories[0].children.filter((child) => child.slug !== "dev");
  for (const settings of [invalidLink, duplicate, removed]) {
    calls = [];
    const response = await request("/api/site-settings", { method: "PUT", data: { settings, sha: settingsSha } });
    assert.equal(response.status, 422, await response.clone().text());
    assert.ok(!calls.some((call) => call.path.endsWith("/git/blobs") && call.method === "POST"));
  }
  assert.equal(
    (
      await request("/api/site-settings", {
        method: "PUT",
        data: { settings: configuredSettings, sha: settingsSha },
        headers: { "X-CSRF-Token": "" },
      })
    ).status,
    403
  );
});
test("settings protect categories used by new drafts and handle concurrent branch writes", async () => {
  await create(document({ category: "money-talk/property" }));
  const removed = structuredClone(configuredSettings);
  removed.categories.find((group) => group.slug === "money-talk").children = removed.categories
    .find((group) => group.slug === "money-talk")
    .children.filter((child) => child.slug !== "property");
  assert.equal((await request("/api/site-settings", { method: "PUT", data: { settings: removed, sha: settingsSha } })).status, 422);
  failBranch = true;
  try {
    assert.equal((await request("/api/site-settings", { method: "PUT", data: { settings: configuredSettings, sha: settingsSha } })).status, 409);
  } finally {
    failBranch = false;
  }
});

test("styled HTML and table images publish with referenced media while missing HTML images are rejected", async () => {
  const value = await create();
  const image = await (
    await request(`/api/drafts/${value.id}/media`, {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: Uint8Array.from([137, 80, 78, 71]),
    })
  ).json();
  const body = `<p style="text-align: center"><span style="font-size: 24px">Styled text</span></p><table><tbody><tr><td><img src="${image.url}" alt="Chart"></td></tr></tbody></table>`;
  const saved = await (
    await request(`/api/drafts/${value.id}`, { method: "PUT", data: { version: value.version, document: { ...value.document, body } } })
  ).json();
  calls = [];
  const result = await request(`/api/drafts/${value.id}/publish`, { method: "POST", data: { version: saved.version } });
  assert.equal(result.status, 200, await result.clone().text());
  const output = (await result.json()).draft.document.body;
  assert.match(output, /font-size: 24px/);
  assert.match(output, /text-align: center/);
  assert.ok(output.includes("/assets/img/posts/") && !output.includes("/api/media/"));
  for (const src of ["/assets/img/missing.png", "blob:temporary-image"]) {
    const bad = await create(document({ body: `<img src="${src}">` }));
    calls = [];
    assert.equal((await request(`/api/drafts/${bad.id}/publish`, { method: "POST", data: { version: bad.version } })).status, 422);
    assert.ok(!calls.some((call) => call.path.endsWith("/git/blobs") && call.method === "POST"));
  }
});
test("books and projects have separate authenticated libraries and private drafts", async () => {
  const book = await create(document({ collection: "books", title: "Private book", category: "books-only/private" }));
  const project = await create(document({ collection: "projects", title: "Private project" }));
  for (const [kind, expected] of [
    ["blog", sourcePath],
    ["books", bookPath],
    ["projects", projectPath],
  ]) {
    const response = await request(`/api/posts?collection=${kind}`);
    assert.equal(response.status, 200);
    assert.deepEqual(
      (await response.json()).posts.map((item) => item.path),
      [expected]
    );
    assert.equal((await mf.dispatchFetch(`${origin}/api/posts?collection=${kind}`)).status, 401);
  }
  const books = (await (await request("/api/drafts?collection=books")).json()).drafts;
  const projects = (await (await request("/api/drafts?collection=projects")).json()).drafts;
  assert.ok(books.some((item) => item.id === book.id));
  assert.ok(!books.some((item) => item.id === project.id));
  assert.ok(projects.some((item) => item.id === project.id));
  assert.ok(!(await (await request("/api/drafts")).json()).drafts.some((item) => item.id === book.id));
  assert.equal((await request("/api/posts?collection=pages")).status, 400);
  assert.equal(
    (
      await request(`/api/drafts/${book.id}`, {
        method: "PUT",
        data: { version: book.version, document: { ...book.document, collection: "projects" } },
      })
    ).status,
    400
  );
  const settings = await (await request("/api/site-settings")).json();
  assert.equal(settings.usage["books-only/private"], undefined);
});

test("editing a Unicode book path preserves metadata and updates its review", async () => {
  const opened = await request("/api/posts/open", { method: "POST", data: { path: bookPath } });
  assert.equal(opened.status, 200);
  const value = await opened.json();
  assert.equal(value.document.collection, "books");
  assert.equal(value.document.metadata.isbn, 7539967447);
  const saved = await (
    await request(`/api/drafts/${value.id}`, {
      method: "PUT",
      data: {
        version: value.version,
        document: {
          ...value.document,
          title: "Updated book",
          body: "Updated review.",
          metadata: { ...value.document.metadata, author: "Updated author" },
        },
      },
    })
  ).json();
  calls = [];
  const response = await request(`/api/drafts/${value.id}/publish`, { method: "POST", data: { version: saved.version } });
  assert.equal(response.status, 200, await response.clone().text());
  const result = await response.json();
  assert.equal(result.path, bookPath);
  assert.equal(result.draft.document.collection, "books");
  const content = calls.find((call) => call.path.endsWith("/git/blobs") && call.data.encoding === "utf-8").data.content;
  assert.match(content, /author: Updated author/);
  assert.match(content, /stars: 3/);
  assert.match(content, /isbn: 7539967447/);
  assert.match(content, /finished: 2025-07-14/);
  assert.match(content, /status: Finished/);
  assert.match(content, /custom_marker: keep-this/);
  assert.match(content, /categories: parenting education/);
  assert.match(content, /^date: ['"]?2026-01-07['"]?$/m);
  assert.ok(!/^category_override:|^legacy_categories:/m.test(content));
  assert.match(content, /Updated review/);
});

test("new books record the first publication date without requiring blog fields and reject invalid metadata", async () => {
  const value = await create(
    document({
      collection: "books",
      date: "",
      category: "",
      tags: [],
      body: "",
      description: "",
      metadata: { author: "Book author" },
    })
  );
  calls = [];
  const response = await request(`/api/drafts/${value.id}/publish`, { method: "POST", data: { version: value.version } });
  assert.equal(response.status, 200, await response.clone().text());
  const result = await response.json();
  assert.equal(result.path, `_books/ko/${value.document.slug}.md`);
  assert.equal(result.draft.document.metadata.date, new Date().toISOString().slice(0, 10));
  for (const metadata of [{ stars: 6 }, { finished: "2026-02-30" }, { date: "2026-02-30" }, { buy_link: "javascript:alert(1)" }]) {
    const invalid = await create(document({ collection: "books", metadata }));
    calls = [];
    const response = await request(`/api/drafts/${invalid.id}/publish`, { method: "POST", data: { version: invalid.version } });
    assert.equal(response.status, 422);
    assert.equal(calls.length, 0);
  }
});

test("existing projects keep their URL and convert legacy sections into a freeform body", async () => {
  const response = await request("/api/posts/open", { method: "POST", data: { path: projectPath } });
  assert.equal(response.status, 200);
  const value = await response.json();
  assert.equal(value.document.slug, "2026-05-06-site-platform");
  assert.match(value.document.body, /Original project body/);
  assert.match(value.document.body, /Original highlight/);
  assert.match(value.document.body, /Original lesson/);
  assert.match(value.document.body, /\[Repository\]/);
  assert.ok(!("highlights" in value.document.metadata));
  assert.ok(!("lessons" in value.document.metadata));
  assert.ok(!("links" in value.document.metadata));
  const saved = await (
    await request(`/api/drafts/${value.id}`, {
      method: "PUT",
      data: {
        version: value.version,
        document: {
          ...value.document,
          metadata: {
            ...value.document.metadata,
            role: "Lead developer",
            stack: ["Astro", "Workers"],
            highlights: ["New highlight"],
            links: [{ label: "Demo", url: "https://example.com" }],
          },
        },
      },
    })
  ).json();
  calls = [];
  const published = await request(`/api/drafts/${value.id}/publish`, { method: "POST", data: { version: saved.version } });
  assert.equal(published.status, 200, await published.clone().text());
  const result = await published.json();
  assert.equal(result.path, projectPath);
  assert.equal(result.draft.document.metadata.related_publications, false);
  assert.deepEqual(result.draft.document.metadata.stack, ["Astro", "Workers"]);
  assert.match(result.draft.document.body, /New highlight/);
  assert.match(result.draft.document.body, /\[Demo\]\(https:\/\/example.com\/\)/);
  assert.ok(!("highlights" in result.draft.document.metadata));
  assert.ok(!("lessons" in result.draft.document.metadata));
  assert.ok(!("links" in result.draft.document.metadata));
  assert.equal(calls.find((call) => call.path.endsWith("/git/refs/heads/main")).data.force, false);
});

test("old private project drafts expose legacy content once and save as ordinary body text", async () => {
  const original = document({
    collection: "projects",
    body: "## My own topic\n\n自由롭게 작성한 본문.",
    metadata: {
      highlights: ["A task", "<script>alert(1)</script>"],
      lessons: ["A lesson"],
      links: [{ label: "[Custom link]", url: "https://example.com/a)b" }],
      role: "Developer",
    },
  });
  const value = await create(original);
  const loaded = await (await request(`/api/drafts/${value.id}`)).json();
  assert.match(loaded.document.body, /## My own topic/);
  assert.match(loaded.document.body, /A task/);
  assert.match(loaded.document.body, /A lesson/);
  assert.ok(loaded.document.body.includes("\\<script\\>alert(1)\\</script\\>"));
  assert.ok(loaded.document.body.includes("[\\[Custom link\\]](<https://example.com/a)b>)"));
  assert.equal(loaded.document.metadata.role, "Developer");
  assert.ok(!("links" in loaded.document.metadata));
  const saved = await request(`/api/drafts/${value.id}`, { method: "PUT", data: { version: value.version, document: loaded.document } });
  assert.equal(saved.status, 200);
  const reloaded = await (await request(`/api/drafts/${value.id}`)).json();
  assert.equal(reloaded.document.body, loaded.document.body);
  const published = await request(`/api/drafts/${value.id}/publish`, { method: "POST", data: { version: reloaded.version } });
  assert.equal(published.status, 200, await published.clone().text());
  const result = await published.json();
  assert.ok(!("highlights" in result.draft.document.metadata));
  assert.ok(!("lessons" in result.draft.document.metadata));
  assert.ok(!("links" in result.draft.document.metadata));
  assert.equal(result.draft.document.body.split("A task").length, 2);
});

test("project cover attachments publish atomically and unsafe paths and links are rejected", async () => {
  const value = await create(document({ collection: "projects" }));
  const image = await (
    await request(`/api/drafts/${value.id}/media`, {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: Uint8Array.from([137, 80, 78, 71]),
    })
  ).json();
  const saved = await (
    await request(`/api/drafts/${value.id}`, {
      method: "PUT",
      data: { version: value.version, document: { ...value.document, metadata: { img: image.url } } },
    })
  ).json();
  calls = [];
  const published = await request(`/api/drafts/${value.id}/publish`, { method: "POST", data: { version: saved.version } });
  assert.equal(published.status, 200, await published.clone().text());
  const result = await published.json();
  assert.match(result.draft.document.metadata.img, /^\/assets\/img\/projects\//);
  const tree = calls.find((call) => call.path.endsWith("/git/trees") && call.method === "POST").data.tree;
  assert.equal(tree.length, 2);
  assert.ok(tree.some((file) => file.path.startsWith("_projects/")));
  assert.ok(tree.some((file) => file.path.startsWith("astro/public/assets/img/projects/")));
  const invalid = await create(document({ collection: "projects", metadata: { links: [{ label: "Unsafe", url: "javascript:alert(1)" }] } }));
  calls = [];
  assert.equal((await request(`/api/drafts/${invalid.id}/publish`, { method: "POST", data: { version: invalid.version } })).status, 422);
  assert.equal(calls.length, 0);
  for (const path of ["_books/../_pages/about.md", "_pages/privacy.md", "_projects/../../README.md"]) {
    assert.equal((await request("/api/posts/open", { method: "POST", data: { path } })).status, 400);
  }
});

test("about editing keeps one working copy, preserves home settings and publishes profile photos atomically", async () => {
  const library = await (await request("/api/posts?collection=about")).json();
  assert.deepEqual(
    library.posts.map((post) => post.path),
    [aboutPath, aboutKoPath]
  );
  for (const path of ["_pages/privacy.md", "_pages/../about.md", "_pages/about-copy.md"]) {
    assert.equal((await request("/api/posts/open", { method: "POST", data: { path } })).status, 400);
  }
  assert.equal((await request("/api/drafts", { method: "POST", data: { document: document({ collection: "about" }) } })).status, 400);
  const opened = await request("/api/posts/open", { method: "POST", data: { path: aboutPath } });
  assert.equal(opened.status, 200);
  let value = await opened.json();
  const original = value.document;
  assert.equal(original.collection, "about");
  assert.equal(original.date, "");
  assert.equal(original.slug, "about");
  assert.equal((await (await request("/api/posts/open", { method: "POST", data: { path: aboutPath } })).json()).id, value.id);
  const originalProfile = original.metadata.profile;
  async function update(metadata) {
    const response = await request(`/api/drafts/${value.id}`, {
      method: "PUT",
      data: { version: value.version, document: { ...original, body: "## Updated introduction\n\nA new profile body.", metadata } },
    });
    assert.equal(response.status, 200, await response.clone().text());
    value = await response.json();
  }
  for (const metadata of [
    { ...original.metadata, permalink: "/other/" },
    { ...original.metadata, profile: [] },
    { ...original.metadata, profile: { ...originalProfile, image: "javascript:alert(1)" } },
    { ...original.metadata, profile: { ...originalProfile, image: "../private.png" } },
  ]) {
    await update(metadata);
    calls = [];
    assert.equal((await request(`/api/drafts/${value.id}/publish`, { method: "POST", data: { version: value.version } })).status, 422);
    assert.equal(calls.length, 0);
  }
  for (const image of [`/api/media/${crypto.randomUUID()}`, "/assets/img/missing-profile.jpg"]) {
    await update({ ...original.metadata, profile: { ...originalProfile, image } });
    calls = [];
    assert.equal((await request(`/api/drafts/${value.id}/publish`, { method: "POST", data: { version: value.version } })).status, 422);
    assert.ok(!calls.some((call) => call.method !== "GET" && !(call.path === "/graphql" && /^query\b/.test(call.data.query))));
  }
  const imageResponse = await request(`/api/drafts/${value.id}/media`, {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: Uint8Array.from([137, 80, 78, 71]),
  });
  assert.equal(imageResponse.status, 201);
  const image = await imageResponse.json();
  await update({
    ...original.metadata,
    subtitle: "New subtitle",
    profile: { ...originalProfile, name: "New name", location: "Seoul", bio: "New short bio", image: image.url },
  });
  const stale = await request(`/api/drafts/${value.id}`, { method: "PUT", data: { version: value.version - 1, document: value.document } });
  assert.equal(stale.status, 409);
  const listing = await (await request("/api/drafts?collection=about")).json();
  assert.deepEqual(
    listing.drafts.map((draft) => draft.id),
    [value.id]
  );
  calls = [];
  const published = await request(`/api/drafts/${value.id}/publish`, { method: "POST", data: { version: value.version } });
  assert.equal(published.status, 200, await published.clone().text());
  const result = await published.json();
  assert.equal(result.path, aboutPath);
  assert.equal(result.draft.document.collection, "about");
  const metadata = result.draft.document.metadata;
  assert.match(metadata.profile.image, /^\/assets\/img\/about\//);
  assert.equal(metadata.profile.name, "New name");
  assert.equal(metadata.profile.align, originalProfile.align);
  assert.equal(metadata.profile.image_circular, originalProfile.image_circular);
  assert.equal(metadata.profile.more_info, originalProfile.more_info);
  assert.deepEqual(metadata.useful_info, original.metadata.useful_info);
  assert.deepEqual(metadata.latest_posts, original.metadata.latest_posts);
  assert.equal(metadata.permalink, "/");
  assert.equal(metadata.layout, "about");
  assert.ok(!("date" in metadata));
  const tree = calls.find((call) => call.path.endsWith("/git/trees") && call.method === "POST").data.tree;
  assert.equal(tree.length, 2);
  assert.ok(tree.some((file) => file.path === aboutPath));
  assert.ok(tree.some((file) => file.path.startsWith("astro/public/assets/img/about/")));
  assert.equal(calls.find((call) => call.path.endsWith("/git/refs/heads/main")).data.force, false);
});

test("English translations may share a Korean slug, while duplicate translation groups and language changes are rejected", async () => {
  const opened = await (await request("/api/posts/open", { method: "POST", data: { path: sourcePath } })).json();
  const original = opened.document;
  const languageChange = await request(`/api/drafts/${opened.id}`, {
    method: "PUT",
    data: { version: opened.version, document: { ...original, metadata: { ...original.metadata, lang: "en" } } },
  });
  assert.equal(languageChange.status, 400);
  const english = await create(
    document({
      title: "English translation",
      date: original.date,
      slug: original.slug,
      metadata: { lang: "en", translation_key: original.metadata.translation_key },
    })
  );
  const published = await request(`/api/drafts/${english.id}/publish`, { method: "POST", data: { version: english.version } });
  assert.equal(published.status, 200, await published.clone().text());
  const result = await published.json();
  assert.equal(result.path, "_posts/en/study-log/dev/2026-01-01-existing.md");
  assert.equal(result.draft.document.metadata.lang, "en");
  const duplicate = await create(document({ metadata: { lang: "ko", translation_key: original.metadata.translation_key } }));
  calls = [];
  assert.equal((await request(`/api/drafts/${duplicate.id}/publish`, { method: "POST", data: { version: duplicate.version } })).status, 409);
  assert.ok(!calls.some((call) => call.method === "POST" && call.path.endsWith("/git/blobs")));
  assert.equal((await request("/api/drafts", { method: "POST", data: { document: document({ metadata: { lang: "fr" } }) } })).status, 422);
});

test("Korean About edits its own source and profile without changing English About", async () => {
  const value = await (await request("/api/posts/open", { method: "POST", data: { path: aboutKoPath } })).json();
  assert.equal(value.document.metadata.lang, "ko");
  assert.equal(value.document.metadata.permalink, "/ko/");
  const saved = await (
    await request(`/api/drafts/${value.id}`, {
      method: "PUT",
      data: {
        version: value.version,
        document: {
          ...value.document,
          body: "수정된 한국어 소개",
          metadata: { ...value.document.metadata, profile: { ...value.document.metadata.profile, bio: "새 소개" } },
        },
      },
    })
  ).json();
  calls = [];
  const result = await request(`/api/drafts/${value.id}/publish`, { method: "POST", data: { version: saved.version } });
  assert.equal(result.status, 200, await result.clone().text());
  const tree = calls.find((call) => call.path.endsWith("/git/trees") && call.method === "POST").data.tree;
  assert.ok(tree.some((file) => file.path === aboutKoPath));
  assert.ok(!tree.some((file) => file.path === aboutPath));
});

test("trash preserves private attachments and the document, hides active access, and restores them with revision protection", async () => {
  const value = await create(document({ collection: "books", title: "Private review" }));
  const media = await (
    await request(`/api/drafts/${value.id}/media`, {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: Uint8Array.from([137, 80, 78, 71]),
    })
  ).json();
  const saved = await (
    await request(`/api/drafts/${value.id}`, {
      method: "PUT",
      data: { version: value.version, document: { ...value.document, metadata: { cover: media.url } } },
    })
  ).json();
  for (const headers of [{ Origin: "https://evil.example" }, { "X-CSRF-Token": "" }]) {
    assert.equal((await request(`/api/drafts/${value.id}`, { method: "DELETE", data: { version: saved.version }, headers })).status, 403);
  }
  assert.equal((await request(`/api/drafts/${value.id}`, { method: "DELETE", data: { version: value.version } })).status, 409);
  const db = await mf.getD1Database("DB");
  await db
    .prepare("UPDATE drafts SET publishing = ? WHERE id = ?")
    .bind(Date.now() + 600000, value.id)
    .run();
  assert.equal((await request(`/api/drafts/${value.id}`, { method: "DELETE", data: { version: saved.version } })).status, 409);
  await db.prepare("UPDATE drafts SET publishing = 0 WHERE id = ?").bind(value.id).run();
  calls = [];
  assert.equal((await request(`/api/drafts/${value.id}`, { method: "DELETE", data: { version: saved.version } })).status, 200);
  assert.equal((await request(`/api/drafts/${value.id}`)).status, 404);
  assert.equal((await request(media.url)).status, 404);
  assert.equal((await request(`/api/drafts/${value.id}/publish`, { method: "POST", data: { version: saved.version } })).status, 404);
  const active = await (await request("/api/drafts?collection=books")).json();
  assert.ok(!active.drafts.some((d) => d.id === value.id));
  const trash = await (await request("/api/drafts?collection=books&trash=1")).json();
  const item = trash.drafts.find((d) => d.id === value.id);
  assert.ok(item);
  assert.equal((await request(`/api/drafts/${value.id}/restore`, { method: "POST", data: { version: saved.version } })).status, 409);
  const restored = await (await request(`/api/drafts/${value.id}/restore`, { method: "POST", data: { version: item.version } })).json();
  assert.deepEqual(restored.document, saved.document);
  assert.equal((await request(media.url)).status, 200);
  assert.ok(!calls.some((call) => call.path.includes("/git/")));
});

test("trashing a published working copy keeps GitHub content and refuses restoration over a new active working copy", async () => {
  const opened = await (await request("/api/posts/open", { method: "POST", data: { path: bookPath } })).json();
  calls = [];
  assert.equal((await request(`/api/drafts/${opened.id}`, { method: "DELETE", data: { version: opened.version } })).status, 200);
  assert.equal(calls.length, 0);
  const fresh = await (await request("/api/posts/open", { method: "POST", data: { path: bookPath } })).json();
  assert.notEqual(fresh.id, opened.id);
  assert.equal(fresh.document.sourcePath, bookPath);
  const trash = await (await request("/api/drafts?collection=books&trash=1")).json();
  const archived = trash.drafts.find((d) => d.id === opened.id);
  assert.equal((await request(`/api/drafts/${opened.id}/restore`, { method: "POST", data: { version: archived.version } })).status, 409);
});

test("logout invalidates the server session", async () => {
  const response = await request("/api/logout", { method: "POST" });
  assert.equal(response.status, 200);
  const session = await request("/api/session");
  assert.equal(session.status, 401);
});
