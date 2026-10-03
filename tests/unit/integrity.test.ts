import { expect, test } from 'vitest';
import { findIntegrityErrors } from '../../src/lib/integrity';

const clean = {
  ciljneGrupe: [{ file: 'ciljneGrupe/porodice.json', slug: 'porodice' }, { file: 'ciljneGrupe/mladi.json', slug: 'mladi' }],
  usluge: [{ file: 'usluge/roditelji.json', slug: 'roditelji', ciljneGrupe: ['porodice'] }],
  programi: [{ file: 'programi/cist-izbor.json', slug: 'cist-izbor', ciljneGrupe: ['mladi', 'porodice'] }],
  nedelje: [{ file: 'nedelje/01.json', n: 1 }],
  price: [{ file: 'price/01-provera-hrabrosti.json', slug: 'provera-hrabrosti', n: 1, nedelja: 1 }],
};

test('clean content has no integrity errors', () => {
  expect(findIntegrityErrors(clean)).toEqual([]);
  expect(findIntegrityErrors({})).toEqual([]);
});

test('a slug used twice in one collection names the collection, the slug and both files', () => {
  const errors = findIntegrityErrors({
    ...clean,
    usluge: [...clean.usluge, { file: 'usluge/roditelji-kopija.json', slug: 'roditelji', ciljneGrupe: [] }],
  });
  expect(errors).toHaveLength(1);
  expect(errors[0]).toContain('usluge');
  expect(errors[0]).toContain('„roditelji“');
  expect(errors[0]).toContain('usluge/roditelji.json');
  expect(errors[0]).toContain('usluge/roditelji-kopija.json');
});

test('the same slug in two different collections is not a duplicate', () => {
  expect(findIntegrityErrors({ ...clean, usluge: [{ file: 'usluge/mladi.json', slug: 'mladi', ciljneGrupe: ['mladi'] }] })).toEqual([]);
});

test.each(['usluge', 'programi'])('an unknown audience in %s names the entry and the bad value', (collection) => {
  const errors = findIntegrityErrors({ ...clean, [collection]: [{ file: `${collection}/x.json`, slug: 'x', ciljneGrupe: ['porodice', 'porodce'] }] });
  expect(errors).toHaveLength(1);
  expect(errors[0]).toContain(`${collection}/x.json`);
  expect(errors[0]).toContain('„porodce“');
});

test('a story whose week has no entry names the story and the week', () => {
  const errors = findIntegrityErrors({ ...clean, price: [...clean.price, { file: 'price/06-dva-vuka.json', slug: 'dva-vuka', n: 6, nedelja: 2 }] });
  expect(errors).toHaveLength(1);
  expect(errors[0]).toContain('price/06-dva-vuka.json');
  expect(errors[0]).toContain('2');
});

test('every problem is reported, not only the first', () => {
  const errors = findIntegrityErrors({
    ...clean,
    usluge: [{ file: 'usluge/a.json', slug: 'a', ciljneGrupe: ['nema'] }, { file: 'usluge/b.json', slug: 'a' }],
    price: [{ file: 'price/x.json', slug: 'x', n: 1, nedelja: 9 }],
  });
  expect(errors).toHaveLength(3);
});
