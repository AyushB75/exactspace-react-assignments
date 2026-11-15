import { test, expect } from "@playwright/test";

test("local mock gallery works without external requests, paginates, retries and retains likes", async ({
  page,
}) => {
  const external = [];
  const pages = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1") {
      external.push(url.href);
      await route.abort();
      return;
    }
    if (url.pathname.endsWith(".json")) pages.push(url.pathname);
    await route.continue();
  });
  let fail = true;
  await page.route("**/mock/page-2.json", async (route) => {
    if (fail) {
      fail = false;
      await route.fulfill({ status: 503, body: "Temporary failure" });
    } else {
      pages.push("/mock/page-2.json");
      await route.continue();
    }
  });
  await page.goto("http://127.0.0.1:4175");
  await expect(page.getByRole("article")).toHaveCount(6);
  const first = page.getByRole("button", {
    name: "Like photo by Demo artist 01",
    exact: true,
  });
  await first.click();
  await first.click();
  await expect(first).toHaveText("2");
  await expect(page.getByRole("article").nth(1).getByRole("button")).toHaveText(
    "0",
  );
  await expect
    .poll(() =>
      page
        .locator("article img")
        .first()
        .evaluate((img) => img.complete && img.naturalWidth > 0),
    )
    .toBe(true);
  await page.getByRole("article").last().scrollIntoViewIfNeeded();
  await expect(page.getByRole("alert")).toContainText("Unable to load");
  await page.getByRole("button", { name: "Retry loading photos" }).click();
  await expect(page.getByRole("article")).toHaveCount(12);
  await page.getByRole("article").last().scrollIntoViewIfNeeded();
  await expect(page.getByRole("article")).toHaveCount(18);
  await page.getByRole("article").last().scrollIntoViewIfNeeded();
  await expect(
    page.getByText("You’ve reached the end of the gallery."),
  ).toBeVisible();
  await expect(first).toHaveText("2");
  expect(pages).toContain("/mock/empty.json");
  expect(external).toEqual([]);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/mock-gallery-mobile.png" });
});

test("Picsum mode uses the original API, retries its page and keeps independent likes", async ({
  page,
}) => {
  const requested = [];
  let fail = true;
  await page.route("https://picsum.photos/v2/list?*", async (route) => {
    const number = Number(
      new URL(route.request().url()).searchParams.get("page"),
    );
    requested.push(number);
    if (number === 2 && fail) {
      fail = false;
      await route.fulfill({ status: 503 });
      return;
    }
    await route.fulfill({
      json:
        number === 1
          ? Array.from({ length: 6 }, (_, index) => ({
              id: String(index),
              author: `Test ${index}`,
              download_url: "/mock/images/landscape-01.svg",
            }))
          : [],
    });
  });
  await page.goto("http://127.0.0.1:4176");
  await expect(page.getByRole("article")).toHaveCount(6);
  const like = page.getByRole("button", {
    name: "Like photo by Test 0",
    exact: true,
  });
  await like.click();
  await like.click();
  await expect(like).toHaveText("2");
  await expect(page.getByRole("article").nth(1).getByRole("button")).toHaveText(
    "0",
  );
  await page.getByRole("article").last().scrollIntoViewIfNeeded();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Retry loading photos" }).click();
  await expect(
    page.getByText("You’ve reached the end of the gallery."),
  ).toBeVisible();
  // Development StrictMode cancels its first mount; the aborted request may
  // reach the route interceptor before the replacement mount fetches page 1.
  const initialRequests = requested.filter((number) => number === 1);
  expect(initialRequests.length).toBeGreaterThanOrEqual(1);
  expect(initialRequests.length).toBeLessThanOrEqual(2);
  expect(requested.slice(initialRequests.length)).toEqual([2, 2]);
});
