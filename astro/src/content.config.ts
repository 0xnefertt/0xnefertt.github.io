import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const taxonomyField = z.union([z.array(z.string()), z.string()]).optional();

const blog = defineCollection({
  loader: glob({
    base: '../_posts',
    pattern: '**/*.md',
  }),
  schema: z
    .object({
      title: z.string(),
      date: z.coerce.date().optional(),
      description: z.string().optional(),
      tags: taxonomyField,
      categories: taxonomyField,
      redirect: z.string().optional(),
      canonical: z.string().optional(),
      canonical_url: z.string().optional(),
      external_source: z.string().optional(),
      draft: z.coerce.boolean().optional(),
      series: z.string().optional(),
      featured: z.coerce.boolean().optional(),
      cover: z.string().optional(),
      thumbnail: z.string().optional(),
      author: z.string().optional(),
      last_updated: z.coerce.date().optional(),
      giscus_comments: z.coerce.boolean().optional(),
      disqus_comments: z.coerce.boolean().optional(),
      meta: z.string().optional(),
      toc: z.any().optional(),
    })
    .passthrough(),
});

const pages = defineCollection({
  loader: glob({
    base: '../_pages',
    pattern: '**/*.md',
  }),
  schema: z
    .object({
      title: z.string().optional(),
      permalink: z.string().optional(),
      description: z.string().optional(),
      nav: z.coerce.boolean().optional(),
      nav_order: z.coerce.number().optional(),
      subtitle: z.string().optional(),
      social: z.coerce.boolean().optional(),
      layout: z.string().optional(),
      redirect: z.union([z.string(), z.coerce.boolean()]).optional(),
      horizontal: z.coerce.boolean().optional(),
      dropdown: z.coerce.boolean().optional(),
      display_categories: z.array(z.string()).optional(),
      children: z
        .array(
          z.object({
            title: z.string(),
            permalink: z.string().optional(),
          })
        )
        .optional(),
      latest_posts: z
        .object({
          enabled: z.coerce.boolean().optional(),
          scrollable: z.coerce.boolean().optional(),
          limit: z.coerce.number().optional(),
        })
        .optional(),
      profile: z
        .object({
          align: z.string().optional(),
          image: z.string().optional(),
          image_circular: z.coerce.boolean().optional(),
          more_info: z.string().optional(),
        })
        .optional(),
      profiles: z
        .array(
          z.object({
            align: z.string().optional(),
            image: z.string().optional(),
            image_circular: z.coerce.boolean().optional(),
            more_info: z.string().optional(),
            content: z.string().optional(),
          })
        )
        .optional(),
    })
    .passthrough(),
});

const projects = defineCollection({
  loader: glob({
    base: '../_projects',
    pattern: '**/*.md',
  }),
  schema: z
    .object({
      title: z.string(),
      description: z.string().optional(),
      img: z.any().optional(),
      importance: z.coerce.number().optional(),
      category: z.string().optional(),
      redirect: z.string().optional(),
      giscus_comments: z.coerce.boolean().optional(),
      related_publications: z.coerce.boolean().optional(),
    })
    .passthrough(),
});

const news = defineCollection({
  loader: glob({
    base: '../_news',
    pattern: '**/*.md',
  }),
  schema: z
    .object({
      title: z.string().optional(),
      date: z.coerce.date().optional(),
      inline: z.coerce.boolean().optional(),
      related_posts: z.coerce.boolean().optional(),
    })
    .passthrough(),
});

const books = defineCollection({
  loader: glob({
    base: '../_books',
    pattern: '**/*.md',
  }),
  schema: z
    .object({
      title: z.string(),
      author: z.string().optional(),
      cover: z.string().optional(),
      olid: z.string().optional(),
      isbn: z.union([z.string(), z.coerce.number()]).optional(),
      categories: taxonomyField,
      tags: taxonomyField,
      buy_link: z.string().optional(),
      started: z.coerce.date().optional(),
      finished: z.coerce.date().optional(),
      released: z.union([z.string(), z.coerce.number()]).optional(),
      stars: z.coerce.number().optional(),
      goodreads_review: z.union([z.string(), z.coerce.number()]).optional(),
      status: z.string().optional(),
    })
    .passthrough(),
});

export const collections = { blog, books, news, pages, projects };
