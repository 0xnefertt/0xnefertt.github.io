// Category taxonomy shared by the Astro site and the writer admin.
// Lives here (instead of writer/src) so astro code never imports from writer.
export interface CategoryChild {
  name: string;
  name_ko?: string;
  slug: string;
}

export interface CategoryGroup extends CategoryChild {
  children: CategoryChild[];
}

// Localized display name with English fallback when the Korean name is unset.
export function categoryName(category: CategoryChild, locale: "en" | "ko"): string {
  return locale === "ko" ? category.name_ko || category.name : category.name;
}
