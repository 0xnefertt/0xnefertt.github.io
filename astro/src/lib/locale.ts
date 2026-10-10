import { inferContentLanguage, contentTranslationKey, type ContentLanguage } from '../../../shared/content-language';

export type Locale = ContentLanguage;
export const locales: Locale[] = ['en', 'ko'];
export function localeFromPath(path: string): Locale {
  return /^\/ko(?:\/|$)/.test(path) ? 'ko' : 'en';
}
export function unlocalizedPath(path: string): string {
  return path.replace(/^\/ko(?=\/|$)/, '') || '/';
}
export function localizedPath(path: string, locale: Locale): string {
  if (!path.startsWith('/') || path.startsWith('//') || /^\/(?:assets|admin|edit)(?:\/|$)/.test(path)) return path;
  const plain = unlocalizedPath(path);
  return locale === 'ko' ? `/ko${plain}` : plain;
}
export function contentLocale(entry: { data: Record<string, unknown>; body?: string; filePath?: string }): Locale {
  return inferContentLanguage(entry.data, entry.body, entry.filePath);
}
export function translationKey(entry: { data: Record<string, unknown>; filePath?: string; id: string }): string {
  return contentTranslationKey(entry.data, entry.filePath ?? entry.id);
}
export function inLocale<T extends { data: Record<string, unknown>; body?: string; filePath?: string }>(entries: T[], locale: Locale): T[] {
  return entries.filter((entry) => contentLocale(entry) === locale && entry.data.draft !== true);
}
export function localeText(locale: Locale, english: string, korean: string): string {
  return locale === 'ko' ? korean : english;
}
