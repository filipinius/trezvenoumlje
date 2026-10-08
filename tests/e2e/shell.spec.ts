import { expect, test } from '@playwright/test';
import { noJsContext, readEntry } from './helpers';

test('header nav has the seven items and a contact CTA, all under the base path', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'desktop navigation');
  await page.goto('');
  const nav = page.getByRole('navigation', { name: 'Glavna navigacija' });
  await expect(nav.getByRole('link')).toHaveText(['O nama', 'Usluge', 'Programi', 'Za organizacije', 'Pričamo priču', 'Trezvene misli', 'Knjige i mediji']);
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

test('open mobile menu offers a call, a Viber chat and an e-mail', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile navigation');
  await page.goto('');
  await page.getByRole('button', { name: 'Meni' }).click();
  const menu = page.locator('#glavni-meni');
  await expect(menu.getByRole('link', { name: 'Pozovite' })).toHaveAttribute('href', 'tel:0648596212');
  const viber = menu.getByRole('link', { name: 'Viber' });
  await expect(viber).toHaveAttribute('href', 'viber://chat?number=%2B381648596212');
  await expect(viber).toHaveText('Viber');
  await expect(viber).toHaveAccessibleName(`Viber: ${readEntry<{ telefon: string }>('podesavanja/sajt.json').telefon}`);
  await expect(menu.getByRole('link', { name: 'Pošaljite e-mail' })).toHaveAttribute('href', 'mailto:trezvenoumljeprica@gmail.com');
  // Pozovite and Viber sit side by side and look the same.
  const [call, chat] = [(await menu.getByRole('link', { name: 'Pozovite' }).boundingBox())!, (await viber.boundingBox())!];
  expect(chat.y).toBe(call.y);
  expect(chat.x).toBeGreaterThan(call.x);
  expect(chat.height).toBeGreaterThanOrEqual(44);
  expect(await viber.getAttribute('class')).toBe(await menu.getByRole('link', { name: 'Pozovite' }).getAttribute('class'));
});

test('on desktop the header offers no Viber link', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'desktop navigation');
  await page.goto('');
  const header = page.getByRole('banner');
  await expect(header.locator('a[href^="viber:"]')).not.toHaveCount(0);
  await expect(header.locator('a[href^="viber:"]:visible')).toHaveCount(0);
  await expect(header.getByRole('link', { name: /Viber/ })).toHaveCount(0);
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

test('the footer links the Facebook page with an icon; nothing loads from Facebook', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => { requests.push(r.url()); });
  await page.goto('');
  const link = page.getByRole('contentinfo').getByRole('link', { name: 'Facebook: Trezvenoumlje', exact: true });
  await expect(link).toHaveAttribute('href', 'https://www.facebook.com/Trezvenoumlje/');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  // The icon alone: the name is for screen readers, no text beside it.
  await expect(link.locator('svg[aria-hidden="true"]')).toBeVisible();
  await expect(link).toHaveText('');
  const box = (await link.boundingBox())!;
  expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
  await page.waitForLoadState('networkidle');
  expect(requests.filter((url) => /facebook|fbcdn/i.test(url))).toEqual([]);
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
