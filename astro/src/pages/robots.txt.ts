import type { APIRoute } from 'astro';
import { siteConfig } from '../lib/site';

export const GET: APIRoute = ({ site }) => {
  const base = (site?.toString() ?? siteConfig.siteUrl).replace(/\/$/, '');
  const body = [`User-agent: *`, `Allow: /`, '', `Sitemap: ${base}/sitemap.xml`, `Sitemap: ${base}/rss.xml`].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
