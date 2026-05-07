import type { CollectionEntry } from 'astro:content';

export interface PostRoute {
  year: string;
  slug: string;
}

export interface BlogSummary {
  title: string;
  description?: string;
  date?: Date;
  readMinutes: number;
  tags: string[];
  categories: string[];
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

const WORDS_PER_MINUTE = 180;
const FILE_NAME_PATTERN = /^(\d{4})-\d{2}-\d{2}-(.+)$/;

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

function inferCategoriesFromPath(filePath?: string): string[] {
  const segments = splitPostPath(filePath);
  const postsIndex = segments.lastIndexOf('_posts');

  if (postsIndex === -1) {
    return [];
  }

  const relativeSegments = segments.slice(postsIndex + 1);
  if (relativeSegments.length <= 1) {
    return [];
  }

  return relativeSegments.slice(0, -1);
}

export function getPostCategories(post: CollectionEntry<'blog'>): string[] {
  const explicitCategories = normalizeTaxonomy(post.data.categories).map((item) => item.trim()).filter(Boolean);
  const inferredCategories = inferCategoriesFromPath(post.filePath);

  const uniqueBySlug = new Map<string, string>();

  for (const category of [...explicitCategories, ...inferredCategories]) {
    const slug = slugifyTerm(category);
    if (!slug) {
      continue;
    }

    if (!uniqueBySlug.has(slug)) {
      uniqueBySlug.set(slug, category);
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

export function listBlogCategories(posts: CollectionEntry<'blog'>[]): BlogCategory[] {
  const categoryMap = new Map<string, BlogCategory>();

  for (const post of posts) {
    const categories = getPostCategories(post);

    for (const categoryName of categories) {
      const trimmed = categoryName.trim();
      if (!trimmed) {
        continue;
      }

      const slug = slugifyTerm(trimmed);
      if (!slug) {
        continue;
      }

      const existing = categoryMap.get(slug);

      if (existing) {
        existing.count += 1;
      } else {
        categoryMap.set(slug, {
          name: trimmed,
          slug,
          count: 1,
        });
      }
    }
  }

  return [...categoryMap.values()].sort((a, b) => a.name.localeCompare(b.name));
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
    readMinutes: estimateReadMinutes(post.body),
    tags: normalizeTaxonomy(post.data.tags),
    categories: getPostCategories(post),
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
