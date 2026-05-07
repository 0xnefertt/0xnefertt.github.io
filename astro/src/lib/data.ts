import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '..');
const dataRoot = path.join(repoRoot, '_data');
const assetsRoot = path.join(repoRoot, 'assets');

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

export interface CvMeta {
  resumePdfHref?: string;
  resumePdfLabel?: string;
  resumePdfAvailable: boolean;
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
      href: '/feed.xml',
    });
  }

  return links;
}

export async function getResumeData(): Promise<unknown> {
  const resumePath = path.join(assetsRoot, 'json', 'resume.json');
  const content = await readFile(resumePath, 'utf-8');
  return JSON.parse(content);
}

function normalizePublicPath(input: string): string {
  return input.startsWith('/') ? input : `/${input}`;
}

async function hasFile(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function getCvMeta(): Promise<CvMeta> {
  const cvMetaPath = path.join(dataRoot, 'cv-meta.yml');
  const content = await readFile(cvMetaPath, 'utf-8').catch(() => '');

  const rawPdfHref = extractFirstValue(content, 'resume_pdf');
  const resumePdfLabel = extractFirstValue(content, 'resume_pdf_label') ?? 'Download CV (PDF)';

  if (!rawPdfHref) {
    return {
      resumePdfLabel,
      resumePdfAvailable: false,
    };
  }

  const resumePdfHref = normalizePublicPath(rawPdfHref);
  const fileSystemPath = path.join(repoRoot, resumePdfHref.replace(/^\/+/, ''));
  const resumePdfAvailable = await hasFile(fileSystemPath);

  return {
    resumePdfHref,
    resumePdfLabel,
    resumePdfAvailable,
  };
}
