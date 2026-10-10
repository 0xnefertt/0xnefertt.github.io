export type ContentLanguage = "en" | "ko";

export function inferContentLanguage(metadata: Record<string, unknown>, body = "", path = ""): ContentLanguage {
  if (metadata.lang === "en" || metadata.lang === "ko") return metadata.lang;
  const folder = path.match(/^_(?:posts|books|projects|pages)\/(en|ko)\//)?.[1];
  if (folder) return folder as ContentLanguage;
  // Support older private drafts and content created before language was explicit.
  return /[가-힣]/.test(`${metadata.title ?? ""} ${body}`) ? "ko" : "en";
}

export function contentTranslationKey(metadata: Record<string, unknown>, path: string): string {
  return String(metadata.translation_key ?? path.split("/").at(-1)?.replace(/\.md$/, "") ?? "");
}
