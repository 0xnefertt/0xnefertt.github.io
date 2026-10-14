import { localeText, type Locale } from "./locale";
import { siteSettings } from "./settings";

export function blogSeoDescription(locale: Locale): string {
  const introduction = localeText(locale, siteSettings.seoDescription, siteSettings.seoDescriptionKo);
  return localeText(
    locale,
    `Browse all posts from ${siteSettings.blogName}. ${introduction}`,
    `${siteSettings.blogName}의 전체 글 목록입니다. ${introduction}`
  );
}

export function categorySeoDescription(locale: Locale, names: string[]): string {
  const category = names.join(" / ");
  return localeText(locale, `Read posts and learning notes in ${category}.`, `${category} 카테고리의 글과 학습 기록을 모았습니다.`);
}
