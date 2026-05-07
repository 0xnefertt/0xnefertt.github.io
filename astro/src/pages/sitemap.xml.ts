import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { listBlogCategories, slugifyTerm, sortPostsDesc, toBlogSummary } from '../lib/blog';
import { siteConfig } from '../lib/site';

const POSTS_PER_PAGE = 8;
const STATIC_PATHS = ['/', '/blog/', '/blog/search/', '/books/', '/projects/', '/repositories/', '/cv/', '/people/', '/publications/', '/teaching/', '/news/'];

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function joinAbsolute(base: string, path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.toString() ?? siteConfig.siteUrl).replace(/\/$/, '');
  const entries = sortPostsDesc(await getCollection('blog'));
  const categories = listBlogCategories(entries);
  const summaries = entries.map(toBlogSummary);

  const urls = new Map<string, string | undefined>();

  for (const path of STATIC_PATHS) {
    urls.set(path, undefined);
  }

  const internalPosts = summaries.filter((post) => !post.external);

  for (const post of internalPosts) {
    urls.set(post.href, post.date?.toISOString());
  }

  const totalBlogPages = Math.max(1, Math.ceil(internalPosts.length / POSTS_PER_PAGE));
  for (let page = 2; page <= totalBlogPages; page += 1) {
    urls.set(`/blog/page-${page}/`, undefined);
  }

  for (const category of categories) {
    const categoryPosts = internalPosts.filter((post) => post.categories.some((item) => slugifyTerm(item) === category.slug));
    urls.set(`/blog/category/${category.slug}/`, categoryPosts[0]?.date?.toISOString());

    const totalCategoryPages = Math.max(1, Math.ceil(categoryPosts.length / POSTS_PER_PAGE));
    for (let page = 2; page <= totalCategoryPages; page += 1) {
      urls.set(`/blog/category/${category.slug}/page-${page}/`, undefined);
    }
  }

  const urlNodes = [...urls.entries()]
    .map(([path, lastmod]) => {
      const parts = [`<loc>${escapeXml(joinAbsolute(base, path))}</loc>`];
      if (lastmod) {
        parts.push(`<lastmod>${escapeXml(lastmod)}</lastmod>`);
      }

      return `<url>${parts.join('')}</url>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlNodes}</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
