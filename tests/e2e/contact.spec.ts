import { expect, test } from '@playwright/test';
import { readEntry } from './helpers';

const VIBER = 'viber://chat?number=%2B381648596212';
const settings = readEntry<{ telefon: string; email: string }>('podesavanja/sajt.json');

test('empty submit shows three errors with text, not colour alone', async ({ page }) => {
  await page.goto('kontakt/');
  await page.getByRole('button', { name: 'Pošaljite zahtev' }).click();
  await expect(page.getByText('Unesite ime ili inicijale.')).toBeVisible();
  await expect(page.getByText('Unesite ispravan broj telefona ili e-mail.')).toBeVisible();
  await expect(page.getByText('Potrebna je potvrda da ste pročitali politiku privatnosti.')).toBeVisible();
  await expect(page.getByLabel(/Ime ili inicijali/)).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel(/Ime ili inicijali/)).toBeFocused();
  await expect(page.getByLabel(/Ime ili inicijali/)).toHaveAccessibleDescription('Unesite ime ili inicijale.');
  await expect(page.locator('[data-contact-error] svg')).toHaveCount(3);
});

test('an error disappears once its field is corrected', async ({ page }) => {
  await page.goto('kontakt/');
  await page.getByRole('button', { name: 'Pošaljite zahtev' }).click();
  const name = page.getByLabel(/Ime ili inicijali/);
  await name.fill('M. P.');
  await expect(page.getByText('Unesite ime ili inicijale.')).toBeHidden();
  await expect(name).not.toHaveAttribute('aria-invalid');
  await expect(name).toHaveAccessibleDescription('');
  await expect(page.getByText('Unesite ispravan broj telefona ili e-mail.')).toBeVisible();
});

test('valid submit shows the confirmation in place and sends no request', async ({ page }) => {
  const NAME = 'Milaprovera';
  const CONTACT = '+381 64 123-45-67';
  // Every request from the click on, whatever its method: none may carry what was typed.
  let clicked = false;
  const afterClick: { url: string; body: string }[] = [];
  // An address with a malformed percent-escape is kept as it is: a listener that throws would hide the request.
  const decoded = (url: string) => { try { return decodeURIComponent(url); } catch { return url; } };
  page.on('request', (r) => { if (clicked) afterClick.push({ url: decoded(r.url()), body: r.postData() ?? '' }); });
  await page.goto('kontakt/');
  await page.getByLabel(/Ime ili inicijali/).fill(NAME);
  await page.getByLabel(/Telefon ili e-mail/).fill(CONTACT);
  await page.getByLabel(/Upoznat\/a sam/).check();
  const submit = page.getByRole('button', { name: 'Pošaljite zahtev' });
  clicked = true;
  await submit.dblclick();
  await expect(page.getByRole('heading', { name: `Hvala, ${NAME}. Zahtev je poslat.` })).toHaveCount(1);
  await expect(page).toHaveURL(/\/kontakt\/$/);
  await page.waitForLoadState('networkidle');
  const digits = CONTACT.replace(/\D/g, '');
  const leaks = afterClick.filter(({ url, body }) => [url, body].some((text) =>
    text.includes(NAME) || text.includes(CONTACT) || text.replace(/\D/g, '').includes(digits)));
  expect(leaks).toEqual([]);
  expect(afterClick.filter((r) => r.body !== '')).toEqual([]);
  await page.getByRole('button', { name: 'Pošaljite novi upit' }).click();
  await expect(page.getByLabel(/Ime ili inicijali/)).toHaveValue('');
});

test('name is rendered as text, not HTML, in the confirmation', async ({ page }) => {
  await page.goto('kontakt/');
  await page.getByLabel(/Ime ili inicijali/).fill('<img src=x onerror=alert(1)>');
  await page.getByLabel(/Telefon ili e-mail/).fill('a@b.rs');
  await page.getByLabel(/Upoznat\/a sam/).check();
  await page.getByRole('button', { name: 'Pošaljite zahtev' }).click();
  await expect(page.locator('[data-contact-done]')).toBeFocused();
  await expect(page.locator('[data-contact-done] img')).toHaveCount(0);
  await expect(page.locator('[data-contact-name]')).toHaveText('<img src=x onerror=alert(1)>');
});

test('nothing the visitor typed is kept in the URL, the fields or browser storage', async ({ page }) => {
  await page.goto('kontakt/');
  await page.getByLabel(/Ime ili inicijali/).fill('Mila');
  await page.getByLabel(/Telefon ili e-mail/).fill('mila@example.rs');
  await page.getByLabel(/Tip upita/).selectOption('porodica');
  await page.getByLabel(/Kratka poruka/).fill('Poruka za proveru');
  await page.getByLabel(/Upoznat\/a sam/).check();
  await page.getByRole('button', { name: 'Pošaljite zahtev' }).click();
  await expect(page.locator('[data-contact-done]')).toBeVisible();
  expect(new URL(page.url()).search).toBe('');
  expect(new URL(page.url()).hash).toBe('');
  const kept = await page.evaluate(() => ({
    fields: [...document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[data-contact-form] :is(input, select, textarea)')]
      .map((f) => (f instanceof HTMLInputElement && f.type === 'checkbox' ? String(f.checked) : f.value)),
    storage: localStorage.length + sessionStorage.length,
    cookie: document.cookie,
    links: [...document.querySelectorAll('a')].filter((a) => /porodica|mila/i.test(a.getAttribute('href') ?? '')).length,
  }));
  expect(kept).toEqual({ fields: ['', '', '', '', '', 'false'], storage: 0, cookie: '', links: 0 });
});

test('a filled honeypot gets the confirmation and the honeypot is out of reach', async ({ page }) => {
  await page.goto('kontakt/');
  const trap = page.locator('input[name="website"]');
  await expect(trap).toHaveAttribute('tabindex', '-1');
  await expect(trap).toHaveAttribute('autocomplete', 'off');
  await expect(page.locator('[aria-hidden="true"]').filter({ has: trap })).toHaveCount(1);
  await expect(trap).not.toBeInViewport();
  await trap.evaluate((el: HTMLInputElement) => { el.value = 'http://x'; });
  await page.getByRole('button', { name: 'Pošaljite zahtev' }).click();
  await expect(page.locator('[data-contact-done]')).toBeVisible();
});

test('page states the dev-preview status and the emergency note', async ({ page }) => {
  await page.goto('kontakt/');
  await expect(page.getByText('Dev pregled: forma ne šalje podatke.')).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Centar nije hitna služba');
});

test('direct contact: phone and e-mail are links; Viber is offered on a phone only', async ({ page, isMobile }) => {
  await page.goto('kontakt/');
  const direct = page.locator('address.direct');
  await expect(direct.getByRole('link', { name: settings.telefon, exact: true })).toHaveAttribute('href', 'tel:0648596212');
  await expect(direct.getByRole('link', { name: settings.email, exact: true })).toHaveAttribute('href', 'mailto:trezvenoumljeprica@gmail.com');
  const viber = direct.locator('a', { hasText: 'Viber' });
  await expect(viber).toHaveAttribute('href', VIBER);
  await expect(viber).toHaveText('Viber');
  const footerViber = page.getByRole('contentinfo').locator('a', { hasText: 'Viber' });
  await expect(footerViber).toHaveAttribute('href', VIBER);
  if (isMobile) {
    await expect(viber).toBeVisible();
    await expect(viber).toHaveAccessibleName(`Viber: ${settings.telefon}`);
    await expect(footerViber).toBeVisible();
    await expect(footerViber).toHaveAccessibleName(`Viber: ${settings.telefon}`);
    for (const link of [viber, footerViber]) {
      const box = (await link.boundingBox())!;
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    }
  } else {
    // Hidden with display: none, so it is out of the accessibility tree as well.
    await expect(viber).toBeHidden();
    await expect(footerViber).toBeHidden();
    await expect(page.getByRole('link', { name: /Viber/ })).toHaveCount(0);
  }
});

test('the Viber link is a plain link: nothing is requested and nothing opens on load', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => { requests.push(r.url()); });
  await page.goto('kontakt/');
  await page.waitForLoadState('networkidle');
  expect(requests.filter((url) => /viber/i.test(url))).toEqual([]);
  const links = page.locator('a[href^="viber:"]');
  expect(await links.count()).toBeGreaterThan(0);
  for (const link of await links.all()) {
    expect(await link.evaluate((a) => a.getAttributeNames().filter((n) => n.startsWith('on') || n === 'target' || n === 'ping'))).toEqual([]);
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('the form is replaced by a note with the direct contact', async ({ page }) => {
    await page.goto('kontakt/');
    // Playwright switches script execution off but Chromium's parser still treats <noscript> as raw text,
    // so the note is checked through the element's text rather than as rendered content.
    const note = await page.locator('[data-contact] noscript').evaluate((el) => el.textContent ?? '');
    expect(note).toContain('Za slanje zahteva potreban je JavaScript. Možete nas kontaktirati i direktno.');
    // The direct contact is whatever the settings hold: the note carries the same lines as the page's own contact block.
    // Whichever way the browser holds the <noscript> content (markup as text, or parsed elements), read its address lines.
    const lines = await page.locator('[data-contact] noscript').evaluate((el) => {
      const html = el.children.length > 0 ? el.innerHTML : el.textContent ?? '';
      return [...new DOMParser().parseFromString(html, 'text/html').querySelectorAll('address > *')].map((n) => n.textContent);
    });
    // E-mail, phone and the Viber link.
    expect(lines).toHaveLength(3);
    expect(lines).toEqual((await page.locator('address.direct > :is(a, span)').allTextContents()).slice(0, 3));
    expect(lines[2]).toBe('Viber');
    await expect(page.locator('[data-contact-form]')).toBeHidden();
    await expect(page.getByRole('heading', { level: 1, name: 'Zakažite razgovor' })).toBeVisible();
  });
});
