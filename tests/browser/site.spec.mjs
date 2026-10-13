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
    test(`public navigation, search and accessibility at ${width}px in ${colorScheme}`, async ({ page }) => {
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
      await page.getByRole("searchbox").fill("파이썬");
      await expect(page.locator("#blog-inline-search-results li")).toHaveCount(5);
      await accessible(page);
      await test.info().attach(`blog-${width}-${colorScheme}`, { body: await page.screenshot(), contentType: "image/png" });
      await page.getByRole("link", { name: "파이썬 가비지 컬렉션", exact: true }).click();
      await expect(page.locator("h1")).toContainText("파이썬");
      await accessible(page);
    });
  }
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
  await page.locator("#extra-settings summary").click();
  await page.locator("#tags").fill("test");
  await page.locator("#slug").fill("browser-smoke");
  await page.getByRole("button", { name: "원문", exact: true }).click();
  await expect(page.locator("#body")).toHaveValue(/서식 편집기 입력 확인/);
  await page.locator("#body").fill("## 복구 검증\n\n비공개 초안 본문입니다.");
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
