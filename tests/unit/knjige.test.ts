import { describe, expect, it } from 'vitest';
import { bookPath, coverAlt, hasDetailPage } from '../../src/lib/knjige';

const entry = (slug: string, status: 'nacrt' | 'pregled' | 'objavljeno', spoljnaStranica?: string) => ({ data: { slug, status, spoljnaStranica } });

describe('hasDetailPage', () => {
  it('is true for a published book without an external page', () => {
    expect(hasDetailPage(entry('knjiga-1', 'objavljeno'))).toBe(true);
  });
  it('is false for a published book that has its own section of the site', () => {
    expect(hasDetailPage(entry('pricamo-pricu', 'objavljeno', '/pricamo-pricu/'))).toBe(false);
  });
  it('is false for drafts and books in review', () => {
    expect(hasDetailPage(entry('knjiga-1', 'nacrt'))).toBe(false);
    expect(hasDetailPage(entry('knjiga-2', 'pregled'))).toBe(false);
  });
});

describe('bookPath', () => {
  it('is the detail route of the book, with a trailing slash', () => {
    expect(bookPath('knjiga-1')).toBe('/knjige/knjiga-1/');
  });
});

describe('coverAlt', () => {
  it('names the book once it has a real title', () => {
    expect(coverAlt('Pričamo priču')).toBe('Korica knjige Pričamo priču');
  });
  it('is empty while the title is a placeholder', () => {
    expect(coverAlt('[Naslov knjige 1]')).toBe('');
  });
});
