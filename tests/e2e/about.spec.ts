import { expect, test } from '@playwright/test';
import { countEntries, noJsContext } from './helpers';

// Preview shows the draft members next to the founder: one card per entry.
const TEAM = countEntries('tim');

test('team overlay opens, traps focus, closes on Escape and returns focus', async ({ page }) => {
  await page.goto('o-nama/');
  const card = page.getByRole('button', { name: /dr Dragan Vukadinović/ });
  await card.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('U centru radi na');
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(card).toBeFocused();
});

test('a card announces its dialog only when the script can open it', async ({ page, browser, baseURL }) => {
  await page.goto('o-nama/');
  for (const card of await page.locator('[data-dialog-open^="tim-"]').all()) await expect(card).toHaveAttribute('aria-haspopup', 'dialog');
  const ctx = await noJsContext(browser, baseURL);
  const plain = await ctx.newPage();
  await plain.goto('o-nama/');
  await expect(plain.locator('[data-dialog-open^="tim-"]')).toHaveCount(TEAM);
  await expect(plain.locator('[aria-haspopup]')).toHaveCount(0);
  await ctx.close();
});

test('team overlay closes on backdrop click', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'overlay is full-screen on mobile; no backdrop');
  await page.goto('o-nama/');
  await page.getByRole('button', { name: /dr Dragan Vukadinović/ }).click();
  await page.mouse.click(5, 5);
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('founder page has Person structured data and a single h1', async ({ page }) => {
  await page.goto('dr-dragan-vukadinovic/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dr Dragan Vukadinović');
  const all = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(all.map((t) => JSON.parse(t)['@type'])).toContain('Person');
});

test('about page shows its sections and links the founder biography', async ({ page }) => {
  await page.goto('o-nama/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Iskustvo iz adiktologije, dostupno pre nego što problem postane kriza');
  await expect(page.getByRole('navigation', { name: 'Putanja' })).toHaveCount(1);
  for (const name of ['Misija', 'Vizija u fazama', 'Vrednosti', 'Granice našeg rada', 'Tim']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  const founder = page.locator('#osnivac');
  await expect(founder.getByRole('link', { name: /Cela biografija/ })).toHaveAttribute('href', '/trezvenoumlje/dr-dragan-vukadinovic/');
  await expect(page.locator('[data-dialog-open^="tim-"]')).toHaveCount(TEAM);

  await page.getByRole('button', { name: /dr Dragan Vukadinović/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { level: 2 })).toHaveText('dr Dragan Vukadinović');
  await expect(dialog.getByRole('link', { name: /Cela biografija/ })).toHaveAttribute('href', '/trezvenoumlje/dr-dragan-vukadinovic/');
  await dialog.getByRole('button', { name: 'Zatvori' }).click();
  await expect(dialog).toBeHidden();
});

test('founder page shows the timeline and links to books and media', async ({ page }) => {
  await page.goto('dr-dragan-vukadinovic/');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Profesionalni put' })).toBeVisible();
  await expect(main.locator('.timeline li')).toHaveCount(5);
  await expect(main.getByText('Osnivanje centra Trezvenoumlje')).toBeVisible();
  await expect(main.getByRole('img', { name: 'dr Dragan Vukadinović' })).toBeVisible();
  await expect(main.getByRole('link', { name: 'Knjige i publikacije' })).toHaveAttribute('href', '/trezvenoumlje/knjige/');
  await expect(main.getByRole('link', { name: 'Medijski nastupi' })).toHaveAttribute('href', '/trezvenoumlje/resursi/#mediji');
});

test('founder page lists a selection of professional papers', async ({ page }) => {
  await page.goto('dr-dragan-vukadinovic/');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 2, name: 'Izabrani stručni radovi' })).toBeVisible();
  const papers = main.locator('.papers li');
  await expect(papers).toHaveCount(6);
  await expect(papers.first()).toContainText('Subspecijalistički rad iz oblasti bolesti zavisnosti. Fakultet medicinskih nauka, Kragujevac, 2014.');
  await expect(papers.nth(1)).toContainText('Depresija i asertivnost kod alkoholičara. Medicinska reč, 2022; 3(1): 1–9.');
});

for (const path of ['o-nama/', 'dr-dragan-vukadinovic/']) {
  test(`${path} does not scroll sideways`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
