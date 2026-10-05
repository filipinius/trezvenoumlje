import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { hasCyrillic } from '../../src/lib/text';

const ROOT = 'src/content';
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const files = walk(ROOT).filter((f) => /\.(json|md)$/.test(f));
const json = (dir: string) => walk(join(ROOT, dir)).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(f, 'utf8')));

test('no content file contains Cyrillic', () => {
  expect(files.filter((f) => hasCyrillic(readFileSync(f, 'utf8')))).toEqual([]);
});
test('no content file contains a price amount', () => {
  expect(files.filter((f) => /\d[\d.]*\s*RSD/.test(readFileSync(f, 'utf8')))).toEqual([]);
});
test('no service or program exposes a price', () => {
  for (const e of [...json('usluge'), ...json('programi')]) {
    expect(e.cena).toBeUndefined();
    expect(e.prikazCene ?? 'skriveno').toBe('skriveno');
  }
});
test('slugs are unique per collection', () => {
  for (const dir of ['usluge', 'programi', 'ciljneGrupe', 'b2b', 'knjige', 'tim', 'mediji']) {
    const slugs = json(dir).map((e) => e.slug);
    expect(new Set(slugs).size, dir).toBe(slugs.length);
  }
});
test('FAQ ids are unique and every category used by a page has at least one question', () => {
  const qs = json('pitanja');
  expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
  for (const cat of ['opste', 'porodica', 'mladi', 'posle-rehabilitacije', 'programi', 'organizacije', 'pravni-sektor', 'privatnost', 'pricamo-pricu']) {
    expect(qs.some((q) => q.kategorija === cat), cat).toBe(true);
  }
});
test('expected entry counts', () => {
  expect(json('usluge')).toHaveLength(7);
  expect(json('programi')).toHaveLength(6);
  expect(json('pitanja')).toHaveLength(19);
});
test('50 stories in 10 weeks, 5 per week, unique slugs and ids', () => {
  const stories = json('price');
  const weeks = json('nedelje');
  expect(stories).toHaveLength(50);
  expect(weeks).toHaveLength(10);
  expect(new Set(stories.map((s) => s.slug)).size).toBe(50);
  expect(stories.map((s) => s.n).sort((a, b) => a - b)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  for (let w = 1; w <= 10; w++) expect(stories.filter((s) => s.nedelja === w), `week ${w}`).toHaveLength(5);
  const ids = [...stories.flatMap((s) => [s.id, ...s.pitanja.map((q: { id: string }) => q.id)]), ...weeks.flatMap((w) => w.osvrt.pitanja.map((q: { id: string }) => q.id))];
  expect(new Set(ids).size).toBe(ids.length);
});
test('story ids follow the stable pattern', () => {
  const s2 = json('price').find((s) => s.n === 2);
  expect(s2.id).toBe('p02');
  expect(s2.slug).toBe('okovani-slon');
  expect(s2.pitanja[0].id).toBe('p02-q1');
  expect(json('nedelje').find((w) => w.n === 1).osvrt.pitanja[4].id).toBe('n01-o5');
});
test('week labels and intros carry no stray markers', () => {
  const weeks = json('nedelje');
  expect(weeks.find((w) => w.n === 2).oznaka).toBe('druga nedelja');
  for (const w of weeks) {
    expect(w.oznaka).toMatch(/nedelja$/);
    expect(w.uvod.length).toBeGreaterThan(0);
    expect(JSON.stringify(w)).not.toContain('##');
  }
});
test('every story image file exists', () => {
  for (const s of json('price')) if (s.slika) expect(statSync(join('src/assets/img/price', s.slika)).isFile()).toBe(true);
});
test('the 2020 initiative note is a media entry that stays a draft', () => {
  const note = json('mediji').find((m) => m.slug === 'inicijativa-trezvenoumlje-2020');
  expect(note).toMatchObject({ status: 'nacrt', naslov: 'Inicijativa „Trezvenoumlje“ 2020.', medij: 'Facebook', datum: '2020.' });
  expect(note.youtubeId).toBeUndefined();
  expect(note.link).toBeUndefined();
});
test('every media still exists as a local file', () => {
  for (const m of json('mediji')) if (m.slicica) expect(statSync(join('src/assets/img', m.slicica)).isFile(), m.slicica).toBe(true);
});
