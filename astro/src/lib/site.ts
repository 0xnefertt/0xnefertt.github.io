import { getCollection } from 'astro:content';
import { localizedPath, type Locale } from './locale';
import { t } from './messages';
import { getPublishedBlogPosts, listBlogCategoryTree } from './blog';
import { siteSettings } from './settings';

const gaMeasurementId = import.meta.env.PUBLIC_GA_MEASUREMENT_ID?.trim() ?? '';
const adsensePublisherId = import.meta.env.PUBLIC_ADSENSE_PUBLISHER_ID?.trim() ?? '';

export const siteConfig = {
  title: siteSettings.siteTitle,
  siteUrl: 'https://0xnefertt.github.io',
  blogName: siteSettings.blogName,
  blogDescriptionKo: siteSettings.blogDescriptionKo,
  blogDescription: siteSettings.blogDescription,
  defaultOgImage: siteSettings.defaultOgImage || '/favicon.svg',
  xHandle: siteSettings.xUrl.match(/^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/([\w]+)\/?$/)?.[1],
  socialLinks: [
    ...(siteSettings.email ? [{ label: 'email', href: `mailto:${siteSettings.email}` }] : []),
    ...(siteSettings.githubUrl ? [{ label: 'github', href: siteSettings.githubUrl }] : []),
    ...(siteSettings.xUrl ? [{ label: 'x', href: siteSettings.xUrl }] : []),
  ],
  adsensePublisherId,
  gaMeasurementId,
  giscus: {
    repo: (import.meta.env.PUBLIC_GISCUS_REPO ?? '').trim(),
    repoId: (import.meta.env.PUBLIC_GISCUS_REPO_ID ?? '').trim(),
    category: (import.meta.env.PUBLIC_GISCUS_CATEGORY ?? '').trim(),
    categoryId: (import.meta.env.PUBLIC_GISCUS_CATEGORY_ID ?? '').trim(),
    mapping: 'pathname',
  },
};

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
  disabled?: boolean;
}

export async function getNavItems(locale: Locale = 'en'): Promise<NavItem[]> {
  const blogCategoryTree = listBlogCategoryTree(getPublishedBlogPosts(await getCollection('blog'), locale), locale);
  return [
    { label: t(locale, 'nav_about'), href: localizedPath('/about/', locale) },
    {
      label: t(locale, 'nav_blog'),
      href: localizedPath('/blog/', locale),
      children: blogCategoryTree.map((parent) => ({
        label: `${parent.name}${parent.count === 0 ? ' (0)' : ''}`,
        href: parent.href,
        disabled: parent.count === 0,
        children: parent.children.map((child) => ({
          label: `${child.name}${child.count === 0 ? ' (0)' : ''}`,
          href: child.href,
          disabled: child.count === 0,
        })),
      })),
    },
    { label: t(locale, 'nav_bookshelf'), href: localizedPath('/books/', locale) },
    { label: t(locale, 'nav_projects'), href: localizedPath('/projects/', locale) },
  ];
}
