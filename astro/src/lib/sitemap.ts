import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface SitemapEntry {
  location: string;
  lastmod?: string;
}

function isoDate(value: unknown): string | undefined {
  if (!(value instanceof Date) && typeof value !== 'string') return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function latestLastmod(values: (string | undefined)[]): string | undefined {
  return values
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
}

export function createLastmodResolver(repositoryRoot = resolve(process.cwd(), existsSync('_posts') ? '.' : '..')) {
  const dates = new Map<string, string | undefined>();
  return (entry: { filePath?: string; data: Record<string, unknown> }): string | undefined => {
    const source = entry.filePath?.replaceAll('\\', '/').match(/(?:^|\/)((?:_posts|_books|_projects|_pages)\/.+)$/)?.[1];
    if (source && !dates.has(source)) {
      let modified: string | undefined;
      try {
        modified = isoDate(
          execFileSync('git', ['-C', repositoryRoot, 'log', '-1', '--format=%cI', '--', source], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
          }).trim()
        );
      } catch {
        // Exported source trees can still use explicitly recorded content dates.
      }
      dates.set(source, modified);
    }
    return latestLastmod([isoDate(entry.data.last_updated), source ? dates.get(source) : undefined]) ?? isoDate(entry.data.date);
  };
}

const xml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function renderSitemap(entries: SitemapEntry[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    // XHTML elements disable browsers' native XML tree viewer. Hreflang stays in page HTML.
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.flatMap((entry) => [
      '  <url>',
      `    <loc>${xml(entry.location)}</loc>`,
      ...(entry.lastmod ? [`    <lastmod>${xml(entry.lastmod)}</lastmod>`] : []),
      '  </url>',
    ]),
    '</urlset>',
    '',
  ].join('\n');
}
