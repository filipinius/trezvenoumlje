import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';

const PREFIX = '/src/assets/img/';
const OG_WIDTH = 1200;

const assets = import.meta.glob<{ default: ImageMetadata }>('/src/assets/img/**/*.webp', { eager: true });

/** `name` is the path relative to `src/assets/img/`, e.g. `'osnivac.webp'` or `'price/okovani-slon.webp'`. */
export function getImageAsset(name: string): ImageMetadata {
  const mod = assets[PREFIX + name];
  if (!mod) throw new Error(`Nedostaje slika src/assets/img/${name}`);
  return mod.default;
}

/**
 * Base-prefixed URL of a JPEG rendition for `og:image`; never wider than the source (no upscaling).
 * `layout: 'none'` opts out of the site-wide responsive layout: one file, no unused srcset variants.
 */
export async function ogImageUrl(name: string): Promise<string> {
  const src = getImageAsset(name);
  return (await getImage({ src, width: Math.min(OG_WIDTH, src.width), format: 'jpg', layout: 'none' })).src;
}
