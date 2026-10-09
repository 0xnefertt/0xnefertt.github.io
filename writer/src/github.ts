import { HttpError, isPostPath, parsePost, postPath, renderPost, type PostDocument } from "./model";
import { format } from "prettier/standalone";
import markdown from "prettier/plugins/markdown";
import yaml from "prettier/plugins/yaml";

export async function boundedBody(response: Response | Request, max = 1_000_000): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > max) throw new HttpError(413, "파일이 너무 큽니다.");
      chunks.push(chunk.value);
    }
  } finally {
    await reader.cancel();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export async function github<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    signal: AbortSignal.timeout(20_000),
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "nefertt-writer",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    if (response.status === 401) throw new HttpError(401, "GitHub 로그인이 만료되었습니다. 다시 로그인해 주세요.");
    if (response.status === 404) throw new HttpError(404, "저장소 또는 글을 찾을 수 없습니다.");
    if (response.status === 409 || response.status === 422)
      throw new HttpError(409, "저장소에 새 변경이 있습니다. 새로 불러온 후 다시 발행해 주세요.");
    throw new HttpError(502, "GitHub 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  return JSON.parse(new TextDecoder().decode(await boundedBody(response, 12_000_000))) as T;
}

interface GitTree {
  tree: { path: string; sha: string; type: string }[];
  truncated: boolean;
}

export async function repositoryTree(env: Env, token: string) {
  const root = `/repos/${env.GITHUB_REPOSITORY}`;
  const head = await github<{ object: { sha: string } }>(token, `${root}/git/ref/heads/${env.GITHUB_BRANCH}`);
  const commit = await github<{ tree: { sha: string } }>(token, `${root}/git/commits/${head.object.sha}`);
  const tree = await github<GitTree>(token, `${root}/git/trees/${commit.tree.sha}?recursive=1`);
  if (tree.truncated) throw new HttpError(502, "저장소 파일 목록이 너무 큽니다.");
  return { root, head: head.object.sha, treeSha: commit.tree.sha, files: tree.tree };
}

export async function readPost(env: Env, token: string, path: string): Promise<PostDocument> {
  if (!isPostPath(path)) throw new HttpError(400, "글 경로가 올바르지 않습니다.");
  const file = await github<{ content: string; sha: string; size: number }>(
    token,
    `/repos/${env.GITHUB_REPOSITORY}/contents/${path}?ref=${env.GITHUB_BRANCH}`
  );
  if (file.size > 600_000) throw new HttpError(413, "이 글은 웹 편집기로 열기에는 너무 큽니다.");
  return parsePost(new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g, "")), (c) => c.charCodeAt(0))), path, file.sha);
}

export interface MediaFile {
  id: string;
  filename: string;
  mime: string;
  size: number;
}

export async function publishPost(env: Env, token: string, doc: PostDocument, media: MediaFile[]) {
  const repo = await repositoryTree(env, token);
  const path = postPath(doc);
  const current = repo.files.find((file) => file.path === path);
  if (doc.sourcePath ? current?.sha !== doc.sourceSha : current)
    throw new HttpError(409, "같은 주소의 글이 있거나 원본이 변경되었습니다. 새로 불러온 후 발행해 주세요.");
  if (!doc.sourcePath) {
    const route = path.split("/").at(-1)!;
    if (repo.files.some((file) => file.path.startsWith("_posts/") && file.path.split("/").at(-1) === route)) {
      throw new HttpError(409, "같은 날짜와 주소를 사용하는 글이 있습니다. 글 주소를 변경해 주세요.");
    }
  }
  const mediaPaths = new Map(media.map((file) => [`/api/media/${file.id}`, `/assets/img/posts/${file.filename}`]));
  const content = await format(renderPost(doc, mediaPaths), { parser: "markdown", plugins: [markdown, yaml], printWidth: 150, trailingComma: "es5" });
  // Validate local references before writing anything to the public repository.
  const publicMedia = new Set(mediaPaths.values());
  const images = [
    ...Array.from(content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g), (match) => match[1].trim().replace(/^<|>$/g, "").split(/\s/)[0]),
    ...Array.from(content.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi), (match) => match[1]),
  ];
  for (const image of images) {
    if (/^https?:\/\//i.test(image)) continue;
    if (/^(data:|blob:|\/api\/)/i.test(image)) throw new HttpError(422, "이미지는 첨부 버튼으로 추가해 주세요.");
    const imagePath = image.startsWith("/assets/")
      ? `astro/public${image}`
      : image.startsWith("/")
        ? image.slice(1)
        : `${path.slice(0, path.lastIndexOf("/"))}/${image}`;
    if (!publicMedia.has(image) && !repo.files.some((file) => file.path === imagePath))
      throw new HttpError(422, `이미지 파일을 찾을 수 없습니다: ${image}`);
  }
  const entries: { path: string; mode: "100644"; type: "blob"; sha: string }[] = [];
  for (const file of media) {
    const object = await env.DB.prepare("SELECT data FROM media WHERE id = ?").bind(file.id).first<{ data: number[] }>();
    if (!object) throw new HttpError(422, "첨부 이미지가 없습니다. 다시 첨부해 주세요.");
    const bytes = Uint8Array.from(object.data);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    const blob = await github<{ sha: string }>(token, `${repo.root}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content: btoa(binary), encoding: "base64" }),
    });
    entries.push({ path: `astro/public/assets/img/posts/${file.filename}`, mode: "100644", type: "blob", sha: blob.sha });
  }
  const blob = await github<{ sha: string }>(token, `${repo.root}/git/blobs`, {
    method: "POST",
    body: JSON.stringify({ content, encoding: "utf-8" }),
  });
  entries.push({ path, mode: "100644", type: "blob", sha: blob.sha });
  const tree = await github<{ sha: string }>(token, `${repo.root}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: repo.treeSha, tree: entries }),
  });
  const commit = await github<{ sha: string }>(token, `${repo.root}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: `${doc.sourcePath ? "Update" : "Publish"} ${doc.title.trim().slice(0, 90)}`,
      tree: tree.sha,
      parents: [repo.head],
    }),
  });
  // Never force: a concurrent repository update must not be overwritten.
  await github(token, `${repo.root}/git/refs/heads/${env.GITHUB_BRANCH}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  return { commit: commit.sha, path, sourceSha: blob.sha, document: parsePost(content, path, blob.sha) };
}
