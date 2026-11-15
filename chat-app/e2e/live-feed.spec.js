import { test, expect } from "@playwright/test";

test("live Picsum feed loads real photos without CORS errors", async ({
  page,
}) => {
  test.skip(
    !process.env.LIVE_PHOTOS,
    "Opt-in network smoke test: set LIVE_PHOTOS=1.",
  );
  await page.goto("http://127.0.0.1:4173");
  await expect(page.getByRole("article").first()).toBeVisible({
    timeout: 25000,
  });
  const first = page.getByRole("article").first().locator("img");
  await expect(first).toBeVisible();
  await expect
    .poll(
      () => first.evaluate((image) => image.complete && image.naturalWidth > 0),
      { timeout: 30000 },
    )
    .toBe(true);
  await page.screenshot({ path: "test-results/gallery-live-desktop.png" });
});
