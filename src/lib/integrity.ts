// Cross-entry rules the schemas cannot express. Pure: the caller hands in what it read from src/content/.

/** One content file: `file` is its path under src/content/, the rest are the fields the rules look at. */
export interface IntegrityEntry { file: string; slug?: string; ciljneGrupe?: string[]; nedelja?: number; n?: number }

const WITH_AUDIENCES = ['usluge', 'programi'];

/** Messages for the editor, one per problem; empty when the content is consistent. */
export function findIntegrityErrors(collections: Record<string, IntegrityEntry[]>): string[] {
  const errors: string[] = [];

  for (const [collection, entries] of Object.entries(collections)) {
    const firstWith = new Map<string, string>();
    for (const { file, slug } of entries) {
      if (slug === undefined) continue;
      const first = firstWith.get(slug);
      if (first) errors.push(`Kolekcija ${collection}: slug „${slug}“ imaju dva unosa, ${first} i ${file}. Slug mora biti jedinstven u kolekciji.`);
      else firstWith.set(slug, file);
    }
  }

  const audiences = new Set((collections.ciljneGrupe ?? []).map((g) => g.slug));
  for (const collection of WITH_AUDIENCES) {
    for (const { file, ciljneGrupe = [] } of collections[collection] ?? []) {
      for (const group of ciljneGrupe) {
        if (!audiences.has(group)) errors.push(`${file}: ciljna grupa „${group}“ ne postoji u kolekciji ciljneGrupe.`);
      }
    }
  }

  const weeks = new Set((collections.nedelje ?? []).map((w) => w.n));
  for (const { file, nedelja } of collections.price ?? []) {
    if (nedelja !== undefined && !weeks.has(nedelja)) errors.push(`${file}: nedelja ${nedelja} nema svoj unos u kolekciji nedelje.`);
  }

  return errors;
}
