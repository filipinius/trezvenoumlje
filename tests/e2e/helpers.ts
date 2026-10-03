import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Browser, BrowserContext, BrowserContextOptions, Page } from '@playwright/test';

// Resolved from this file, so the tests read the same content whatever directory they are started from.
const CONTENT_DIR = fileURLToPath(new URL('../../src/content/', import.meta.url));

/** Number of entries (JSON files) in a content collection. The preview build shows every entry, drafts too. */
export const countEntries = (collection: string): number => readdirSync(join(CONTENT_DIR, collection)).filter((name) => name.endsWith('.json')).length;

/** One content entry as written, by its path under `src/content/`. */
export const readEntry = <T>(path: string): T => JSON.parse(readFileSync(join(CONTENT_DIR, path), 'utf8')) as T;

/** Collects the address of every request that leaves the site's own origin (that of the configured `baseURL`). */
export function watchForeign(page: Page, baseURL: string | undefined): string[] {
  const origin = new URL(baseURL!).origin;
  const foreign: string[] = [];
  page.on('request', (r) => { if (new URL(r.url()).origin !== origin) foreign.push(r.url()); });
  return foreign;
}

/**
 * A context with JavaScript switched off, on the project's configured `baseURL` (pass the test's `baseURL` fixture),
 * so its pages take the same relative addresses as every other test: `page.goto('kontakt/')`.
 */
export function noJsContext(browser: Browser, baseURL: string | undefined, options: BrowserContextOptions = {}): Promise<BrowserContext> {
  return browser.newContext({ ...options, baseURL, javaScriptEnabled: false });
}

/** One address per page type and state, relative to `baseURL`: what the accessibility and privacy sweeps visit. */
export const SWEEP_PAGES = [
  '', 'o-nama/', 'dr-dragan-vukadinovic/', 'usluge/', 'usluge/porodice/', 'usluge/mladi/', 'usluge/posle-rehabilitacije/',
  'programi/', 'programi/trezvena-kuca/', 'organizacije/', 'organizacije/kompanije/', 'organizacije/advokati/', 'organizacije/skole-i-nvo/',
  'resursi/', 'resursi/tema/porodica/', 'resursi/tema/pravni-sektor/', 'resursi/kako-porodica-prepoznaje-problem/',
  'knjige/', 'pricamo-pricu/', 'pricamo-pricu/price/', 'pricamo-pricu/okovani-slon/', 'pricamo-pricu/provera-hrabrosti/',
  'cesta-pitanja/', 'kontakt/', 'politika-privatnosti/', 'ne-postoji/',
] as const;

/** What the server must answer for a sweep address: a sweep that lands on an error page checks nothing. */
export const expectedStatus = (path: string): number => (path === 'ne-postoji/' ? 404 : 200);
