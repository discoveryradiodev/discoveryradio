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
  await page.goto('/the-feed');
  await expect(page).toHaveURL(/\/the-feed$/);

  await clickAndAssertRoute(page, 'a[href^="/the-feed/blog/"]', 'Feed blog');

  await page.goto('/the-feed');
  await clickAndAssertRoute(page, 'a[href^="/the-feed/spotlight/"]', 'Feed spotlight');

  await page.goto('/the-feed/archive/blog');
  await clickAndAssertRoute(page, 'a[href^="/the-feed/blog/"]', 'Archive blog');

  await page.goto('/the-feed/archive/spotlights');
  await clickAndAssertRoute(page, 'a[href^="/the-feed/spotlight/"]', 'Archive spotlight');
});
