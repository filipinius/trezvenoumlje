import { describe, expect, test } from 'vitest';
import { findPlaceholders, hasCyrillic, markPlaceholders, slugify } from '../../src/lib/text';

describe('slugify', () => {
  test.each([
    ['Šta posle rehabilitacije', 'sta-posle-rehabilitacije'],
    ['Čist izbor', 'cist-izbor'],
    ['Đorđe Džaković', 'djordje-dzakovic'],
    ['Mentalna higijena 360°', 'mentalna-higijena-360'],
    ['  Škole  i  NVO ', 'skole-i-nvo'],
    ['Kako razgovarati sa mladima o alkoholu, drogama i kockanju', 'kako-razgovarati-sa-mladima-o-alkoholu-drogama-i-kockanju'],
    ['„Okovani slon“', 'okovani-slon'],
    ['Café – naïve', 'cafe-naive'],
  ])('%s → %s', (input, expected) => { expect(slugify(input)).toBe(expected); });
  test('empty and symbol-only input give empty string', () => {
    expect(slugify('')).toBe('');
    expect(slugify('—°!')).toBe('');
  });
});

describe('hasCyrillic', () => {
  test('detects Cyrillic, including a single look-alike letter inside a Latin word', () => {
    expect(hasCyrillic('Смисао')).toBe(true);
    expect(hasCyrillic('Smisaо')).toBe(true); // last letter is Cyrillic о
  });
  test('accepts Latin with Serbian diacritics', () => {
    expect(hasCyrillic('Čćšžđ ČĆŠŽĐ Lj Nj Dž „navodnici“ – 360°')).toBe(false);
  });
});

describe('findPlaceholders', () => {
  test('finds bracketed values, also inside other text', () => {
    expect(findPlaceholders('Pozovite [BROJ HITNE SLUŽBE] ili kontakt@[domen].rs'))
      .toEqual(['[BROJ HITNE SLUŽBE]', '[domen]']);
  });
  test('ignores Markdown links and images', () => {
    expect(findPlaceholders('Vidi [politiku privatnosti](/politika-privatnosti/) i ![slika](a.webp)')).toEqual([]);
  });
  test('ignores Markdown reference links and empty brackets', () => {
    expect(findPlaceholders('Vidi [tekst][1] i []')).toEqual([]);
  });
  test('ignores Markdown reference-link definitions', () => {
    expect(findPlaceholders('Vidi [tekst][1].\n\n[1]: https://a.rs/x')).toEqual([]);
  });
  test('ignores an indented reference definition', () => {
    expect(findPlaceholders('   [ref]: https://a.rs')).toEqual([]);
    expect(findPlaceholders('[1]: /politika-privatnosti/')).toEqual([]);
  });
  test('still finds placeholders directly followed by a colon', () => {
    expect(findPlaceholders('Telefon [TELEFON]: radnim danima')).toEqual(['[TELEFON]']);
    expect(findPlaceholders('Radno vreme: [DANI]: 9-17')).toEqual(['[DANI]']);
    expect(findPlaceholders('[IME OSNIVAČA]: biografija')).toEqual(['[IME OSNIVAČA]']);
  });
  test('returns empty for plain text', () => { expect(findPlaceholders('Bez zagrada.')).toEqual([]); });
});

describe('markPlaceholders', () => {
  test('stays consistent with findPlaceholders for definitions and colons', () => {
    expect(markPlaceholders('[1]: https://a.rs')).toBe('[1]: https://a.rs');
    expect(markPlaceholders('[1]: <https://a.rs>')).toBe('[1]: &lt;https://a.rs&gt;');
    expect(markPlaceholders('Telefon [TELEFON]: x')).toBe('Telefon <mark class="ph">[TELEFON]</mark>: x');
  });
  test('escapes HTML and wraps placeholders', () => {
    expect(markPlaceholders('<b> [TELEFON]')).toBe('&lt;b&gt; <mark class="ph">[TELEFON]</mark>');
  });
});
