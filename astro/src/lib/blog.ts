import type { CollectionEntry } from 'astro:content';
import { t } from './messages';
import { contentLocale, localizedPath, unlocalizedPath, type Locale } from './locale';
import { normalizeAssetPath } from './content';
import { siteSettings } from './settings';

export interface PostRoute {
  year: string;
  slug: string;
}

export interface BlogCategoryPath {
  names: [string] | [string, string];
  slugs: [string] | [string, string];
  label: string;
  key: string;
  parentName: string;
  parentSlug: string;
  childName?: string;
  childSlug?: string;
  href: string;
}

export interface BlogSummary {
  title: string;
  description?: string;
  date?: Date;
  readMinutes: number;
  tags: string[];
  categories: string[];
  categoryPaths: BlogCategoryPath[];
  thumbnail?: string;
  gallery: string[];
  href: string;
  external: boolean;
  externalSource?: string;
  year: string;
  slug: string;
}

export interface BlogCategory {
  name: string;
  slug: string;
  count: number;
}

export interface BlogCategoryTreeChild {
  name: string;
  slug: string;
  count: number;
  href: string;
}

export interface BlogCategoryTreeParent {
  name: string;
  slug: string;
  count: number;
  href: string;
  children: BlogCategoryTreeChild[];
}

const CATEGORY_I18N_KEYS: Record<string, string> = {
  '/blog/category/study-log/': 'category_study_log',
  '/blog/category/study-log/dev/': 'category_dev',
  '/blog/category/study-log/english/': 'category_english',
  '/blog/category/money-talk/': 'category_money_talk',
  '/blog/category/money-talk/finance/': 'category_finance',
  '/blog/category/money-talk/stock/': 'category_stock',
  '/blog/category/money-talk/property/': 'category_property',
  '/blog/category/life-thoughts/': 'category_life_thoughts',
  '/blog/category/life-thoughts/opinions-is-my-own/': 'category_opinions_is_my_own',
  '/blog/category/useful-tips/': 'category_useful_tips',
  '/blog/category/useful-tips/general/': 'category_general',
  '/blog/category/useful-tips/in-canada/': 'category_in_canada',
};

const WORDS_PER_MINUTE = 180;
const FILE_NAME_PATTERN = /^(\d{4})-\d{2}-\d{2}-(.+)$/;

interface ParentCategoryPreset {
  slug: string;
  label: string;
  aliases: string[];
  children: { slug: string; label: string }[];
}

const LEGACY_CATEGORY_PRESETS: ParentCategoryPreset[] = [
  {
    slug: 'study-log',
    label: 'study log',
    aliases: ['study-log', 'study', 'dev', 'english'],
    children: [
      { slug: 'dev', label: 'dev' },
      { slug: 'english', label: 'english' },
    ],
  },
  {
    slug: 'money-talk',
    label: 'money talk',
    aliases: ['money-talk', 'money', 'finance', 'stock', 'property'],
    children: [
      { slug: 'finance', label: 'finance' },
      { slug: 'stock', label: 'stock' },
      { slug: 'property', label: 'property' },
    ],
  },
  {
    slug: 'life-thoughts',
    label: 'life · thoughts',
    aliases: ['life-thoughts', 'thoughts', 'uncategory', 'life', 'opinions-is-my-own', 'retrospect'],
    children: [
      { slug: 'opinions-is-my-own', label: 'opinions is my own' },
      { slug: 'retrospect', label: 'retrospect' },
    ],
  },
  {
    slug: 'useful-tips',
    label: 'useful tips',
    aliases: ['useful-tips', 'tips', 'general', 'in-canada', 'canada'],
    children: [
      { slug: 'general', label: 'general' },
      { slug: 'in-canada', label: 'in canada' },
    ],
  },
];

const PARENT_CATEGORY_PRESETS: ParentCategoryPreset[] = siteSettings.categories.map((group) => ({
  slug: group.slug,
  label: group.name,
  aliases: LEGACY_CATEGORY_PRESETS.find((preset) => preset.slug === group.slug)?.aliases ?? [group.slug],
  children: group.children.map((child) => ({ slug: child.slug, label: child.name })),
}));
const PARENT_ALIAS_LOOKUP = new Map<string, ParentCategoryPreset>(
  [...LEGACY_CATEGORY_PRESETS, ...PARENT_CATEGORY_PRESETS].flatMap((preset) => preset.aliases.map((alias) => [alias, preset] as const))
);
const PARENT_CATEGORY_ORDER = new Map(PARENT_CATEGORY_PRESETS.map((preset, index) => [preset.slug, index]));
const CHILD_CATEGORY_ORDER = new Map(
  PARENT_CATEGORY_PRESETS.flatMap((preset) => preset.children.map((child, index) => [`${preset.slug}/${child.slug}`, index] as const))
);

const CATEGORY_LABELS = new Map<string, string>([
  ['dev', 'dev'],
  ['english', 'english'],
  ['finance', 'finance'],
  ['general', 'general'],
  ['in-canada', 'in canada'],
  ['money', '자산'],
  ['opinions-is-my-own', 'opinions is my own'],
  ['portfolio', '포트폴리오'],
  ['property', 'property'],
  ['school', '학교'],
  ['shool', '학교'],
  ['stock', 'stock'],
  ['technology', '기술'],
  ['thoughts', '생각'],
  ['uncategory', '기타'],
]);

const HIDDEN_NAV_CHILD_CATEGORY_SLUGS = new Set(['writed-by-ai']);
const LANGUAGE_CATEGORY_SLUGS = new Set(['en', 'english', 'ko', 'korean']);
const PARENT_ONLY_ALIAS_SLUGS = new Set(['life', 'life-thoughts', 'thoughts', 'uncategory']);

export function getCategoryI18nKey(href: string): string | undefined {
  const plain = unlocalizedPath(href);
  const normalized = plain.endsWith('/') ? plain : `${plain}/`;
  const [parentSlug, childSlug] = normalized.replace('/blog/category/', '').split('/');
  const preset = PARENT_CATEGORY_PRESETS.find((group) => group.slug === parentSlug);
  const legacy = LEGACY_CATEGORY_PRESETS.find((group) => group.slug === parentSlug);
  const currentLabel = childSlug ? preset?.children.find((child) => child.slug === childSlug)?.label : preset?.label;
  const originalLabel = childSlug ? legacy?.children.find((child) => child.slug === childSlug)?.label : legacy?.label;
  return currentLabel === originalLabel ? CATEGORY_I18N_KEYS[normalized] : undefined;
}

function toTitleCaseWords(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getCategoryLabel(name: string, slug: string): string {
  return CATEGORY_LABELS.get(slug) ?? toTitleCaseWords(name.replace(/[-_]+/g, ' '));
}

function remapCategoryPath(names: string[], slugs: string[]): { names: string[]; slugs: string[] } {
  const parentName = names[0];
  const parentSlug = slugs[0];
  const childName = names[1];
  const childSlug = slugs[1];

  const preset = PARENT_ALIAS_LOOKUP.get(parentSlug);
  if (!preset) {
    return {
      names: names.map((name, index) => getCategoryLabel(name, slugs[index])),
      slugs,
    };
  }

  if (childName && childSlug) {
    return {
      names: [preset.label, preset.children.find((child) => child.slug === childSlug)?.label ?? getCategoryLabel(childName, childSlug)],
      slugs: [preset.slug, childSlug],
    };
  }

  if (preset.slug === parentSlug || PARENT_ONLY_ALIAS_SLUGS.has(parentSlug)) {
    return {
      names: [preset.label],
      slugs: [preset.slug],
    };
  }

  const childLabel = preset.children.find((child) => child.slug === parentSlug)?.label ?? getCategoryLabel(parentName, parentSlug);
  return {
    names: [preset.label, childLabel],
    slugs: [preset.slug, parentSlug],
  };
}

function fallbackSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function slugifyTerm(input: string): string {
  return fallbackSlug(input);
}

function splitPostPath(filePath?: string): string[] {
  if (!filePath) {
    return [];
  }

  return filePath
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean);
}

function toTwoLevelSegments(segments: string[]): string[] {
  const normalized = segments.map((item) => item.trim()).filter(Boolean);
  if (normalized.length <= 2) {
    return normalized;
  }

  return [normalized[0], normalized.slice(1).join('/')];
}

function parseCategoryTerm(input: string): string[] {
  if (!input.trim()) {
    return [];
  }

  return toTwoLevelSegments(input.split('/'));
}

function inferCategoryPathFromFilePath(filePath?: string): string[] {
  const segments = splitPostPath(filePath);
  const postsIndex = segments.lastIndexOf('_posts');

  if (postsIndex === -1) {
    return [];
  }

  const relativeSegments = segments.slice(postsIndex + 1);
  if (relativeSegments.length <= 1) {
    return [];
  }

  return toTwoLevelSegments(relativeSegments.slice(['en', 'ko'].includes(relativeSegments[0]) ? 1 : 0, -1));
}

function toCategoryPath(segments: string[]): BlogCategoryPath | undefined {
  const normalizedSegments = toTwoLevelSegments(segments);
  const sourceNames = normalizedSegments.map((item) => item.trim()).filter(Boolean);
  const sourceSlugs = sourceNames.map((item) => slugifyTerm(item)).filter(Boolean);

  if (sourceNames.length === 0 || sourceNames.length !== sourceSlugs.length) {
    return undefined;
  }

  const remapped = remapCategoryPath(sourceNames, sourceSlugs);
  const names = remapped.names;
  const slugs = remapped.slugs;
  const parentName = names[0];
  const parentSlug = slugs[0];
  const childName = names[1];
  const childSlug = slugs[1];

  if (childName && childSlug) {
    return {
      names: [parentName, childName],
      slugs: [parentSlug, childSlug],
      label: `${parentName} / ${childName}`,
      key: `${parentSlug}/${childSlug}`,
      parentName,
      parentSlug,
      childName,
      childSlug,
      href: `/blog/category/${parentSlug}/${childSlug}/`,
    };
  }

  return {
    names: [parentName],
    slugs: [parentSlug],
    label: parentName,
    key: parentSlug,
    parentName,
    parentSlug,
    href: `/blog/category/${parentSlug}/`,
  };
}

export function getPostCategoryPaths(post: CollectionEntry<'blog'>): BlogCategoryPath[] {
  const explicitCategories = normalizeTaxonomy(post.data.categories).map((item) => item.trim()).filter(Boolean);
  const inferredCategoryPath = inferCategoryPathFromFilePath(post.filePath);
  const inferredParentSlug = inferredCategoryPath.length === 1 ? slugifyTerm(inferredCategoryPath[0]) : undefined;
  const shouldUseInferredPath = post.data.category_override !== true && inferredCategoryPath.length > 0 && !(explicitCategories.length > 0 && inferredParentSlug && LANGUAGE_CATEGORY_SLUGS.has(inferredParentSlug));

  const explicitEntries = explicitCategories.map(parseCategoryTerm).filter((segments) => segments.length > 0);
  const entries: string[][] = [...explicitEntries];

  if (shouldUseInferredPath) {
    entries.push(inferredCategoryPath);
  }

  if (shouldUseInferredPath && inferredCategoryPath.length === 1) {
    const inferredParent = inferredCategoryPath[0];

    for (const explicitEntry of explicitEntries) {
      if (explicitEntry.length !== 1) {
        continue;
      }

      const explicitChild = explicitEntry[0];
      const explicitChildSlug = slugifyTerm(explicitChild);
      if (!explicitChildSlug || explicitChildSlug === inferredParentSlug) {
        continue;
      }

      entries.push([inferredParent, explicitChild]);
    }
  }

  const uniqueByKey = new Map<string, BlogCategoryPath>();

  for (const entry of entries) {
    const categoryPath = toCategoryPath(entry);
    if (!categoryPath) {
      continue;
    }

    if (categoryPath.childSlug && HIDDEN_NAV_CHILD_CATEGORY_SLUGS.has(categoryPath.childSlug)) {
      continue;
    }

    if (!uniqueByKey.has(categoryPath.key)) {
      uniqueByKey.set(categoryPath.key, categoryPath);
    }
  }

  return [...uniqueByKey.values()].map((path) => {
    const locale = contentLocale(post);
    const parentHref = `/blog/category/${path.parentSlug}/`;
    const parentKey = getCategoryI18nKey(parentHref);
    const childKey = getCategoryI18nKey(path.href);
    const parent = parentKey ? t(locale, parentKey) : path.parentName;
    const child = path.childSlug ? (childKey ? t(locale, childKey) : path.childName) : undefined;
    return { ...path, label: child ? `${parent} / ${child}` : parent, href: localizedPath(path.href, locale) };
  });
}

export function getLegacyCategoryPaths(post: CollectionEntry<'blog'>): BlogCategoryPath[] {
  return normalizeTaxonomy(post.data.legacy_categories)
    .map((item) => toCategoryPath(parseCategoryTerm(item)))
    .filter((item): item is BlogCategoryPath => Boolean(item));
}

export function getPostCategories(post: CollectionEntry<'blog'>): string[] {
  const categoryPaths = getPostCategoryPaths(post);
  const uniqueBySlug = new Map<string, string>();

  for (const categoryPath of categoryPaths) {
    for (let index = 0; index < categoryPath.names.length; index += 1) {
      const category = categoryPath.names[index];
      const slug = categoryPath.slugs[index];
      if (!slug) {
        continue;
      }

      if (!uniqueBySlug.has(slug)) {
        uniqueBySlug.set(slug, category);
      }
    }
  }

  return [...uniqueBySlug.values()];
}

function safeDate(date?: Date): Date {
  return date ?? new Date(0);
}

function getFileStem(filePath?: string): string | undefined {
  if (!filePath) {
    return undefined;
  }

  const fileName = filePath.split('/').pop();
  if (!fileName) {
    return undefined;
  }

  return fileName.replace(/\.mdx?$/, '');
}

export function getPostRoute(post: CollectionEntry<'blog'>): PostRoute {
  const explicitSlug = post.data.slug?.trim();
  if (explicitSlug) {
    return {
      year: String(safeDate(post.data.date).getUTCFullYear()),
      slug: fallbackSlug(explicitSlug),
    };
  }

  const stem = getFileStem(post.filePath);

  if (stem) {
    const match = FILE_NAME_PATTERN.exec(stem);
    if (match) {
      const year = match[1];
      const slug = match[2];
      return { year, slug };
    }
  }

  const fallbackYear = String(safeDate(post.data.date).getUTCFullYear());
  return {
    year: fallbackYear,
    slug: fallbackSlug(post.id),
  };
}

export function estimateReadMinutes(markdownBody: string): number {
  const strippedTemplateSyntax = markdownBody
    .replace(/\{\%[\s\S]*?\%\}/g, ' ')
    .replace(/\{\{[\s\S]*?\}\}/g, ' ');

  const words = strippedTemplateSyntax
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export function normalizeTaxonomy(items?: string | string[]): string[] {
  if (!items) {
    return [];
  }

  if (Array.isArray(items)) {
    return items.filter(Boolean);
  }

  return items
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeGallery(items?: string | string[]): string[] {
  return normalizeTaxonomy(items)
    .map((item) => normalizeAssetPath(item, 'assets/img/posts'))
    .filter((item): item is string => Boolean(item));
}

function extractPostImageUrls(markdown?: string): string[] {
  if (!markdown) {
    return [];
  }

  const imageUrls = new Set<string>();
  const markdownImagePattern = /!\[[^\]]*]\((\S+)(?:\s+["'][^"']*["'])?\)/g;
  const htmlImagePattern = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g;

  for (const match of markdown.matchAll(markdownImagePattern)) {
    const imagePath = normalizeAssetPath(match[1].replace(/^<|>$/g, ''), 'assets/img/posts');
    if (imagePath) {
      imageUrls.add(imagePath);
    }
  }

  for (const match of markdown.matchAll(htmlImagePattern)) {
    const imagePath = normalizeAssetPath(match[1], 'assets/img/posts');
    if (imagePath) {
      imageUrls.add(imagePath);
    }
  }

  return [...imageUrls];
}

export function listBlogCategoryTree(posts: CollectionEntry<'blog'>[], locale: Locale = posts[0] ? contentLocale(posts[0]) : 'en'): BlogCategoryTreeParent[] {
  const categoryMap = new Map<string, { name: string; slug: string; count: number; children: Map<string, BlogCategoryTreeChild> }>();

  for (const preset of PARENT_CATEGORY_PRESETS) {
    categoryMap.set(preset.slug, {
      name: preset.label,
      slug: preset.slug,
      count: 0,
      children: new Map(
        preset.children.map((child) => [
          child.slug,
          {
            name: child.label,
            slug: child.slug,
            count: 0,
            href: localizedPath(`/blog/category/${preset.slug}/${child.slug}/`, locale),
          },
        ])
      ),
    });
  }

  for (const post of posts) {
    const categoryPaths = getPostCategoryPaths(post);
    const parentSeen = new Set<string>();
    const childSeen = new Set<string>();

    for (const categoryPath of categoryPaths) {
      const parentSlug = categoryPath.parentSlug;
      if (!parentSlug) {
        continue;
      }

      let parent = categoryMap.get(parentSlug);
      if (!parent) {
        parent = {
          name: categoryPath.parentName,
          slug: parentSlug,
          count: 0,
          children: new Map(),
        };
        categoryMap.set(parentSlug, parent);
      }

      if (!parentSeen.has(parentSlug)) {
        parent.count += 1;
        parentSeen.add(parentSlug);
      }

      if (!categoryPath.childSlug || !categoryPath.childName || HIDDEN_NAV_CHILD_CATEGORY_SLUGS.has(categoryPath.childSlug)) {
        continue;
      }

      const childKey = `${parentSlug}/${categoryPath.childSlug}`;
      if (childSeen.has(childKey)) {
        continue;
      }

      childSeen.add(childKey);
      const existingChild = parent.children.get(categoryPath.childSlug);

      if (existingChild) {
        existingChild.count += 1;
      } else {
        parent.children.set(categoryPath.childSlug, {
          name: categoryPath.childName,
          slug: categoryPath.childSlug,
          count: 1,
          href: categoryPath.href,
        });
      }
    }
  }

  return [...categoryMap.values()]
    .filter((parent) => parent.count > 0)
    .map((parent) => ({
      name: getCategoryI18nKey(`/blog/category/${parent.slug}/`) ? t(locale, getCategoryI18nKey(`/blog/category/${parent.slug}/`)!) : parent.name,
      slug: parent.slug,
      count: parent.count,
      href: localizedPath(`/blog/category/${parent.slug}/`, locale),
      children: [...parent.children.values()]
        .filter((child) => child.count > 0)
        .map((child) => ({ ...child, name: getCategoryI18nKey(child.href) ? t(locale, getCategoryI18nKey(child.href)!) : child.name }))
        .sort((a, b) => {
          const aOrder = CHILD_CATEGORY_ORDER.get(`${parent.slug}/${a.slug}`) ?? Number.MAX_SAFE_INTEGER;
          const bOrder = CHILD_CATEGORY_ORDER.get(`${parent.slug}/${b.slug}`) ?? Number.MAX_SAFE_INTEGER;
          return aOrder === bOrder ? a.name.localeCompare(b.name) : aOrder - bOrder;
        }),
    }))
    .sort((a, b) => {
      const aOrder = PARENT_CATEGORY_ORDER.get(a.slug) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = PARENT_CATEGORY_ORDER.get(b.slug) ?? Number.MAX_SAFE_INTEGER;
      return aOrder === bOrder ? a.name.localeCompare(b.name) : aOrder - bOrder;
    });
}

export function listBlogCategories(posts: CollectionEntry<'blog'>[]): BlogCategory[] {
  return listBlogCategoryTree(posts).map((category) => ({
    name: category.name,
    slug: category.slug,
    count: category.count,
  }));
}

export function isDraftPost(post: CollectionEntry<'blog'>): boolean {
  return post.data.draft === true;
}

export function getPublishedBlogPosts(posts: CollectionEntry<'blog'>[], locale?: Locale): CollectionEntry<'blog'>[] {
  return posts.filter((post) => !isDraftPost(post) && (!locale || contentLocale(post) === locale));
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//.test(url);
}

export function getBlogHref(post: CollectionEntry<'blog'>): { href: string; external: boolean } {
  if (post.data.redirect) {
    return {
      href: post.data.redirect,
      external: isExternalUrl(post.data.redirect),
    };
  }

  const { year, slug } = getPostRoute(post);
  const primaryCategoryPath = getPostCategoryPaths(post).find((categoryPath) => categoryPath.childSlug);

  if (primaryCategoryPath?.childSlug) {
    return {
      href: localizedPath(`/blog/category/${primaryCategoryPath.parentSlug}/${primaryCategoryPath.childSlug}/${slug}/`, contentLocale(post)),
      external: false,
    };
  }

  return {
    href: localizedPath(`/blog/${year}/${slug}/`, contentLocale(post)),
    external: false,
  };
}

export function sortPostsDesc(posts: CollectionEntry<'blog'>[]): CollectionEntry<'blog'>[] {
  return [...posts].sort((a, b) => safeDate(b.data.date).getTime() - safeDate(a.data.date).getTime());
}

export function toBlogSummary(post: CollectionEntry<'blog'>): BlogSummary {
  const { year, slug } = getPostRoute(post);
  const { href, external } = getBlogHref(post);
  const thumbnail = normalizeAssetPath(post.data.thumbnail ?? post.data.cover, 'assets/img/posts');
  const gallery = normalizeGallery(post.data.gallery);
  const bodyImages = extractPostImageUrls(post.body);
  const previewImages = [...new Set([...(thumbnail ? [thumbnail] : []), ...gallery, ...bodyImages])];

  return {
    title: post.data.title,
    description: post.data.description,
    date: post.data.date,
    readMinutes: estimateReadMinutes(post.body ?? ''),
    tags: normalizeTaxonomy(post.data.tags),
    categories: getPostCategories(post),
    categoryPaths: getPostCategoryPaths(post),
    thumbnail,
    gallery: previewImages.slice(0, 8),
    href,
    external,
    externalSource: post.data.external_source,
    year,
    slug,
  };
}

export function formatPostDate(date?: Date): string {
  if (!date) {
    return 'Unknown date';
  }

  return date.toISOString().slice(0, 10).replaceAll('-', '.') + '.';
}
