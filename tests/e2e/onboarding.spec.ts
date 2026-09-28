import { expect, test } from "@playwright/test";
import { mockApi, REAL } from "./mock-api";
import { expectNoHorizontalOverflow, option } from "./helpers";

test("brand onboarding runs to a finished Funnel Pack", async ({ page }) => {
  test.skip(REAL, "needs a fresh account; runs against the mock API");
  test.setTimeout(90_000);
  await mockApi(page, { credits: 40 });
  await page.goto("/");

  await expect(page.getByText("who's this account for?")).toBeVisible();
  await option(page, "My own brand").click();
  await expect(page.getByText("drop your website below")).toBeVisible();

  const input = page.getByLabel("Message the assistant");
  await input.fill("nimbussleep.com");
  await input.press("Enter");
  await expect(page.getByText("Learning your offer")).toBeVisible();
  await expect(page.getByText("ok here's what I got")).toBeVisible();
  await expect(page.getByText("Hot ad formula")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await option(page, "Looks good").click();
  await expect(page.getByText("which part of the funnel?")).toBeVisible();
  await option(page, /Full Funnel Pack/).click();

  await expect(page.getByText("which angles?")).toBeVisible();
  const gift = page.getByRole("button", { name: /^Gift/ }).last();
  await expect(gift).toHaveAttribute("aria-pressed", "true");
  await gift.click();
  await expect(gift).toHaveAttribute("aria-pressed", "false");
  await option(page, /Use these/).click();

  await expect(page.getByText(/Making 20 ads for Nimbus Sleep/)).toBeVisible();
  await expect(page.getByText("done! 20 ads are in your gallery")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("tab", { name: "Cold (10)" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Warm (6)" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Hot (4)" })).toBeVisible();
  await expect(page.getByTestId("ad-tile")).toHaveCount(10);
  await expect(page.getByRole("button", { name: "Download 20 ads" })).toBeVisible();
  await expect(option(page, /Make 10 more/)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Remove / undo on a tile
  const firstTile = page.getByTestId("ad-tile").first();
  await firstTile.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("button", { name: "Download 19 ads" })).toBeVisible();
  await firstTile.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Download 20 ads" })).toBeVisible();

  // 20 credits left, so 10 more goes through
  await option(page, /Make 10 more/).click();
  await expect(page.getByText(/making 10 more/)).toBeVisible();
});

test("402 offers a top up", async ({ page }) => {
  test.skip(REAL, "runs against the mock API");
  await mockApi(page, { credits: 5, withAds: true });
  await page.goto("/");
  await option(page, /Full Funnel Pack/).click();
  await option(page, /Use these/).click();
  await expect(page.getByText("that's 20 credits and you've got 5. wanna top up?")).toBeVisible();
  await option(page, "Top up credits").click();
  await expect(page).toHaveURL(/\/credits$/);
  await expect(page.getByRole("heading", { name: /Credits/ })).toBeVisible();
});
