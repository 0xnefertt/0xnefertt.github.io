import type { CollectionEntry } from 'astro:content';
import { getPostCategories, normalizeTaxonomy, toBlogSummary } from './blog';
import { getBookRoute } from './content';
import { inLocale, type Locale } from './locale';

export function sortBooks(books: CollectionEntry<'books'>[]): CollectionEntry<'books'>[] {
  return [...books].sort((a, b) => (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0) || a.id.localeCompare(b.id));
}

export function getBookNeighbors(book: CollectionEntry<'books'>, books: CollectionEntry<'books'>[], locale: Locale) {
  const ordered = sortBooks(inLocale(books, locale));
  const index = ordered.findIndex((entry) => entry.id === book.id);
  return {
    previous: index >= 0 ? ordered[index + 1] : undefined,
    next: index > 0 ? ordered[index - 1] : undefined,
  };
}

export function getBookRecommendations(
  book: CollectionEntry<'books'>,
  books: CollectionEntry<'books'>[],
  posts: CollectionEntry<'blog'>[],
  locale: Locale
) {
  const topic = (value: string) =>
    value
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '-');
  const terms = new Set([...normalizeTaxonomy(book.data.tags), ...normalizeTaxonomy(book.data.categories)].map(topic).filter(Boolean));
  const candidates = [
    ...inLocale(books, locale)
      .filter((entry) => entry.id !== book.id)
      .map((entry) => ({
        title: entry.data.title,
        ...getBookRoute(entry),
        date: entry.data.date,
        kind: 'books' as const,
        terms: [...normalizeTaxonomy(entry.data.tags), ...normalizeTaxonomy(entry.data.categories)],
      })),
    ...inLocale(posts, locale)
      .filter((entry) => !entry.data.redirect)
      .map((entry) => ({
        ...toBlogSummary(entry),
        kind: 'blog' as const,
        terms: [...normalizeTaxonomy(entry.data.tags), ...getPostCategories(entry)],
      })),
  ];
  return candidates
    .map((item) => ({
      ...item,
      score: new Set(item.terms.map(topic).filter((term) => term && terms.has(term))).size,
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.kind === 'books') - Number(a.kind === 'books') ||
        (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0) ||
        a.href.localeCompare(b.href)
    )
    .slice(0, 4);
}
