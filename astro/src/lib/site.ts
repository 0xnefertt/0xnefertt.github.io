import { getCollection } from 'astro:content';
import { localizedPath, type Locale } from './locale';
import { t } from './messages';
import { getPublishedBlogPosts, listBlogCategoryTree } from './blog';

const gaMeasurementId = import.meta.env.PUBLIC_GA_MEASUREMENT_ID?.trim() ?? '';
const adsensePublisherId = import.meta.env.PUBLIC_ADSENSE_PUBLISHER_ID?.trim() ?? '';

export const siteConfig = {
  title: "0xnefertt's thoughts",
  description: 'Personal notes on software development, life in Canada, careers, and financial research.',
  lang: 'en',
  siteUrl: 'https://0xnefertt.github.io',
  blogName: "0xnefertt's Blog",
  blogDescriptionKo: '소프트웨어 개발, 캐나다 생활, 커리어와 금융에 관한 학습 기록과 실용적인 리서치',
  blogDescription: 'Learning notes and practical research on software development, life in Canada, careers, and finance.',
  defaultOgImage: '/assets/img/prof_pic.jpg',
  xHandle: '@0xnefertt',
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
}

export async function getNavItems(locale: Locale = 'en'): Promise<NavItem[]> {
  const blogCategoryTree = listBlogCategoryTree(getPublishedBlogPosts(await getCollection('blog'), locale), locale);
  return [
    { label: t(locale, 'nav_about'), href: localizedPath('/about/', locale) },
    { label: t(locale, 'nav_blog'), href: localizedPath('/blog/', locale), children: blogCategoryTree.map((parent) => ({
      label: parent.name, href: parent.href, children: parent.children.map((child) => ({label: child.name, href: child.href})),
    })) },
    { label: t(locale, 'nav_bookshelf'), href: localizedPath('/books/', locale) },
    { label: t(locale, 'nav_projects'), href: localizedPath('/projects/', locale) },
  ];
}
