import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getSiteRoutes, getLanguageLinks } from '../lib/routes';
import { siteConfig } from '../lib/site';
import { contentLocale, inLocale } from '../lib/locale';
import { getPublishedBlogPosts } from '../lib/blog';
import { createLastmodResolver, latestLastmod, renderSitemap } from '../lib/sitemap';

export const GET: APIRoute = async ({ site }) => {
  const base = site?.toString() ?? siteConfig.siteUrl;
  const routes = (await getSiteRoutes()).filter((route) => !route.noindex && !route.redirect);
  const [pages, posts, books, projects] = await Promise.all([
    getCollection('pages'),
    getCollection('blog'),
    getCollection('books'),
    getCollection('projects'),
  ]);
  const modified = createLastmodResolver();
  const entries = await Promise.all(
    routes.map(async (route) => {
      const links = (await getLanguageLinks(route.path)).filter((link) => link.translated);
      const content = (route.props.post ?? route.props.entry ?? route.props.project) as
        | { filePath?: string; data: Record<string, unknown> }
        | undefined;
      const about = pages.find((page) => page.filePath?.endsWith('/about.md') && contentLocale(page) === route.locale);
      const published = getPublishedBlogPosts(posts, route.locale).filter((post) => !post.data.redirect);
      let lastmod = content ? modified(content) : undefined;
      if (route.view === 'about') lastmod = about && modified(about);
      if (route.view === 'index') lastmod = latestLastmod([...(about ? [modified(about)] : []), ...published.map(modified)]);
      if (route.view === 'blog/index') lastmod = latestLastmod(published.map(modified));
      if (route.view === 'books/index') lastmod = latestLastmod(inLocale(books, route.locale).map(modified));
      if (route.view === 'projects/index')
        lastmod = latestLastmod(
          inLocale(projects, route.locale)
            .filter((entry) => !entry.data.redirect)
            .map(modified)
        );
      return {
        location: new URL(route.path, base).href,
        lastmod,
        alternatives: links.map((link) => ({ locale: link.locale, href: new URL(link.href, base).href })),
      };
    })
  );
  return new Response(renderSitemap(entries), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
