// Rules shared by the book list and the book detail route.
import type { Status } from './status';
import { findPlaceholders } from './text';

interface BookRef { data: { slug: string; status: Status; spoljnaStranica?: string } }

/** A book gets `/knjige/<slug>/` once it is published, unless it has its own section of the site. */
export const hasDetailPage = (book: BookRef): boolean => book.data.status === 'objavljeno' && !book.data.spoljnaStranica;

export const bookPath = (slug: string): string => `/knjige/${slug}/`;

/** A cover under a title that is still a placeholder is decorative. */
export const coverAlt = (naslov: string): string => (findPlaceholders(naslov).length > 0 ? '' : `Korica knjige ${naslov}`);
