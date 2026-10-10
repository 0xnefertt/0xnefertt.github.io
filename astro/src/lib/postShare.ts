export function postShareLinks(title: string, input: string) {
  const canonical = new URL(input);
  if (!['https:', 'http:'].includes(canonical.protocol)) throw new Error('Invalid post sharing URL');
  canonical.search = '';
  canonical.hash = '';
  const url = canonical.href;
  const message = `${title}\n\n${url}`;
  const facebook = new URL('https://www.facebook.com/sharer/sharer.php');
  facebook.searchParams.set('u', url);
  const reddit = new URL('https://www.reddit.com/submit');
  reddit.searchParams.set('url', url);
  reddit.searchParams.set('title', title);
  return {
    url,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`,
    facebook: facebook.href,
    reddit: reddit.href,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
  };
}
