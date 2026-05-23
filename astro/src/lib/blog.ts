import type { CollectionEntry } from 'astro:content';

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

const WORDS_PER_MINUTE = 180;
const FILE_NAME_PATTERN = /^(\d{4})-\d{2}-\d{2}-(.+)$/;

interface ParentCategoryPreset {
  slug: string;
  label: string;
  aliases: string[];
}

const PARENT_CATEGORY_PRESETS: ParentCategoryPreset[] = [
  {
    slug: 'money-talk',
    label: '돈 이야기',
    aliases: ['money-talk', 'finance', 'energy', 'mining', 'writed-by-ai', 'transportation'],
  },
  {
    slug: 'useful-tips',
    label: '정보 공유',
    aliases: ['useful-tips', 'technology', 'tips'],
  },
  {
    slug: 'study-log',
    label: '공부 기록',
    aliases: ['study-log', 'study', 'dev', 'research'],
  },
  {
    slug: 'reading-log',
    label: '독서 기록',
    aliases: ['reading-log', 'reading', 'books'],
  },
  {
    slug: 'life-thoughts',
    label: '일상·생각',
    aliases: ['life-thoughts', 'thoughts', 'uncategory', 'life'],
  },
  {
    slug: 'life-in-canada',
    label: '캐나다 생활',
    aliases: ['life-in-canada', 'canada'],
  },
];

const PARENT_ALIAS_LOOKUP = new Map<string, ParentCategoryPreset>(
  PARENT_CATEGORY_PRESETS.flatMap((preset) => preset.aliases.map((alias) => [alias, preset] as const))
);

function toTitleCaseWords(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function remapCategoryPath(names: string[], slugs: string[]): { names: string[]; slugs: string[] } {
  const parentName = names[0];
  const parentSlug = slugs[0];
  const childName = names[1];
  const childSlug = slugs[1];

  const preset = PARENT_ALIAS_LOOKUP.get(parentSlug);
  if (!preset) {
    return { names, slugs };
  }

  if (childName && childSlug) {
    return {
      names: [preset.label, childName],
      slugs: [preset.slug, childSlug],
    };
  }

  if (preset.slug === parentSlug) {
    return {
      names: [preset.label],
      slugs: [preset.slug],
    };
  }

  const childLabel = toTitleCaseWords(parentName.replace(/[-_]+/g, ' '));
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

  return toTwoLevelSegments(relativeSegments.slice(0, -1));
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

  const explicitEntries = explicitCategories.map(parseCategoryTerm).filter((segments) => segments.length > 0);
  const entries: string[][] = [...explicitEntries];

  if (inferredCategoryPath.length > 0) {
    entries.push(inferredCategoryPath);
  }

  if (inferredCategoryPath.length === 1) {
    const inferredParent = inferredCategoryPath[0];
    const inferredParentSlug = slugifyTerm(inferredParent);

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

    if (!uniqueByKey.has(categoryPath.key)) {
      uniqueByKey.set(categoryPath.key, categoryPath);
    }
  }

  return [...uniqueByKey.values()];
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

export function listBlogCategoryTree(posts: CollectionEntry<'blog'>[]): BlogCategoryTreeParent[] {
  const categoryMap = new Map<string, { name: string; slug: string; count: number; children: Map<string, BlogCategoryTreeChild> }>();

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

      if (!categoryPath.childSlug || !categoryPath.childName) {
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
    .map((parent) => ({
      name: parent.name,
      slug: parent.slug,
      count: parent.count,
      href: `/blog/category/${parent.slug}/`,
      children: [...parent.children.values()].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
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

export function getPublishedBlogPosts(posts: CollectionEntry<'blog'>[]): CollectionEntry<'blog'>[] {
  return posts.filter((post) => !isDraftPost(post));
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
  return {
    href: `/blog/${year}/${slug}/`,
    external: false,
  };
}

export function sortPostsDesc(posts: CollectionEntry<'blog'>[]): CollectionEntry<'blog'>[] {
  return [...posts].sort((a, b) => safeDate(b.data.date).getTime() - safeDate(a.data.date).getTime());
}

export function toBlogSummary(post: CollectionEntry<'blog'>): BlogSummary {
  const { year, slug } = getPostRoute(post);
  const { href, external } = getBlogHref(post);

  return {
    title: post.data.title,
    description: post.data.description,
    date: post.data.date,
    readMinutes: estimateReadMinutes(post.body ?? ''),
    tags: normalizeTaxonomy(post.data.tags),
    categories: getPostCategories(post),
    categoryPaths: getPostCategoryPaths(post),
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

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(date);
}
