import { expect, test } from '@playwright/test';
import { noJsContext } from './helpers';

test('header nav has the seven items and a contact CTA, all under the base path', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'desktop navigation');
  await page.goto('');
  const nav = page.getByRole('navigation', { name: 'Glavna navigacija' });
  await expect(nav.getByRole('link')).toHaveText(['O nama', 'Usluge', 'Programi', 'Za organizacije', 'Pričamo priču', 'Trezvene misli', 'Knjige']);
  for (const a of await nav.getByRole('link').all()) expect(await a.getAttribute('href')).toMatch(/^\/trezvenoumlje\//);
  await expect(page.getByRole('banner').getByRole('link', { name: 'Zakažite razgovor' })).toHaveAttribute('href', '/trezvenoumlje/kontakt/');
});

test('the nav marks the section a page belongs to, also for a page outside the section address', async ({ page }) => {
  // By selector, not by role: on mobile the links sit in the closed menu.
  const current = page.locator('nav[aria-label="Glavna navigacija"] a[aria-current="page"]');
  await page.goto('o-nama/');
  await expect(current).toHaveText(['O nama']);
  await page.goto('dr-dragan-vukadinovic/');
  await expect(current).toHaveText(['O nama']);
  await page.goto('kontakt/');
  await expect(current).toHaveCount(0);
});

test('mobile menu toggles, exposes its state and closes on Escape', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile navigation');
  await page.goto('');
  const toggle = page.getByRole('button', { name: 'Meni' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: 'Glavna navigacija' }).getByRole('link', { name: 'Usluge' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('without JavaScript the navigation links are still reachable on mobile', async ({ browser, baseURL }) => {
  const ctx = await noJsContext(browser, baseURL, { viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto('');
  await expect(page.getByRole('navigation', { name: 'Glavna navigacija' }).getByRole('link', { name: 'Usluge' })).toBeVisible();
  await ctx.close();
});

test('footer has legal links, FAQ link and the emergency note; preview banner is shown', async ({ page }) => {
  await page.goto('');
  const footer = page.getByRole('contentinfo');
  for (const name of ['Politika privatnosti', 'Politika kolačića', 'Uslovi korišćenja', 'Priroda usluga', 'Česta pitanja'])
    await expect(footer.getByRole('link', { name })).toBeVisible();
  await expect(footer).toContainText('Centar nije hitna služba');
  await expect(page.getByText('Dev pregled')).toBeVisible();
});

test('home renders no breadcrumb trail', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('nav[aria-label="Putanja"]')).toHaveCount(0);
});

test('at 1280px the header is one row: nav and CTA share a vertical centre', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'desktop navigation');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('');
  const banner = page.getByRole('banner');
  const centre = async (box: Promise<{ y: number; height: number } | null>) => { const b = (await box)!; return b.y + b.height / 2; };
  const cta = await centre(banner.getByRole('link', { name: 'Zakažite razgovor' }).boundingBox());
  const first = await centre(page.getByRole('navigation', { name: 'Glavna navigacija' }).getByRole('link').first().boundingBox());
  const last = await centre(page.getByRole('navigation', { name: 'Glavna navigacija' }).getByRole('link').last().boundingBox());
  expect(Math.abs(cta - first)).toBeLessThanOrEqual(12);
  expect(Math.abs(last - first)).toBeLessThanOrEqual(1);
});
