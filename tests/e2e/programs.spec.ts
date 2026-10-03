import { expect, test } from '@playwright/test';

test('program list shows six programs and marks those in preparation', async ({ page }) => {
  await page.goto('programi/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Šest programa, jedna logika: razumevanje pre promene');
  await expect(page.locator('[data-program]')).toHaveCount(6);
  await expect(page.locator('[data-program]', { hasText: 'Trezvena kuća' })).toContainText('Sadržaj u izradi');
  await expect(page.locator('[data-program]', { hasText: 'Mentalna higijena 360°' })).not.toContainText('Sadržaj u izradi');
  await expect(page.getByRole('main').getByText('RSD')).toHaveCount(0);
  await expect(page.getByRole('main').getByText('Cena paketa')).toHaveCount(0);
});

test('program detail page renders and is reachable from the list', async ({ page }) => {
  await page.goto('programi/');
  await page.locator('[data-program]', { hasText: 'Čist izbor' }).getByRole('link', { name: /Pogledajte program/ }).click();
  await expect(page).toHaveURL(/\/programi\/cist-izbor\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Čist izbor');
});

test('old anchors on the list still land on a program card', async ({ page }) => {
  await page.goto('programi/#trezvena-kuca');
  await expect(page.locator('#trezvena-kuca[data-program]')).toContainText('Trezvena kuća');
});

test('program detail carries one FAQPage that matches the questions shown', async ({ page }) => {
  await page.goto('programi/adiktologija-u-pravu/');
  await expect(page.getByRole('heading', { level: 2, name: 'Česta pitanja' })).toBeVisible();
  const lds = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t));
  const faqs = lds.filter((l) => l['@type'] === 'FAQPage');
  expect(faqs).toHaveLength(1);
  expect(faqs[0].mainEntity.length).toBe(await page.locator('main details').count());
  await expect(page.getByRole('main').getByRole('link', { name: 'Zakažite razgovor' })).toHaveAttribute('href', '/trezvenoumlje/kontakt/');
});
