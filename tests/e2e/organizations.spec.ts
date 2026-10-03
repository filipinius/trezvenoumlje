import { expect, test } from '@playwright/test';

test('overview links to the three segment pages', async ({ page }) => {
  await page.goto('organizacije/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Prevencija, edukacija i jasni protokoli za vaš tim');
  for (const slug of ['kompanije', 'advokati', 'skole-i-nvo'])
    await expect(page.getByRole('main').locator(`a[href="/trezvenoumlje/organizacije/${slug}/"]`).first()).toBeVisible();
  for (const id of ['kompanije', 'advokati', 'skole']) await expect(page.locator(`main #${id}`)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Zatražite ponudu za vašu organizaciju' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Za organizacije: pošaljite upit' })).toHaveAttribute('href', '/trezvenoumlje/kontakt/');
});

test('lawyers page states clearly what the service is not', async ({ page }) => {
  await page.goto('organizacije/advokati/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Razumevanje zavisnosti za bolja pitanja u predmetu');
  await expect(page.getByRole('heading', { name: 'Šta ova usluga nije' })).toBeVisible();
  for (const t of ['sudskog veštačenja', 'sudsko-psihijatrijskog nalaza', 'procene uračunljivosti', 'medicinskog mišljenja za sud'])
    await expect(page.getByText(t, { exact: true })).toBeVisible();
  await expect(page.getByText('Pisani stručni osvrt objavljuje se tek kada se pravno definiše priroda dokumenta.')).toBeVisible();
});

test('companies page lists the modules', async ({ page }) => {
  await page.goto('organizacije/kompanije/');
  await expect(page.locator('[data-modul]')).toHaveCount(6); // preview includes the draft module
  await expect(page.locator('[data-modul]').last()).toContainText('čeka pravnu definiciju');
});

test('schools page lists what is on offer', async ({ page }) => {
  await page.goto('organizacije/skole-i-nvo/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Prevencija koja počinje u učionici');
  await expect(page.getByRole('main').getByRole('listitem').filter({ hasText: 'Obuke nastavnika i stručnih službi' })).toBeVisible();
});

test('every organisation page carries one FAQPage that matches the questions shown', async ({ page }) => {
  for (const path of ['organizacije/', 'organizacije/kompanije/', 'organizacije/advokati/', 'organizacije/skole-i-nvo/']) {
    await page.goto(path);
    const lds = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t));
    const faqs = lds.filter((l) => l['@type'] === 'FAQPage');
    expect(faqs, path).toHaveLength(1);
    expect(faqs[0].mainEntity.length, path).toBe(await page.locator('main details').count());
  }
});
