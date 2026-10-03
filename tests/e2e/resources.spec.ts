import { expect, test } from '@playwright/test';
import { noJsContext, watchForeign } from './helpers';

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

test('media section loads nothing from a third party and offers no player without an id', async ({ page, baseURL }) => {
  const foreign = watchForeign(page, baseURL);
  await page.goto('resursi/');
  const media = page.locator('#mediji');
  await expect(media.getByRole('heading', { level: 2 })).toHaveText('Medijski nastupi');
  // The 2020 initiative is a media entry like the others, a draft until its wording is settled.
  const note = media.locator('article').filter({ has: page.getByRole('heading', { name: 'Inicijativa „Trezvenoumlje“ 2020.' }) });
  await expect(note.getByRole('heading', { level: 3 })).toBeVisible();
  await expect(note.locator('.status-badge[data-status="nacrt"]')).toBeVisible();
  await expect(media.locator('article')).toHaveCount(3);
  await expect(media.getByText('[Linkovi ka objavama, ako postoje prava]')).toHaveCount(0);
  // No entry has a youtubeId or a link: plain cards, nothing that invites a click.
  await expect(media.getByRole('heading', { name: '[Naslov emisije]' })).toHaveCount(2);
  await expect(media.getByText('Video se učitava tek na klik (YouTube, režim privatnosti).')).toHaveCount(0);
  await expect(media.getByRole('button')).toHaveCount(0);
  await expect(media.getByRole('link')).toHaveCount(0);
  const types = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t)['@type']);
  expect(types).not.toContain('VideoObject');
  expect(foreign).toEqual([]);
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
