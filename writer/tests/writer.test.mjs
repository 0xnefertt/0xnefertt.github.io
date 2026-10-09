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
let mf;
let ownerId = 170924802;
let failBranch = false;
let calls = [];
let auth;

before(async () => {
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
          return json({ truncated: false, tree: [{ path: sourcePath, sha: originalSha, type: "blob" }] });
        if (url.pathname.includes("/contents/"))
          return json({ content: Buffer.from(existing).toString("base64"), sha: originalSha, size: existing.length });
        if (url.pathname.endsWith("/git/blobs")) return json({ sha: "d".repeat(40) });
        if (url.pathname.endsWith("/git/trees")) return json({ sha: "e".repeat(40) });
        if (url.pathname.endsWith("/git/commits")) return json({ sha: "f".repeat(40) });
        if (url.pathname.endsWith("/git/refs/heads/main")) return json({}, failBranch ? 422 : 200);
        throw new Error(`Unexpected outbound request: ${url.pathname}`);
      },
    })
  );
  const db = await mf.getD1Database("DB");
  const migration = await readFile("migrations/0001_writer.sql", "utf8");
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
  for (const path of ["/api/session", "/api/drafts", `/api/drafts/${value.id}`, `/api/media/${crypto.randomUUID()}`]) {
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
test("logout invalidates the server session", async () => {
  const response = await request("/api/logout", { method: "POST" });
  assert.equal(response.status, 200);
  const session = await request("/api/session");
  assert.equal(session.status, 401);
});
