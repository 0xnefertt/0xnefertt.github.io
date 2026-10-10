import { before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { build } from "esbuild";

let books, model, github;
before(async () => {
  await mkdir(".test-build", { recursive: true });
  for (const [entry, name] of [
    ["../astro/src/lib/books.ts", "book-reading"],
    ["src/model.ts", "book-dates"],
    ["src/github.ts", "book-publication"],
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
  github = await import("../.test-build/book-publication.mjs");
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

test("only an additive book publication-date backfill can refresh an older working copy", () => {
  const original = model.parsePost("---\ntitle: Review\nlang: ko\n---\n\nOriginal body", "_books/ko/review.md", "a".repeat(40));
  const latest = { ...original, sourceSha: "b".repeat(40), metadata: { ...original.metadata, date: "2026-10-10" } };
  const edited = { ...original, body: "Private edits", metadata: { ...original.metadata, cover: "/api/media/private", date: "2024-11-20" } };
  const merged = model.rebaseBookDateBackfill(edited, original, latest);
  assert.equal(merged.sourceSha, latest.sourceSha);
  assert.equal(merged.body, "Private edits");
  assert.equal(merged.metadata.cover, "/api/media/private");
  assert.equal(merged.metadata.date, "2024-11-20");
  assert.equal(model.rebaseBookDateBackfill(original, original, latest).metadata.date, "2026-10-10");
  assert.equal(model.rebaseBookDateBackfill(edited, original, { ...latest, body: "Remote edits" }), undefined);
  assert.equal(model.rebaseBookDateBackfill(edited, { ...original, metadata: { date: "2025-01-01" } }, latest), undefined);
});

test("book publication rebases a date-only repository change but refuses remote body changes before any write", async () => {
  const originalFetch = globalThis.fetch;
  const path = "_books/ko/review.md",
    oldSha = "a".repeat(40),
    newSha = "b".repeat(40);
  const original = "---\ntitle: Review\nlang: ko\n---\n\nOriginal body\n";
  const source = model.parsePost(original, path, oldSha);
  for (const changedBody of [false, true]) {
    const writes = [];
    const latest = "---\ntitle: Review\nlang: ko\ndate: 2026-10-10\n---\n\n" + (changedBody ? "Changed remote body" : "Original body") + "\n";
    globalThis.fetch = async (input, init = {}) => {
      const endpoint = new URL(input).pathname;
      const reply = (data) => Response.json(data);
      if (endpoint.endsWith("/git/ref/heads/main")) return reply({ object: { sha: "head" } });
      if (endpoint.endsWith("/git/commits/head")) return reply({ tree: { sha: "tree" } });
      if (endpoint.endsWith("/git/trees/tree")) return reply({ truncated: false, tree: [{ path, sha: newSha, type: "blob" }] });
      if (endpoint.endsWith(`/git/blobs/${oldSha}`) || endpoint.endsWith(`/git/blobs/${newSha}`)) {
        const content = endpoint.endsWith(oldSha) ? original : latest;
        return reply({ content: Buffer.from(content).toString("base64"), size: Buffer.byteLength(content) });
      }
      writes.push({ endpoint, data: JSON.parse(init.body) });
      return reply({ sha: "c".repeat(40) });
    };
    try {
      const publish = () =>
        github.publishPost({ GITHUB_REPOSITORY: "owner/site", GITHUB_BRANCH: "main" }, "fixture-token", { ...source, body: "Private edits" }, []);
      if (changedBody) {
        await assert.rejects(publish, (error) => error.status === 409);
        assert.equal(writes.length, 0);
      } else {
        const result = await publish();
        assert.equal(result.document.body.trim(), "Private edits");
        assert.equal(result.document.metadata.date, "2026-10-10");
        assert.equal(writes.find((item) => item.endpoint.endsWith("/git/refs/heads/main")).data.force, false);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
});
