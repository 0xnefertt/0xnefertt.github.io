import type { CollectionEntry } from 'astro:content';

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

function fallbackSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//.test(url);
}

export function normalizeAssetPath(assetPath: unknown, fallbackDir = 'assets/img'): string | undefined {
  if (typeof assetPath !== 'string') {
    return undefined;
  }

  if (!assetPath) {
    return undefined;
  }

  if (isExternalUrl(assetPath)) {
    return assetPath;
  }

  if (assetPath.startsWith('/')) {
    return assetPath;
  }

  if (assetPath.startsWith('assets/')) {
    return `/${assetPath}`;
  }

  return `/${fallbackDir}/${assetPath}`;
}

export interface RouteInfo {
  slug: string;
  href: string;
  external: boolean;
}

export function getProjectRoute(project: CollectionEntry<'projects'>): RouteInfo {
  if (project.data.redirect) {
    return {
      slug: getFileStem(project.filePath) ?? fallbackSlug(project.id),
      href: project.data.redirect,
      external: isExternalUrl(project.data.redirect),
    };
  }

  const slug = getFileStem(project.filePath) ?? fallbackSlug(project.id);
  return {
    slug,
    href: `/projects/${slug}/`,
    external: false,
  };
}

export function getBookRoute(book: CollectionEntry<'books'>): RouteInfo {
  const slug = getFileStem(book.filePath) ?? fallbackSlug(book.id);
  return {
    slug,
    href: `/books/${slug}/`,
    external: false,
  };
}

export function sortProjects(projects: CollectionEntry<'projects'>[]): CollectionEntry<'projects'>[] {
  return [...projects].sort((a, b) => {
    const aImportance = a.data.importance ?? Number.MAX_SAFE_INTEGER;
    const bImportance = b.data.importance ?? Number.MAX_SAFE_INTEGER;
    if (aImportance === bImportance) {
      return a.data.title.localeCompare(b.data.title);
    }
    return aImportance - bImportance;
  });
}
