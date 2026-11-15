import { test, expect } from "@playwright/test";

test("gallery paginates on scroll, keeps likes, retries errors and fits mobile", async ({
  page,
}) => {
  const requests = [];
  let failSecondPage = true;
  await page.route("https://picsum.photos/v2/list?*", async (route) => {
    const number = Number(
      new URL(route.request().url()).searchParams.get("page"),
    );
    requests.push(number);
    if (number === 2 && failSecondPage) {
      failSecondPage = false;
      await route.fulfill({ status: 503, body: "Unavailable" });
      return;
    }
    const photos =
      number < 3
        ? Array.from({ length: 8 }, (_, index) => ({
            id: `${number}-${index}`,
            author: `Photographer ${number}-${index}`,
            download_url: `https://images.test/${index}.svg`,
          }))
        : [];
    await route.fulfill({ json: photos });
  });
  await page.route("https://images.test/*", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="140"><rect width="200" height="140" fill="#8eaa96"/></svg>',
    }),
  );
  await page.goto("http://127.0.0.1:4173");
  const first = page.getByRole("button", {
    name: "Like photo by Photographer 1-0",
    exact: true,
  });
  await first.click();
  await first.click();
  await first.click();
  await expect(first).toHaveText("3");
  await expect(
    page.getByRole("button", {
      name: "Like photo by Photographer 1-1",
      exact: true,
    }),
  ).toHaveText("0");
  await page.getByRole("article").last().scrollIntoViewIfNeeded();
  await expect(page.getByRole("alert")).toContainText("Unable to load");
  await page.getByRole("button", { name: "Retry loading photos" }).click();
  await expect(page.getByRole("article")).toHaveCount(16);
  await page.getByRole("article").last().scrollIntoViewIfNeeded();
  await expect(
    page.getByText("You’ve reached the end of the gallery."),
  ).toBeVisible();
  expect(requests).toEqual([1, 2, 2, 3]);
  await expect(first).toHaveText("3");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/gallery-mobile.png",
    fullPage: false,
  });
});

test("chat sends emoji and mentions, synchronizes messages and likes, and reconnects", async ({
  browser,
}) => {
  const contextA = await browser.newContext({
    viewport: { width: 1100, height: 720 },
  });
  const contextB = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  const a = await contextA.newPage();
  const b = await contextB.newPage();
  const errors = [];
  a.on("pageerror", (error) => errors.push(error.message));
  b.on("pageerror", (error) => errors.push(error.message));
  await Promise.all([
    a.goto("http://127.0.0.1:3001"),
    b.goto("http://127.0.0.1:3001"),
  ]);
  await expect(a.getByRole("status")).toHaveText("Connected");
  await expect(b.getByRole("status")).toHaveText("Connected");
  await a.getByRole("textbox", { name: "Message" }).fill("Hello team ");
  await a.getByRole("button", { name: "Mention a user" }).click();
  await a.getByRole("option", { name: /Bob/ }).click();
  await a.getByRole("button", { name: "Choose emoji" }).click();
  await a.getByRole("textbox", { name: "Search emojis" }).fill("wave");
  await a.getByRole("button", { name: "wave hello hand" }).click();
  await a.getByRole("button", { name: /Send/ }).click();
  await expect(a.getByRole("article")).toHaveCount(1);
  await expect(b.getByRole("article")).toHaveCount(1);
  await expect(b.getByRole("article")).toContainText("Hello team @Bob 👋");
  await a.getByRole("button", { name: /Like message/ }).click();
  await expect(b.getByRole("button", { name: /Like message/ })).toHaveText(
    "♡ 1",
  );
  await b.getByRole("button", { name: /Like message/ }).click();
  await expect(a.getByRole("button", { name: /Like message/ })).toHaveText(
    "♡ 2",
  );
  await contextB.setOffline(true);
  await expect(b.getByRole("status")).toHaveText("Reconnecting…", {
    timeout: 40000,
  });
  await a
    .getByRole("textbox", { name: "Message" })
    .fill("Message during disconnect");
  await a.getByRole("button", { name: /Send/ }).click();
  await contextB.setOffline(false);
  await expect(b.getByRole("article")).toHaveCount(2, { timeout: 20000 });
  await expect(
    b
      .getByRole("article")
      .last()
      .getByRole("button", { name: /Like message/ }),
  ).toHaveText("♡ 0");
  expect(
    await b.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await a.screenshot({ path: "test-results/chat-desktop.png" });
  await b.screenshot({ path: "test-results/chat-mobile.png" });
  expect(errors).toEqual([]);
  await contextA.close();
  await contextB.close();
});
