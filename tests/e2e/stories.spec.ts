import { expect, test } from '@playwright/test';
import { noJsContext, readEntry } from './helpers';

const LIB = /\/pricamo-pricu\/price\/(#.*)?$/;

test('story opens in an overlay with its own address', async ({ page }) => {
  await page.goto('pricamo-pricu/price/');
  await page.getByRole('link', { name: /Okovani slon/ }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  await expect(dlg.getByRole('heading', { name: 'Okovani slon' })).toBeVisible();
  await expect(page).toHaveURL(/\/pricamo-pricu\/okovani-slon\/$/);
  await expect(page).toHaveTitle(/Okovani slon/);
});

test('next/next then one Back closes the overlay and restores the library', async ({ page }) => {
  await page.goto('pricamo-pricu/price/');
  await page.getByRole('link', { name: /Okovani slon/ }).click();
  const dlg = page.getByRole('dialog');
  await dlg.locator('a[data-story-nav="next"]').click();
  await expect(page).toHaveURL(/vilinsko-kolo/);
  await dlg.locator('a[data-story-nav="next"]').click();
  await expect(page).toHaveURL(/pruzi-mi-ruku/);
  await page.goBack();
  await expect(dlg).toBeHidden();
  await expect(page).toHaveURL(LIB);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Biblioteka priča');
});

test('Escape closes the overlay and restores the library address', async ({ page }) => {
  await page.goto('pricamo-pricu/price/');
  await page.getByRole('link', { name: /Okovani slon/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page).toHaveURL(LIB);
});

test('a story address opened directly is a full page with its own metadata', async ({ page }) => {
  await page.goto('pricamo-pricu/okovani-slon/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Okovani slon');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Okovani slon/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /okovani-slon/);
  await expect(page.locator('[data-question-id="p02-q1"]')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Okovani slon');
});

test('first story has no previous link and the last has no next link', async ({ page }) => {
  await page.goto('pricamo-pricu/provera-hrabrosti/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Provera hrabrosti');
  await expect(page.locator('a[data-story-nav="prev"]')).toHaveCount(0);
  await expect(page.locator('a[data-story-nav="next"]')).toHaveCount(1);
  await page.goto('pricamo-pricu/prazna-sveska/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Prazna sveska');
  await expect(page.locator('a[data-story-nav="next"]')).toHaveCount(0);
  await expect(page.locator('a[data-story-nav="prev"]')).toHaveCount(1);
});

test('week chip filters the library; review overlay collects nothing', async ({ page }) => {
  await page.goto('pricamo-pricu/price/');
  await expect(page.locator('a[data-story-link]:visible')).toHaveCount(50);
  await page.locator('a[data-filter-value="3"]').click();
  await expect(page.locator('a[data-story-link]:visible')).toHaveCount(5);
  await page.getByRole('button', { name: /Otvorite osvrt/ }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg.locator('li')).toHaveCount(5);
  await expect(dlg.locator('input, textarea, form')).toHaveCount(0);
});

test('without JavaScript a story card is an ordinary link', async ({ browser, baseURL }) => {
  const ctx = await noJsContext(browser, baseURL);
  const page = await ctx.newPage();
  await page.goto('pricamo-pricu/price/');
  await page.getByRole('link', { name: /Okovani slon/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Okovani slon');
  await ctx.close();
});

test('long story title does not overflow on mobile', async ({ page, isMobile }) => {
  test.skip(!isMobile);
  await page.goto('pricamo-pricu/vilinsko-kolo-kolo-iz-kog-se-ne-izlazi-bez-rana/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test('between tablet and desktop a week never leaves one card alone in a row', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('pricamo-pricu/price/');
  const tops = await page.locator('#nedelja-1 a[data-story-link]').evaluateAll((cards) => cards.map((c) => Math.round(c.getBoundingClientRect().top)));
  expect(tops).toHaveLength(5);
  const rows = [...new Set(tops)].map((top) => tops.filter((t) => t === top).length);
  expect(rows.length).toBeLessThanOrEqual(2);
  expect(rows).not.toContain(1);
});

const overflow = () => document.documentElement.scrollWidth - document.documentElement.clientWidth;
const ldTypes = (page: import('@playwright/test').Page) =>
  page.locator('script[type="application/ld+json"]').evaluateAll((nodes) =>
    nodes.flatMap((n) => [JSON.parse(n.textContent ?? 'null')].flat()).map((o) => o?.['@type']));

test('overlay: title is a second-level heading, neighbours are named, the page link back is not injected', async ({ page }) => {
  await page.goto('pricamo-pricu/price/');
  const card = page.getByRole('link', { name: /Okovani slon/ });
  await card.click();
  const dlg = page.getByRole('dialog', { name: 'Okovani slon' });
  await expect(dlg.getByRole('heading', { level: 2, name: 'Okovani slon' })).toBeVisible();
  await expect(dlg.locator('h1')).toHaveCount(0);
  await expect(dlg.locator('[data-question-id="p02-q1"]')).toBeVisible();
  await expect(dlg.getByRole('link', { name: 'Prethodna priča: Provera hrabrosti' })).toBeVisible();
  await expect(dlg.getByRole('link', { name: /^Sledeća priča: Vilinsko kolo/ })).toBeVisible();
  await expect(dlg.getByRole('link', { name: /Biblioteka priča/ })).toHaveCount(0);
  await dlg.locator('a[data-story-nav="next"]').click();
  const next = page.getByRole('dialog', { name: /Vilinsko kolo/ });
  await expect(next.locator('#story-dialog-title')).toBeFocused();
  expect(await next.evaluate((d) => d.scrollTop)).toBe(0);
  await next.getByRole('button', { name: 'Zatvori' }).click();
  await expect(next).toBeHidden();
  await expect(page).toHaveURL(LIB);
  await expect(page).toHaveTitle(/Biblioteka priča/);
  await expect(card).toBeFocused();
});

test('overlay: one second-level heading, sections one level below, the title of the story page', async ({ page }) => {
  await page.goto('pricamo-pricu/price/');
  await page.getByRole('link', { name: /Okovani slon/ }).click();
  const dlg = page.getByRole('dialog', { name: 'Okovani slon' });
  await expect(dlg.locator('h2')).toHaveCount(1);
  await expect(dlg.locator('h3')).toHaveText(['Pitanja za razmišljanje', 'Poruka za dan', 'Mali zadatak']);
  const inOverlay = await page.title();
  await page.goto('pricamo-pricu/okovani-slon/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Okovani slon');
  expect(inOverlay).toBe(await page.title());
});

test('Forward after closing the overlay shows the story as a full page', async ({ page }) => {
  await page.goto('pricamo-pricu/price/');
  await page.getByRole('link', { name: /Okovani slon/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.goForward();
  await expect(page).toHaveURL(/\/pricamo-pricu\/okovani-slon\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Okovani slon');
  await page.goBack();
  await expect(page).toHaveURL(LIB);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Biblioteka priča');
});

test('reload while reading in the overlay gives the story page; Back returns to the library', async ({ page }) => {
  await page.goto('pricamo-pricu/price/');
  await page.getByRole('link', { name: /Okovani slon/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Okovani slon');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(LIB);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Biblioteka priča');
});

test('overlay opened from a filtered week returns to that week', async ({ page }) => {
  await page.goto('pricamo-pricu/price/');
  await page.locator('a[data-filter-value="4"]').click();
  await expect(page).toHaveURL(/#nedelja-4$/);
  await page.getByRole('link', { name: /Dva vuka/ }).click();
  await expect(page).toHaveURL(/\/pricamo-pricu\/dva-vuka\/$/);
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/pricamo-pricu\/price\/#nedelja-4$/);
  await expect(page.locator('a[data-story-link]:visible')).toHaveCount(5);
});

test('library: headings, chips, week extras and the read-only review', async ({ page }) => {
  await page.goto('pricamo-pricu/price/');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(main.getByRole('heading', { level: 2 })).toHaveCount(10);
  await expect(main.getByRole('heading', { level: 3 })).toHaveCount(50);
  await expect(page.getByRole('button', { name: /Otvorite osvrt/ })).toHaveCount(0);
  const all = page.locator('a[data-filter-value=""]');
  const third = page.locator('a[data-filter-value="3"]');
  await expect(all).toHaveAttribute('aria-current', 'true');
  await third.click();
  await expect(third).toHaveAttribute('aria-current', 'true');
  await expect(all).not.toHaveAttribute('aria-current', /.*/);
  await expect(page.locator('#nedelja-3').getByText('Pet pitanja za tihi pregled nedelje. Ništa se ne upisuje i ne čuva.')).toBeVisible();
  await page.getByRole('button', { name: /Otvorite osvrt/ }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg.getByRole('heading', { level: 2 })).toHaveText('Moj izbor i moja odgovornost');
  await expect(dlg.locator('li[data-question-id]')).toHaveCount(5);
  await expect(dlg.locator('[data-question-id="n03-o1"]')).toBeVisible();
  await expect(dlg).toContainText('Odgovore zapišite za sebe, na papiru. Sajt ih ne prikuplja.');
  await page.keyboard.press('Escape');
  await all.click();
  await expect(page.locator('a[data-story-link]:visible')).toHaveCount(50);
  await expect(page.getByRole('button', { name: /Otvorite osvrt/ })).toHaveCount(0);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length, document.cookie])).toEqual([0, 0, '']);
  expect(await page.locator('main input, main textarea, main form').count()).toBe(0);
});

test('an address that names a week opens the library on that week', async ({ page }) => {
  await page.goto('pricamo-pricu/price/#nedelja-3');
  await expect(page.locator('a[data-story-link]:visible')).toHaveCount(5);
  await expect(page.locator('a[data-filter-value="3"]')).toHaveAttribute('aria-current', 'true');
});

test('without JavaScript a week link shows that week\'s intro and review in the page', async ({ browser, baseURL }) => {
  const ctx = await noJsContext(browser, baseURL);
  const page = await ctx.newPage();
  await page.goto('pricamo-pricu/price/');
  await expect(page.locator('a[data-story-link]:visible')).toHaveCount(50);
  await expect(page.locator('[data-question-id="n03-o1"]')).toBeHidden();
  await page.locator('a[data-filter-value="3"]').click();
  await expect(page).toHaveURL(/#nedelja-3$/);
  await expect(page.locator('[data-question-id="n03-o1"]')).toBeVisible();
  await expect(page.locator('[data-question-id="n04-o1"]')).toBeHidden();
  await expect(page.locator('#nedelja-3 [data-dialog-open]')).toBeHidden();
  await ctx.close();
});

test('book page: program, overlays with bracketed values, Book and one FAQPage', async ({ page }) => {
  await page.goto('pricamo-pricu/');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('Pričamo priču');
  await expect(main.getByRole('navigation', { name: 'Putanja' })).toHaveCount(1);
  await expect(main.getByRole('link', { name: 'Čitajte priče' })).toHaveAttribute('href', '/trezvenoumlje/pricamo-pricu/price/');
  await expect(main.getByRole('link', { name: 'Pročitajte celu priču' })).toHaveAttribute('href', '/trezvenoumlje/pricamo-pricu/okovani-slon/');
  await expect(main.getByRole('link', { name: /Za ustanove i NVO/ })).toHaveAttribute('href', '/trezvenoumlje/kontakt/');
  await expect(main.locator('.themes > li')).toHaveCount(10);
  await expect(main.locator('.themes ul li')).toHaveCount(50);
  const types = await ldTypes(page);
  expect(types.filter((t) => t === 'Book')).toHaveLength(1);
  expect(types.filter((t) => t === 'FAQPage').length).toBeLessThanOrEqual(1);

  await main.getByRole('button', { name: 'Kako do knjige' }).click();
  const buy = page.getByRole('dialog', { name: 'Kako do knjige' });
  await expect(buy).toContainText('[ŠTAMPANO / PDF]');
  await expect(buy).toContainText('[CENA ILI „NA UPIT“]');
  await expect(buy).not.toContainText(/\d\s*(RSD|din\b|€|EUR)/);
  await expect(buy.getByRole('link', { name: 'Pošaljite upit' })).toHaveAttribute('href', '/trezvenoumlje/kontakt/');
  await page.keyboard.press('Escape');
  await main.getByRole('button', { name: 'Pročitajte sažetak' }).click();
  await expect(page.getByRole('dialog', { name: /Teorijsko i kliničko obrazloženje/ })).toContainText('Ključne reči:');
});

for (const path of ['pricamo-pricu/', 'pricamo-pricu/price/']) {
  test(`${path} does not scroll sideways`, async ({ page }) => {
    await page.goto(path);
    expect(await page.evaluate(overflow)).toBeLessThanOrEqual(0);
  });
}

test('a story page shows its illustration exactly when its data names one', async ({ page }) => {
  const story = readEntry<{ slika?: string }>('price/01-provera-hrabrosti.json');
  await page.goto('pricamo-pricu/provera-hrabrosti/');
  await expect(page.locator('a[data-story-nav="prev"]')).toHaveCount(0);
  await expect(page.getByRole('main').getByRole('img', { name: 'Ilustracija uz priču Provera hrabrosti' })).toHaveCount(story.slika ? 1 : 0);
});
