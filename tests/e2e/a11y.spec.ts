import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectedStatus, SWEEP_PAGES } from './helpers';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
/** This project's own rule; WCAG 2.2 AA asks for 24px. */
const MIN_TARGET = 44;

/** Violations as `rule: node | node`, of the whole page or of the part matched by `include`. */
async function violations(page: Page, include?: string): Promise<string[]> {
  const axe = new AxeBuilder({ page }).withTags(TAGS);
  if (include) axe.include(include);
  const { violations: found } = await axe.analyze();
  return found.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

/** The one open dialog, once its fade-in is over: axe reads colours through the opacity of the moment. */
async function openDialog(page: Page): Promise<Locator> {
  const dlg = page.locator('dialog[open]');
  await expect(dlg).toBeVisible();
  await dlg.evaluate((d) => Promise.all(d.getAnimations().map((a) => a.finished)));
  return dlg;
}

for (const path of SWEEP_PAGES) {
  test(`no WCAG A/AA violations: /${path}`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(expectedStatus(path));
    expect(await violations(page)).toEqual([]);
  });
}

const OVERLAYS: { name: string; path: string; open: (page: Page) => Promise<void> }[] = [
  { name: 'team member', path: 'o-nama/', open: (page) => page.getByRole('button', { name: /dr Dragan Vukadinović/ }).click() },
  { name: 'how to get a book', path: 'knjige/', open: (page) => page.getByRole('button', { name: /Kako do knjige/ }).first().click() },
  { name: 'story reader', path: 'pricamo-pricu/price/', open: (page) => page.getByRole('link', { name: /Okovani slon/ }).click() },
  {
    name: 'weekly review', path: 'pricamo-pricu/price/',
    open: async (page) => {
      await page.locator('a[data-filter-value="3"]').click();
      await page.getByRole('button', { name: /Otvorite osvrt/ }).click();
    },
  },
  { name: 'how to get Pričamo priču', path: 'pricamo-pricu/', open: (page) => page.getByRole('main').getByRole('button', { name: 'Kako do knjige' }).click() },
  { name: 'book summary', path: 'pricamo-pricu/', open: (page) => page.getByRole('main').getByRole('button', { name: 'Pročitajte sažetak' }).click() },
];

for (const { name, path, open } of OVERLAYS) {
  test(`open overlay has no WCAG A/AA violations: ${name} on /${path}`, async ({ page }) => {
    await page.goto(path);
    await open(page);
    await openDialog(page);
    expect(await violations(page, 'dialog[open]')).toEqual([]);
  });
}

test('open video dialog has no WCAG A/AA violations', async ({ page }) => {
  // The player address is answered locally: the scan must not reach the internet.
  await page.route('**://www.youtube-nocookie.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>stub</body></html>' }));
  await page.goto('knjige/');
  await page.locator('#mediji').getByRole('button', { name: /^Pusti video:/ }).first().click();
  const dlg = await openDialog(page);
  await expect(dlg.locator('iframe')).toHaveCount(1);
  // The document inside the iframe is third-party content we do not control, so it is left out of the scan;
  // the frame element's own accessible name is asserted here instead.
  await expect(dlg.locator('iframe')).toHaveAttribute('title', /\S/);
  const { violations: found } = await new AxeBuilder({ page }).withTags(TAGS).include('dialog[open]').exclude('iframe').analyze();
  expect(found.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
});

test('open mobile menu has no WCAG A/AA violations', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile navigation');
  await page.goto('');
  await page.getByRole('button', { name: 'Meni' }).click();
  await expect(page.getByRole('navigation', { name: 'Glavna navigacija' }).getByRole('link', { name: 'Usluge' })).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test('contact form in its error state has no WCAG A/AA violations', async ({ page }) => {
  await page.goto('kontakt/');
  await page.getByRole('button', { name: 'Pošaljite zahtev' }).click();
  await expect(page.locator('[data-contact-error]:visible')).toHaveCount(3);
  expect(await violations(page)).toEqual([]);
});

test('contact confirmation has no WCAG A/AA violations', async ({ page }) => {
  await page.goto('kontakt/');
  await page.getByLabel(/Ime ili inicijali/).fill('M. P.');
  await page.getByLabel(/Telefon ili e-mail/).fill('mp@example.rs');
  await page.getByLabel(/Upoznat\/a sam/).check();
  await page.getByRole('button', { name: 'Pošaljite zahtev' }).click();
  await expect(page.locator('[data-contact-done]')).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test('FAQ hub with a question open has no WCAG A/AA violations', async ({ page }) => {
  await page.goto('cesta-pitanja/');
  const first = page.locator('main details').first();
  await first.locator('summary').click();
  await expect(first.locator('p').first()).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test('resources filtered by a topic chip have no WCAG A/AA violations', async ({ page }) => {
  await page.goto('resursi/');
  await page.getByRole('link', { name: 'Porodica', exact: true }).click();
  await expect(page.locator('[data-filter-item]:visible')).toHaveCount(1);
  expect(await violations(page)).toEqual([]);
});

for (const path of ['', 'usluge/', 'pricamo-pricu/price/', 'kontakt/', 'cesta-pitanja/', 'resursi/']) {
  test(`interactive targets are at least ${MIN_TARGET}px on mobile: /${path}`, async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch targets');
    await page.goto(path);
    const { measured, small } = await page.evaluate((min) => {
      const controls = 'a, button, summary, input, select, textarea, [role="button"]';
      const selector = ['header', 'main', 'footer'].map((area) => `${area} :is(${controls})`).join(', ');
      // WCAG 2.2 exempts a link inside a sentence: its height is the line's.
      const inSentence = (el: Element) => el.matches('a') && getComputedStyle(el).display === 'inline'
        && [...el.parentElement!.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== '');
      // What a finger can hit: a checkbox is hit through its label, a card link through the pseudo-element stretched over the card.
      const hitBox = (el: Element) => {
        if (el.matches('input[type="checkbox"], input[type="radio"]') && el.closest('label')) return el.closest('label')!.getBoundingClientRect();
        // Only a pseudo-element pinned to all four edges of the card covers it.
        const stretched = ['::before', '::after'].some((pseudo) => {
          const style = getComputedStyle(el, pseudo);
          return style.content !== 'none' && style.position === 'absolute'
            && [style.top, style.right, style.bottom, style.left].every((edge) => edge === '0px');
        });
        return (stretched && el instanceof HTMLElement && el.offsetParent ? el.offsetParent : el).getBoundingClientRect();
      };
      const targets = [...document.querySelectorAll(selector)]
        .filter((el) => el.checkVisibility({ visibilityProperty: true }) && !el.closest('[aria-hidden="true"]') && !inSentence(el))
        .map((el) => ({ el, r: hitBox(el) }));
      return {
        measured: targets.length,
        small: targets
          .filter(({ r }) => r.width > 0 && (r.height < min || r.width < min))
          .map(({ el, r }) => `${el.textContent?.trim().replace(/\s+/g, ' ').slice(0, 40) || el.getAttribute('aria-label') || el.id || el.tagName} (${Math.round(r.width)}×${Math.round(r.height)})`),
      };
    }, MIN_TARGET);
    expect(measured).toBeGreaterThan(0);
    expect(small).toEqual([]);
  });
}

test.describe('keyboard only', () => {
  test.beforeEach(({ isMobile }) => { test.skip(!!isMobile, 'keyboard operation is checked on the desktop project'); });

  /** Tab forward until `target` holds the focus. */
  async function tabTo(page: Page, target: Locator): Promise<void> {
    await expect(async () => {
      await page.keyboard.press('Tab');
      await expect(target).toBeFocused({ timeout: 100 });
    }).toPass({ intervals: [0] });
  }

  test('the skip link is the first stop and leads to the content', async ({ page }) => {
    await page.goto('');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Preskoči na sadržaj' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#sadrzaj$/);
    // The next stop is inside the content: the header was skipped.
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('#sadrzaj'))).toBe(true);
  });

  test('a story opens from its card with Enter and Escape returns the focus to the card', async ({ page }) => {
    await page.goto('pricamo-pricu/price/');
    const card = page.locator('a[data-story-link]').first();
    await tabTo(page, card);
    await page.keyboard.press('Enter');
    const dlg = page.getByRole('dialog');
    await expect(dlg).toBeVisible();
    expect(await page.evaluate(() => !!document.activeElement?.closest('dialog[open]'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
    await expect(card).toBeFocused();
  });

  test('the contact form can be filled and sent without a pointer', async ({ page }) => {
    await page.goto('kontakt/');
    await tabTo(page, page.getByLabel(/Ime ili inicijali/));
    await page.keyboard.type('M. P.');
    await tabTo(page, page.getByLabel(/Telefon ili e-mail/));
    await page.keyboard.type('mp@example.rs');
    const consent = page.getByLabel(/Upoznat\/a sam/);
    await tabTo(page, consent);
    await page.keyboard.press('Space');
    await expect(consent).toBeChecked();
    await tabTo(page, page.getByRole('button', { name: 'Pošaljite zahtev' }));
    await page.keyboard.press('Enter');
    const done = page.locator('[data-contact-done]');
    await expect(done.getByRole('heading', { name: 'Hvala, M. P.. Zahtev je poslat.' })).toBeVisible();
    await expect(done).toBeFocused();
  });
});

test('with reduced motion an overlay opens without animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('o-nama/');
  await page.getByRole('button', { name: /dr Dragan Vukadinović/ }).click();
  const dlg = page.locator('dialog[open]');
  await expect(dlg).toBeVisible();
  const longest = await dlg.evaluate((d) => {
    const seconds = (value: string) => value.split(',').map((v) => (v.trim().endsWith('ms') ? parseFloat(v) / 1000 : parseFloat(v)));
    return Math.max(...[getComputedStyle(d), getComputedStyle(d, '::backdrop')]
      .flatMap((style) => [...seconds(style.animationDuration), ...seconds(style.transitionDuration)]));
  });
  expect(longest).toBeLessThanOrEqual(0.01);
});
