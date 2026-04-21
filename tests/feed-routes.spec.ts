import { expect, test } from '@playwright/test';

async function clickAndAssertRoute(page: Parameters<typeof test>[0]['page'], selector: string, label: string) {
  const locator = page.locator(selector).first();
  await expect(locator).toBeVisible();

  const href = await locator.getAttribute('href');
  if (!href) throw new Error(`${label} href should exist`);

  console.log(`${label} href: ${href}`);

  await locator.scrollIntoViewIfNeeded();
  await Promise.all([
    page.waitForURL((url) => new URL(url.toString()).pathname === href),
    locator.click(),
  ]);

  const currentPath = new URL(page.url()).pathname;
  expect(currentPath).toBe(href);
  await expect(page.locator('h1').first()).toBeVisible();
}

test('Feed and archive links navigate to correct routes', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);

  await clickAndAssertRoute(page, 'a[href^="/the-feed/blog/"]', 'Feed blog');

  await page.goto('/');
  await clickAndAssertRoute(page, 'a[href^="/the-feed/spotlight/"]', 'Feed spotlight');

  await page.goto('/the-feed/archive/blog');
  if (await page.locator('a[href^="/the-feed/blog/"]').count()) {
    await clickAndAssertRoute(page, 'a[href^="/the-feed/blog/"]', 'Archive blog');
  } else {
    await expect(page.locator('h1').first()).toBeVisible();
  }

  await page.goto('/the-feed/archive/spotlights');
  if (await page.locator('a[href^="/the-feed/spotlight/"]').count()) {
    await clickAndAssertRoute(page, 'a[href^="/the-feed/spotlight/"]', 'Archive spotlight');
  } else {
    await expect(page.locator('h1').first()).toBeVisible();
  }
});

test('Old /the-feed homepage redirects to canonical /', async ({ page }) => {
  await page.goto('/the-feed');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/$/);
});
