import { expect, test } from '@playwright/test';
test('home renders under the base path', async ({ page }) => {
  await page.goto('');
  await expect(page).toHaveURL(/\/trezvenoumlje\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'sr-Latn');
});
