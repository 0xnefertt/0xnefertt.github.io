import { inferContentLanguage, contentTranslationKey, type ContentLanguage } from "../../shared/content-language";
import { parseDocument, stringify } from "yaml";

export interface PostDocument {
  collection?: ContentCollection;
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

export type ContentCollection = "blog" | "books" | "projects" | "about";
export function contentCollection(value: unknown = "blog"): ContentCollection {
  if (value !== "blog" && value !== "books" && value !== "projects" && value !== "about")
    throw new HttpError(400, "콘텐츠 종류가 올바르지 않습니다.");
  return value;
}
export function pathCollection(path: string): ContentCollection {
  if (path === "_pages/about.md" || path === "_pages/ko/about.md") return "about";
  if (isPostPath(path)) return "blog";
  if (/^_books\/(?:[\p{L}\p{N}_-]+\/)*[\p{L}\p{N}_-]+\.md$/u.test(path)) return "books";
  if (/^_projects\/(?:[\p{L}\p{N}_-]+\/)*[\p{L}\p{N}_-]+\.md$/u.test(path)) return "projects";
  throw new HttpError(400, "콘텐츠 경로가 올바르지 않습니다.");
}
export function documentCollection(doc: Pick<PostDocument, "collection" | "sourcePath">): ContentCollection {
  return contentCollection(doc.collection ?? (doc.sourcePath ? pathCollection(doc.sourcePath) : "blog"));
}
export function isContentPath(path: string): boolean {
  try {
    pathCollection(path);
    return true;
  } catch {
    return false;
  }
}

export function profileMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const profile = metadata.profile;
  return profile && typeof profile === "object" && !Array.isArray(profile) ? (profile as Record<string, unknown>) : {};
}
export function contentImages(metadata: Record<string, unknown>): string[] {
  return [metadata.cover, metadata.thumbnail, metadata.img, profileMetadata(metadata).image].filter(
    (value): value is string => typeof value === "string"
  );
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
  return /^_posts\/(?:(?:en|ko)\/)?(?:[a-zA-Z0-9_-]+\/){1,2}[a-zA-Z0-9_.-]+\.md$/.test(path) && !path.includes("..");
}

function validateCollectionMetadata(doc: PostDocument): void {
  const kind = documentCollection(doc);
  if (kind === "blog") return;
  const metadata = doc.metadata;
  if (kind === "about") {
    if (metadata.layout !== "about" || metadata.permalink !== (documentLanguage(doc) === "ko" ? "/ko/" : "/"))
      throw new HttpError(422, "소개 페이지의 주소와 레이아웃은 변경할 수 없습니다.");
    if (metadata.profile !== undefined && (!metadata.profile || typeof metadata.profile !== "object" || Array.isArray(metadata.profile)))
      throw new HttpError(422, "프로필 정보 형식을 확인해 주세요.");
    const profile = profileMetadata(metadata);
    for (const key of ["name", "location", "bio", "image", "more_info"]) {
      if (profile[key] !== undefined && (typeof profile[key] !== "string" || (profile[key] as string).length > (key === "more_info" ? 10000 : 2000)))
        throw new HttpError(422, "프로필 정보를 확인해 주세요.");
    }
    if (metadata.subtitle !== undefined && (typeof metadata.subtitle !== "string" || metadata.subtitle.length > 2000))
      throw new HttpError(422, "소개 부제목을 확인해 주세요.");
  }
  for (const key of ["author", "status", "role", "category", "cover", "img", "olid", "buy_link"]) {
    if (metadata[key] !== undefined && (typeof metadata[key] !== "string" || (metadata[key] as string).length > 2000))
      throw new HttpError(422, `${key} 정보를 확인해 주세요.`);
  }
  for (const key of ["isbn", "released", "goodreads_review", "period"]) {
    if (metadata[key] !== undefined && !["string", "number"].includes(typeof metadata[key])) throw new HttpError(422, `${key} 정보를 확인해 주세요.`);
  }
  for (const key of ["stars", "importance"]) {
    const value = metadata[key];
    if (
      value !== undefined &&
      (typeof value !== "number" || !Number.isFinite(value) || value < 0 || (key === "stars" ? value > 5 : !Number.isInteger(value)))
    )
      throw new HttpError(422, key === "stars" ? "별점은 0부터 5까지 입력해 주세요." : "정렬 순서는 0 이상의 정수로 입력해 주세요.");
  }
  for (const key of ["started", "finished"]) {
    if (metadata[key] === undefined) continue;
    const value = metadata[key];
    const date = new Date(`${value}T00:00:00Z`);
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value)
      throw new HttpError(422, "독서 날짜를 확인해 주세요.");
  }
  for (const key of ["stack", "highlights", "lessons", "categories"]) {
    const value = metadata[key];
    if (value === undefined || (key === "categories" && typeof value === "string")) continue;
    if (!Array.isArray(value) || value.length > 50 || value.some((item) => typeof item !== "string" || item.length > 2000))
      throw new HttpError(422, `${key} 목록을 확인해 주세요.`);
  }
  function webUrl(value: unknown): boolean {
    if (typeof value !== "string" || value.length > 2000) return false;
    try {
      return ["https:", "http:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }
  if (metadata.buy_link !== undefined && !webUrl(metadata.buy_link)) throw new HttpError(422, "구매 링크는 http 또는 https 주소로 입력해 주세요.");
  for (const value of contentImages(metadata)) {
    if (value === undefined || webUrl(value)) continue;
    if (
      typeof value !== "string" ||
      !value ||
      value.includes(":") ||
      value.startsWith("//") ||
      value.includes("\\") ||
      value.split("/").includes("..")
    )
      throw new HttpError(422, "표지 이미지 주소를 확인해 주세요.");
  }
  if (metadata.links !== undefined) {
    if (
      !Array.isArray(metadata.links) ||
      metadata.links.length > 20 ||
      metadata.links.some(
        (link) =>
          !link || typeof link !== "object" || typeof link.label !== "string" || !link.label.trim() || link.label.length > 200 || !webUrl(link.url)
      )
    )
      throw new HttpError(422, "프로젝트 링크의 이름과 http 또는 https 주소를 입력해 주세요.");
  }
}

export function parsePost(content: string, sourcePath: string, sourceSha: string): PostDocument {
  const collection = pathCollection(sourcePath);
  const match = content.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) throw new HttpError(422, "이 글에는 글 정보를 담은 머리말이 없습니다.");
  const parsed = parseDocument(match[1], { uniqueKeys: true });
  if (parsed.errors.length) throw new HttpError(422, "기존 글의 머리말 형식을 확인해 주세요.");
  const metadata = parsed.toJSON() as Record<string, unknown>;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) throw new HttpError(422, "글 정보 형식이 올바르지 않습니다.");
  const filename = sourcePath.split("/").at(-1)!.replace(/\.md$/, "");
  const filenameMatch = filename.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  return editableDocument({
    collection,
    title: String(metadata.title ?? ""),
    description: String(metadata.description ?? ""),
    date: collection === "blog" ? String(metadata.date ?? filenameMatch?.[1] ?? "").slice(0, 10) : "",
    slug: collection === "blog" ? String(metadata.slug ?? filenameMatch?.[2] ?? filename) : filename,
    category: collection === "blog" ? (metadata.category_override === true ? list(metadata.categories)[0] : sourceCategory(sourcePath)) : "",
    tags: list(metadata.tags),
    body: content.replace(/\r\n/g, "\n").slice(match[0].length).replace(/^\n+/, ""),
    metadata,
    sourcePath,
    sourceSha,
  });
}

// Legacy project sections become ordinary Markdown that can be edited in one body.
export function documentLanguage(doc: PostDocument): ContentLanguage {
  return inferContentLanguage({ ...doc.metadata, title: doc.title }, doc.body, doc.sourcePath ?? "");
}
export function documentTranslationKey(doc: PostDocument): string {
  if (!doc.sourcePath && !doc.slug && !doc.metadata.translation_key) return "";
  return contentTranslationKey(
    doc.metadata,
    doc.sourcePath ?? (documentCollection(doc) === "blog" ? `${doc.date}-${doc.slug}.md` : `${doc.slug}.md`)
  );
}
export function translationDraft(source: PostDocument): PostDocument {
  if (!source.sourcePath || documentCollection(source) === "about") throw new HttpError(400, "발행된 글을 열어 번역본을 추가해 주세요.");
  if (source.body.includes("/api/media/") || JSON.stringify(source.metadata).includes("/api/media/"))
    throw new HttpError(422, "첨부 사진을 포함한 원본 변경을 먼저 발행한 뒤 번역본을 추가해 주세요.");
  const metadata = { ...source.metadata, lang: documentLanguage(source) === "en" ? "ko" : "en", translation_key: documentTranslationKey(source) };
  for (const key of ["canonical", "canonical_url", "redirect", "external_source", "draft", "last_updated"])
    delete (metadata as Record<string, unknown>)[key];
  return {
    ...source,
    metadata,
    title: "",
    description: "",
    body: "",
    sourcePath: null,
    sourceSha: null,
    slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source.slug) ? source.slug : "",
  };
}
export function sourceCategory(path: string): string {
  const segments = path.split("/").slice(1, -1);
  if (segments[0] === "en" || segments[0] === "ko") segments.shift();
  return segments.join("/");
}
export function editableDocument(doc: PostDocument): PostDocument {
  const key = documentTranslationKey(doc);
  doc = { ...doc, metadata: { ...doc.metadata, lang: documentLanguage(doc), ...(key ? { translation_key: key } : {}) } };
  if (documentCollection(doc) !== "projects" || !["highlights", "lessons", "links"].some((key) => key in doc.metadata)) return doc;
  validateCollectionMetadata(doc);
  const text = (value: string) => value.replace(/[\r\n]+/g, " ").replace(/[\\`*_[\]<>]/g, "\\$&");
  const sections = [doc.body.trimEnd()];
  for (const key of ["highlights", "lessons"]) {
    const items = list(doc.metadata[key]);
    if (items.length) sections.push(items.map((item) => `- ${text(item)}`).join("\n"));
  }
  const links = doc.metadata.links as { label: string; url: string }[] | undefined;
  if (links?.length) sections.push(links.map((link) => `- [${text(link.label)}](<${new URL(link.url).href}>)`).join("\n"));
  const metadata = { ...doc.metadata };
  for (const key of ["highlights", "lessons", "links"]) delete metadata[key];
  const body = sections.filter(Boolean).join("\n\n");
  if (body.length > 300_000) throw new HttpError(413, "글이 너무 깁니다.");
  return { ...doc, body, metadata };
}

export function validateDocument(value: unknown, publishing = false): PostDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "글 형식이 올바르지 않습니다.");
  const doc = value as PostDocument;
  const collection = documentCollection(doc);
  for (const key of ["title", "description", "date", "slug", "category", "body"] as const) {
    if (typeof doc[key] !== "string") throw new HttpError(400, "글 형식이 올바르지 않습니다.");
  }
  if (doc.title.length > 300 || doc.description.length > 1000 || doc.body.length > 300_000) throw new HttpError(413, "글이 너무 깁니다.");
  if (!Array.isArray(doc.tags) || doc.tags.length > 30 || doc.tags.some((tag) => typeof tag !== "string" || tag.length > 100)) {
    throw new HttpError(400, "태그는 30개까지 입력할 수 있습니다.");
  }
  if (!doc.metadata || typeof doc.metadata !== "object" || Array.isArray(doc.metadata)) throw new HttpError(400, "글 정보가 올바르지 않습니다.");
  if (
    (doc.sourcePath !== null &&
      (typeof doc.sourcePath !== "string" || !isContentPath(doc.sourcePath) || pathCollection(doc.sourcePath) !== collection)) ||
    (doc.sourceSha !== null && (typeof doc.sourceSha !== "string" || !/^[a-f0-9]{40}$/.test(doc.sourceSha))) ||
    Boolean(doc.sourcePath) !== Boolean(doc.sourceSha)
  ) {
    throw new HttpError(400, "원본 글 정보가 올바르지 않습니다.");
  }
  if (collection === "about" && !doc.sourcePath?.match(/^_pages\/(?:ko\/)?about\.md$/))
    throw new HttpError(400, "소개 페이지는 기존 소개 글을 불러와 수정해 주세요.");
  if (doc.metadata.lang !== undefined && doc.metadata.lang !== "en" && doc.metadata.lang !== "ko")
    throw new HttpError(422, "콘텐츠 언어를 선택해 주세요.");
  if (
    doc.metadata.translation_key !== undefined &&
    (typeof doc.metadata.translation_key !== "string" || !/^[\p{L}\p{N}_-]{1,200}$/u.test(doc.metadata.translation_key))
  )
    throw new HttpError(422, "번역 연결 주소는 문자, 숫자, 하이픈으로 입력해 주세요.");
  if (collection === "about" && doc.sourcePath && documentLanguage(doc) !== (doc.sourcePath.includes("/ko/") ? "ko" : "en"))
    throw new HttpError(422, "소개 페이지 언어와 원본 경로가 일치하지 않습니다.");
  if (publishing) {
    if (!doc.title.trim()) throw new HttpError(422, "제목을 입력해 주세요.");
    if (collection === "blog" && (!doc.description.trim() || !doc.body.trim() || !doc.tags.some((tag) => tag.trim()))) {
      throw new HttpError(422, "발행하려면 제목, 요약, 본문, 태그를 입력해 주세요.");
    }
    const parsedDate = new Date(`${doc.date}T00:00:00Z`);
    if (
      collection === "blog" &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(doc.date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== doc.date)
    ) {
      throw new HttpError(422, "올바른 날짜를 입력해 주세요.");
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(doc.slug) && !doc.sourcePath)
      throw new HttpError(422, "글 주소는 영문 소문자, 숫자, 하이픈으로 입력해 주세요.");
    if (collection === "blog" && !/^[a-z0-9-]+(?:\/[a-z0-9-]+)?$/.test(doc.category)) throw new HttpError(422, "카테고리를 선택해 주세요.");
    validateCollectionMetadata(doc);
    if (doc.metadata.redirect || doc.metadata.external_source) throw new HttpError(422, "외부 링크 글은 저장소에서 직접 수정해 주세요.");
  }
  return publishing ? editableDocument(doc) : doc;
}

export function postPath(doc: PostDocument): string {
  const collection = documentCollection(doc);
  return (
    doc.sourcePath ??
    (collection === "blog"
      ? `_posts/${documentLanguage(doc)}/${doc.category}/${doc.date}-${doc.slug}.md`
      : `_${collection}/${documentLanguage(doc)}/${doc.slug}.md`)
  );
}

export function renderPost(doc: PostDocument, mediaPaths: Map<string, string> = new Map(), privateDraft = false): string {
  doc = editableDocument(doc);
  const collection = documentCollection(doc);
  const metadata: Record<string, unknown> = {
    ...doc.metadata,
    title: doc.title.trim(),
    lang: documentLanguage(doc),
    translation_key: documentTranslationKey(doc),
  };
  if (collection === "blog" || doc.description.trim() || "description" in metadata) metadata.description = doc.description.trim();
  if (collection === "blog" || doc.tags.length || "tags" in metadata) metadata.tags = doc.tags;
  if (collection === "blog") {
    metadata.date = doc.date;
    const folderCategory = doc.sourcePath ? sourceCategory(doc.sourcePath) : undefined;
    const previousCategory = doc.metadata.category_override === true ? list(doc.metadata.categories)[0] : folderCategory;
    const changedCategory = Boolean(doc.sourcePath && doc.category !== previousCategory);
    if (changedCategory) {
      metadata.legacy_categories = [...new Set([...list(doc.metadata.legacy_categories), ...list(doc.metadata.categories), previousCategory!])];
      metadata.category_override = true;
    }
    metadata.categories = changedCategory || !doc.sourcePath ? [doc.category] : doc.metadata.categories ?? [doc.category];
  }
  metadata.last_updated = new Date().toISOString().slice(0, 10);
  delete metadata.draft;
  if (privateDraft) metadata.draft = true;
  let body = doc.body;
  for (const [privatePath, publicPath] of mediaPaths) body = body.replaceAll(privatePath, publicPath);
  if (!privateDraft && body.includes("/api/media/")) throw new HttpError(422, "다른 초안의 이미지가 포함되어 있습니다. 이미지를 다시 첨부해 주세요.");
  for (const key of ["cover", "thumbnail", "img"] as const) {
    if (typeof metadata[key] === "string") metadata[key] = mediaPaths.get(metadata[key]) ?? metadata[key];
    if (!privateDraft && typeof metadata[key] === "string" && metadata[key].includes("/api/media/"))
      throw new HttpError(422, "표지 이미지를 다시 첨부해 주세요.");
  }
  if (metadata.profile && typeof metadata.profile === "object" && !Array.isArray(metadata.profile)) {
    const profile = { ...profileMetadata(metadata) };
    if (typeof profile.image === "string") {
      const image = mediaPaths.get(profile.image) ?? profile.image;
      if (!privateDraft && image.includes("/api/media/")) throw new HttpError(422, "프로필 사진을 다시 첨부해 주세요.");
      profile.image = image;
    }
    metadata.profile = profile;
  }
  return `---\n${stringify(metadata, { lineWidth: 140, sortMapEntries: true }).trimEnd()}\n---\n\n${body.trim()}\n`;
}
