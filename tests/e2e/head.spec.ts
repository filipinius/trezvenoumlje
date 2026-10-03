import { expect, test } from '@playwright/test';
import { watchForeign } from './helpers';

test('home has complete, base-aware head metadata and is noindex in preview', async ({ page }) => {
  await page.goto('');
  await expect(page).toHaveTitle(/Trezvenoumlje/);
  const attr = (sel: string, a: string) => page.locator(sel).getAttribute(a);
  expect(await attr('meta[name="robots"]', 'content')).toBe('noindex, nofollow');
  expect(await attr('link[rel="canonical"]', 'href')).toMatch(/\/trezvenoumlje\/$/);
  expect(await attr('meta[property="og:image"]', 'content')).toMatch(/\/trezvenoumlje\/og-default\.png$/);
  const desc = (await attr('meta[name="description"]', 'content')) ?? '';
  expect(desc.length).toBeGreaterThanOrEqual(50);
  expect(desc.length).toBeLessThanOrEqual(160);
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(ld!)['@type']).toBe('Organization');
  const title = await page.title();
  expect(await attr('meta[property="og:image:alt"]', 'content')).toBe(title);
  expect(await attr('meta[name="twitter:title"]', 'content')).toBe(title);
  expect(await attr('meta[name="twitter:description"]', 'content')).toBe(desc);
  expect(await attr('meta[property="og:url"]', 'content')).toBe(await attr('link[rel="canonical"]', 'href'));
});

test('the not-found page names no canonical address', async ({ page }) => {
  const response = await page.goto('ne-postoji/');
  expect(response!.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Stranica nije pronađena');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('fonts are self-hosted: no request leaves the site origin on load', async ({ page, baseURL }) => {
  const foreign = watchForeign(page, baseURL);
  await page.goto('');
  await page.waitForLoadState('networkidle');
  expect(foreign).toEqual([]);
});
