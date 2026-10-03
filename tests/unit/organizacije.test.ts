import { expect, test } from 'vitest';
import { segmentDescription } from '../../src/lib/organizacije';

test('the description of a segment without an intro is one sentence: title, colon, first two items', () => {
  expect(segmentDescription({
    naslov: 'Prevencija koja počinje u učionici',
    stavke: ['Predavanja za učenike i roditelje', 'Obuke nastavnika i stručnih službi', 'Preventivne kampanje i projekti'],
  })).toBe('Prevencija koja počinje u učionici: predavanja za učenike i roditelje, obuke nastavnika i stručnih službi.');
});

test('one item, no item, a diacritic first letter and an item that already ends in a period', () => {
  expect(segmentDescription({ naslov: 'Naslov', stavke: ['Škole i vrtići.'] })).toBe('Naslov: škole i vrtići.');
  expect(segmentDescription({ naslov: 'Naslov', stavke: [] })).toBe('Naslov.');
});

test('an abbreviation at the start of an item keeps its capitals', () => {
  expect(segmentDescription({ naslov: 'Naslov', stavke: ['NVO i zajednica', 'Obuke'] })).toBe('Naslov: NVO i zajednica, obuke.');
});
