import { expect, test } from '@playwright/test';
import { countEntries } from './helpers';

test('services page lists 7 services without any price', async ({ page }) => {
  await page.goto('usluge/');
  await expect(page.locator('[data-usluga]')).toHaveCount(7);
  await expect(page.getByRole('main').getByText('RSD')).toHaveCount(0);
  await expect(page.locator('[data-cena-napomena]')).toHaveText('Informacije o ceni dobijate pri dogovoru termina.');
});

test('FAQ opens in place and the page carries matching FAQPage data', async ({ page }) => {
  await page.goto('usluge/');
  const q = page.locator('details', { hasText: 'Da li je razgovor lečenje?' });
  await expect(q.locator('p')).toBeHidden();
  await q.locator('summary').click();
  await expect(q.locator('p')).toBeVisible();
  const lds = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t));
  const faq = lds.find((l) => l['@type'] === 'FAQPage');
  expect(faq.mainEntity.length).toBe(await page.locator('main details').count());
});

test('each audience page exists with its own h1 and links back into the site', async ({ page }) => {
  for (const [slug, h1] of [['porodice', 'Roditelji i porodice'], ['mladi', 'Mladi i adolescenti'], ['posle-rehabilitacije', 'Posle rehabilitacije']] as const) {
    await page.goto(`usluge/${slug}/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
    await expect(page.getByRole('main').getByRole('link', { name: /Zakažite razgovor/ }).first()).toBeVisible();
  }
});

test('FAQ hub groups questions by category with anchors', async ({ page }) => {
  await page.goto('cesta-pitanja/#privatnost');
  await expect(page.locator('section#privatnost h2')).toHaveText('Privatnost i poverljivost');
  await expect(page.locator('main details')).toHaveCount(countEntries('pitanja')); // preview shows drafts too
  await expect(page.locator('details#da-li-su-razgovori-poverljivi')).toBeVisible();
});

test('a question opens when the page is loaded with its id as the hash', async ({ page }) => {
  await page.goto('cesta-pitanja/#da-li-su-razgovori-poverljivi');
  await expect(page.locator('details#da-li-su-razgovori-poverljivi p')).toBeVisible();
  await expect(page.locator('details#ko-vidi-moj-upit p')).toBeHidden();
});
