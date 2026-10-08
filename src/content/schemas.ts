import { z } from 'astro/zod';
import { hasCyrillic } from '../lib/text';

const latin = (s: z.ZodString) => s.refine((v) => !hasCyrillic(v), 'Sadržaj mora biti na latinici');
const text = latin(z.string().min(1));
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug: mala slova bez dijakritika, crtice');
const stableId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
export const status = z.enum(['nacrt', 'pregled', 'objavljeno']);
const prikazCene = z.enum(['tacna', 'od', 'na-upit', 'skriveno']).default('skriveno');

export const KATEGORIJE_CLANAKA = ['zavisnosti', 'porodica', 'mladi', 'oporavak', 'radno-mesto', 'pravni-sektor', 'zdravi-stilovi-zivota'] as const;
export const NAZIVI_KATEGORIJA: Record<(typeof KATEGORIJE_CLANAKA)[number], string> = {
  zavisnosti: 'Zavisnosti', porodica: 'Porodica', mladi: 'Mladi', oporavak: 'Oporavak',
  'radno-mesto': 'Radno mesto', 'pravni-sektor': 'Pravni sektor', 'zdravi-stilovi-zivota': 'Zdravi stilovi života',
};
export const KATEGORIJE_PITANJA = ['opste', 'porodica', 'mladi', 'posle-rehabilitacije', 'programi', 'organizacije', 'pravni-sektor', 'privatnost', 'pricamo-pricu'] as const;
export const NAZIVI_KATEGORIJA_PITANJA: Record<(typeof KATEGORIJE_PITANJA)[number], string> = {
  opste: 'Opšta pitanja', porodica: 'Porodica', mladi: 'Mladi', 'posle-rehabilitacije': 'Posle rehabilitacije',
  programi: 'Programi', organizacije: 'Organizacije', 'pravni-sektor': 'Pravni sektor',
  privatnost: 'Privatnost i poverljivost', 'pricamo-pricu': 'Pričamo priču',
};
export const REZERVISANI_SLUGOVI_CLANAKA = ['tema', 'rss.xml'];
// A legal page lives at /<slug>/: it must not take the address of a top-level route.
export const REZERVISANI_SLUGOVI_PRAVNO = ['kontakt', 'usluge', 'programi', 'organizacije', 'resursi', 'knjige', 'o-nama', 'pricamo-pricu', 'cesta-pitanja', 'dr-dragan-vukadinovic', '404'];

// Optional on purpose (no object-level default: its semantics differ between Zod 3 and 4). Read as `data.seo?.noindex ?? false`.
export const seoSchema = z.object({
  naslov: text.optional(), opis: text.optional(), slika: z.string().optional(), noindex: z.boolean().optional(),
}).optional();

const base = { status, seo: seoSchema, pravnaNapomena: text.optional() };

export const uslugaSchema = z.object({
  ...base, naziv: text, slug, meta: text, opis: text,
  ciljneGrupe: z.array(slug).default([]), prikazCene, cena: z.string().optional(), redosled: z.number().int().default(0),
});
export const programSchema = z.object({
  ...base, naziv: text, slug, publika: text, opis: text, format: text,
  ciljneGrupe: z.array(slug).default([]), prikazCene, cena: z.string().optional(),
  uIzradi: z.boolean().default(false), redosled: z.number().int().default(0),
  kategorijaPitanja: z.enum(KATEGORIJE_PITANJA).default('programi'),
});
export const ciljnaGrupaSchema = z.object({
  ...base, naziv: text, slug, uvod: text,
  kategorijeClanaka: z.array(z.enum(KATEGORIJE_CLANAKA)).default([]),
  kategorijaPitanja: z.enum(KATEGORIJE_PITANJA),
});
export const b2bSchema = z.object({
  ...base, segment: text, slug, nadnaslov: text.optional(), naslov: text, uvod: text.optional(),
  moduli: z.array(z.object({ naziv: text, opis: text.optional(), status: status.default('objavljeno') })).default([]),
  stavke: z.array(text).default([]),
  nije: z.object({ uvod: text, stavke: z.array(text), napomena: text.optional() }).optional(),
  kategorijaPitanja: z.enum(KATEGORIJE_PITANJA),
});
export const clanakSchema = z.object({
  ...base, naslov: text,
  slug: slug.refine((v) => !REZERVISANI_SLUGOVI_CLANAKA.includes(v), 'Slug je rezervisan'),
  autor: text, recenzent: text.optional(), kategorija: z.enum(KATEGORIJE_CLANAKA), sazetak: text,
  datum: z.coerce.date().optional(), datumRevizije: z.coerce.date().optional(),
  slika: z.string().optional(), slikaAlt: text.optional(),
}).refine((a) => !a.slika || !!a.slikaAlt, { message: 'slikaAlt je obavezan kada članak ima sliku', path: ['slikaAlt'] });
export const knjigaSchema = z.object({
  ...base, naslov: text, slug, autor: text, godina: text.optional(), izdavac: text.optional(), isbn: text.optional(),
  korica: z.string().optional(), opis: text.optional(), nabavka: text.optional(), oznaka: text.optional(),
  // What the book is about, a paragraph per item: the "O knjizi" section of the book page. `opis` stays the short version.
  oKnjizi: z.array(text).min(1).optional(),
  // Where the book is ordered: its page in the publisher's shop. Shown as a link beside `nabavka`.
  nabavkaLink: z.string().regex(/^https?:\/\//).optional(),
  spoljnaStranica: z.string().optional(), redosled: z.number().int().default(0),
  // What the "Kako do knjige" overlay lists. `cenaNapomena` is a note on how the price is given, never an amount.
  izdanje: text.optional(), format: text.optional(), cenaNapomena: text.optional(),
});
export const timSchema = z.object({
  ...base, ime: text, slug, uloga: text, kratko: text, bio: text, zadaci: z.array(text),
  napomena: text.optional(), fotografija: z.string(), oblik: z.enum(['krug', 'kvadrat']).default('krug'),
  zdravstvenaUloga: z.boolean().default(false), stranica: z.string().optional(), redosled: z.number().int().default(0),
});
export const medijSchema = z.object({
  ...base, naslov: text, slug, medij: text, datum: text.optional(),
  youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/, 'YouTube ID ima 11 znakova (ne URL)').optional(),
  // Second at which the player starts, for an appearance that is one part of a longer recording.
  pocetak: z.number().int().min(0).optional(),
  // Self-hosted still for the card (file under src/assets/img/, saved once — never loaded from YouTube).
  slicica: z.string().regex(/^[a-z0-9-]+(\/[a-z0-9-]+)*\.webp$/, 'Sličica: putanja do .webp fajla u src/assets/img/').optional(),
  link: z.string().regex(/^https?:\/\//).optional(), opis: text.optional(), redosled: z.number().int().default(0),
});
export const pitanjeSchema = z.object({
  status, id: stableId, pitanje: text, odgovor: text, kategorija: z.enum(KATEGORIJE_PITANJA), redosled: z.number().int(),
});
const pitanjeSaId = z.object({ id: stableId, tekst: text });
export const nedeljaSchema = z.object({
  status, n: z.number().int().min(1).max(10), oznaka: text, tema: text, uvod: z.array(text),
  osvrt: z.object({ naslov: text, napomena: text, pitanja: z.array(pitanjeSaId).length(5) }),
});
export const pricaSchema = z.object({
  status, seo: seoSchema, id: z.string().regex(/^p\d{2}$/), n: z.number().int().min(1).max(50),
  nedelja: z.number().int().min(1).max(10), dan: text, naslov: text, slug, podnaslov: text, izvor: text,
  slika: z.string().optional(), tekst: z.array(text).min(1), pitanja: z.array(pitanjeSaId).min(1),
  poruka: text, zadatak: text, citat: text,
});
export const pravnoSchema = z.object({
  ...base, naslov: text,
  slug: slug.refine((v) => !REZERVISANI_SLUGOVI_PRAVNO.includes(v), 'Slug je rezervisan'),
  datumIzmene: z.coerce.date().optional(),
});
export const podesavanjaSchema = z.object({
  naziv: text, podnaslov: text, slogan: text, email: text, telefon: text, adresa: text, radnoVreme: text,
  hitnaSluzba: text, poslovniPodaci: text, rokOdgovora: text, rokCuvanja: text, facebook: text,
  // Address of the centre's Facebook page: makes the footer's Facebook line a link.
  facebookUrl: z.string().regex(/^https:\/\/www\.facebook\.com\/[^/\s]+\/?$/, 'Facebook: adresa stranice, https://www.facebook.com/<naziv>/').optional(),
  // The number Viber is registered on, in international form: it goes into the viber:// link as it is.
  viber: z.string().regex(/^\+\d{8,15}$/, 'Viber broj: + i 8 do 15 cifara, bez razmaka').optional(),
});
