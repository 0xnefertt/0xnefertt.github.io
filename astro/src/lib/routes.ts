import { getCollection } from 'astro:content';
import { getBlogHref, getLegacyCategoryPaths, getPostCategoryPaths, getPostRoute, getPublishedBlogPosts, listBlogCategoryTree, sortPostsDesc } from './blog';
import { getBookRoute, getProjectRoute } from './content';
import { contentLocale, inLocale, locales, localizedPath, translationKey, unlocalizedPath, type Locale } from './locale';

export interface SiteRoute {
  path: string;
  view: string;
  props: Record<string, unknown>;
  group?: string;
  locale: Locale;
  redirect?: string;
  noindex?: boolean;
}
let routesPromise: Promise<SiteRoute[]> | undefined;
export function getSiteRoutes(): Promise<SiteRoute[]> {
  if (import.meta.env?.DEV) return buildRoutes();
  return routesPromise ??= buildRoutes();
}
async function buildRoutes(): Promise<SiteRoute[]> {
  const [posts, books, projects] = await Promise.all([getCollection('blog'), getCollection('books'), getCollection('projects')]);
  const routes = new Map<string, SiteRoute>();
  function add(path: string, view: string, locale: Locale, props: Record<string, unknown> = {}, group?: string, noindex = false) {
    const localized = localizedPath(path, locale);
    if (group && [...routes.values()].some((route) => route.group === group && route.locale === locale)) throw new Error(`Duplicate translation group: ${locale}/${group}`);
    if (routes.has(localized)) throw new Error(`Duplicate public route: ${localized}`);
    routes.set(localized, { path: localized, view, props, group, locale, noindex });
  }
  for (const locale of locales) {
    for (const [path, view] of [['/', 'index'], ['/about/', 'about'], ['/blog/', 'blog/index'], ['/blog/search/', 'blog/search'], ['/books/', 'books/index'], ['/projects/', 'projects/index'], ['/privacy/', 'privacy']]) {
      add(path, view, locale, {}, path, path === '/blog/search/');
    }
    const published = getPublishedBlogPosts(sortPostsDesc(posts), locale);
    for (let page = 2; page <= Math.ceil(published.length / 8); page++) add(`/blog/page-${page}/`, 'blog/page-[page]', locale, { currentPage: page }, undefined, true);
    for (const parent of listBlogCategoryTree(published, locale)) {
      const parentPath = `/blog/category/${parent.slug}/`;
      add(parentPath, 'blog/category/[category]', locale, { category: parent }, parentPath);
      const parentPosts = published.filter((post) => getPostCategoryPaths(post).some((path) => path.parentSlug === parent.slug));
      for (let page = 2; page <= Math.ceil(parentPosts.length / 8); page++) add(`${parentPath}page-${page}/`, 'blog/category/[category]/page-[page]', locale, { category: parent, currentPage: page }, undefined, true);
      for (const child of parent.children) {
        const childPath = `${parentPath}${child.slug}/`;
        const props = { parentCategory: parent, childCategory: child };
        add(childPath, 'blog/category/[parent]/[child]', locale, props, childPath);
        const childPosts = parentPosts.filter((post) => getPostCategoryPaths(post).some((path) => path.childSlug === child.slug));
        for (let page = 2; page <= Math.ceil(childPosts.length / 8); page++) add(`${childPath}page-${page}/`, 'blog/category/[parent]/[child]/page-[page]', locale, { ...props, currentPage: page }, undefined, true);
      }
    }
    for (const post of published.filter((post) => !post.data.redirect)) {
      add(unlocalizedPath(getBlogHref(post).href), 'blog/[year]/[slug]', locale, { post }, `blog:${translationKey(post)}`);
    }
    for (const entry of inLocale(books, locale)) add(unlocalizedPath(getBookRoute(entry).href), 'books/[slug]', locale, { entry }, `books:${translationKey(entry)}`);
    for (const project of inLocale(projects, locale).filter((entry) => !entry.data.redirect)) add(unlocalizedPath(getProjectRoute(project).href), 'projects/[slug]', locale, { project }, `projects:${translationKey(project)}`);
  }
  // Preserve old and category-migration links with redirects to the canonical language URL.
  function alias(path: string, destination: string, locale: Locale) {
    if (path !== destination && !routes.has(path)) routes.set(path, { path, view: 'redirect', props: {}, locale, redirect: destination, noindex: true });
  }
  for (const post of getPublishedBlogPosts(posts)) {
    const locale = contentLocale(post);
    const destination = getBlogHref(post).href;
    const { year, slug } = getPostRoute(post);
    const paths = [`/blog/${year}/${slug}/`, ...[...getPostCategoryPaths(post), ...getLegacyCategoryPaths(post)].filter((path) => path.childSlug).map((path) => `/blog/category/${path.parentSlug}/${path.childSlug}/${slug}/`)];
    if (post.data.redirect) {
      for (const path of paths) alias(localizedPath(path, locale), destination, locale);
    }
    for (const path of paths) {
      alias(localizedPath(path, locale), destination, locale);
      if (locale === 'ko') alias(path, destination, locale);
    }
  }
  for (const entry of [...inLocale(books, 'ko'), ...inLocale(projects, 'ko')]) {
    const destination = entry.collection === 'books' ? getBookRoute(entry as typeof books[number]).href : getProjectRoute(entry as typeof projects[number]).href;
    alias(unlocalizedPath(destination), destination, 'ko');
  }
  return [...routes.values()];
}
export async function getLanguageLinks(path: string) {
  const routes = await getSiteRoutes();
  const current = routes.find((route) => route.path === path);
  const peers = current?.group ? routes.filter((route) => route.group === current.group && !route.redirect) : [];
  return locales.map((locale) => {
    const peer = peers.find((route) => route.locale === locale);
    const fallback = /^\/(?:ko\/)?books\//.test(path) ? '/books/' : /^\/(?:ko\/)?projects\//.test(path) ? '/projects/' : '/blog/';
    return { locale, href: peer?.path ?? localizedPath(fallback, locale), translated: Boolean(peer) };
  });
}
