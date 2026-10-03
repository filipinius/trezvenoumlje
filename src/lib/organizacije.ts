// What the Organizations artboard adds to the `b2b` entries: section order, the overview anchors and the two illustrations.
export interface SegmentPresentation { anchor: string; image?: { name: string; alt: string } }

export const SEGMENT_ORDER = ['kompanije', 'advokati', 'skole-i-nvo'];

const PRESENTATION: Record<string, SegmentPresentation> = {
  kompanije: { anchor: 'kompanije', image: { name: 'clanak-radno-mesto.webp', alt: 'Ilustracija: radni sto u kancelariji' } },
  advokati: { anchor: 'advokati' },
  'skole-i-nvo': { anchor: 'skole', image: { name: 'clanak-zavisnosti.webp', alt: 'Ilustracija: knjige i prozor' } },
};

/**
 * Meta description of a segment that has no intro: "<naslov>: <stavka 1>, <stavka 2>."
 * An item starts in lower case after the colon, unless it starts with an abbreviation.
 */
export function segmentDescription({ naslov, stavke }: { naslov: string; stavke: string[] }): string {
  const items = stavke.slice(0, 2).map((item) => item.replace(/[.\s]+$/, '').replace(/^\p{Lu}(?!\p{Lu})/u, (first) => first.toLowerCase()));
  return items.length > 0 ? `${naslov}: ${items.join(', ')}.` : `${naslov}.`;
}

/** A segment added later gets its slug as the anchor and no illustration. */
export const segmentPresentation = (slug: string): SegmentPresentation => PRESENTATION[slug] ?? { anchor: slug };

/** Artboard order first; segments the artboard does not know keep their collection order after it. */
export function sortSegments<T extends { data: { slug: string } }>(segments: T[]): T[] {
  const rank = (slug: string) => { const i = SEGMENT_ORDER.indexOf(slug); return i === -1 ? SEGMENT_ORDER.length : i; };
  return [...segments].sort((a, b) => rank(a.data.slug) - rank(b.data.slug));
}
