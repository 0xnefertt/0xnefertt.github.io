import { getCollection } from 'astro:content';
import { getPublishedBlogPosts, sortPostsDesc } from '../../lib/blog';
import { buildBlogSearchIndex } from '../../lib/blogSearch';

export const prerender = true;

export async function GET() {
  const rawPosts = getPublishedBlogPosts(sortPostsDesc(await getCollection('blog')));

  return new Response(JSON.stringify(buildBlogSearchIndex(rawPosts)), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
