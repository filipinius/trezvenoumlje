import type { EnvConfig } from './env';
import { absoluteUrl } from './url';

const CONTEXT = 'https://schema.org' as const;
const BRAND = 'Trezvenoumlje';

// A value that still carries an unfilled `[PLACEHOLDER]` must never reach structured data.
const filled = (v: string | undefined): v is string => !!v && !v.includes('[');

export function organization(cfg: EnvConfig, s: { naziv: string; podnaslov: string }) {
  return {
    '@context': CONTEXT,
    '@type': 'Organization' as const,
    name: s.naziv,
    description: s.podnaslov,
    url: absoluteUrl('/', cfg),
    logo: absoluteUrl('/favicon.svg', cfg),
  };
}

export function breadcrumbs(items: { label: string; path: string }[], cfg: EnvConfig) {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList' as const,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem' as const,
      position: i + 1,
      name: it.label,
      item: absoluteUrl(it.path, cfg),
    })),
  };
}

export function person(cfg: EnvConfig) {
  return {
    '@context': CONTEXT,
    '@type': 'Person' as const,
    name: 'Dragan Vukadinović',
    honorificPrefix: 'dr',
    jobTitle: 'Specijalista psihijatrije, subspecijalista za bolesti zavisnosti',
    url: absoluteUrl('/dr-dragan-vukadinovic/', cfg),
    worksFor: { '@type': 'Organization' as const, name: BRAND },
  };
}

export interface ArticleInput {
  naslov: string;
  sazetak: string;
  autor: string;
  recenzent?: string;
  datum?: Date;
  datumRevizije?: Date;
  /** Absolute URL of the article's image. */
  image?: string;
  /** Site path of the article page, e.g. `/resursi/<slug>/`. */
  path: string;
}

export function article(a: ArticleInput, cfg: EnvConfig) {
  return {
    '@context': CONTEXT,
    '@type': 'Article' as const,
    headline: a.naslov,
    description: a.sazetak,
    author: { '@type': 'Person' as const, name: a.autor },
    ...(a.recenzent ? { reviewedBy: { '@type': 'Person' as const, name: a.recenzent } } : {}),
    ...(a.datum ? { datePublished: a.datum.toISOString() } : {}),
    ...(a.datumRevizije ? { dateModified: a.datumRevizije.toISOString() } : {}),
    ...(a.image ? { image: a.image } : {}),
    publisher: {
      '@type': 'Organization' as const,
      name: BRAND,
      logo: { '@type': 'ImageObject' as const, url: absoluteUrl('/og-default.png', cfg) },
    },
    mainEntityOfPage: absoluteUrl(a.path, cfg),
  };
}

export interface FaqItem { pitanje: string; odgovor: string }

function faqLd(items: FaqItem[]) {
  return {
    '@context': CONTEXT,
    '@type': 'FAQPage' as const,
    mainEntity: items.map((q) => ({
      '@type': 'Question' as const,
      name: q.pitanje,
      acceptedAnswer: { '@type': 'Answer' as const, text: q.odgovor },
    })),
  };
}

/** `null` for an empty list: an FAQPage without questions is invalid. */
export function faqPage(items: [FaqItem, ...FaqItem[]]): ReturnType<typeof faqLd>;
export function faqPage(items: FaqItem[]): ReturnType<typeof faqLd> | null;
export function faqPage(items: FaqItem[]) {
  return items.length ? faqLd(items) : null;
}

export interface BookInput {
  naslov: string;
  autor: string;
  isbn?: string;
  izdavac?: string;
  godina?: string;
  /** Site path of the book page. */
  path: string;
}

export function book(b: BookInput, cfg: EnvConfig) {
  return {
    '@context': CONTEXT,
    '@type': 'Book' as const,
    name: b.naslov,
    author: { '@type': 'Person' as const, name: b.autor },
    url: absoluteUrl(b.path, cfg),
    ...(filled(b.isbn) ? { isbn: b.isbn } : {}),
    ...(filled(b.izdavac) ? { publisher: { '@type': 'Organization' as const, name: b.izdavac } } : {}),
    ...(filled(b.godina) ? { datePublished: b.godina } : {}),
  };
}

export interface VideoInput {
  naslov: string;
  opis?: string;
  youtubeId: string;
  /** Site path of the page that shows the video. */
  path: string;
}

export function videoObject(v: VideoInput, cfg: EnvConfig) {
  return {
    '@context': CONTEXT,
    '@type': 'VideoObject' as const,
    name: v.naslov,
    ...(v.opis ? { description: v.opis } : {}),
    embedUrl: `https://www.youtube-nocookie.com/embed/${v.youtubeId}`,
    url: absoluteUrl(v.path, cfg),
  };
}

/** `null` until the phone and the address are real: no placeholder may be published as business data. */
export function localBusiness(
  cfg: EnvConfig,
  s: { naziv: string; telefon: string; adresa: string; radnoVreme: string },
) {
  if (!filled(s.telefon) || !filled(s.adresa)) return null;
  return {
    '@context': CONTEXT,
    '@type': 'LocalBusiness' as const,
    name: s.naziv,
    url: absoluteUrl('/', cfg),
    telephone: s.telefon,
    address: s.adresa,
    ...(filled(s.radnoVreme) ? { openingHours: s.radnoVreme } : {}),
  };
}
