import type { CollectionEntry } from "astro:content";
import { contentLocale, localizedPath } from "./locale";
import { slugify } from "../../../shared/slug";

function getFileStem(filePath?: string): string | undefined {
  if (!filePath) {
    return undefined;
  }

  const fileName = filePath.split("/").pop();
  if (!fileName) {
    return undefined;
  }

  return fileName.replace(/\.mdx?$/, "");
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//.test(url);
}

export function normalizeAssetPath(assetPath: unknown, fallbackDir = "assets/img"): string | undefined {
  if (typeof assetPath !== "string") {
    return undefined;
  }

  if (!assetPath) {
    return undefined;
  }

  if (isExternalUrl(assetPath)) {
    return assetPath;
  }

  if (assetPath.startsWith("/")) {
    return assetPath;
  }

  if (assetPath.startsWith("assets/")) {
    return `/${assetPath}`;
  }

  return `/${fallbackDir}/${assetPath}`;
}

export interface RouteInfo {
  slug: string;
  href: string;
  external: boolean;
}

// Prefers the file name on disk so renamed titles keep stable URLs,
// falling back to a slugified entry id when the file path is unknown.
function resolveSlug(entry: Pick<CollectionEntry<"projects">, "filePath" | "id">): string {
  return getFileStem(entry.filePath) ?? slugify(entry.id);
}

export function getProjectRoute(project: CollectionEntry<"projects">): RouteInfo {
  const slug = resolveSlug(project);

  if (project.data.redirect) {
    return {
      slug,
      href: project.data.redirect,
      external: isExternalUrl(project.data.redirect),
    };
  }

  return {
    slug,
    href: localizedPath(`/projects/${slug}/`, contentLocale(project)),
    external: false,
  };
}

export function getBookRoute(book: CollectionEntry<"books">): RouteInfo {
  const slug = resolveSlug(book);
  return {
    slug,
    href: localizedPath(`/books/${slug}/`, contentLocale(book)),
    external: false,
  };
}

export function sortProjects(projects: CollectionEntry<"projects">[]): CollectionEntry<"projects">[] {
  return [...projects].sort((a, b) => {
    const aImportance = a.data.importance ?? Number.MAX_SAFE_INTEGER;
    const bImportance = b.data.importance ?? Number.MAX_SAFE_INTEGER;
    if (aImportance === bImportance) {
      return a.data.title.localeCompare(b.data.title);
    }
    return aImportance - bImportance;
  });
}
