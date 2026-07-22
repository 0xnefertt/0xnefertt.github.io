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

function extractYamlList(content: string, key: string): string[] {
  const blockPattern = new RegExp(`^${key}:\\s*$([\\s\\S]*?)(?=^\\S|$)`, 'm');
  const blockMatch = content.match(blockPattern);

  if (!blockMatch) {
    return [];
  }

  return blockMatch[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

export interface RepositoryData {
  githubUsers: string[];
  githubRepos: string[];
}

export interface SocialLink {
  label: string;
  href: string;
}

export async function getRepositoryData(): Promise<RepositoryData> {
  const content = await readFile(path.join(dataRoot, 'repositories.yml'), 'utf-8');

  return {
    githubUsers: extractYamlList(content, 'github_users'),
    githubRepos: extractYamlList(content, 'github_repos'),
  };
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
