import { HttpError, list, type PostDocument } from "./model";

export interface CategoryChild {
  name: string;
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
export interface SiteSettings {
  categories: CategoryGroup[];
  favorites: FavoriteGroup[];
}
export interface SettingsSnapshot {
  settings: SiteSettings;
  sha: string;
  usage: Record<string, number>;
}
export const SETTINGS_PATH = "_data/site-settings.json";

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
  return { name: text(row.name, 100, "카테고리 이름"), slug };
}
function unique(values: string[], message: string) {
  if (new Set(values).size !== values.length) throw new HttpError(422, message);
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
  return { categories, favorites };
}
export function categoryOptions(settings: SiteSettings): { value: string; label: string }[] {
  return settings.categories.flatMap((group) => [
    { value: group.slug, label: group.name },
    ...group.children.map((child) => ({ value: `${group.slug}/${child.slug}`, label: `${group.name} / ${child.name}` })),
  ]);
}
export function assertCategoryRemoval(previous: SiteSettings, next: SiteSettings, usage: Record<string, number>) {
  const retained = new Set(categoryOptions(next).map((item) => item.value));
  for (const item of categoryOptions(previous))
    if (!retained.has(item.value) && usage[item.value])
      throw new HttpError(422, `${item.label}에 글 또는 초안이 있습니다. 먼저 다른 카테고리로 옮겨 주세요.`);
}
