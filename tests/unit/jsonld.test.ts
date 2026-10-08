import { expect, test } from 'vitest';
import { article, book, breadcrumbs, faqPage, localBusiness, organization, person, videoObject } from '../../src/lib/jsonld';

const cfg = { env: 'production' as const, siteUrl: 'https://example.rs', basePath: '/' };

test('organization is a plain Organization, never a medical type', () => {
  const o = organization(cfg, { naziv: 'Trezvenoumlje', podnaslov: 'Centar' });
  expect(o['@type']).toBe('Organization');
  expect(JSON.stringify(o)).not.toMatch(/Medical|Physician/);
  expect(o.url).toBe('https://example.rs/');
});
test('breadcrumbs are positioned from 1 with absolute urls', () => {
  const b = breadcrumbs([{ label: 'Početna', path: '/' }, { label: 'Kontakt', path: '/kontakt/' }], cfg);
  expect(b.itemListElement.map((i: { position: number }) => i.position)).toEqual([1, 2]);
  expect(b.itemListElement[1].item).toBe('https://example.rs/kontakt/');
});
test('faqPage maps questions and answers', () => {
  const f = faqPage([{ pitanje: 'P?', odgovor: 'O.' }]);
  expect(f['@type']).toBe('FAQPage');
  expect(f.mainEntity[0]).toEqual({ '@type': 'Question', name: 'P?', acceptedAnswer: { '@type': 'Answer', text: 'O.' } });
});

test('faqPage is null for an empty list', () => {
  expect(faqPage([] as { pitanje: string; odgovor: string }[])).toBeNull();
});
test('person is a Person working for a plain Organization', () => {
  const p = person(cfg);
  expect(p['@type']).toBe('Person');
  expect(p.url).toBe('https://example.rs/dr-dragan-vukadinovic/');
  expect(JSON.stringify(p)).not.toMatch(/Medical|Physician/);
});
test('article emits dates and reviewer only when present', () => {
  const base = { naslov: 'N', sazetak: 'S', autor: 'A', path: '/resursi/n/' };
  const bare = article(base, cfg);
  expect(bare).toEqual({
    '@context': 'https://schema.org', '@type': 'Article', headline: 'N', description: 'S',
    author: { '@type': 'Person', name: 'A' },
    publisher: { '@type': 'Organization', name: 'Trezvenoumlje', logo: { '@type': 'ImageObject', url: 'https://example.rs/og-default.png' } },
    mainEntityOfPage: 'https://example.rs/resursi/n/',
  });
  const full = article({ ...base, recenzent: 'R', datum: new Date('2026-01-02T00:00:00Z'), datumRevizije: new Date('2026-02-03T00:00:00Z') }, cfg);
  expect(full).toMatchObject({
    reviewedBy: { '@type': 'Person', name: 'R' },
    datePublished: '2026-01-02T00:00:00.000Z', dateModified: '2026-02-03T00:00:00.000Z',
  });
});
test('article carries its image only when given, always a publisher, never a medical type', () => {
  const base = { naslov: 'N', sazetak: 'S', autor: 'A', path: '/resursi/n/' };
  const sub = { env: 'preview' as const, siteUrl: 'https://x.github.io', basePath: '/trezvenoumlje/' };
  expect(article({ ...base, image: 'https://example.rs/_astro/n.jpg' }, cfg).image).toBe('https://example.rs/_astro/n.jpg');
  expect(article(base, cfg)).not.toHaveProperty('image');
  expect(article(base, sub).publisher).toEqual({
    '@type': 'Organization', name: 'Trezvenoumlje', logo: { '@type': 'ImageObject', url: 'https://x.github.io/trezvenoumlje/og-default.png' },
  });
  expect(JSON.stringify(article({ ...base, image: 'https://example.rs/_astro/n.jpg' }, cfg))).not.toMatch(/Medical|Physician/);
});
test('book drops bibliographic values that are still placeholders', () => {
  const b = book({ naslov: 'K', autor: 'A', isbn: '[ISBN]', izdavac: 'Izdavač', godina: '[GODINA]', path: '/knjige/k/' }, cfg);
  expect(b).toEqual({
    '@context': 'https://schema.org', '@type': 'Book', name: 'K', author: { '@type': 'Person', name: 'A' },
    url: 'https://example.rs/knjige/k/', publisher: { '@type': 'Organization', name: 'Izdavač' },
  });
});
test('videoObject embeds from youtube-nocookie only', () => {
  const v = videoObject({ naslov: 'V', opis: 'O', youtubeId: 'abc123', path: '/resursi/' }, cfg);
  expect(v['@type']).toBe('VideoObject');
  expect(v.embedUrl).toBe('https://www.youtube-nocookie.com/embed/abc123');
  expect(v.description).toBe('O');
});
test('localBusiness is null while phone or address is a placeholder', () => {
  const s = { naziv: 'Trezvenoumlje', telefon: '[TELEFON]', adresa: 'Ulica 1, Beograd', radnoVreme: '[RADNO VREME]' };
  expect(localBusiness(cfg, s)).toBeNull();
  expect(localBusiness(cfg, { ...s, telefon: '011 000 000', adresa: '[ADRESA]' })).toBeNull();
  const ok = localBusiness(cfg, { ...s, telefon: '011 000 000' });
  expect(ok).toEqual({
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: 'Trezvenoumlje', url: 'https://example.rs/',
    telephone: '011 000 000', address: 'Ulica 1, Beograd',
  });
  expect(JSON.stringify(ok)).not.toMatch(/Medical|Physician/);
});

test('book carries its short description once it is real text', () => {
  const input = { naslov: 'K', autor: 'A', path: '/knjige/k/' };
  expect(book({ ...input, opis: 'O čemu je knjiga.' }, cfg)).toMatchObject({ description: 'O čemu je knjiga.' });
  expect(book({ ...input, opis: '[Kratak opis knjige]' }, cfg)).not.toHaveProperty('description');
  expect(book(input, cfg)).not.toHaveProperty('description');
});
