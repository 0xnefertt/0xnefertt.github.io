import { getCollection } from 'astro:content';
import { getPublishedBlogPosts, listBlogCategoryTree } from './blog';

const gaMeasurementId = import.meta.env.PUBLIC_GA_MEASUREMENT_ID?.trim() ?? '';
const adsensePublisherId = import.meta.env.PUBLIC_ADSENSE_PUBLISHER_ID?.trim() ?? '';

export const siteConfig = {
  title: "0xnefertt's thoughts",
  description: '소프트웨어 개발, 캐나다 생활, 커리어와 금융 리서치를 직접 경험과 공식 자료를 바탕으로 기록하는 0xnefertt의 블로그입니다.',
  lang: 'ko',
  siteUrl: 'https://0xnefertt.github.io',
  blogName: "0xnefertt's Blog",
  blogDescription: '소프트웨어 개발, 캐나다 생활, 커리어와 금융에 관한 학습 기록과 실용적인 리서치',
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

export async function getNavItems(): Promise<NavItem[]> {
  const [pages, posts] = await Promise.all([getCollection('pages'), getCollection('blog')]);
  const blogCategoryTree = listBlogCategoryTree(getPublishedBlogPosts(posts));

  const aboutPage = pages.find((entry) => entry.data.permalink === '/');
  const aboutTitle = aboutPage?.data.title ?? 'about';

  const ordered = pages
    .filter((entry) => entry.data.nav && entry.data.permalink && entry.data.permalink !== '/')
    .sort((a, b) => {
      const aOrder = a.data.nav_order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.data.nav_order ?? Number.MAX_SAFE_INTEGER;
      if (aOrder === bOrder) {
        return (a.data.title ?? '').localeCompare(b.data.title ?? '');
      }
      return aOrder - bOrder;
    })
    .map((entry) => {
      const href = entry.data.permalink ?? '/';
      const isBlogNav = href === '/blog/';

      return {
        label: entry.data.title ?? entry.id,
        href,
        children: isBlogNav
          ? blogCategoryTree.map((parent) => ({
              label: parent.name,
              href: parent.href,
              children: parent.children.map((child) => ({
                label: child.name,
                href: child.href,
              })),
            }))
          : undefined,
      };
    });

  return [{ label: aboutTitle, href: '/' }, ...ordered];
}
