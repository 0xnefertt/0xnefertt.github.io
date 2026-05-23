import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getPostCategories, getPostRoute, getPublishedBlogPosts, sortPostsDesc, toBlogSummary } from '../lib/blog';
import { siteConfig } from '../lib/site';

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[>#*_~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function excerpt(input: string, maxLength: number): string {
  if (input.length <= maxLength) {
    return input;
  }

  return `${input.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.toString() ?? siteConfig.siteUrl).replace(/\/$/, '');
  const posts = getPublishedBlogPosts(sortPostsDesc(await getCollection('blog')))
    .filter((entry) => !entry.data.redirect)
    .slice(0, 60);

  const itemsXml = posts
    .map((entry) => {
      const summary = toBlogSummary(entry);
      const route = getPostRoute(entry);
      const url = `${base}/blog/${route.year}/${route.slug}/`;
      const published = entry.data.date?.toUTCString() ?? new Date(0).toUTCString();
      const description = excerpt(summary.description ?? normalizeMarkdown(entry.body ?? ''), 320);
      const categories = getPostCategories(entry)
        .map((category) => `<category>${escapeXml(category)}</category>`)
        .join('');

      return [
        '<item>',
        `<title>${escapeXml(summary.title)}</title>`,
        `<link>${escapeXml(url)}</link>`,
        `<guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `<pubDate>${escapeXml(published)}</pubDate>`,
        `<description>${escapeXml(description)}</description>`,
        categories,
        '</item>',
      ].join('');
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>${escapeXml(siteConfig.blogName)}</title>\n    <description>${escapeXml(siteConfig.blogDescription)}</description>\n    <link>${escapeXml(`${base}/blog/`)}</link>\n    <atom:link href="${escapeXml(`${base}/rss.xml`)}" rel="self" type="application/rss+xml" />\n    <language>en-us</language>\n    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n    ${itemsXml}\n  </channel>\n</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
