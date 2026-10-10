import { timingSafeEqual } from "node:crypto";
import { boundedBody, github, publishPost, readPost, repositoryTree, readDocuments, type MediaFile } from "./github";
import {
  HttpError,
  validateDocument,
  contentCollection,
  documentCollection,
  isContentPath,
  pathCollection,
  contentImages,
  editableDocument,
  documentLanguage,
  type Draft,
  type PostDocument,
} from "./model";
import { getSiteSettings, saveSiteSettings } from "./settings-github";

const SESSION_SECONDS = 60 * 60 * 24 * 7;
const IMAGE_LIMIT = 1024 * 1024;
const COOKIE = "writer_session";
interface Session {
  id: string;
  token: string;
  csrf: string;
  expires: number;
}
interface DraftRow {
  id: string;
  document: string;
  version: number;
  updated: string;
  publishing: number;
}

function random(): string {
  return crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
}
function equals(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const first = encoder.encode(a);
  const second = encoder.encode(b);
  return first.byteLength === second.byteLength && timingSafeEqual(first, second);
}
async function digest(value: string): Promise<string> {
  return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
async function key(secret: string) {
  return crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
async function seal(value: string, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(secret), new TextEncoder().encode(value));
  return `${btoa(String.fromCharCode(...iv))}.${btoa(String.fromCharCode(...new Uint8Array(bytes)))}`;
}
async function unseal(value: string, secret: string): Promise<string> {
  const [iv, data] = value.split(".");
  const bytes = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: Uint8Array.from(atob(iv), (c) => c.charCodeAt(0)) },
    await key(secret),
    Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
  );
  return new TextDecoder().decode(bytes);
}
function cookieValue(request: Request, name: string): string {
  return (
    request.headers
      .get("Cookie")
      ?.split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? ""
  );
}
function cookie(request: Request, name: string, value: string, seconds: number): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${secure}`;
}
function json(value: unknown, status = 200): Response {
  return Response.json(value, { status });
}
function redirect(path: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: path });
  for (const value of cookies) headers.append("Set-Cookie", value);
  return new Response(null, { status: 302, headers });
}
function configured(env: Env): boolean {
  return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.SESSION_SECRET?.length >= 32 && /^\d+$/.test(env.OWNER_ID));
}
async function session(request: Request, env: Env): Promise<Session> {
  const bearer = request.headers.get("Authorization")?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  const value = bearer ?? cookieValue(request, COOKIE);
  if (!/^[a-f0-9]{64}$/.test(value)) throw new HttpError(401, "로그인이 필요합니다.");
  const row = await env.DB.prepare("SELECT * FROM sessions WHERE id = ? AND expires > ?")
    .bind(await digest(value), Date.now())
    .first<Session>();
  if (!row) throw new HttpError(401, "로그인이 만료되었습니다. 다시 로그인해 주세요.");
  return { ...row, token: await unseal(row.token, env.SESSION_SECRET) };
}
async function input(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) throw new HttpError(415, "JSON 형식이 필요합니다.");
  try {
    const value = JSON.parse(new TextDecoder().decode(await boundedBody(request, 650_000)));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "입력 형식이 올바르지 않습니다.");
    return value;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "입력 형식이 올바르지 않습니다.");
  }
}
function draft(row: DraftRow): Draft {
  return { id: row.id, document: editableDocument(JSON.parse(row.document)), version: row.version, updated: row.updated };
}
function validId(id: string): void {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new HttpError(400, "초안 주소가 올바르지 않습니다.");
}
async function getDraft(env: Env, id: string): Promise<DraftRow> {
  validId(id);
  const row = await env.DB.prepare("SELECT * FROM drafts WHERE id = ?").bind(id).first<DraftRow>();
  if (!row) throw new HttpError(404, "초안을 찾을 수 없습니다.");
  return row;
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!path.startsWith("/api/") && !path.startsWith("/auth/")) return env.ASSETS.fetch(request);
  if (request.method === "OPTIONS" && path.startsWith("/api/")) {
    if (!allowedOrigin(request, env)) throw new HttpError(403, "허용되지 않은 사이트입니다.");
    return new Response(null, { status: 204 });
  }
  if (!configured(env)) throw new HttpError(503, "GitHub 로그인 연결을 준비 중입니다.");
  if (path === "/auth/login" && request.method === "GET") {
    const state = random();
    const verifier = random();
    const editor = url.searchParams.get("editor") === "site";
    const clientState = url.searchParams.get("client_state") ?? "";
    if (editor && !/^[a-f0-9-]{36}$/.test(clientState)) throw new HttpError(400, "블로그의 글쓰기 화면에서 로그인해 주세요.");
    const flow = await seal(JSON.stringify({ state, verifier, editor, clientState, expires: Date.now() + 600_000 }), env.SESSION_SECRET);
    const githubUrl = new URL("https://github.com/login/oauth/authorize");
    githubUrl.search = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: `${url.origin}/auth/callback`,
      scope: "public_repo",
      state,
      code_challenge: await digest(verifier),
      code_challenge_method: "S256",
      allow_signup: "false",
    }).toString();
    return redirect(githubUrl.href, [cookie(request, "writer_oauth", encodeURIComponent(flow), 600)]);
  }
  if (path === "/auth/callback" && request.method === "GET") {
    const cleared = cookie(request, "writer_oauth", "", 0);
    try {
      const flow = JSON.parse(await unseal(decodeURIComponent(cookieValue(request, "writer_oauth")), env.SESSION_SECRET)) as {
        state: string;
        verifier: string;
        expires: number;
        editor?: boolean;
        clientState?: string;
      };
      if (!equals(flow.state, url.searchParams.get("state") ?? "") || flow.expires < Date.now() || !url.searchParams.get("code"))
        throw new HttpError(400, "로그인 요청이 만료되었습니다.");
      const response = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        signal: AbortSignal.timeout(20_000),
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code: url.searchParams.get("code"),
          redirect_uri: `${url.origin}/auth/callback`,
          code_verifier: flow.verifier,
        }),
      });
      if (!response.ok) throw new HttpError(502, "GitHub 로그인에 실패했습니다.");
      const token = JSON.parse(new TextDecoder().decode(await boundedBody(response))) as { access_token?: string; expires_in?: number };
      if (!token.access_token) throw new HttpError(401, "GitHub 로그인에 실패했습니다.");
      const user = await github<{ id: number; login: string }>(token.access_token, "/user");
      if (String(user.id) !== env.OWNER_ID) throw new HttpError(403, "본인 계정만 사용할 수 있습니다.");
      const id = random();
      const seconds = Math.min(SESSION_SECONDS, token.expires_in ?? SESSION_SECONDS);
      await env.DB.batch([
        env.DB.prepare("DELETE FROM sessions WHERE expires <= ?").bind(Date.now()),
        env.DB.prepare("INSERT INTO sessions (id, token, csrf, expires) VALUES (?, ?, ?, ?)").bind(
          await digest(id),
          await seal(token.access_token, env.SESSION_SECRET),
          random(),
          Date.now() + seconds * 1000
        ),
      ]);
      const destination = flow.editor ? `${env.SITE_URL}/admin/#session=${id}&state=${flow.clientState}` : "/";
      return redirect(destination, flow.editor ? [cleared] : [cleared, cookie(request, COOKIE, id, seconds)]);
    } catch (error) {
      return redirect(error instanceof HttpError && error.status === 403 ? "/?login=owner-only" : "/?login=failed", [cleared]);
    }
  }
  const user = await session(request, env);
  if (!["GET", "HEAD"].includes(request.method)) {
    if (!allowedOrigin(request, env) || !equals(request.headers.get("X-CSRF-Token") ?? "", user.csrf))
      throw new HttpError(403, "요청을 확인하지 못했습니다. 화면을 새로고침해 주세요.");
  }
  if (path === "/api/session" && request.method === "GET")
    return json({ csrf: user.csrf, siteUrl: env.SITE_URL, repository: env.GITHUB_REPOSITORY, branch: env.GITHUB_BRANCH });
  if (path === "/api/site-settings" && request.method === "GET") return json(await getSiteSettings(env, user.token));
  if (path === "/api/site-settings" && request.method === "PUT") {
    const data = await input(request);
    return json(await saveSiteSettings(env, user.token, data.settings, data.sha));
  }
  if (path === "/api/logout" && request.method === "POST") {
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(user.id).run();
    const result = json({ ok: true });
    result.headers.set("Set-Cookie", cookie(request, COOKIE, "", 0));
    return result;
  }
  if (path === "/api/posts" && request.method === "GET") {
    const collection = contentCollection(url.searchParams.get("collection") ?? "blog");
    const repo = await repositoryTree(env, user.token);
    const files = repo.files.filter((file) => file.type === "blob" && isContentPath(file.path) && pathCollection(file.path) === collection);
    const posts = (await readDocuments(env, user.token, repo, files)).map((doc) => ({
      path: doc.sourcePath,
      sha: doc.sourceSha,
      language: documentLanguage(doc),
    }));
    return json({ posts });
  }
  if (path === "/api/posts/open" && request.method === "POST") {
    const data = await input(request);
    const doc = await readPost(env, user.token, String(data.path ?? ""));
    // Return an existing working copy instead of overwriting edits from another device.
    const existing = await env.DB.prepare("SELECT * FROM drafts WHERE json_extract(document, '$.sourcePath') = ?")
      .bind(doc.sourcePath)
      .first<DraftRow>();
    if (existing) return json(draft(existing));
    const id = crypto.randomUUID();
    const updated = new Date().toISOString();
    await env.DB.prepare("INSERT INTO drafts (id, document, updated) VALUES (?, ?, ?)").bind(id, JSON.stringify(doc), updated).run();
    return json({ id, document: doc, version: 1, updated });
  }
  if (path === "/api/drafts" && request.method === "GET") {
    const collection = contentCollection(url.searchParams.get("collection") ?? "blog");
    const rows = await env.DB.prepare(
      "SELECT id, json_extract(document, '$.title') AS title, json_extract(document, '$.sourcePath') AS sourcePath, document, updated FROM drafts WHERE COALESCE(json_extract(document, '$.collection'), 'blog') = ? ORDER BY updated DESC LIMIT 500"
    )
      .bind(collection)
      .all();
    return json({
      drafts: rows.results.map((row) => {
        const doc = JSON.parse(String(row.document)) as PostDocument;
        return { id: row.id, title: row.title, sourcePath: row.sourcePath, updated: row.updated, language: documentLanguage(doc) };
      }),
    });
  }
  if (path === "/api/drafts" && request.method === "POST") {
    const data = await input(request);
    const doc = validateDocument(data.document);
    if (doc.sourcePath) throw new HttpError(400, "기존 글은 글 목록에서 불러와 주세요.");
    const id = crypto.randomUUID();
    const updated = new Date().toISOString();
    await env.DB.prepare("INSERT INTO drafts (id, document, updated) VALUES (?, ?, ?)").bind(id, JSON.stringify(doc), updated).run();
    return json({ id, document: doc, version: 1, updated }, 201);
  }
  const match = path.match(/^\/api\/drafts\/([^/]+)(?:\/(publish|media))?$/);
  if (match) {
    const [, id, action] = match;
    const row = await getDraft(env, id);
    if (!action && request.method === "GET") return json(draft(row));
    if (!action && request.method === "PUT") {
      const data = await input(request);
      const doc = validateDocument(data.document);
      const original = JSON.parse(row.document) as PostDocument;
      if (documentCollection(doc) !== documentCollection(original)) throw new HttpError(400, "초안의 콘텐츠 종류는 변경할 수 없습니다.");
      if (doc.sourcePath !== original.sourcePath || doc.sourceSha !== original.sourceSha)
        throw new HttpError(400, "원본 글 정보는 변경할 수 없습니다.");
      if (original.sourcePath && documentLanguage(doc) !== documentLanguage(original))
        throw new HttpError(400, "기존 글의 언어는 변경할 수 없습니다. 다른 언어 버전을 추가해 주세요.");
      if (original.sourcePath && (doc.date !== original.date || doc.slug !== original.slug))
        throw new HttpError(400, "기존 글의 날짜와 주소는 저장소에서 변경해 주세요.");
      const updated = new Date().toISOString();
      const result = await env.DB.prepare(
        "UPDATE drafts SET document = ?, updated = ?, version = version + 1 WHERE id = ? AND version = ? AND publishing <= ? RETURNING *"
      )
        .bind(JSON.stringify(doc), updated, id, Number(data.version), Date.now())
        .first<DraftRow>();
      if (!result) throw new HttpError(409, "다른 기기에서 변경했거나 발행 중인 글입니다. 내용을 내려받고 초안을 다시 열어 주세요.");
      return json(draft(result));
    }
    if (action === "media" && request.method === "POST") {
      if (row.publishing > Date.now()) throw new HttpError(409, "발행 중에는 이미지를 첨부할 수 없습니다.");
      const mime = request.headers.get("Content-Type")?.split(";")[0] ?? "";
      const extensions: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
      if (!extensions[mime]) throw new HttpError(415, "PNG, JPG, WebP, GIF 이미지만 첨부할 수 있습니다.");
      const count = await env.DB.prepare("SELECT count(*) AS total FROM media WHERE draft_id = ?").bind(id).first<{ total: number }>();
      if (count && count.total >= 20) throw new HttpError(422, "초안당 이미지는 20개까지 첨부할 수 있습니다.");
      const bytes = await boundedBody(request, IMAGE_LIMIT);
      if (!bytes.length) throw new HttpError(400, "빈 이미지는 첨부할 수 없습니다.");
      const fileId = crypto.randomUUID();
      const filename = `${id}/${fileId}.${extensions[mime]}`;
      await env.DB.prepare("INSERT INTO media (id, draft_id, filename, mime, size, data) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(fileId, id, filename, mime, bytes.length, bytes.buffer)
        .run();
      return json({ url: `/api/media/${fileId}` }, 201);
    }
    if (action === "publish" && request.method === "POST") {
      const data = await input(request);
      const locked = await env.DB.prepare("UPDATE drafts SET publishing = ? WHERE id = ? AND version = ? AND publishing <= ? RETURNING *")
        .bind(Date.now() + 600_000, id, Number(data.version), Date.now())
        .first<DraftRow>();
      if (!locked) throw new HttpError(409, "초안이 변경되었거나 이미 발행 중입니다. 초안을 다시 열어 주세요.");
      try {
        const doc = validateDocument(JSON.parse(locked.document), true);
        const files = await env.DB.prepare("SELECT id, filename, mime, size FROM media WHERE draft_id = ?").bind(id).all<MediaFile>();
        const referenced = files.results.filter(
          (file) => doc.body.includes(`/api/media/${file.id}`) || contentImages(doc.metadata).includes(`/api/media/${file.id}`)
        );
        const result = await publishPost(env, user.token, doc, referenced);
        // Keep a working copy, so subsequent edits retain the original URL and revision.
        const committed = result.document;
        const updated = new Date().toISOString();
        const saved = await env.DB.prepare(
          "UPDATE drafts SET document = ?, updated = ?, version = version + 1, publishing = 0 WHERE id = ? RETURNING *"
        )
          .bind(JSON.stringify(committed), updated, id)
          .first<DraftRow>();
        return json({
          ...result,
          draft: saved ? draft(saved) : null,
          workflowUrl: `https://github.com/${env.GITHUB_REPOSITORY}/actions?query=workflow%3A%22Deploy+site%22`,
        });
      } finally {
        await env.DB.prepare("UPDATE drafts SET publishing = 0 WHERE id = ?").bind(id).run();
      }
    }
  }
  const mediaMatch = path.match(/^\/api\/media\/([a-f0-9-]{36})$/);
  if (mediaMatch && request.method === "GET") {
    const object = await env.DB.prepare("SELECT data, mime FROM media WHERE id = ?").bind(mediaMatch[1]).first<{ data: number[]; mime: string }>();
    if (!object) throw new HttpError(404, "이미지를 찾을 수 없습니다.");
    return new Response(Uint8Array.from(object.data), {
      headers: { "Content-Type": object.mime, "Content-Disposition": "inline" },
    });
  }
  throw new HttpError(404, "요청한 기능을 찾을 수 없습니다.");
}

export default {
  async fetch(request, env): Promise<Response> {
    let response: Response;
    try {
      response = await route(request, env);
    } catch (error) {
      const expected = error instanceof HttpError;
      if (!expected) console.error(JSON.stringify({ event: "writer_request_failed", type: error instanceof Error ? error.name : "Unknown" }));
      response = json({ error: expected ? error.message : "처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, expected ? error.status : 500);
    }
    const result = new Response(response.body, response);
    result.headers.set("Cache-Control", "no-store");
    result.headers.set("X-Content-Type-Options", "nosniff");
    result.headers.set("Referrer-Policy", "no-referrer");
    result.headers.set("X-Robots-Tag", "noindex, nofollow");
    const origin = request.headers.get("Origin");
    if (origin && allowedOrigin(request, env)) {
      result.headers.set("Access-Control-Allow-Origin", origin);
      result.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
      result.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-CSRF-Token");
      result.headers.set("Vary", "Origin");
    }
    result.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' https: blob:; connect-src 'self'; frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
    );
    return result;
  },
} satisfies ExportedHandler<Env>;

function allowedOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get("Origin");
  return origin === new URL(env.SITE_URL).origin || origin === new URL(request.url).origin;
}
