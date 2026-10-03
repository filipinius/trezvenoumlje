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
  // Preview shows the four drafts after the published book.
  await expect(main.getByRole('heading', { level: 2 })).toHaveText(
    ['Pričamo priču', '[Naslov knjige 1]', '[Naslov knjige 2]', '[Naslov knjige 3]', '[Naslov knjige 4]'],
  );
  await expect(main.locator('.status-badge')).toHaveCount(4);
  // No book has a cover image yet: each shows the drawn cover, named only once its title is real.
  await expect(main.getByRole('img', { name: 'Korica knjige Pričamo priču' })).toBeVisible();
  await expect(main.locator('.book-cover')).toHaveCount(5);
  await expect(main.locator('.book .book-cover').first()).toContainText('[Naslov knjige 1]');
  await expect(main.locator('img')).toHaveCount(0);
  // No detail page exists for a draft or for a book with its own section: titles are not links.
  await expect(main.locator('a[href*="/knjige/"]')).toHaveCount(0);
});

test('each overlay names its book and closes on Escape, returning focus', async ({ page }) => {
  await page.goto('knjige/');
  const trigger = page.getByRole('button', { name: 'Kako do knjige: [Naslov knjige 2]' });
  await trigger.click();
  const dlg = page.getByRole('dialog');
  await expect(dlg.getByRole('heading', { level: 2 })).toHaveText('Kako do knjige');
  await expect(dlg).toContainText('[Naslov knjige 2]');
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

test('knjige/ does not scroll sideways', async ({ page }) => {
  await page.goto('knjige/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
