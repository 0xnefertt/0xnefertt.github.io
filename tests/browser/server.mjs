// Loopback-only test harness. Real Worker/D1 and built UI; GitHub never receives requests.
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { build } from "../../writer/node_modules/esbuild/lib/main.js";
import { Miniflare, convertV4MiniflareOptions } from "../../writer/node_modules/miniflare/dist/src/index.js";

const siteOrigin = "http://127.0.0.1:4321";
const apiOrigin = "http://127.0.0.1:8789";
const root = process.cwd();
const blobs = new Map();
const trees = new Map();
const commits = new Map();
const hash = (value) => createHash("sha1").update(value).digest("hex");
const store = (content) => {
  const sha = hash(content);
  blobs.set(sha, Buffer.from(content));
  return sha;
};
const settings = await readFile("_data/site-settings.json");
const initialTree = [{ path: "_data/site-settings.json", type: "blob", sha: store(settings) }];
const initialTreeSha = hash(JSON.stringify(initialTree));
trees.set(initialTreeSha, initialTree);
let head = hash("initial-commit");
commits.set(head, { tree: { sha: initialTreeSha } });
let publications = 0;

async function github(request) {
  const url = new URL(request.url);
  const data = request.method === "GET" ? null : await request.json();
  const json = (value, status = 200) => Response.json(value, { status });
  if (url.hostname === "github.com" && url.pathname === "/login/oauth/access_token")
    return json({ access_token: "fixture-token", scope: "public_repo" });
  if (url.hostname !== "api.github.com") throw new Error("Unexpected external host");
  if (url.pathname === "/user") return json({ id: 170924802, login: "fixture-owner" });
  if (url.pathname.endsWith("/git/ref/heads/main")) return json({ object: { sha: head } });
  if (/\/git\/commits\/[^/]+$/.test(url.pathname)) return json(commits.get(url.pathname.split("/").at(-1)));
  if (/\/git\/trees\/[^/]+$/.test(url.pathname)) return json({ truncated: false, tree: trees.get(url.pathname.split("/").at(-1)) });
  if (/\/git\/blobs\/[^/]+$/.test(url.pathname)) {
    const bytes = blobs.get(url.pathname.split("/").at(-1));
    return json({ content: bytes.toString("base64"), size: bytes.length });
  }
  if (url.pathname === "/graphql") {
    const files = trees.get(commits.get(head).tree.sha);
    return json({
      data: {
        repository: Object.fromEntries(
          Object.entries(data.variables)
            .filter(([key]) => /^p\d+$/.test(key))
            .map(([key, value]) => {
              const file = files.find((file) => file.path === value.split(":").slice(1).join(":"));
              return [key, file ? { text: blobs.get(file.sha).toString() } : null];
            })
        ),
      },
    });
  }
  if (url.pathname.includes("/contents/")) {
    const file = trees.get(commits.get(head).tree.sha).find((file) => file.path === decodeURIComponent(url.pathname.split("/contents/")[1]));
    if (!file) return json({}, 404);
    const bytes = blobs.get(file.sha);
    return json({ content: bytes.toString("base64"), size: bytes.length, sha: file.sha });
  }
  if (url.pathname.endsWith("/git/blobs")) return json({ sha: store(Buffer.from(data.content, data.encoding === "base64" ? "base64" : "utf8")) });
  if (url.pathname.endsWith("/git/trees")) {
    const files = new Map(trees.get(data.base_tree).map((file) => [file.path, file]));
    for (const file of data.tree) files.set(file.path, file);
    const tree = [...files.values()];
    const sha = hash(JSON.stringify(tree));
    trees.set(sha, tree);
    return json({ sha });
  }
  if (url.pathname.endsWith("/git/commits")) {
    const sha = hash(JSON.stringify(data));
    commits.set(sha, { tree: { sha: data.tree } });
    return json({ sha });
  }
  if (url.pathname.endsWith("/git/refs/heads/main") && request.method === "PATCH") {
    if (data.force) throw new Error("Force push in fixture");
    head = data.sha;
    publications++;
    return json({});
  }
  throw new Error(`Unhandled GitHub fixture endpoint: ${url.pathname}`);
}

await mkdir("writer/.test-build", { recursive: true });
await build({
  entryPoints: ["writer/src/worker.ts"],
  outfile: "writer/.test-build/browser-worker.mjs",
  bundle: true,
  format: "esm",
  platform: "neutral",
  conditions: ["workerd", "import", "default"],
  external: ["node:crypto"],
  target: "es2022",
});
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    scriptPath: "writer/.test-build/browser-worker.mjs",
    compatibilityDate: "2026-10-09",
    compatibilityFlags: ["nodejs_compat"],
    bindings: {
      SITE_URL: siteOrigin,
      GITHUB_REPOSITORY: "fixture/blog",
      GITHUB_BRANCH: "main",
      OWNER_ID: "170924802",
      GITHUB_CLIENT_ID: "fixture-client",
      GITHUB_CLIENT_SECRET: "fixture-secret",
      SESSION_SECRET: "fixture-session-secret-at-least-32-characters",
    },
    d1Databases: { DB: "browser-test-db" },
    serviceBindings: { ASSETS: () => new Response("Test only") },
    outboundService: github,
  })
);
const db = await mf.getD1Database("DB");
for (const name of ["0001_writer.sql", "0002_draft_trash.sql", "0003_media_chunks.sql"]) {
  const sql = await readFile(`writer/migrations/${name}`, "utf8");
  await db.batch(
    sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => db.prepare(s))
  );
}
const api = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, apiOrigin);
    if (url.pathname === "/test/oauth") {
      res.writeHead(302, { Location: `/auth/callback?code=fixture&state=${encodeURIComponent(url.searchParams.get("state"))}` }).end();
      return;
    }
    if (url.pathname === "/test/state") {
      const files = trees.get(commits.get(head).tree.sha).filter((file) => file.path.startsWith("_posts/"));
      res
        .writeHead(200, { "Content-Type": "application/json" })
        .end(JSON.stringify({ publications, posts: files.map((file) => ({ path: file.path, content: blobs.get(file.sha).toString() })) }));
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const response = await mf.dispatchFetch(url, {
      method: req.method,
      headers: req.headers,
      ...(chunks.length ? { body: Buffer.concat(chunks) } : {}),
      redirect: "manual",
    });
    const headers = Object.fromEntries(response.headers);
    if (response.headers.getSetCookie().length) headers["set-cookie"] = response.headers.getSetCookie();
    if (url.pathname === "/auth/login" && response.status === 302) {
      const provider = new URL(headers.location);
      headers.location = `/test/oauth?state=${encodeURIComponent(provider.searchParams.get("state"))}`;
    }
    res.writeHead(response.status, headers).end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    res.writeHead(500).end("Fixture error");
  }
});
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".xml": "application/xml",
};
const site = createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, siteOrigin).pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const file = path.resolve(root, "astro/dist", `.${pathname}`);
    if (!file.startsWith(path.join(root, "astro/dist") + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    let body = await readFile(file);
    if (pathname === "/admin/index.html")
      body = Buffer.from(body.toString().replaceAll("https://nefertt-writer.0xnefertt-writer.workers.dev", apiOrigin));
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
});
await Promise.all([
  new Promise((resolve) => api.listen(8789, "127.0.0.1", resolve)),
  new Promise((resolve) => site.listen(4321, "127.0.0.1", resolve)),
]);
console.log("Browser fixture ready on http://127.0.0.1:4321 (GitHub simulated; D1 ephemeral)");
async function stop() {
  site.close();
  api.close();
  await mf.dispose();
  process.exit(0);
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
