import { expect, test } from "@playwright/test";
import { mockApi, REAL } from "./mock-api";
import { expectNoHorizontalOverflow } from "./helpers";

test("editing a text layer updates the preview and saves", async ({ page }) => {
  test.skip(REAL, "runs against the mock API");
  const mock = await mockApi(page, { withAds: true });
  await page.goto("/");
  await expect(page.getByTestId("ad-tile")).toHaveCount(3);

  await page.getByTestId("ad-tile").first().getByRole("button", { name: /^Edit/ }).click();
  const dialog = page.getByRole("dialog", { name: "Edit ad" });
  await expect(dialog).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const field = dialog.getByLabel("Headline");
  await expect(field).toHaveValue("ME AT 2AM");
  await field.fill("ME AT 3AM");
  await expect(dialog.locator("div").filter({ hasText: /^ME AT 3AM$/ })).toBeVisible();

  await expect.poll(() => mock.patches.length).toBeGreaterThan(0);
  expect(mock.patches.at(-1)?.body).toEqual({ layers: [{ id: "headline", text: "ME AT 3AM" }] });

  await dialog.getByRole("button", { name: "New headline · free" }).click();
  await expect(field).toHaveValue("YOUR 2AM BRAIN IS LYING");
  await dialog.getByRole("button", { name: "Undo" }).click();
  await expect(field).toHaveValue("ME AT 2AM");

  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();
});
