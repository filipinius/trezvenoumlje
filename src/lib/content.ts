import { getCollection, getEntry, type CollectionKey } from 'astro:content';
import type { KATEGORIJE_PITANJA } from '../content/schemas';
import { findIntegrityErrors, type IntegrityEntry } from './integrity';
import { site } from './site';
import { isVisible, type Status } from './status';

export async function getVisible<C extends CollectionKey>(collection: C) {
  const all = await getCollection(collection);
  return all.filter((e) => isVisible(((e.data as { status?: Status }).status ?? 'nacrt'), site.env));
}
export async function getSettings() {
  const entry = await getEntry('podesavanja', 'sajt');
  if (!entry) throw new Error('Nedostaje src/content/podesavanja/sajt.json');
  return entry.data;
}
/** Visible questions of one category, in editorial order. */
export async function getFaq(category: (typeof KATEGORIJE_PITANJA)[number]) {
  return (await getVisible('pitanja'))
    .filter((q) => q.data.kategorija === category)
    .sort((a, b) => a.data.redosled - b.data.redosled);
}
/** Visible articles, newest first; undated drafts last, in slug order so the build is repeatable. */
export async function getArticles() {
  return (await getVisible('clanci')).sort(
    (a, b) => (b.data.datum?.getTime() ?? 0) - (a.data.datum?.getTime() ?? 0) || a.data.slug.localeCompare(b.data.slug),
  );
}
/** Visible stories of "Pričamo priču", in book order. */
export async function getStories() {
  return (await getVisible('price')).sort((a, b) => a.data.n - b.data.n);
}
/** Visible weeks of "Pričamo priču", in order. */
export async function getWeeks() {
  return (await getVisible('nedelje')).sort((a, b) => a.data.n - b.data.n);
}
/** The three family audiences in the order of "Kome pomažemo" (Home and Usluge show the same cards). */
const FAMILY_AUDIENCES = ['porodice', 'mladi', 'posle-rehabilitacije'];
export async function getFamilyAudiences() {
  const visible = await getVisible('ciljneGrupe');
  return FAMILY_AUDIENCES.flatMap((slug) => visible.filter((g) => g.data.slug === slug));
}

// Read as files, not through getCollection: the loader keys an entry by its slug, so of two files
// with the same slug only one would reach the collection and the duplicate could not be seen.
const CONTENT_ROOT = '/src/content/';
const contentFiles = import.meta.glob<string>('/src/content/*/**/*.{json,md}', { query: '?raw', import: 'default', eager: true });
const FRONTMATTER_SLUG = /^slug:[ \t]*["']?([^"'\r\n]+?)["']?[ \t]*$/m;

function readIntegrityEntry(file: string, raw: string): IntegrityEntry {
  if (file.endsWith('.json')) {
    const { slug, ciljneGrupe, nedelja, n } = JSON.parse(raw) as Omit<IntegrityEntry, 'file'>;
    return { file, slug, ciljneGrupe, nedelja, n };
  }
  const frontmatter = raw.split(/^---[ \t]*$/m)[1] ?? '';
  return { file, slug: FRONTMATTER_SLUG.exec(frontmatter)?.[1] };
}

let integrityChecked = false;
/** Stops the build on a content mistake the schemas cannot see (see src/lib/integrity.ts). Checks once per build. */
export function assertContentIntegrity(): void {
  if (integrityChecked) return;
  integrityChecked = true;
  const collections: Record<string, IntegrityEntry[]> = {};
  for (const [path, raw] of Object.entries(contentFiles)) {
    const file = path.slice(CONTENT_ROOT.length);
    (collections[file.split('/')[0]!] ??= []).push(readIntegrityEntry(file, raw));
  }
  const errors = findIntegrityErrors(collections);
  if (errors.length > 0) throw new Error(`Greška u sadržaju (src/content/):\n${errors.map((e) => `- ${e}`).join('\n')}`);
}
