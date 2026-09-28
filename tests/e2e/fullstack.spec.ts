import { expect, test } from "@playwright/test";
import { REAL } from "./mock-api";
import { expectNoHorizontalOverflow, option } from "./helpers";

/** Real backend + worker (mock AI providers). Run with E2E_REAL_API=1. */
test("full stack: website to finished Funnel Pack, edit, download, share", async ({ page, context }) => {
  test.skip(!REAL, "set E2E_REAL_API=1 to run against the real backend");
  test.setTimeout(180_000);
  await page.goto("/");
  await expect(page.getByText("who's this account for?")).toBeVisible();
  await option(page, /agency/i).click();
  await option(page, "1 to 5").click();
  await expect(page.getByText(/which client|drop the client|drop your website/i)).toBeVisible();
  const newClient = page.getByRole("button", { name: /New client/ });
  if (await newClient.count()) await newClient.last().click();

  const input = page.getByLabel("Message the assistant");
  await input.fill("signalleads.co");
  await input.press("Enter");
  await expect(page.getByText("Hot ad formula")).toBeVisible({ timeout: 30_000 });
  await option(page, "Looks good").click();
  await option(page, /Full Funnel Pack/).click();
  await expect(page.getByText("which angles?")).toBeVisible();
  await option(page, /Use these/).click();

  await expect(page.getByText(/done! 20 ads are in your gallery/)).toBeVisible({ timeout: 150_000 });
  await expect(page.getByRole("tab", { name: "Hot (4)" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Edit a text layer on a ready ad, it persists after reload
  await page.getByTestId("ad-tile").first().getByRole("button", { name: /^Edit/ }).click();
  const dialog = page.getByRole("dialog", { name: "Edit ad" });
  const field = dialog.getByRole("textbox").first();
  await field.fill("EDITED BY E2E");
  await page.waitForTimeout(1500);
  await dialog.getByRole("button", { name: "Done" }).click();
  await page.reload();
  await page.getByTestId("ad-tile").first().getByRole("button", { name: /^Edit/ }).click();
  await expect(page.getByRole("dialog", { name: "Edit ad" }).getByRole("textbox").first()).toHaveValue("EDITED BY E2E");
  await page.getByRole("dialog", { name: "Edit ad" }).getByRole("button", { name: "Done" }).click();

  // Download returns a real zip
  const me = await (await context.request.get("/api/me")).json();
  const zip = await context.request.get(`/api/brands/${me.brands[0].id}/download`);
  expect(zip.headers()["content-type"]).toBe("application/zip");
  expect((await zip.body()).length).toBeGreaterThan(10_000);

  // Share link opens the client approval page
  const share = await (await context.request.post(`/api/brands/${me.brands[0].id}/share`)).json();
  await page.goto(share.url);
  await expect(page.getByRole("button", { name: /approve/i }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
