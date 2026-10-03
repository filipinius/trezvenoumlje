import { expect, test } from '@playwright/test';

test('the four legal pages exist and are marked as drafts in preview', async ({ page }) => {
  for (const [slug, h1] of [['politika-privatnosti', 'Politika privatnosti'], ['kolacici', 'Politika kolačića'], ['uslovi-koriscenja', 'Uslovi korišćenja'], ['priroda-usluga', 'Priroda usluga']] as const) {
    await page.goto(`${slug}/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
    await expect(page.getByRole('main').getByText('Nacrt')).toBeVisible();
  }
});

test('a legal page has breadcrumbs, the pending text and a description of valid length', async ({ page }) => {
  await page.goto('uslovi-koriscenja/');
  const crumbs = page.getByRole('navigation', { name: 'Putanja' });
  await expect(crumbs.getByRole('link', { name: 'Početna' })).toHaveAttribute('href', '/trezvenoumlje/');
  await expect(crumbs.locator('[aria-current="page"]')).toHaveText('Uslovi korišćenja');
  await expect(page.getByRole('main')).toContainText('[TEKST ČEKA PRAVNU PROVERU]');
  await expect(page.getByRole('main')).not.toContainText('Poslednja izmena');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Uslovi korišćenja centra Trezvenoumlje: pravila i informacije za posetioce sajta.',
  );
});

test('unknown address shows the 404 page with a way back', async ({ page }) => {
  const res = await page.goto('ne-postoji/');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Stranica nije pronađena');
  await expect(page.getByRole('main')).toContainText('Adresa je možda promenjena ili stranica više ne postoji.');
  await expect(page.getByRole('main').getByRole('link', { name: 'Početna' })).toHaveAttribute('href', '/trezvenoumlje/');
  await expect(page.getByRole('main').getByRole('link', { name: 'Usluge' })).toHaveAttribute('href', '/trezvenoumlje/usluge/');
  await expect(page.getByRole('main').getByRole('link', { name: 'Trezvene misli' })).toHaveAttribute('href', '/trezvenoumlje/resursi/');
  await expect(page.getByRole('main').getByRole('link', { name: 'Kontakt' })).toHaveAttribute('href', '/trezvenoumlje/kontakt/');
});

test('the 404 page works at any depth: every URL in it starts at the site root', async ({ page }) => {
  const res = await page.goto('ne-postoji/duboko/jos-dublje/');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Stranica nije pronađena');
  const urls = await page.locator('[href], [src]').evaluateAll((els) =>
    els.map((el) => el.getAttribute('href') ?? el.getAttribute('src') ?? ''),
  );
  expect(urls.length).toBeGreaterThan(10);
  expect(urls.filter((u) => !/^(\/trezvenoumlje\/|#|https?:|mailto:|tel:)/.test(u))).toEqual([]);
});
