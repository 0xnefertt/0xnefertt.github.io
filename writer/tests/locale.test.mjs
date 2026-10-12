import { before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { build } from "esbuild";

let routes, model;
before(async () => {
  await mkdir(".test-build", { recursive: true });
  await build({
    entryPoints: ["../astro/src/lib/routes.ts"],
    outfile: ".test-build/routes.mjs",
    bundle: true,
    format: "esm",
    platform: "node",
    banner: { js: 'import {createRequire} from "node:module"; const require=createRequire(import.meta.url);' },
    plugins: [
      {
        name: "fixture-content",
        setup(build) {
          build.onResolve({ filter: /^astro:content$/ }, () => ({ path: "content", namespace: "fixture" }));
          build.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
            contents: `
          const post = (id, lang, slug, key, draft = false) => ({id, collection:'blog', filePath:'_posts/'+lang+'/study-log/dev/2026-01-01-'+slug+'.md', body:'Body', data:{title:id, lang, translation_key:key, categories:['study-log/dev'], date:new Date('2026-01-01'), draft}});
          const book = (lang) => ({id:lang+'-book', collection:'books', filePath:'_books/'+lang+'/book.md', body:'Review', data:{title:'Book',lang,translation_key:'book'}});
          const hidden = (kind) => ({id:'unpublished-'+kind,collection:kind,filePath:'_'+kind+'/ko/unpublished-'+kind+'.md',body:'Hidden',data:{title:'Hidden',lang:'ko',draft:true}});
          export async function getCollection(kind) { return kind === 'blog' ? [post('English','en','english-title','paired'),post('Korean','ko','korean-title','paired'),post('Untranslated','ko','only-korean','single'),post('Private','en','private','draft',true)] : kind === 'books' ? [book('en'),book('ko'),hidden('books')] : kind === 'projects' ? [hidden('projects')] : []; }
        `,
          }));
        },
      },
    ],
  });
  await build({
    entryPoints: ["src/model.ts"],
    outfile: ".test-build/locale-model.mjs",
    bundle: true,
    format: "esm",
    platform: "node",
    banner: { js: 'import {createRequire} from "node:module"; const require=createRequire(import.meta.url);' },
  });
  routes = await import("../.test-build/routes.mjs");
  model = await import("../.test-build/locale-model.mjs");
});

test("localized routes keep English at root, Korean under ko, and drafts out of both languages", async () => {
  const catalogue = await routes.getSiteRoutes();
  const published = catalogue.filter((route) => route.props.post);
  assert.deepEqual(
    published.map((route) => [route.locale, route.props.post.id]),
    [
      ["en", "English"],
      ["ko", "Korean"],
      ["ko", "Untranslated"],
    ]
  );
  assert.ok(published.find((route) => route.locale === "en").path.startsWith("/blog/"));
  assert.ok(published.filter((route) => route.locale === "ko").every((route) => route.path.startsWith("/ko/blog/")));
  assert.ok(!catalogue.some((route) => route.path.includes("private")));
  assert.ok(!catalogue.some((route) => route.path.includes("unpublished")), "hidden books and projects have no detail pages or legacy aliases");
  assert.ok(catalogue.some((route) => route.path === "/"));
  assert.ok(catalogue.some((route) => route.path === "/ko/"));
  const categories = catalogue.filter((route) => route.view === "blog/category/[category]");
  assert.deepEqual(
    categories.map((route) => route.props.category.count),
    [1, 2]
  );
});
test("language switches find linked translations with different slugs and leave missing translations unclaimed", async () => {
  const catalogue = await routes.getSiteRoutes();
  const english = catalogue.find((route) => route.props.post?.id === "English");
  const korean = catalogue.find((route) => route.props.post?.id === "Korean");
  assert.deepEqual(await routes.getLanguageLinks(english.path), [
    { locale: "en", href: english.path, translated: true },
    { locale: "ko", href: korean.path, translated: true },
  ]);
  const single = catalogue.find((route) => route.props.post?.id === "Untranslated");
  assert.deepEqual((await routes.getLanguageLinks(single.path))[0], { locale: "en", href: "/blog/", translated: false });
  const legacy = catalogue.find((route) => route.path === "/blog/2026/only-korean/");
  assert.equal(legacy.redirect, single.path);
  assert.equal(legacy.noindex, true);
  const books = catalogue.filter((route) => route.view === "books/[slug]");
  assert.deepEqual(
    books.map((route) => route.path),
    ["/books/book/", "/ko/books/book/"]
  );
});
test("translation drafts retain the original body and shared images without inheriting private media or canonical URLs", () => {
  const source = model.parsePost(
    '---\ntitle: 원문\nlang: ko\ndate: 2026-01-01\ntags: [astro]\ncanonical: https://example.com/original\nthumbnail: /assets/img/cover.png\n---\n\n## 원문\n\n![사진](/assets/img/photo.png)\n\n<table><tr><td><img src="https://example.com/photo.jpg" alt="표 안의 사진"></td></tr></table>',
    "_posts/study-log/dev/2026-01-01-original.md",
    "a".repeat(40)
  );
  const draft = model.translationDraft(source);
  assert.equal(model.documentLanguage(draft), "en");
  assert.equal(model.documentTranslationKey(draft), model.documentTranslationKey(source));
  assert.deepEqual([draft.title, draft.description, draft.sourcePath, draft.sourceSha], ["", "", null, null]);
  assert.equal(draft.body, source.body);
  assert.equal(draft.metadata.thumbnail, "/assets/img/cover.png");
  assert.ok(!("canonical" in draft.metadata));
  assert.throws(() => model.validateDocument(draft, true));
  assert.throws(() => model.translationDraft({ ...source, body: "![Private](/api/media/secret)" }));
  const blank = { ...draft, slug: "", metadata: { lang: "en" } };
  assert.equal(model.documentTranslationKey(blank), "");
});
