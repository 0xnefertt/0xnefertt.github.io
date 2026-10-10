import { before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { build } from "esbuild";

let books, model;
before(async () => {
  await mkdir(".test-build", { recursive: true });
  for (const [entry, name] of [
    ["../astro/src/lib/books.ts", "book-reading"],
    ["src/model.ts", "book-dates"],
  ]) {
    await build({
      entryPoints: [entry],
      outfile: `.test-build/${name}.mjs`,
      bundle: true,
      format: "esm",
      platform: "node",
      banner: { js: 'import {createRequire} from "node:module"; const require=createRequire(import.meta.url);' },
    });
  }
  books = await import("../.test-build/book-reading.mjs");
  model = await import("../.test-build/book-dates.mjs");
});

function book(id, date, lang = "ko", draft = false) {
  return {
    id,
    collection: "books",
    filePath: `_books/${lang}/${id}.md`,
    body: "Review",
    data: { title: id, lang, draft, date: date && new Date(date), tags: ["parenting"] },
  };
}

test("book navigation follows publication order and excludes drafts and other languages at both ends", () => {
  const old = book("old", "2026-01-01"),
    middle = book("middle", "2026-01-02"),
    latest = book("latest", "2026-01-03");
  const catalogue = [middle, book("private", "2026-01-04", "ko", true), book("english", "2026-01-04", "en"), old, latest];
  assert.deepEqual(books.getBookNeighbors(middle, catalogue, "ko"), { previous: old, next: latest });
  assert.deepEqual(books.getBookNeighbors(latest, catalogue, "ko"), { previous: middle, next: undefined });
  assert.deepEqual(books.getBookNeighbors(old, catalogue, "ko"), { previous: undefined, next: middle });
  assert.deepEqual(books.getBookNeighbors(old, [old], "ko"), { previous: undefined, next: undefined });
});

test("reading recommendations prioritize shared topics and fill remaining places without leaking private or translated content", () => {
  const current = book("current", "2026-01-01");
  const related = book("related", "2026-01-02");
  const unrelated = { ...book("unrelated", "2026-01-03"), data: { title: "Unrelated", lang: "ko", tags: ["finance"] } };
  const post = (id, tags, lang = "ko", draft = false) => ({
    id,
    collection: "blog",
    filePath: `_posts/${lang}/study-log/dev/2026-01-01-${id}.md`,
    body: "Blog",
    data: { title: id, date: new Date("2026-01-01"), lang, draft, tags },
  });
  const results = books.getBookRecommendations(
    current,
    [current, related, unrelated, book("private", "2026-01-04", "ko", true), book("english", "2026-01-04", "en")],
    [
      post("parenting-post", ["parenting"]),
      post("fallback", []),
      post("private-post", ["parenting"], "ko", true),
      post("english-post", ["parenting"], "en"),
    ],
    "ko"
  );
  assert.deepEqual(
    results.map((item) => item.title),
    ["related", "parenting-post", "Unrelated", "fallback"]
  );
  assert.ok(results.every((item) => item.href.startsWith("/ko/")));
});

test("different Korean tags are not mistaken for the same recommendation topic", () => {
  const current = { ...book("current", "2026-01-01"), data: { title: "현재", lang: "ko", tags: ["폴그레이엄"] } };
  const unrelated = { ...book("unrelated", "2026-01-03"), data: { title: "육아", lang: "ko", tags: ["육아"] } };
  const related = { ...book("related", "2026-01-02"), data: { title: "관련", lang: "ko", tags: ["폴그레이엄"] } };
  const results = books.getBookRecommendations(current, [current, unrelated, related], [], "ko");
  assert.deepEqual(
    results.map((item) => [item.title, item.score]),
    [
      ["관련", 1],
      ["육아", 0],
    ]
  );
});

test("book publication dates survive edits while drafts and translations do not inherit an artificial publication date", () => {
  const source = model.parsePost(
    "---\ntitle: Review\nlang: ko\nauthor: Book author\ndate: 2026-01-07\n---\n\nReview",
    "_books/ko/review.md",
    "a".repeat(40)
  );
  const revised = model.parsePost(model.renderPost({ ...source, body: "Edited" }), source.sourcePath, "b".repeat(40));
  assert.equal(revised.metadata.date, "2026-01-07");
  assert.equal(revised.metadata.author, "Book author");
  const translated = model.translationDraft(source);
  assert.ok(!("date" in translated.metadata));
  const draft = { ...translated, title: "English review", body: "English review" };
  assert.ok(!/^date:/m.test(model.renderPost(draft, new Map(), true)));
  const published = model.parsePost(model.renderPost(draft), "_books/en/review.md", "c".repeat(40));
  assert.equal(published.metadata.date, new Date().toISOString().slice(0, 10));
});
