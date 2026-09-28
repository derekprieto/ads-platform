import { expect, type Page } from "@playwright/test";

/** Fails if the page scrolls sideways. */
export async function expectNoHorizontalOverflow(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(scroll, "page must not scroll horizontally").toBeLessThanOrEqual(client);
  const wide = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    return Array.from(document.querySelectorAll("body *"))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        // ignore content inside scaled ad canvases and clipped scrollers
        if (el.closest("[style*='scale(']")) return false;
        return r.right > vw + 1 || r.left < -1;
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${(el as HTMLElement).className}`.slice(0, 120));
  });
  expect(wide, "no element may stick out of the viewport").toEqual([]);
}

export const option = (page: Page, name: string | RegExp) => page.getByRole("button", { name }).last();
