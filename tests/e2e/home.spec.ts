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

test('home offers a call, a Viber message and a video conversation', async ({ page }) => {
  await page.goto('');
  const section = page.getByRole('region', { name: 'Javite nam se direktno' });
  const call = section.getByRole('link', { name: 'Pozovite nas', exact: true });
  const viber = section.getByRole('link', { name: 'Pošaljite Viber poruku', exact: true });
  const video = section.getByRole('link', { name: 'Zakažite video razgovor', exact: true });
  await expect(call).toHaveAttribute('href', 'tel:0648596212');
  await expect(viber).toHaveAttribute('href', 'viber://chat?number=%2B381648596212');
  await expect(video).toHaveAttribute('href', '/trezvenoumlje/kontakt/#video-razgovor');
  for (const link of [call, viber, video]) await expect(link).toBeVisible();
  await expect(section).toContainText('Prvi informativni video razgovor je bez naknade.');
  await expect(section).toContainText('Telefon i Viber: 064 859 6212');
  const [callBox, viberBox, videoBox] = [(await call.boundingBox())!, (await viber.boundingBox())!, (await video.boundingBox())!];
  expect(videoBox.y).toBeGreaterThanOrEqual(Math.max(callBox.y + callBox.height, viberBox.y + viberBox.height));
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
