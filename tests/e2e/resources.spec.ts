import { expect, test, type Page } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT_DIR, countEntries, noJsContext, readEntry, watchForeign } from './helpers';

test('topic chip filters in place and updates the address', async ({ page }) => {
  await page.goto('resursi/');
  await expect(page.locator('[data-filter-item]:visible')).toHaveCount(6);
  await page.getByRole('link', { name: 'Porodica', exact: true }).click();
  await expect(page).toHaveURL(/\/resursi\/tema\/porodica\/$/);
  await expect(page.locator('[data-filter-item]:visible')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Kako porodica prepoznaje problem' })).toBeVisible();
});

test('empty topic shows the empty state instead of a blank page', async ({ page }) => {
  await page.goto('resursi/tema/pravni-sektor/');
  await expect(page.getByText('U ovoj kategoriji još nema objavljenih tekstova.')).toBeVisible();
});

test('topic pages work without JavaScript', async ({ browser, baseURL }) => {
  const ctx = await noJsContext(browser, baseURL);
  const page = await ctx.newPage();
  await page.goto('resursi/');
  await page.getByRole('link', { name: 'Mladi', exact: true }).click();
  await expect(page).toHaveURL(/\/resursi\/tema\/mladi\/$/);
  await expect(page.getByRole('heading', { name: /Kako razgovarati sa mladima/ })).toBeVisible();
  await expect(page.locator('[data-filter-item]:visible')).toHaveCount(1);
  await ctx.close();
});

test('article page has Article data, one h1 and no dead guide links', async ({ page }) => {
  await page.goto('resursi/kako-porodica-prepoznaje-problem/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kako porodica prepoznaje problem');
  const types = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t)['@type']);
  expect(types).toContain('Article');
  await page.goto('resursi/');
  await expect(page.locator('a[href="#"]')).toHaveCount(0);
});

test('RSS feed is served', async ({ request }) => {
  const res = await request.get('resursi/rss.xml');
  expect(res.ok()).toBe(true);
  expect(await res.text()).toContain('<rss');
});

test('topic page names its category and marks its chip', async ({ page }) => {
  await page.goto('resursi/tema/radno-mesto/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trezvene misli: Radno mesto');
  await expect(page).toHaveTitle('Trezvene misli: Radno mesto – Trezvenoumlje');
  await expect(page.locator('a[data-filter-value][aria-current]')).toHaveText('Radno mesto');
  await expect(page.locator('[data-filter-item]:visible')).toHaveCount(1);
  await page.getByRole('link', { name: 'Sve', exact: true }).click();
  await expect(page).toHaveURL(/\/resursi\/$/);
  await expect(page.locator('[data-filter-item]:visible')).toHaveCount(6);
  await expect(page.locator('a[data-filter-value][aria-current]')).toHaveText('Sve');
  await expect(page.locator('[data-filter-root]')).not.toHaveAttribute('data-filter-active');
});

test('chips are at least 44px tall', async ({ page }) => {
  await page.goto('resursi/');
  for (const chip of await page.locator('a[data-filter-value]').all()) {
    expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
});

test('guides without a file are not links, books link to their own page', async ({ page }) => {
  await page.goto('resursi/');
  const guides = page.getByRole('region', { name: 'Vodiči za preuzimanje' });
  await expect(guides.getByRole('listitem')).toHaveCount(3);
  await expect(guides.getByRole('link')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Knjige i publikacije' })).toHaveAttribute('href', '/trezvenoumlje/knjige/');
});

// The published appearances, in their editorial order (`redosled`).
const APPEARANCES = [
  'Vukadinović: Roditelji, izvucite glavu iz peska!',
  'Kako se boriti protiv bolesti zavisnosti',
  'Nekada marihuana, a sada lekovi za smirenje',
  'U bolnici Gornja Toponica – povratak u sobu gde je sve počelo',
  'Inicijativa „Trezvenoumlje“ 2020.',
];
const PLAYER_HOST = 'www.youtube-nocookie.com';

/** Answers the player address locally: the tests never reach the internet. */
const stubPlayer = (page: Page) => page.route(`**://${PLAYER_HOST}/**`, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>stub</body></html>' }));

const playButton = (page: Page, title: string) => page.locator('#mediji').getByRole('button', { name: `Pusti video: ${title}` });

test('media section lists the appearances in order and loads nothing from a third party', async ({ page, baseURL }) => {
  const foreign = watchForeign(page, baseURL);
  await page.goto('resursi/');
  const media = page.locator('#mediji');
  await expect(media.getByRole('heading', { level: 2 })).toHaveText('Medijski nastupi');
  await expect(media.locator('article')).toHaveCount(countEntries('mediji'));
  const titles = await media.getByRole('heading', { level: 3 }).allTextContents();
  expect(titles).toEqual(APPEARANCES);
  // The 2020 initiative closes the list: published, with the interview from that summer.
  const note = media.locator('article').filter({ has: page.getByRole('heading', { name: 'Inicijativa „Trezvenoumlje“ 2020.' }) });
  await expect(note.locator('.status-badge')).toHaveCount(0);
  await expect(note.locator('.video-meta')).toHaveText('Medijski istraživački centar · 19. 7. 2020.');
  await expect(note).toContainText('Besplatna psihijatrijska podrška putem interneta tokom pandemije');
  await expect(media.getByRole('button')).toHaveCount(APPEARANCES.length);
  for (const title of APPEARANCES) {
    const card = media.locator('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
    await expect(card.getByRole('button', { name: `Pusti video: ${title}` })).toBeVisible();
    await expect(card.getByText('Video se učitava tek na klik (YouTube, režim privatnosti).')).toBeVisible();
  }
  // The meta line carries the date only where there is one; the description is on the card itself.
  const cards = media.locator('article').filter({ has: page.getByRole('button') });
  await expect(cards.nth(0).locator('.video-meta')).toHaveText('TV Zona Plus');
  await expect(cards.nth(1).locator('.video-meta')).toHaveText('TV Zona Plus · Iz jutra u dan · 23. 8. 2024.');
  await expect(cards.nth(1).locator('.video-text')).toHaveText('Studijski razgovor sa dr Draganom Vukadinovićem na temu kako se boriti protiv bolesti zavisnosti.');
  await expect(media.locator('article .video-text')).toHaveCount(countEntries('mediji'));
  await expect(media.getByRole('link')).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('iframe')).toHaveCount(0);
  const youtube = await page.evaluate(() => [...document.querySelectorAll('[src], [href]')]
    .map((el) => el.getAttribute('src') ?? el.getAttribute('href') ?? '')
    .filter((address) => /youtube|ytimg/i.test(address)));
  expect(youtube).toEqual([]);
  const types = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t)['@type']);
  expect(types).not.toContain('VideoObject');
  expect(foreign).toEqual([]);
});

test('a click loads the player from the privacy host only, and closing removes it', async ({ page, baseURL }) => {
  await stubPlayer(page);
  const foreign = watchForeign(page, baseURL);
  await page.goto('resursi/');
  const button = playButton(page, APPEARANCES[0]!);
  await expect(button).toHaveAttribute('aria-haspopup', 'dialog');
  await button.click();
  const dialog = page.getByRole('dialog', { name: APPEARANCES[0]! });
  await expect(dialog).toBeVisible();
  const frame = dialog.locator('iframe');
  await expect(frame).toHaveCount(1);
  await expect(frame).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/8pK7-E09iGs\?/);
  await expect(frame).toHaveAttribute('src', /[?&]autoplay=1(&|$)/);
  await expect(frame).not.toHaveAttribute('src', /start=/);
  await expect(frame).toHaveAttribute('title', APPEARANCES[0]!);
  await expect(dialog).toContainText('Kratak medijski prilog u kome dr Dragan Vukadinović govori o ulozi roditelja');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(button).toBeFocused();
  await page.waitForLoadState('networkidle');
  expect(foreign.length).toBeGreaterThan(0);
  expect(foreign.filter((url) => new URL(url).host !== PLAYER_HOST)).toEqual([]);
});

test('an appearance with a start offset opens the player at that second', async ({ page, baseURL }) => {
  await stubPlayer(page);
  const foreign = watchForeign(page, baseURL);
  await page.goto('resursi/');
  await playButton(page, APPEARANCES[3]!).click();
  const frame = page.getByRole('dialog', { name: APPEARANCES[3]! }).locator('iframe');
  await expect(frame).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/4Ol8N3J7r5g\?/);
  await expect(frame).toHaveAttribute('src', /[?&]autoplay=1(&|$)/);
  await expect(frame).toHaveAttribute('src', /[?&]start=2141(&|$)/);
  await page.waitForLoadState('networkidle');
  expect(foreign.filter((url) => new URL(url).host !== PLAYER_HOST)).toEqual([]);
});

test('in-place filter keeps the heading and the document title in step with the address', async ({ page }) => {
  await page.goto('resursi/');
  await page.getByRole('link', { name: 'Porodica', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trezvene misli: Porodica');
  await expect(page).toHaveTitle(/Trezvene misli: Porodica/);
  await page.getByRole('link', { name: 'Sve', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trezvene misli');
  await expect(page).toHaveTitle('Trezvene misli – Trezvenoumlje');
  await expect(page).toHaveURL(/\/resursi\/$/);
});

test('topic page carries only the article list: no guides, books link or media section', async ({ page }) => {
  await page.goto('resursi/tema/porodica/');
  await expect(page.locator('#mediji')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Vodiči za preuzimanje' })).toHaveCount(0);
  await expect(page.locator('main').getByRole('link', { name: 'Knjige i publikacije' })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Filter po temi' })).toBeVisible();
});

test('the empty state is announced from a live region that is always in the page', async ({ page }) => {
  await page.goto('resursi/');
  const region = page.locator('[aria-live="polite"]').filter({ has: page.locator('[data-filter-empty]') });
  const empty = page.locator('[data-filter-empty]');
  await expect(region).toHaveCount(1);
  await expect(region).not.toHaveAttribute('hidden');
  await expect(empty).not.toHaveAttribute('aria-live');
  await expect(empty).toBeHidden();
  await page.getByRole('link', { name: 'Pravni sektor', exact: true }).click();
  await expect(empty).toBeVisible();
  await expect(region).toHaveText('U ovoj kategoriji još nema objavljenih tekstova.');
  // Back on the unfiltered list the message no longer speaks of a category.
  await page.getByRole('link', { name: 'Sve', exact: true }).click();
  await expect(empty).toBeHidden();
  await expect(empty).toHaveText('Još nema objavljenih tekstova.');
});

test('each playable card shows its own self-hosted still, readable notice included', async ({ page, baseURL }) => {
  const foreign = watchForeign(page, baseURL);
  await page.goto('resursi/');
  const stills = page.locator('#mediji img[data-video-still]');
  // Derived from content: an appearance may deliberately have no still and keep the generic poster.
  const withStill = readdirSync(join(CONTENT_DIR, 'mediji')).filter((f) => f.endsWith('.json'))
    .filter((f) => readEntry<{ slicica?: string }>(`mediji/${f}`).slicica).length;
  expect(withStill).toBeGreaterThan(0);
  await expect(stills).toHaveCount(withStill);
  const sources = await stills.evaluateAll((imgs) => imgs.map((img) => (img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src));
  // Different local files under the site's own base path — never YouTube's image host.
  expect(new Set(sources).size).toBe(withStill);
  for (const src of sources) {
    expect(new URL(src).origin).toBe(new URL(baseURL!).origin);
    expect(new URL(src).pathname.startsWith('/trezvenoumlje/_astro/')).toBe(true);
  }
  for (const img of await stills.all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  // The notice is stacked under the still, so it never covers the picture.
  const poster = page.locator('#mediji .video-poster').first();
  const stillBox = (await poster.locator('.video-still').boundingBox())!;
  const noticeBox = (await poster.locator('.video-notice').boundingBox())!;
  expect(noticeBox.y).toBeGreaterThanOrEqual(stillBox.y + stillBox.height - 1);
  const strip = await page.locator('#mediji .video-notice').first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(strip).not.toBe('rgba(0, 0, 0, 0)');
  await page.waitForLoadState('networkidle');
  expect(foreign).toEqual([]);
});

test('keyboard focus on a video card is visible over the photograph', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'keyboard focus');
  await page.goto('resursi/');
  const poster = page.locator('#mediji .video-poster').first();
  await poster.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(poster).toBeFocused();
  // A multi-band inset ring drawn above the image (a plain outline disappears on light frames).
  const ring = await poster.evaluate((el) => getComputedStyle(el, '::after').boxShadow);
  expect(ring).toContain('inset');
  expect(ring.split('inset').length - 1).toBe(3);
});
