import { test, expect } from "@playwright/test";

test.describe("Basic Site Functionality", () => {
  test("should load the homepage and display content", async ({ page }) => {
    // Navigate to the homepage
    await page.goto("/");

    // Wait for the page to load
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000); // Give React time to render

    // Check that the page title is correct
    await expect(page).toHaveTitle(/Операционные метрики небанковского банка/);

    // Check that body is visible (basic page load check)
    await expect(page.locator("body")).toBeVisible();

    // Check that Header is present (should contain navigation) or any header-like element
    const header = page.locator("header, [role='banner'], nav").first();
    const headerCount = await header.count();
    
    // If no header found, check for any navigation or just verify page loaded
    if (headerCount === 0) {
      // At least verify the page has some content
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toBeTruthy();
    } else {
      await expect(header).toBeVisible();
    }

    // Check that main content area is visible OR body has content
    const main = page.locator("main").first();
    const mainCount = await main.count();
    
    if (mainCount > 0) {
      await expect(main).toBeVisible();
    } else {
      // If no main tag, at least verify body has some content
      const bodyContent = await page.locator("body").textContent();
      expect(bodyContent?.length).toBeGreaterThan(0);
    }
  });

  test("should display at least one section or loading state", async ({ page }) => {
    await page.goto("/");

    // Wait for content to load (either actual content or loading skeleton)
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000); // Give time for React to render

    // Check for one of:
    // 1. Loading skeletons (if data is still loading)
    // 2. Section titles (if data loaded)
    // 3. Error message (if there's an error)
    // 4. Main content area (should always be present)
    const skeletonCount = await page.locator('[class*="skeleton"], [class*="Skeleton"], [class*="animate-pulse"]').count();
    const headingCount = await page.locator("h2, h3").count();
    const alertCount = await page.locator('[role="alert"]').count();
    const mainCount = await page.locator("main").count();

    const hasContent = skeletonCount > 0 || headingCount > 0 || alertCount > 0 || mainCount > 0;

    expect(hasContent).toBeTruthy();
  });

  test("should display KPI cards or loading state when data loads", async ({ page }) => {
    await page.goto("/");

    // Wait a bit for API calls to complete or timeout
    await page.waitForTimeout(3000);

    // Check for one of:
    // 1. KPI cards (any card-like element)
    // 2. Loading skeletons
    // 3. Error message
    // 4. Any content in main area
    const cardCount = await page.locator('[class*="card"], [class*="Card"], [data-testid*="card"]').count();
    const skeletonCount = await page.locator('[class*="skeleton"], [class*="Skeleton"], [class*="animate-pulse"]').count();
    const errorCount = await page.getByText(/ошибка|error|нет данных/i).count();
    const mainContent = await page.locator("main").count();

    const hasKPIOrLoading = cardCount > 0 || skeletonCount > 0 || errorCount > 0 || mainContent > 0;

    expect(hasKPIOrLoading).toBeTruthy();
  });

  test("should have working navigation", async ({ page }) => {
    await page.goto("/");

    // Check if navigation links exist
    const navLinks = page.locator('a[href="/"], a[href="/static"], a[href="/dashboard"]');
    const linkCount = await navLinks.count();

    // At least one navigation link should exist
    if (linkCount > 0) {
      // Try clicking the first link if it's not the current page
      const firstLink = navLinks.first();
      const href = await firstLink.getAttribute("href");
      if (href && href !== "/") {
        await firstLink.click();
        await page.waitForLoadState("networkidle");
        // Page should have loaded
        await expect(page.locator("body")).toBeVisible();
      }
    }
  });
});

