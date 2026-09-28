import { expect, test } from "@playwright/test";
import { mockApi, REAL } from "./mock-api";
import { expectNoHorizontalOverflow } from "./helpers";

for (const path of ["/", "/results", "/credits"]) {
  test(`no horizontal overflow on ${path}`, async ({ page }) => {
    if (!REAL) await mockApi(page, { withAds: true });
    await page.goto(path);
    await expect(page.getByRole("banner")).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalOverflow(page);
  });
}

test("no horizontal overflow on the client approval page", async ({ page }) => {
  if (!REAL) await mockApi(page, { withAds: true });
  test.skip(REAL, "needs a share token; runs against the mock API");
  await page.goto("/s/tok123");
  await expect(page.getByRole("heading", { name: /Review ads for Nimbus Sleep/ })).toBeVisible();
  await expect(page.getByTestId("review-tile")).toHaveCount(9);
  await expectNoHorizontalOverflow(page);
  await page.getByTestId("review-tile").first().getByRole("button", { name: "Approve" }).click();
  await expect(page.getByTestId("review-tile").first().getByRole("button", { name: "Approved" })).toBeVisible();
});

test("tooltip opens on screen and closes on scroll", async ({ page }) => {
  if (!REAL) await mockApi(page, { withAds: true });
  test.skip(REAL, "runs against the mock API");
  await page.goto("/");
  const btn = page.getByRole("button", { name: "About Gallery" });
  await btn.click();
  const tip = page.getByRole("tooltip");
  await expect(tip).toBeVisible();
  const box = await tip.boundingBox();
  const vw = page.viewportSize()!.width;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(vw);
  await expectNoHorizontalOverflow(page);
  await page.mouse.wheel(0, 300);
  await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
  await expect(tip).toBeHidden();
});

test("agency header shows the client switcher", async ({ page }) => {
  test.skip(REAL, "runs against the mock API");
  await mockApi(page, { withAds: true, accountType: "agency" });
  await page.goto("/");
  await expect(page.getByText("which client are we doing today?")).toBeVisible();
  await page.getByRole("button", { name: /^Client:/ }).click();
  await expect(page.getByRole("menuitem", { name: "+ New client" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
