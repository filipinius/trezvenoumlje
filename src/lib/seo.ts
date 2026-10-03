import type { EnvConfig } from './env';
import { absoluteUrl } from './url';

export interface SeoInput { title: string; description: string; path: string; /** `false` for a page without an address of its own (404): no canonical link, no og:url. */ canonical?: false; image?: string; noindex?: boolean; type?: 'website' | 'article'; isHome?: boolean }
export interface SeoMeta { title: string; description: string; canonical: string | null; ogImage: string; robots: string; ogType: 'website' | 'article' }

const BRAND = 'Trezvenoumlje';

export function clampDescription(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const atWord = cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:–-]+$/, '');
  return `${atWord || cut}…`;
}

export function buildSeo(input: SeoInput, cfg: EnvConfig): SeoMeta {
  const robots = cfg.env === 'preview' ? 'noindex, nofollow' : input.noindex ? 'noindex, follow' : 'index, follow';
  return {
    title: input.isHome ? input.title : `${input.title} – ${BRAND}`,
    description: clampDescription(input.description),
    canonical: input.canonical === false ? null : absoluteUrl(input.path, cfg),
    ogImage: absoluteUrl(input.image ?? '/og-default.png', cfg),
    robots,
    ogType: input.type ?? 'website',
  };
}
