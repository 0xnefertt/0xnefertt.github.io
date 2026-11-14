import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  // Keep production analytics, ads, and other external services out of fixture runs.
  await page.route("**/*", (route) => (new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort()));
});

async function accessible(page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect
    .soft(
      result.violations.map(({ id, impact, nodes }) => ({
        id,
        impact,
        nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
      })),
      page.url()
    )
    .toEqual([]);
}

for (const width of [390, 1280]) {
  for (const colorScheme of ["light", "dark"]) {
    test(`public navigation, search and accessibility at ${width}px in ${colorScheme}`, async ({ page, request }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width, height: 844 });
      for (const route of ["/", "/ko/", "/ko/blog/", "/ko/about/", "/ko/books/", "/ko/projects/", "/ko/resources/", "/ko/privacy/", "/admin/"]) {
        await page.goto(route);
        if (route === "/admin/") await expect(page.locator("#login-screen")).toBeVisible();
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await accessible(page);
      }
      await page.goto("/ko/blog/");
      if (width === 390) {
        await page.getByRole("button", { name: "Open navigation menu" }).click();
        await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
        await page.getByRole("button", { name: "Close navigation menu" }).click();
      }
      const query = "파이썬";
      const index = await (await request.get("/ko/blog/search-index.json")).json();
      const expectedUrls = index
        .filter((post) => [post.title, post.description, post.content, ...post.tags, ...post.categories].some((field) => field.includes(query)))
        .map((post) => new URL(post.href, page.url()).href)
        .sort();
      await page.getByRole("searchbox").fill(query);
      const resultLinks = page.locator("#blog-inline-search-results h2 > a");
      await expect.poll(() => resultLinks.evaluateAll((links) => links.map((link) => link.href).sort())).toEqual(expectedUrls);
      await accessible(page);
      await test.info().attach(`blog-${width}-${colorScheme}`, { body: await page.screenshot(), contentType: "image/png" });
      await page.getByRole("link", { name: "파이썬 가비지 컬렉션", exact: true }).click();
      await expect(page.locator("h1")).toContainText("파이썬");
      await accessible(page);
    });
  }
}

test("a photo post shows its artwork, footer tags and six related Korean posts", async ({ page, request }) => {
  const index = await (await request.get("/ko/blog/search-index.json")).json();
  const article = index.find((post) => !post.external && !post.hasVideo && post.gallery.length && post.tags.length);
  await page.goto(article.href);
  await expect(page.locator(".post-header-image")).toHaveAttribute("src", article.gallery[0]);
  await expect(page.locator(".post-header .tags")).toHaveCount(0);
  await expect(page.locator(".post-body + .post-tags a")).toHaveText(article.tags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)));
  const links = page.locator(".post-recommendations li a");
  await expect(links).toHaveCount(6);
  const urls = await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
  expect(new Set(urls).size).toBe(6);
  expect(urls).not.toContain(article.href);
  const tags = new Set(article.tags.map((tag) => tag.trim().normalize("NFC").toLowerCase()));
  const related = index.filter(
    (post) =>
      post.href !== article.href &&
      (post.categories.some((category) => article.categories.includes(category)) ||
        post.tags.some((tag) => tags.has(tag.trim().normalize("NFC").toLowerCase())))
  );
  const matches = new Set(related.map((post) => post.href));
  expect(urls.slice(0, Math.min(6, matches.size)).every((url) => matches.has(url))).toBe(true);
});

test.describe("mobile footer tags", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 320, height: 640 } });
  test("tapping a tag opens only posts carrying that exact tag", async ({ page, request }) => {
    const index = await (await request.get("/ko/blog/search-index.json")).json();
    const articles = index.filter((post) => !post.external && post.tags.length);
    const article = articles.find((post) => post.tags.some((tag) => tag.includes(" "))) ?? articles[0];
    const tag = article.tags.find((tag) => tag.includes(" ")) ?? article.tags[0];
    const tagKey = (text) => text.trim().normalize("NFC").toLowerCase();
    const expected = index.filter((post) => post.tags.some((value) => tagKey(value) === tagKey(tag))).map((post) => post.href);
    await page.goto(article.href);
    const label = tag.startsWith("#") ? tag : `#${tag}`;
    const tags = page.getByRole("navigation", { name: "글 태그" });
    const link = tags.getByRole("link", { name: label, exact: true }).first();
    await link.scrollIntoViewIfNeeded();
    expect(
      await tags.locator("a").evaluateAll((nodes) =>
        nodes.every((node) => {
          const box = node.getBoundingClientRect();
          return box.height >= 44 && box.width >= 44 && box.left >= 0 && box.right <= innerWidth;
        })
      )
    ).toBe(true);
    await link.tap();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(label);
    const matches = page.locator("#blog-search-results h2 a");
    await expect(page.locator("#blog-search-meta")).toContainText(`${label} 태그가 붙은 글 · ${expected.length}편`);
    expect(await matches.evaluateAll((nodes) => nodes.map((node) => node.href).sort())).toEqual(
      expected.map((href) => new URL(href, page.url()).href).sort()
    );
    await page.getByRole("searchbox").fill("파이썬");
    expect(new URL(page.url()).searchParams.has("tag")).toBe(false);
  });
});

test("only the selected blog group shows its subcategories, including on paginated lists", async ({ page, request }) => {
  const all = "/ko/blog/";
  const group = `${all}category/study-log/`;
  const index = await (await request.get(`${all}search-index.json`)).json();
  const childPaths = [
    ...new Set(index.flatMap((post) => post.categoryPaths.map(({ href }) => href)).filter((href) => href.startsWith(group) && href !== group)),
  ].sort();
  await page.goto(all);
  const tabs = page.getByRole("navigation", { name: "주요 카테고리" });
  const children = page.getByRole("navigation", { name: "공부 기록 하위 카테고리" });
  await expect(page.locator(".blog-subcategories")).toHaveCount(0);
  await tabs.getByRole("link", { name: "공부 기록" }).click();
  await expect(children).toBeVisible();
  expect(await children.locator("a").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")).sort())).toEqual(childPaths);
  const pagination = page.locator('.pagination-link[href$="/page-2/"]').first();
  if (await pagination.count()) {
    await pagination.click();
    await expect(children).toBeVisible();
  }
  await children.locator("a").first().click();
  expect(await children.locator('[aria-current="page"]').getAttribute("href")).toBe(new URL(page.url()).pathname);
  await tabs.getByRole("link", { name: /전체 글/ }).click();
  await expect(page.locator(".blog-subcategories")).toHaveCount(0);
});

test("post breadcrumbs navigate independently to all posts, the parent group and the child category", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const article = "/ko/blog/2026/python-duck-typing/";
  const parent = "/ko/blog/category/study-log/";
  const child = `${parent}dev/`;
  const index = await (await request.get("/ko/blog/search-index.json")).json();
  const expectedParent = index.filter((post) => post.categoryPaths.some((path) => path.href.startsWith(parent))).map((post) => post.href);
  const expectedChild = index.filter((post) => post.categoryPaths.some((path) => path.href === child)).map((post) => post.href);
  expect(expectedParent.length).toBeGreaterThan(expectedChild.length);

  async function listedPosts() {
    const links = () => page.locator(".post-card-content h2 > a").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
    const posts = await links();
    const pages = await page
      .locator(".pagination-link[href]")
      .evaluateAll((nodes) => [...new Set(nodes.map((node) => node.getAttribute("href")))].filter((href) => /\/page-\d+\/$/.test(href)));
    for (const path of pages) {
      await page.goto(path);
      posts.push(...(await links()));
    }
    return posts.sort();
  }

  await page.goto(article);
  const breadcrumbs = page.locator(".post-breadcrumbs a");
  await expect(breadcrumbs).toHaveCount(3);
  await expect(breadcrumbs.nth(0)).toHaveAttribute("href", "/ko/blog/");
  await expect(breadcrumbs.nth(1)).toHaveAttribute("href", parent);
  await expect(breadcrumbs.nth(2)).toHaveAttribute("href", child);
  await test.info().attach("independent-category-breadcrumbs", { body: await page.screenshot(), contentType: "image/png" });
  await breadcrumbs.nth(1).click();
  await expect(page).toHaveURL(new URL(parent, page.url()).href);
  expect(await listedPosts()).toEqual(expectedParent.sort());

  await page.goto(article);
  await breadcrumbs.nth(2).click();
  await expect(page).toHaveURL(new URL(child, page.url()).href);
  expect(await listedPosts()).toEqual(expectedChild.sort());

  await page.goto(article);
  await breadcrumbs.nth(0).click();
  await expect(page).toHaveURL(/\/ko\/blog\/$/);
  expect(await listedPosts()).toEqual(index.map((post) => post.href).sort());
});

for (const width of [390, 1280]) {
  test(`sharing beside post breadcrumbs opens, copies and restores focus at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { value: { writeText: async (value) => (window.copiedPostUrl = value) } });
    });
    await page.goto("/ko/blog/2026/python-duck-typing/");
    const share = page.locator(".post-header-navigation [data-share-open]");
    await expect(share).toBeVisible();
    await expect(page.locator(".post-reader-actions")).toHaveCount(0);
    await expect(page.locator("[data-post-share] > [data-share-copy]")).toHaveCount(0);
    await expect(page.locator(".post-breadcrumbs a")).toHaveCount(3);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await test.info().attach(`post-sharing-header-${width}`, { body: await page.screenshot(), contentType: "image/png" });

    await share.click();
    const dialog = page.getByRole("dialog", { name: "이 글 공유하기" });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".post-share-post-title")).toHaveText(await page.locator("h1").innerText());
    expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await test.info().attach(`share-dialog-${width}`, { body: await page.screenshot(), contentType: "image/png" });
    await accessible(page);
    const canonical = await page.locator("[data-post-share]").getAttribute("data-share-url");
    await dialog.getByRole("button", { name: "링크 복사" }).click();
    await expect(dialog.getByRole("status")).toHaveText("링크를 복사했습니다.");
    expect(await page.evaluate(() => window.copiedPostUrl)).toBe(canonical);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(share).toBeFocused();
  });
}

test("search rejects executable URLs while preserving ordinary links and text", async ({ page }) => {
  const title = 'security <img src=x onerror="window.searchXss=true">';
  const post = {
    title,
    description: "security regression",
    content: "security regression",
    tags: [],
    categories: [],
    dateLabel: "2026-10-13",
    readMinutes: 1,
    categoryPaths: [{ href: "javascript:window.searchXss=true", label: "unsafe category" }],
  };
  await page.route("**/search-index.json", (route) =>
    route.fulfill({
      json: [
        { ...post, href: "java\nscript:window.searchXss=true", thumbnail: "data:image/svg+xml,<svg onload=alert(1)>" },
        { ...post, href: "/ko/about/", gallery: ["javascript:alert(1)"] },
        { ...post, href: "https://example.com/article", thumbnail: "/assets/img/prof_pic.jpg", external: true },
      ],
    })
  );
  await page.goto("/ko/blog/");
  await page.getByRole("searchbox").fill("security");
  const results = page.locator("#blog-inline-search-results");
  await expect(results.locator("li")).toHaveCount(3);
  await expect(results.locator("h2 a").first()).toHaveAttribute("href", "#");
  await expect(results.locator("h2 a").nth(1)).toHaveAttribute("href", "http://127.0.0.1:4321/ko/about/");
  await expect(results.locator("h2 a").nth(2)).toHaveAttribute("href", "https://example.com/article");
  await expect(results.locator("img")).toHaveCount(1);
  await expect(results.locator("h2 a").first()).toHaveText(title);
  await expect(results.locator(".post-card-categories a")).toHaveCount(0);
  await results.locator("h2 a").first().click();
  expect(await page.evaluate(() => window.searchXss)).toBeUndefined();
  await page.getByRole("searchbox").fill("");
  await expect(results.locator("h2 a").first()).not.toHaveText(title);
});

test("admin offers separate English and Korean SEO descriptions without changing the visible introduction", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/");
  await page.getByRole("link", { name: "GitHub로 로그인" }).click();
  await expect(page.locator("#workspace")).toBeVisible();
  await page.locator("#manage-description").click();
  await expect(page.locator("#seo-description-en")).toHaveValue(/Development learning notes/);
  await expect(page.locator("#seo-description-ko")).toHaveValue(/개발 학습 기록/);
  await expect(page.locator("#blog-description-en")).toHaveValue("1, 2, 3, Let's go!");
  await accessible(page);
  await test.info().attach("admin-seo-descriptions", { body: await page.screenshot({ path: "reports/seo-admin.png" }), contentType: "image/png" });
  await page.locator("#logout").click();
});

test("YouTube frames load in the editor, preview and published article", async ({ page }) => {
  const videoId = "U0TXIXTzJEY";
  await page.route(`https://www.youtube-nocookie.com/embed/${videoId}`, (route) =>
    route.fulfill({ contentType: "text/html", body: "<title>Video fixture</title><p>Player loaded</p>" })
  );
  async function expectPlayer(selector) {
    const frame = page.locator(selector);
    await frame.scrollIntoViewIfNeeded();
    await expect(frame.contentFrame().getByText("Player loaded")).toBeVisible();
    const bounds = await frame.boundingBox();
    expect(bounds.width / bounds.height).toBeCloseTo(16 / 9, 2);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ko/blog/2026/2026-half-retrospect/");
  await expectPlayer(".post-body iframe.youtube-player");
  await page.goto("/ko/blog/");
  await page.getByRole("searchbox").fill("낙관적 비관주의");
  const videoCard = page.locator('#blog-inline-search-results .post-card-media[href*="optimistic-pessimism"] .post-card-preview--1 img').first();
  await expect(videoCard).toHaveAttribute("src", "https://i.ytimg.com/vi/l-oCt441--E/hqdefault.jpg");
  await page.goto("/admin/");
  await page.getByRole("link", { name: "GitHub로 로그인" }).click();
  await page.locator("#new-post").click();
  await page.getByRole("button", { name: "영상 추가" }).click();
  await page.locator("#insert-url").fill(`https://youtu.be/${videoId}`);
  await page.locator("#insert-form button[type=submit]").click();
  await expectPlayer("#rich-body iframe.youtube-player");
  await page.getByRole("button", { name: "영상 크기 조정" }).click();
  await page.getByLabel("너비 (px)").fill("210");
  await page.getByLabel("너비 (px)").press("Tab");
  await expect(page.locator("#rich-body iframe")).toHaveCSS("width", "210px");
  await page.locator("#preview-tab").click();
  await expectPlayer("#preview-body iframe.youtube-player");
  await expect(page.locator("#preview-body iframe")).toHaveCSS("width", "210px");
});

async function expectImageRow(row) {
  const images = row.locator("img");
  await expect(images).toHaveCount(2);
  await expect.poll(() => images.evaluateAll((items) => items.every((img) => img.naturalWidth > 0))).toBe(true);
  const [left, right] = await images.evaluateAll((items) => items.map((img) => img.getBoundingClientRect().toJSON()));
  expect(left.width).toBeGreaterThan(0);
  expect(Math.abs(left.width - right.width)).toBeLessThan(1);
  expect(left.top).toBe(right.top);
  expect(right.left).toBeGreaterThan(left.right);
}

test("real Worker/D1 login, save, publish, unpublish, republish and logout", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/");
  await page.getByRole("link", { name: "GitHub로 로그인" }).click();
  await expect(page.locator("#workspace")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/$/);
  await expect(page.locator("#new-post")).toBeEnabled();
  await accessible(page);
  await page.locator("#new-post").click();
  await page.getByRole("textbox", { name: "글 본문", exact: true }).fill("서식 편집기 입력 확인");
  await accessible(page);
  await page.locator("#title").fill("브라우저 복구 검증");
  await page.locator("#description").fill("로그인과 발행 흐름을 확인하는 테스트입니다.");
  await page.locator("#content-language").selectOption("ko");
  await expect(page.locator("#tags")).toBeVisible();
  await page.locator("#tags").fill("test");
  await page.locator("#slug").fill("browser-smoke");
  await page.getByRole("button", { name: "원문", exact: true }).click();
  await expect(page.locator("#body")).toHaveValue(/서식 편집기 입력 확인/);
  await page.locator("#body").fill("## 복구 검증\n\n비공개 초안 본문입니다.");
  await page.locator("#write-tab").click();
  await page.getByRole("textbox", { name: "글 본문", exact: true }).press("ControlOrMeta+End");
  await page.locator("#image-file").setInputFiles(["astro/public/favicon-32x32.png", "astro/public/apple-touch-icon.png"]);
  const editorImages = page.locator("#rich-body img");
  const row = page.locator('#rich-body p[data-image-pair="true"]');
  await expectImageRow(row);
  await editorImages.first().click();
  await page.getByRole("button", { name: "나란히 배치 해제" }).click();
  await expect(row).toHaveCount(0);
  await page.locator("#media-pixels").fill("120");
  await page.locator("#media-pixels").press("Tab");
  await expect(editorImages.first()).toHaveCSS("width", "120px");
  await page.locator("#image-width").selectOption("75");
  await page.locator("#preview-tab").click();
  const single = page.locator('#preview-body img[data-image-width="75"]');
  await expect(single).toBeVisible();
  const fraction = await single.evaluate((img) => {
    const parent = img.parentElement;
    const style = getComputedStyle(parent);
    const contentWidth = parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return img.getBoundingClientRect().width / contentWidth;
  });
  expect(fraction).toBeCloseTo(0.75);
  await page.locator("#write-tab").click();
  await editorImages.first().click();
  await page.getByRole("button", { name: "캡션 추가" }).click();
  await page.keyboard.insertText("첫 번째 사진 설명");
  await expect(page.locator("#rich-body figcaption")).toHaveText("첫 번째 사진 설명");
  await editorImages.first().click();
  await page.getByRole("button", { name: "다음 이미지와 나란히" }).click();
  await page.locator("#preview-tab").click();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expectImageRow(page.locator('#preview-body [data-image-pair="true"]'));
    await expect(page.locator("#preview-body figure > figcaption")).toHaveText("첫 번째 사진 설명");
  }
  await page.locator("#write-tab").click();
  await page.locator("#save").click();
  await expect(page.locator("#save-status")).toContainText("저장");
  await page.reload();
  await page.getByRole("button", { name: /브라우저 복구 검증/ }).click();
  await page.getByRole("button", { name: "원문", exact: true }).click();
  await expect(page.locator("#body")).toHaveValue(/비공개 초안 본문/);
  await accessible(page);
  await page.locator("#publish").click();
  await page.locator("#publish-dialog button[value=publish]").click();
  await expect(page.locator("#save-status")).toContainText("발행 완료");
  const published = await (await request.get("http://127.0.0.1:8789/test/state")).json();
  expect(published.publications).toBe(1);
  expect(published.posts).toHaveLength(1);
  expect(published.posts[0].content).toContain('data-image-pair="true"');
  expect(published.posts[0].content).toContain('data-image-width="75"');
  expect(published.posts[0].content).toContain("<figcaption>첫 번째 사진 설명</figcaption>");
  expect(published.posts[0].content.match(/<img\b[^>]*src="\/assets\/img\/posts\//g)).toHaveLength(2);
  expect(published.posts[0].content).not.toContain("/api/media/");
  const originalPath = published.posts[0].path;
  await page.locator("#source-tab").click();
  await page.locator("#body").fill("## 복구 검증\n\n아직 발행하지 않은 변경입니다.");
  await page.locator("#save").click();
  await page.locator("#unpublish").click();
  await page.locator("#unpublish-dialog button[value=unpublish]").click();
  await expect(page.locator("#publish")).toHaveText("다시 발행");
  const hidden = await (await request.get("http://127.0.0.1:8789/test/state")).json();
  expect(hidden.posts[0].content).toContain("draft: true");
  expect(hidden.posts[0].content).not.toContain("아직 발행하지 않은 변경");
  await expect(page.locator("#body")).toHaveValue(/아직 발행하지 않은 변경/);
  await page.locator("#publish").click();
  await page.locator("#publish-dialog button[value=publish]").click();
  await expect(page.locator("#save-status")).toContainText("발행 완료");
  const restored = await (await request.get("http://127.0.0.1:8789/test/state")).json();
  expect(restored.publications).toBe(3);
  expect(restored.posts[0].path).toBe(originalPath);
  expect(restored.posts[0].content).toContain("아직 발행하지 않은 변경");
  expect(restored.posts[0].content).not.toContain("draft: true");
  await test.info().attach("writer-republished", { body: await page.screenshot(), contentType: "image/png" });
  await page.locator("#logout").click();
  await expect(page.locator("#login-screen")).toBeVisible();
  expect((await request.get("http://127.0.0.1:8789/api/drafts")).status()).toBe(401);
});
