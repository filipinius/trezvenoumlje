import { describe, expect, test } from 'vitest';
import { buildSeo, clampDescription } from '../../src/lib/seo';

const preview = { env: 'preview' as const, siteUrl: 'https://x.github.io', basePath: '/trezvenoumlje/' };
const prod = { env: 'production' as const, siteUrl: 'https://example.rs', basePath: '/' };

describe('buildSeo', () => {
  test('inner page title gets the brand suffix; home does not', () => {
    expect(buildSeo({ title: 'Kontakt', description: 'd', path: '/kontakt/' }, prod).title).toBe('Kontakt – Trezvenoumlje');
    expect(buildSeo({ title: 'Trezvenoumlje – centar', description: 'd', path: '/', isHome: true }, prod).title).toBe('Trezvenoumlje – centar');
  });
  test('canonical and og image are absolute and base-aware', () => {
    const m = buildSeo({ title: 'K', description: 'd', path: '/kontakt/' }, preview);
    expect(m.canonical).toBe('https://x.github.io/trezvenoumlje/kontakt/');
    expect(m.ogImage).toBe('https://x.github.io/trezvenoumlje/og-default.png');
  });
  test('a page without an address of its own opts out of the canonical', () => {
    expect(buildSeo({ title: 'K', description: 'd', path: '/404/', canonical: false }, prod).canonical).toBeNull();
    expect(buildSeo({ title: 'K', description: 'd', path: '/kontakt/' }, prod).canonical).toBe('https://example.rs/kontakt/');
  });
  test('robots: preview is always noindex; production honours the flag', () => {
    expect(buildSeo({ title: 'K', description: 'd', path: '/' }, preview).robots).toBe('noindex, nofollow');
    expect(buildSeo({ title: 'K', description: 'd', path: '/' }, prod).robots).toBe('index, follow');
    expect(buildSeo({ title: 'K', description: 'd', path: '/', noindex: true }, prod).robots).toBe('noindex, follow');
  });
});

describe('clampDescription', () => {
  test('short text is unchanged', () => { expect(clampDescription('Kratak opis.')).toBe('Kratak opis.'); });
  test('long text is cut at a word boundary within 160 chars with an ellipsis', () => {
    const out = clampDescription('reč '.repeat(80));
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });
  test('collapses whitespace and newlines', () => { expect(clampDescription('a\n\n  b')).toBe('a b'); });
});
