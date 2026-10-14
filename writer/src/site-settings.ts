import { HttpError, list, type PostDocument } from "./model";
import defaults from "../../_data/site-defaults.json";

export interface CategoryChild {
  name: string;
  name_ko?: string;
  slug: string;
}
export interface CategoryGroup extends CategoryChild {
  children: CategoryChild[];
}
export interface FavoriteLink {
  href: string;
  title: string;
  note?: string;
}
export interface FavoriteGroup {
  name: string;
  items: FavoriteLink[];
}
export interface SiteContentSettings {
  blogDescription: string;
  blogDescriptionKo: string;
  seoDescription: string;
  seoDescriptionKo: string;
  siteTitle: string;
  blogName: string;
  email: string;
  githubUrl: string;
  xUrl: string;
  defaultOgImage: string;
  latestPostsLimit: number;
  resourcesDescription: string;
  resourcesDescriptionKo: string;
  usefulInfo: {
    enabled: boolean;
    location: string;
    latitude: number;
    longitude: number;
    baseCurrency: string;
    targetCurrencies: string[];
  };
  privacy: { body: string; bodyKo: string; updated: string };
}
export interface SiteSettings extends SiteContentSettings {
  categories: CategoryGroup[];
  favorites: FavoriteGroup[];
}
export interface SettingsSnapshot {
  settings: SiteSettings;
  sha: string;
  usage: Record<string, number>;
}
export const SETTINGS_PATH = "_data/site-settings.json";
export const DEFAULT_SITE_CONTENT: SiteContentSettings = defaults;

const aliases: Record<string, string> = {
  study: "study-log",
  dev: "study-log",
  english: "study-log",
  money: "money-talk",
  finance: "money-talk",
  stock: "money-talk",
  property: "money-talk",
  thoughts: "life-thoughts",
  uncategory: "life-thoughts",
  life: "life-thoughts",
  "opinions-is-my-own": "life-thoughts",
  retrospect: "life-thoughts",
  tips: "useful-tips",
  general: "useful-tips",
  "in-canada": "useful-tips",
  canada: "useful-tips",
};
const parentOnly = new Set(["life", "life-thoughts", "thoughts", "uncategory"]);
const languageFolders = new Set(["en", "english", "ko", "korean"]);
const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// Match the blog's legacy aliases and folder inference when checking category usage.
export function postCategoryKeys(doc: Pick<PostDocument, "metadata" | "sourcePath" | "category">): string[] {
  const explicit = list(doc.metadata.categories).map((value) =>
    value
      .split("/")
      .map((item) => item.trim())
      .filter(Boolean)
  );
  const folder = doc.sourcePath?.split("/").slice(1, -1) ?? [];
  if (folder[0] === "en" || folder[0] === "ko") folder.shift();
  const inferred =
    doc.metadata.category_override !== true &&
    folder.length > 0 &&
    !(explicit.length && folder.length === 1 && languageFolders.has(slugify(folder[0])));
  const entries = [...explicit];
  if (inferred) entries.push(folder);
  if (inferred && folder.length === 1)
    for (const entry of explicit) if (entry.length === 1 && slugify(entry[0]) !== slugify(folder[0])) entries.push([folder[0], entry[0]]);
  if (typeof doc.category === "string") entries.push(doc.category.split("/"));
  const keys = new Set<string>();
  for (const entry of entries) {
    const parts = entry.map(slugify).filter(Boolean);
    if (!parts.length) continue;
    const original = parts[0];
    const parent = aliases[original] ?? original;
    const child = parts[1] ?? (parent !== original && !parentOnly.has(original) ? original : undefined);
    if (child === "writed-by-ai") continue;
    keys.add(parent);
    if (child) keys.add(`${parent}/${child}`);
  }
  return [...keys];
}

function text(value: unknown, max: number, field: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new HttpError(422, `${field}을 확인해 주세요.`);
  return value.trim();
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(422, "설정 형식이 올바르지 않습니다.");
  return value as Record<string, unknown>;
}
function array(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new HttpError(422, "항목 수 또는 설정 형식을 확인해 주세요.");
  return value;
}
function category(value: unknown): CategoryChild {
  const row = object(value);
  const slug = text(row.slug, 60, "카테고리 주소");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new HttpError(422, "카테고리 주소에는 영문 소문자, 숫자, 하이픈을 사용하세요.");
  return {
    name: text(row.name, 100, "영어 카테고리 이름"),
    ...(row.name_ko === undefined || row.name_ko === "" ? {} : { name_ko: text(row.name_ko, 100, "한국어 카테고리 이름") }),
    slug,
  };
}
function unique(values: string[], message: string) {
  if (new Set(values).size !== values.length) throw new HttpError(422, message);
}
function optionalText(value: unknown, max: number, field: string): string {
  if (typeof value !== "string" || value.length > max) throw new HttpError(422, `${field}을 확인해 주세요.`);
  return value.trim();
}
function number(value: unknown, min: number, max: number, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new HttpError(422, `${field}을 확인해 주세요.`);
  return value;
}
function publicUrl(value: unknown, field: string, image = false): string {
  const result = optionalText(value, 2000, field);
  if (image && /^\/api\/media\//.test(result)) throw new HttpError(422, "공유 이미지에는 먼저 발행한 공개 이미지 주소를 사용하세요.");
  if (!result || (image && /^\/(?!\/)/.test(result))) return result;
  try {
    const url = new URL(result);
    if (image && url.pathname.startsWith("/api/media/")) throw new HttpError(422, "공유 이미지에는 먼저 발행한 공개 이미지 주소를 사용하세요.");
    if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) return result;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    /* Report the field instead of URL parser details. */
  }
  throw new HttpError(422, `${field}에는 올바른 http 또는 https 주소를 입력하세요.`);
}
function contentSettings(input: Record<string, unknown>): SiteContentSettings {
  const value = { ...DEFAULT_SITE_CONTENT, ...input };
  const email = optionalText(value.email, 254, "이메일");
  if (email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new HttpError(422, "이메일 주소를 확인해 주세요.");
  const latestPostsLimit = number(value.latestPostsLimit, 1, 20, "최근 글 수");
  if (!Number.isInteger(latestPostsLimit)) throw new HttpError(422, "최근 글 수는 1~20 사이의 정수로 입력하세요.");
  const info = object(value.usefulInfo);
  if (typeof info.enabled !== "boolean") throw new HttpError(422, "Useful Info 표시 설정을 확인해 주세요.");
  const baseCurrency = text(info.baseCurrency, 3, "기준 통화").toUpperCase();
  const targetCurrencies = array(info.targetCurrencies, 8).map((currency) => text(currency, 3, "비교 통화").toUpperCase());
  if (
    !/^[A-Z]{3}$/.test(baseCurrency) ||
    !targetCurrencies.length ||
    targetCurrencies.some((currency) => !/^[A-Z]{3}$/.test(currency) || currency === baseCurrency)
  )
    throw new HttpError(422, "통화는 USD, CAD, KRW 같은 3자리 코드로 입력하고 기준 통화는 비교 통화에서 제외하세요.");
  unique(targetCurrencies, "비교 통화가 중복됩니다.");
  const privacy = object(value.privacy);
  const updated = text(privacy.updated, 10, "Privacy 수정일");
  const date = new Date(updated);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(updated) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== updated)
    throw new HttpError(422, "Privacy 수정일을 확인해 주세요.");
  return {
    blogDescription: text(value.blogDescription, 500, "영어 소개 문구"),
    blogDescriptionKo: text(value.blogDescriptionKo, 500, "한국어 소개 문구"),
    seoDescription: text(value.seoDescription, 500, "영어 검색 설명"),
    seoDescriptionKo: text(value.seoDescriptionKo, 500, "한국어 검색 설명"),
    siteTitle: text(value.siteTitle, 100, "사이트 이름"),
    blogName: text(value.blogName, 100, "블로그 제목"),
    email,
    githubUrl: publicUrl(value.githubUrl, "GitHub 링크"),
    xUrl: publicUrl(value.xUrl, "X 링크"),
    defaultOgImage: publicUrl(value.defaultOgImage, "공유 기본 이미지", true),
    latestPostsLimit,
    resourcesDescription: text(value.resourcesDescription, 500, "Resources 영어 소개"),
    resourcesDescriptionKo: text(value.resourcesDescriptionKo, 500, "Resources 한국어 소개"),
    usefulInfo: {
      enabled: info.enabled,
      location: text(info.location, 100, "날씨 지역 이름"),
      latitude: number(info.latitude, -90, 90, "위도"),
      longitude: number(info.longitude, -180, 180, "경도"),
      baseCurrency,
      targetCurrencies,
    },
    privacy: { body: text(privacy.body, 30000, "Privacy 영어 본문"), bodyKo: text(privacy.bodyKo, 30000, "Privacy 한국어 본문"), updated },
  };
}
export function validateSettings(value: unknown): SiteSettings {
  const input = object(value);
  const categories = array(input.categories, 40).map((value) => {
    const row = object(value);
    const group = category(row);
    if (Object.hasOwn(aliases, group.slug)) throw new HttpError(422, "이 카테고리 주소는 기존 글에서 사용 중인 별칭입니다. 다른 주소를 입력하세요.");
    const children = array(row.children, 40).map(category);
    unique(
      children.map((child) => child.slug),
      "같은 상위 카테고리에 중복된 주소가 있습니다."
    );
    return { children, ...group };
  });
  unique(
    categories.map((group) => group.slug),
    "상위 카테고리 주소가 중복됩니다."
  );
  let links = 0;
  const favorites = array(input.favorites, 50).map((value) => {
    const row = object(value);
    const items = array(row.items, 200).map((value) => {
      const item = object(value);
      const href = text(item.href, 2000, "링크 주소");
      if (!/^\/(?!\/)/.test(href)) {
        let url: URL;
        try {
          url = new URL(href);
        } catch {
          throw new HttpError(422, "올바른 링크 주소를 입력하세요.");
        }
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
          throw new HttpError(422, "링크에는 http 또는 https 주소를 사용하세요.");
      }
      const note = item.note === undefined || item.note === "" ? undefined : text(item.note, 500, "링크 설명");
      links++;
      return { href, ...(note ? { note } : {}), title: text(item.title, 200, "링크 이름") };
    });
    return { items, name: text(row.name, 100, "즐겨찾기 그룹 이름") };
  });
  if (links > 500) throw new HttpError(422, "즐겨찾기는 500개까지 저장할 수 있습니다.");
  unique(
    favorites.map((group) => group.name.toLowerCase()),
    "즐겨찾기 그룹 이름이 중복됩니다."
  );
  return { ...contentSettings(input), categories, favorites };
}
export function categoryName(category: CategoryChild, locale: "en" | "ko"): string {
  return locale === "ko" ? category.name_ko || category.name : category.name;
}
export function categoryOptions(settings: SiteSettings, locale: "en" | "ko" = "en"): { value: string; label: string }[] {
  return settings.categories.flatMap((group) => [
    { value: group.slug, label: categoryName(group, locale) },
    ...group.children.map((child) => ({
      value: `${group.slug}/${child.slug}`,
      label: `${categoryName(group, locale)} / ${categoryName(child, locale)}`,
    })),
  ]);
}
export function writableCategoryOptions(settings: SiteSettings, locale: "en" | "ko" = "en") {
  return settings.categories.flatMap((group) =>
    group.children.map((child) => ({ value: `${group.slug}/${child.slug}`, label: categoryName(child, locale) }))
  );
}
export function assertWritableCategory(settings: SiteSettings, value: string) {
  if (!writableCategoryOptions(settings).some((option) => option.value === value))
    throw new HttpError(422, "상위 분류의 하위 카테고리까지 선택해 주세요. 기존 분류가 없다면 관리자에서 먼저 추가해 주세요.");
}
export function assertCategoryRemoval(previous: SiteSettings, next: SiteSettings, usage: Record<string, number>) {
  const retained = new Set(categoryOptions(next).map((item) => item.value));
  for (const item of categoryOptions(previous))
    if (!retained.has(item.value) && usage[item.value])
      throw new HttpError(422, `${item.label}에 글 또는 초안이 있습니다. 먼저 다른 카테고리로 옮겨 주세요.`);
}
