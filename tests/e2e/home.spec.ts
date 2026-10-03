import { expect, test } from '@playwright/test';

test('home shows the main sections with working destinations', async ({ page }) => {
  await page.goto('');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByText('Stručno znanje i ljudska podrška za prevenciju zavisnosti, porodicu i zdravije izbore.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Podrška pre nego što problem postane kriza' })).toBeVisible();
  const main = page.getByRole('main');
  await expect(main.getByRole('link', { name: 'Pogledajte programe' })).toHaveAttribute('href', '/trezvenoumlje/programi/');
  await expect(main.getByRole('link', { name: /Pročitajte biografiju/ })).toHaveAttribute('href', '/trezvenoumlje/dr-dragan-vukadinovic/');
  await expect(main.getByRole('heading', { name: 'Kako razgovarati sa mladima o alkoholu, drogama i kocki' })).toBeVisible();
  await expect(main.getByText('RSD')).toHaveCount(0);
});

test('home links every section to its destination', async ({ page }) => {
  await page.goto('');
  const main = page.getByRole('main');
  const destinations: [string | RegExp, string][] = [
    ['Roditelji i porodice', 'usluge/porodice/'],
    ['Mladi i adolescenti', 'usluge/mladi/'],
    ['Posle rehabilitacije', 'usluge/posle-rehabilitacije/'],
    ['Kompanije', 'organizacije/kompanije/'],
    ['Škole i NVO', 'organizacije/skole-i-nvo/'],
    ['Advokati i pravni timovi', 'organizacije/advokati/'],
    ['Saznajte više: Trezvena kuća', 'programi/trezvena-kuca/'],
    ['Saznajte više: Čist izbor', 'programi/cist-izbor/'],
    ['Saznajte više: Put stabilnosti', 'programi/put-stabilnosti/'],
    ['Čitajte priče', 'pricamo-pricu/price/'],
    ['O knjizi', 'pricamo-pricu/'],
    [/Svi resursi/, 'resursi/'],
    ['Šta posle rehabilitacije', 'resursi/sta-posle-rehabilitacije/'],
    ['Postavite pitanje', 'cesta-pitanja/'],
  ];
  for (const [name, path] of destinations) {
    await expect(main.getByRole('link', { name, exact: true })).toHaveAttribute('href', `/trezvenoumlje/${path}`);
  }
  await expect(main.getByRole('link', { name: 'Zakažite razgovor' })).toHaveCount(2);
  for (const link of await main.getByRole('link', { name: 'Zakažite razgovor' }).all()) {
    await expect(link).toHaveAttribute('href', '/trezvenoumlje/kontakt/');
  }
  await expect(main.getByRole('note')).toContainText('Ako je nečiji život ili zdravlje u neposrednoj opasnosti');
});

test('article cards label the category as text, not as a link', async ({ page }) => {
  await page.goto('');
  const cards = page.locator('[data-filter-item]');
  await expect(cards).toHaveCount(3);
  const card = page.locator('[data-filter-item="mladi"]');
  await expect(card.getByText('Mladi', { exact: true })).toBeVisible();
  await expect(card.getByRole('link')).toHaveCount(1);
  await expect(card.getByRole('img')).toHaveAttribute('alt', /.+/);
});

test('home has no horizontal scroll on mobile', async ({ page, isMobile }) => {
  test.skip(!isMobile);
  await page.goto('');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
