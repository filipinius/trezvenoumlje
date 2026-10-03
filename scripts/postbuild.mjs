// @ts-check
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { buildSitemap, checkAssets, checkSite } from './lib/distcheck.mjs';

const DIST = 'dist';
const production = process.env.SITE_ENV === 'production';
const siteUrl = process.env.SITE_URL ?? 'http://localhost:4321';
const trimmed = (process.env.BASE_PATH ?? '/').replace(/^\/+|\/+$/g, '');
const basePath = trimmed ? `/${trimmed}/` : '/';

/** @param {string} dir @returns {string[]} */
const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const all = walk(DIST).map((p) => relative(DIST, p).split(sep).join('/'));
const files = new Set(all);
/** @param {string[]} extensions @returns {Map<string, string>} dist-relative path → content */
const read = (...extensions) => new Map(all.filter((f) => extensions.some((e) => f.endsWith(e))).map((f) => [f, readFileSync(join(DIST, f), 'utf8')]));
const pages = read('.html');

writeFileSync(join(DIST, 'sitemap.xml'), buildSitemap(pages, { siteUrl, basePath, production }));

const issues = [...checkSite(pages, { basePath, production, files }), ...checkAssets(read('.css', '.js'))];
if (issues.length) {
  for (const i of issues) console.error(`✗ ${i.path}  ${i.rule}  ${i.detail}`);
  console.error(`\npostbuild: ${issues.length} issue(s) in ${pages.size} pages`);
  process.exit(1);
}
console.log(`postbuild: ${pages.size} pages OK, sitemap written (${production ? 'production' : 'preview'})`);
