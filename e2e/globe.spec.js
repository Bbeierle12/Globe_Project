import { test, expect } from "@playwright/test";

test.describe("Globe Application E2E", function() {
  test.beforeEach(async function({ page }) {
    await page.goto("/");
  });

  test("page loads and shows sidebar", async function({ page }) {
    await expect(page.locator("text=Population Globe")).toBeVisible({ timeout: 15000 });
  });

  test("search input filters the list", async function({ page }) {
    await expect(page.locator("text=Population Globe")).toBeVisible({ timeout: 15000 });
    var searchInput = page.locator("input[aria-label*='Search']");
    await searchInput.fill("India");
    await expect(page.locator("text=India").first()).toBeVisible();
    await expect(page.locator("text=entries")).toBeVisible();
  });

  test("rotation toggle works", async function({ page }) {
    await expect(page.locator("text=Population Globe")).toBeVisible({ timeout: 15000 });
    var rotateBtn = page.locator("text=Rotating");
    await rotateBtn.click();
    await expect(page.locator("text=Paused")).toBeVisible();
    await page.locator("text=Paused").click();
    await expect(page.locator("text=Rotating")).toBeVisible();
  });

  test("clicking a country shows selection details", async function({ page }) {
    await expect(page.locator("text=Population Globe")).toBeVisible({ timeout: 15000 });
    var indiaItem = page.locator("text=India").first();
    await indiaItem.click();
    await expect(page.locator("text=COUNTRY")).toBeVisible();
  });

  test("globe canvas renders", async function({ page }) {
    await expect(page.locator("text=Loading globe layers...")).toBeHidden({ timeout: 30000 });
    var canvas = page.locator("canvas");
    await expect(canvas.first()).toBeVisible();
  });

  test("country expand shows subdivisions", async function({ page }) {
    await expect(page.locator("text=Population Globe")).toBeVisible({ timeout: 15000 });
    var expandBtn = page.locator("button[aria-label*='Expand India']");
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await expect(page.locator("text=Uttar Pradesh").first()).toBeVisible({ timeout: 5000 });
    }
  });
});
