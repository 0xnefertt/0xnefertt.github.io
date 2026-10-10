import type { APIRoute } from 'astro';
import { getSiteRoutes, getLanguageLinks } from '../lib/routes';
import { siteConfig } from '../lib/site';
const xml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
export const GET: APIRoute = async ({ site }) => {
 const base = site?.toString() ?? siteConfig.siteUrl;
 const routes = (await getSiteRoutes()).filter((route) => !route.noindex && !route.redirect);
 const nodes = await Promise.all(routes.map(async (route) => {
   const links = (await getLanguageLinks(route.path)).filter((link) => link.translated);
   return `<url><loc>${xml(new URL(route.path, base).href)}</loc>${links.map((link) => `<xhtml:link rel="alternate" hreflang="${link.locale}" href="${xml(new URL(link.href, base).href)}" />`).join('')}</url>`;
 }));
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${nodes.join('')}</urlset>`, {headers: {'Content-Type': 'application/xml; charset=utf-8'}});
};
