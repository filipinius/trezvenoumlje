import { expect, test, type Page } from '@playwright/test';
import { expectedStatus, SWEEP_PAGES, watchForeign } from './helpers';

const stored = (page: Page) => page.evaluate(() => ({ cookie: document.cookie, local: localStorage.length, session: sessionStorage.length }));
const NOTHING = { cookie: '', local: 0, session: 0 };

for (const path of SWEEP_PAGES) {
  test(`no third-party request and no cookie on load: /${path}`, async ({ page, context, baseURL }) => {
    const foreign = watchForeign(page, baseURL);
    const response = await page.goto(path);
    expect(response?.status()).toBe(expectedStatus(path));
    await page.waitForLoadState('networkidle');
    expect(foreign).toEqual([]);
    expect(await context.cookies()).toEqual([]);
    expect(await stored(page)).toEqual(NOTHING);
  });
}

test('reading stories in the overlay sends nothing out and stores nothing', async ({ page, context, baseURL }) => {
  const foreign = watchForeign(page, baseURL);
  await page.goto('pricamo-pricu/price/');
  await page.getByRole('link', { name: /Okovani slon/ }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  expect(await stored(page)).toEqual(NOTHING);
  await dlg.locator('a[data-story-nav="next"]').click();
  await expect(page).toHaveURL(/vilinsko-kolo/);
  await dlg.getByRole('button', { name: 'Zatvori' }).click();
  await expect(dlg).toBeHidden();
  await page.waitForLoadState('networkidle');
  expect(foreign).toEqual([]);
  expect(await stored(page)).toEqual(NOTHING);
  expect(await context.cookies()).toEqual([]);
});

test('sending the contact form makes no request and keeps nothing', async ({ page, context, baseURL }) => {
  const NAME = 'Milaprovera';
  const CONTACT = 'milaprovera@example.rs';
  const foreign = watchForeign(page, baseURL);
  let clicked = false;
  const afterClick: string[] = [];
  page.on('request', (r) => { if (clicked) afterClick.push(`${r.method()} ${r.url()}`); });
  await page.goto('kontakt/');
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/Ime ili inicijali/).fill(NAME);
  await page.getByLabel(/Telefon ili e-mail/).fill(CONTACT);
  await page.getByLabel(/Upoznat\/a sam/).check();
  clicked = true;
  await page.getByRole('button', { name: 'Pošaljite zahtev' }).click();
  await expect(page.locator('[data-contact-done]')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(afterClick).toEqual([]);
  expect(foreign).toEqual([]);
  const address = decodeURIComponent(page.url());
  const { search, hash } = new URL(page.url());
  expect([search, hash]).toEqual(['', '']);
  expect(address).not.toContain(NAME);
  expect(address).not.toContain(CONTACT);
  expect(await stored(page)).toEqual(NOTHING);
  expect(await context.cookies()).toEqual([]);
});

test('the page with the media appearances embeds no player and points at no YouTube address', async ({ page }) => {
  await page.goto('knjige/');
  await expect(page.locator('#mediji article').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('iframe')).toHaveCount(0);
  const youtube = await page.evaluate(() => [...document.querySelectorAll('[src], [href]')]
    .map((el) => el.getAttribute('src') ?? el.getAttribute('href') ?? '')
    .filter((address) => /youtube|ytimg/i.test(address)));
  expect(youtube).toEqual([]);
});
