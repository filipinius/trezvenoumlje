import { describe, expect, test } from 'vitest';
import { readEnv } from '../../src/lib/env';
import { isIndexable, isVisible } from '../../src/lib/status';
import { absoluteUrl, withBase } from '../../src/lib/url';

describe('readEnv', () => {
  test('defaults to preview at root', () => {
    expect(readEnv({})).toEqual({ env: 'preview', siteUrl: 'http://localhost:4321', basePath: '/' });
  });
  test('normalises slashes', () => {
    expect(readEnv({ PUBLIC_SITE_ENV: 'production', SITE: 'https://example.rs/', BASE_URL: 'trezvenoumlje' }))
      .toEqual({ env: 'production', siteUrl: 'https://example.rs', basePath: '/trezvenoumlje/' });
  });
  test('empty SITE and BASE_URL fall back to defaults', () => {
    expect(readEnv({ SITE: '', BASE_URL: '' })).toEqual({ env: 'preview', siteUrl: 'http://localhost:4321', basePath: '/' });
  });
  test('unknown env value falls back to preview (never accidentally indexable)', () => {
    expect(readEnv({ PUBLIC_SITE_ENV: 'prod' }).env).toBe('preview');
  });
});

describe('withBase', () => {
  const B = '/trezvenoumlje/';
  test.each([
    ['/', B, '/trezvenoumlje/'],
    ['/kontakt/', B, '/trezvenoumlje/kontakt/'],
    ['/usluge/#programi', B, '/trezvenoumlje/usluge/#programi'],
    ['/kontakt/', '/', '/kontakt/'],
    ['#osnivac', B, '#osnivac'],
    ['https://youtube-nocookie.com/x', B, 'https://youtube-nocookie.com/x'],
    ['mailto:a@b.rs', B, 'mailto:a@b.rs'],
    ['tel:+381111', B, 'tel:+381111'],
  ])('%s with %s → %s', (path, base, expected) => { expect(withBase(path, base)).toBe(expected); });
  test('does not double-prefix an already prefixed path', () => {
    expect(withBase('/trezvenoumlje/kontakt/', B)).toBe('/trezvenoumlje/kontakt/');
  });
  test('treats the bare base without trailing slash as already prefixed', () => {
    expect(withBase('/trezvenoumlje', B)).toBe('/trezvenoumlje');
  });
  test('prefixes a different first segment that merely starts with the base name', () => {
    expect(withBase('/trezvenoumlje-arhiva/', B)).toBe('/trezvenoumlje/trezvenoumlje-arhiva/');
  });
  test('passes protocol-relative URLs through', () => {
    expect(withBase('//cdn.x.rs/a.js', B)).toBe('//cdn.x.rs/a.js');
  });
  test('rejects a relative path', () => { expect(() => withBase('kontakt/', B)).toThrow(/must start with/); });
});

test('absoluteUrl joins site, base and path', () => {
  const cfg = { env: 'preview' as const, siteUrl: 'https://x.github.io', basePath: '/trezvenoumlje/' };
  expect(absoluteUrl('/kontakt/', cfg)).toBe('https://x.github.io/trezvenoumlje/kontakt/');
  expect(absoluteUrl('https://a.b/c', cfg)).toBe('https://a.b/c');
  expect(absoluteUrl('//cdn.x.rs/a.js', cfg)).toBe('//cdn.x.rs/a.js');
});

describe('status', () => {
  test('production shows only objavljeno; preview shows everything', () => {
    expect(isVisible('nacrt', 'production')).toBe(false);
    expect(isVisible('pregled', 'production')).toBe(false);
    expect(isVisible('objavljeno', 'production')).toBe(true);
    expect(isVisible('nacrt', 'preview')).toBe(true);
  });
  test('nothing is indexable in preview; noindex and drafts are not indexable in production', () => {
    expect(isIndexable({ status: 'objavljeno' }, 'preview')).toBe(false);
    expect(isIndexable({ status: 'objavljeno' }, 'production')).toBe(true);
    expect(isIndexable({ status: 'objavljeno', noindex: true }, 'production')).toBe(false);
    expect(isIndexable({ status: 'nacrt' }, 'production')).toBe(false);
  });
});
