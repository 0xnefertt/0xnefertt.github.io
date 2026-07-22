import { readFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '..');
const dataRoot = path.join(repoRoot, '_data');

function extractFirstValue(content: string, key: string): string | undefined {
  const pattern = new RegExp(`^${key}:\\s*(.+)$`, 'm');
  const match = content.match(pattern);

  if (!match) {
    return undefined;
  }

  return match[1].trim().replace(/^['"]|['"]$/g, '');
}

export interface SocialLink {
  label: string;
  href: string;
}

export async function getSocialLinks(): Promise<SocialLink[]> {
  const content = await readFile(path.join(dataRoot, 'socials.yml'), 'utf-8');

  const email = extractFirstValue(content, 'email');
  const github = extractFirstValue(content, 'github_username');
  const x = extractFirstValue(content, 'x_username');
  const rssEnabled = extractFirstValue(content, 'rss_icon') === 'true';

  const links: SocialLink[] = [];

  if (email) {
    links.push({
      label: 'email',
      href: `mailto:${email}`,
    });
  }

  if (github) {
    links.push({
      label: 'github',
      href: `https://github.com/${github}`,
    });
  }

  if (x) {
    links.push({
      label: 'x',
      href: `https://x.com/${x}`,
    });
  }

  if (rssEnabled) {
    links.push({
      label: 'rss',
      href: '/rss.xml',
    });
  }

  return links;
}
