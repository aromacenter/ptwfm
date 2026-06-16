import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("home page i18n", () => {
  test("renders English content at /en", async ({ page }) => {
    await page.goto("/en");
    await expect(
      page.getByRole("heading", { name: /Train smarter/i }),
    ).toBeVisible();
  });

  test("renders Hungarian content at /hu", async ({ page }) => {
    await page.goto("/hu");
    await expect(
      page.getByRole("heading", { name: /Eddz okosabban/i }),
    ).toBeVisible();
  });

  test("language switcher navigates between locales", async ({ page }) => {
    await page.goto("/en");
    await page.getByLabel(/language/i).selectOption("hu");
    await expect(page).toHaveURL(/\/hu$/);
    await expect(
      page.getByRole("heading", { name: /Eddz okosabban/i }),
    ).toBeVisible();
  });

  test("has no critical accessibility violations (WCAG 2.2 AA)", async ({
    page,
  }) => {
    await page.goto("/en");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
