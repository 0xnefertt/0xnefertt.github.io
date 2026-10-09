import { parseDocument, stringify } from "yaml";

export interface PostDocument {
  title: string;
  description: string;
  date: string;
  slug: string;
  category: string;
  tags: string[];
  body: string;
  metadata: Record<string, unknown>;
  sourcePath: string | null;
  sourceSha: string | null;
}

export interface Draft {
  id: string;
  document: PostDocument;
  version: number;
  updated: string;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return typeof value === "string" ? value.split(/[,\s]+/).filter(Boolean) : [];
}

export function isPostPath(path: string): boolean {
  return /^_posts\/(?:[a-zA-Z0-9_-]+\/){1,2}[a-zA-Z0-9_.-]+\.md$/.test(path) && !path.includes("..");
}

export function parsePost(content: string, sourcePath: string, sourceSha: string): PostDocument {
  const match = content.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) throw new HttpError(422, "이 글에는 글 정보를 담은 머리말이 없습니다.");
  const parsed = parseDocument(match[1], { uniqueKeys: true });
  if (parsed.errors.length) throw new HttpError(422, "기존 글의 머리말 형식을 확인해 주세요.");
  const metadata = parsed.toJSON() as Record<string, unknown>;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) throw new HttpError(422, "글 정보 형식이 올바르지 않습니다.");
  const filename = sourcePath.split("/").at(-1)!.replace(/\.md$/, "");
  const filenameMatch = filename.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  return {
    title: String(metadata.title ?? ""),
    description: String(metadata.description ?? ""),
    date: String(metadata.date ?? filenameMatch?.[1] ?? "").slice(0, 10),
    slug: String(metadata.slug ?? filenameMatch?.[2] ?? filename),
    category: metadata.category_override === true ? list(metadata.categories)[0] : sourcePath.split("/").slice(1, -1).join("/"),
    tags: list(metadata.tags),
    body: content.replace(/\r\n/g, "\n").slice(match[0].length).replace(/^\n+/, ""),
    metadata,
    sourcePath,
    sourceSha,
  };
}

export function validateDocument(value: unknown, publishing = false): PostDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "글 형식이 올바르지 않습니다.");
  const doc = value as PostDocument;
  for (const key of ["title", "description", "date", "slug", "category", "body"] as const) {
    if (typeof doc[key] !== "string") throw new HttpError(400, "글 형식이 올바르지 않습니다.");
  }
  if (doc.title.length > 300 || doc.description.length > 1000 || doc.body.length > 300_000) throw new HttpError(413, "글이 너무 깁니다.");
  if (!Array.isArray(doc.tags) || doc.tags.length > 30 || doc.tags.some((tag) => typeof tag !== "string" || tag.length > 100)) {
    throw new HttpError(400, "태그는 30개까지 입력할 수 있습니다.");
  }
  if (!doc.metadata || typeof doc.metadata !== "object" || Array.isArray(doc.metadata)) throw new HttpError(400, "글 정보가 올바르지 않습니다.");
  if (
    (doc.sourcePath !== null && (typeof doc.sourcePath !== "string" || !isPostPath(doc.sourcePath))) ||
    (doc.sourceSha !== null && (typeof doc.sourceSha !== "string" || !/^[a-f0-9]{40}$/.test(doc.sourceSha))) ||
    Boolean(doc.sourcePath) !== Boolean(doc.sourceSha)
  ) {
    throw new HttpError(400, "원본 글 정보가 올바르지 않습니다.");
  }
  if (publishing) {
    if (!doc.title.trim() || !doc.description.trim() || !doc.body.trim() || !doc.tags.some((tag) => tag.trim())) {
      throw new HttpError(422, "발행하려면 제목, 요약, 본문, 태그를 입력해 주세요.");
    }
    const parsedDate = new Date(`${doc.date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== doc.date) {
      throw new HttpError(422, "올바른 날짜를 입력해 주세요.");
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(doc.slug) && !doc.sourcePath)
      throw new HttpError(422, "글 주소는 영문 소문자, 숫자, 하이픈으로 입력해 주세요.");
    if (!/^[a-z0-9-]+(?:\/[a-z0-9-]+)?$/.test(doc.category)) throw new HttpError(422, "카테고리를 선택해 주세요.");
    if (doc.metadata.redirect || doc.metadata.external_source) throw new HttpError(422, "외부 링크 글은 저장소에서 직접 수정해 주세요.");
  }
  return doc;
}

export function postPath(doc: PostDocument): string {
  return doc.sourcePath ?? `_posts/${doc.category}/${doc.date}-${doc.slug}.md`;
}

export function renderPost(doc: PostDocument, mediaPaths: Map<string, string> = new Map()): string {
  const metadata: Record<string, unknown> = {
    ...doc.metadata,
    title: doc.title.trim(),
    date: doc.date,
    description: doc.description.trim(),
    tags: doc.tags,
  };
  const folderCategory = doc.sourcePath?.split("/").slice(1, -1).join("/");
  const previousCategory = doc.metadata.category_override === true ? list(doc.metadata.categories)[0] : folderCategory;
  const changedCategory = Boolean(doc.sourcePath && doc.category !== previousCategory);
  if (changedCategory) {
    metadata.legacy_categories = [...new Set([...list(doc.metadata.legacy_categories), ...list(doc.metadata.categories), previousCategory!])];
    metadata.category_override = true;
  }
  metadata.categories = changedCategory || !doc.sourcePath ? [doc.category] : doc.metadata.categories ?? [doc.category];
  metadata.last_updated = new Date().toISOString().slice(0, 10);
  delete metadata.draft;
  let body = doc.body;
  for (const [privatePath, publicPath] of mediaPaths) body = body.replaceAll(privatePath, publicPath);
  if (body.includes("/api/media/")) throw new HttpError(422, "다른 초안의 이미지가 포함되어 있습니다. 이미지를 다시 첨부해 주세요.");
  for (const key of ["cover", "thumbnail"] as const) {
    if (typeof metadata[key] === "string") metadata[key] = mediaPaths.get(metadata[key]) ?? metadata[key];
    if (typeof metadata[key] === "string" && metadata[key].includes("/api/media/")) throw new HttpError(422, "표지 이미지를 다시 첨부해 주세요.");
  }
  return `---\n${stringify(metadata, { lineWidth: 140, sortMapEntries: true }).trimEnd()}\n---\n\n${body.trim()}\n`;
}
