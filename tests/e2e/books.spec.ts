import { expect, test } from '@playwright/test';

test('book list shows Pričamo priču first and opens the how-to-get overlay for others', async ({ page }) => {
  await page.goto('knjige/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Knjige dr Dragana Vukadinovića');
  await expect(page.getByRole('link', { name: /Pogledajte knjigu/ })).toHaveAttribute('href', '/trezvenoumlje/pricamo-pricu/');
  await page.getByRole('button', { name: /Kako do knjige/ }).first().click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toContainText('Gde se nabavlja');
  await expect(dlg.getByRole('link', { name: 'Pošaljite upit' })).toHaveAttribute('href', '/trezvenoumlje/kontakt/');
});

test('book list has one card per book, in editorial order, with breadcrumbs', async ({ page }) => {
  await page.goto('knjige/');
  await expect(page.getByRole('navigation', { name: 'Putanja' })).toHaveCount(1);
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 2 })).toHaveText(
    [
      'Pričamo priču', 'Opijati: skripta za pacijente', 'Kanabis: zavisnost i oporavak',
      'Trezvenoumlje: kratki psihijatrijski praktikum, ilustrovani prikaz slučaja', 'Anatomija jedne duševne bolnice: bolnica u Toponici',
    ],
  );
  await expect(main.locator('.status-badge')).toHaveCount(0);
  // No book has a cover image yet: each shows the drawn cover, named after its title.
  await expect(main.getByRole('img', { name: 'Korica knjige Pričamo priču' })).toBeVisible();
  await expect(main.getByRole('img', { name: 'Korica knjige Opijati: skripta za pacijente' })).toBeVisible();
  await expect(main.locator('.book-cover')).toHaveCount(5);
  await expect(main.locator('.book .book-cover').last()).toContainText('dr Dragan Vukadinović i Ana Vukadinović');
  await expect(main.locator('.book-line').nth(1)).toHaveText('Talija izdavaštvo, Niš · 2025. · ISBN 978-86-6140-219-7');
  await expect(main.locator('img')).toHaveCount(0);
  // Every book but the one with its own section has a detail page: its title links there.
  await expect(main.locator('h2 a[href*="/knjige/"]')).toHaveCount(4);
  await expect(main.getByRole('link', { name: 'Kanabis: zavisnost i oporavak', exact: true })).toHaveAttribute('href', '/trezvenoumlje/knjige/kanabis-zavisnost-i-oporavak/');
});

test('each overlay names its book and closes on Escape, returning focus', async ({ page }) => {
  await page.goto('knjige/');
  const trigger = page.getByRole('button', { name: 'Kako do knjige: Kanabis: zavisnost i oporavak' });
  await trigger.click();
  const dlg = page.getByRole('dialog');
  await expect(dlg.getByRole('heading', { level: 2 })).toHaveText('Kako do knjige');
  await expect(dlg.locator('.book-title')).toHaveText('Kanabis: zavisnost i oporavak');
  await expect(dlg).toContainText('Talija izdavaštvo, Niš, 2025.');
  await expect(dlg).toContainText('978-86-6140-219-7');
  const order = dlg.getByRole('link', { name: 'Naručite kod izdavača: Kanabis: zavisnost i oporavak' });
  await expect(order).toHaveText('Naručite kod izdavača');
  await expect(order).toHaveAttribute('href', 'https://www.talijaizdavastvo.rs/korpa/pocetak/494-dr-dragan-vukadinovic-kanabis-zavisnost-i-oporavak.html');
  await expect(order).toHaveAttribute('rel', 'noopener');
  for (const term of ['Naslov', 'Izdavač', 'ISBN', 'Gde se nabavlja']) {
    await expect(dlg.locator('dt', { hasText: new RegExp(`^${term}$`) })).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await expect(dlg).toBeHidden();
  await expect(trigger).toBeFocused();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('the how-to-get details are readable in the page', async ({ page }) => {
    await page.goto('knjige/');
    await expect(page.getByText('Gde se nabavlja').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pošaljite upit' }).first()).toBeVisible();
    await expect(page.locator('[data-dialog-open]').first()).toBeHidden();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    // On a phone the details get the full width of the page, not half of it.
    const viewport = page.viewportSize()!.width;
    const block = (await page.locator('dialog[id^="knjiga-"]').first().boundingBox())!.width;
    if (viewport < 700) expect(block).toBeGreaterThan(viewport * 0.8);
  });
});

test('a book page gives the bibliographic data and the way to order it from the publisher', async ({ page }) => {
  await page.goto('knjige/anatomija-jedne-dusevne-bolnice/');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('Anatomija jedne duševne bolnice: bolnica u Toponici');
  await expect(main).toContainText('dr Dragan Vukadinović i Ana Vukadinović');
  await expect(main).toContainText('978-86-80406-53-4');
  await expect(main.getByRole('link', { name: /Naručite kod izdavača/ })).toHaveAttribute(
    'href', 'https://www.talijaizdavastvo.rs/korpa/istorija/274-dragan-i-ana-vukadinovic-anatomija-jedne-dusevne-bolnice.html',
  );
  await expect(main.getByRole('link', { name: 'Pošaljite upit' })).toHaveAttribute('href', '/trezvenoumlje/kontakt/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('knjige/ does not scroll sideways', async ({ page }) => {
  await page.goto('knjige/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
