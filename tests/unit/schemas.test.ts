import { describe, expect, test } from 'vitest';
import { b2bSchema, clanakSchema, knjigaSchema, medijSchema, pitanjeSchema, podesavanjaSchema, pravnoSchema, pricaSchema, uslugaSchema } from '../../src/content/schemas';
import { priceLabel } from '../../src/lib/price';

describe('uslugaSchema', () => {
  const base = { naziv: 'Psihoedukacija o zavisnostima', slug: 'psihoedukacija', meta: 'pojedinci i porodice', opis: 'Mehanizmi zavisnosti.', status: 'objavljeno' };
  test('price display defaults to hidden', () => {
    expect(uslugaSchema.parse(base).prikazCene).toBe('skriveno');
  });
  test('rejects Cyrillic in copy', () => {
    expect(() => uslugaSchema.parse({ ...base, opis: 'Смисао' })).toThrow(/latinic/i);
  });
  test('rejects a slug with diacritics or capitals', () => {
    expect(() => uslugaSchema.parse({ ...base, slug: 'Psiho-edukacija' })).toThrow();
    expect(() => uslugaSchema.parse({ ...base, slug: 'čist' })).toThrow();
  });
  test('status is required and constrained', () => {
    expect(() => uslugaSchema.parse({ ...base, status: 'published' })).toThrow();
  });
});

test('article slug cannot be a reserved word', () => {
  const a = { naslov: 'N', slug: 'tema', autor: 'A', kategorija: 'porodica', sazetak: 'S', status: 'nacrt' };
  expect(() => clanakSchema.parse(a)).toThrow(/rezervisan/i);
});

test('an article image must come with its alternative text', () => {
  const a = { naslov: 'N', slug: 'naslov', autor: 'A', kategorija: 'porodica', sazetak: 'S', status: 'nacrt' };
  expect(clanakSchema.parse(a).slika).toBeUndefined();
  expect(clanakSchema.parse({ ...a, slika: 'clanak.webp', slikaAlt: 'Porodica za stolom' }).slikaAlt).toBe('Porodica za stolom');
  expect(() => clanakSchema.parse({ ...a, slika: 'clanak.webp' })).toThrow(/slikaAlt/);
});

describe('pravnoSchema', () => {
  const page = { naslov: 'Politika privatnosti', slug: 'politika-privatnosti', status: 'nacrt' };
  test('accepts a slug of its own', () => {
    expect(pravnoSchema.parse(page).slug).toBe('politika-privatnosti');
  });
  test.each(['kontakt', 'usluge', 'programi', 'organizacije', 'resursi', 'knjige', 'o-nama', 'pricamo-pricu', 'cesta-pitanja', 'dr-dragan-vukadinovic', '404'])(
    'rejects the slug of the top-level route /%s/', (slug) => {
      expect(() => pravnoSchema.parse({ ...page, slug })).toThrow(/rezervisan/i);
    });
});

test('FAQ id is a stable lowercase identifier', () => {
  const q = { id: 'da-li-je-razgovor-lecenje', pitanje: 'P?', odgovor: 'O.', kategorija: 'opste', redosled: 1, status: 'objavljeno' };
  expect(pitanjeSchema.parse(q).id).toBe('da-li-je-razgovor-lecenje');
  expect(() => pitanjeSchema.parse({ ...q, id: 'Da li' })).toThrow();
});

test('story requires stable question ids', () => {
  const s = { id: 'p02', n: 2, nedelja: 1, dan: '1. nedelja – utorak', naslov: 'Okovani slon', slug: 'okovani-slon', podnaslov: 'Šta me još drži vezanog?', izvor: 'Prema priči Horhea Bukaja', tekst: ['a'], pitanja: [{ id: 'p02-q1', tekst: 'x?' }], poruka: 'm', zadatak: 'z', citat: 'c', status: 'objavljeno' };
  expect(pricaSchema.parse(s).pitanja[0]!.id).toBe('p02-q1');
  expect(() => pricaSchema.parse({ ...s, pitanja: [{ tekst: 'x?' }] })).toThrow();
});

describe('priceLabel', () => {
  test.each([
    ['skriveno', '1.234 RSD', null],
    ['na-upit', undefined, 'Na upit'],
    ['od', '1.234 RSD', 'od 1.234 RSD'],
    ['tacna', '1.234 RSD', '1.234 RSD'],
    ['tacna', undefined, null],
  ] as const)('%s / %s → %s', (prikaz, cena, expected) => { expect(priceLabel(prikaz, cena)).toBe(expected); });
});

describe('b2bSchema', () => {
  test('uvod is optional', () => {
    const entry = { segment: 'Škole i NVO', slug: 'skole-i-nvo', naslov: 'Prevencija koja počinje u učionici', kategorijaPitanja: 'organizacije', status: 'objavljeno' };
    expect(b2bSchema.parse(entry).uvod).toBeUndefined();
  });
});

describe('medijSchema', () => {
  const base = { naslov: 'Emisija', slug: 'emisija', medij: 'Radio', datum: '2025.', status: 'nacrt' };
  test('accepts an 11-character YouTube id and an entry without one', () => {
    expect(medijSchema.parse({ ...base, youtubeId: 'abc123XYZ_-' }).youtubeId).toBe('abc123XYZ_-');
    expect(medijSchema.parse(base).youtubeId).toBeUndefined();
  });
  test('rejects a URL or an id of the wrong length', () => {
    expect(() => medijSchema.parse({ ...base, youtubeId: 'https://www.youtube.com/watch?v=abc123XYZ_-' })).toThrow();
    expect(() => medijSchema.parse({ ...base, youtubeId: 'abc123XYZ_' })).toThrow();
  });
  test('the date is optional', () => {
    const { datum: _datum, ...undated } = base;
    expect(medijSchema.parse(undated).datum).toBeUndefined();
    expect(medijSchema.parse(base).datum).toBe('2025.');
  });
  test('pocetak is an optional whole number of seconds, zero or more', () => {
    expect(medijSchema.parse(base).pocetak).toBeUndefined();
    expect(medijSchema.parse({ ...base, pocetak: 0 }).pocetak).toBe(0);
    expect(medijSchema.parse({ ...base, pocetak: 2141 }).pocetak).toBe(2141);
    expect(() => medijSchema.parse({ ...base, pocetak: -1 })).toThrow();
    expect(() => medijSchema.parse({ ...base, pocetak: 1.5 })).toThrow();
    expect(() => medijSchema.parse({ ...base, pocetak: '35:41' })).toThrow();
  });
  test('redosled is a whole number that defaults to 0', () => {
    expect(medijSchema.parse(base).redosled).toBe(0);
    expect(medijSchema.parse({ ...base, redosled: 3 }).redosled).toBe(3);
    expect(() => medijSchema.parse({ ...base, redosled: 1.5 })).toThrow();
  });
});

describe('podesavanjaSchema', () => {
  const base = {
    naziv: 'Trezvenoumlje', podnaslov: 'Centar', slogan: 'Slogan', email: 'a@b.rs', telefon: '011 000 000', adresa: '[ADRESA]',
    radnoVreme: '[RADNO VREME]', hitnaSluzba: '[BROJ]', poslovniPodaci: '[PODACI]', rokOdgovora: '[BROJ] radnih dana', rokCuvanja: '[ROK]', facebook: 'Facebook',
  };
  test('viber is optional', () => {
    expect(podesavanjaSchema.parse(base).viber).toBeUndefined();
  });
  test('viber is an international number: + and 8 to 15 digits, nothing else', () => {
    expect(podesavanjaSchema.parse({ ...base, viber: '+381110000000' }).viber).toBe('+381110000000');
    for (const viber of ['0110000000', '+381 11 000 0000', '+3811100', '+3811100000000000', 'viber://chat?number=%2B381110000000', ''])
      expect(() => podesavanjaSchema.parse({ ...base, viber }), viber).toThrow();
  });
});

test('a book may carry its edition, format and price note, and may leave them out', () => {
  const k = { naslov: 'Pričamo priču', slug: 'pricamo-pricu', autor: 'dr Dragan Vukadinović', status: 'objavljeno' };
  const bare = knjigaSchema.parse(k);
  expect([bare.izdanje, bare.format, bare.cenaNapomena]).toEqual([undefined, undefined, undefined]);
  const full = knjigaSchema.parse({ ...k, izdanje: 'Prvo izdanje', format: '[FORMAT]', cenaNapomena: '[NAPOMENA O CENI]' });
  expect([full.izdanje, full.format, full.cenaNapomena]).toEqual(['Prvo izdanje', '[FORMAT]', '[NAPOMENA O CENI]']);
  expect(() => knjigaSchema.parse({ ...k, izdanje: '' })).toThrow();
});
