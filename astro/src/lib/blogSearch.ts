import type { CollectionEntry } from 'astro:content';
import { formatPostDate, toBlogSummary } from './blog';

export interface BlogSearchItem {
  title: string;
  description: string;
  content: string;
  href: string;
  external: boolean;
  externalSource: string;
  readMinutes: number;
  dateLabel: string;
  dateValue: number;
  tags: string[];
  categories: string[];
  categoryPaths: {
    href: string;
    label: string;
  }[];
}

export function normalizeMarkdownForSearch(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 14000);
}

export function buildBlogSearchIndex(posts: CollectionEntry<'blog'>[]): BlogSearchItem[] {
  return posts.map((entry) => {
    const post = toBlogSummary(entry);

    return {
      title: post.title,
      description: post.description ?? '',
      content: normalizeMarkdownForSearch(entry.body ?? ''),
      href: post.href,
      external: post.external,
      externalSource: post.externalSource ?? '',
      readMinutes: post.readMinutes,
      dateLabel: formatPostDate(post.date),
      dateValue: post.date?.getTime() ?? 0,
      tags: post.tags,
      categories: post.categories,
      categoryPaths: post.categoryPaths.map((categoryPath) => ({
        href: categoryPath.href,
        label: categoryPath.label,
      })),
    };
  });
}

export function toSafeJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
