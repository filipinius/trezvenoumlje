// @ts-check
import { parse } from 'node-html-parser';

/** @typedef {{ path: string; rule: string; detail: string }} Issue */
/** @typedef {import('node-html-parser').HTMLElement} HTMLElement */

// Rendered output, not Markdown source: any bracketed run is a placeholder, also across a line break.
const PLACEHOLDER = /\[[^\]]+\]/g;
const PRICE = /\d[\d.]*\s*RSD/;
const ABSOLUTE = /^(https?:)?\/\//i;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const DEAD_SCHEME = /^\s*javascript:/i;
const DEV_BANNER = 'Dev pregled';
const TRACKERS = ['googletagmanager', 'google-analytics', 'gtag(', 'fbq(', 'connect.facebook.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const MEDICAL_TYPES = ['Physician', 'Hospital', 'Dentist', 'Pharmacy'];
const SCHEMA_PREFIX = /^(https?:\/\/schema\.org\/|schema:)/;

const SRC_TAGS = ['script', 'img', 'iframe', 'source', 'video', 'audio', 'embed'];
// Elements whose target must be a file in dist (an iframe or embed may point at a page; those are only origin-checked).
const ASSET_SRC_TAGS = ['script', 'img', 'source', 'video', 'audio'];
const ASSET_LINK_RELS = ['stylesheet', 'icon', 'preload', 'modulepreload', 'manifest'];
const URL_ATTRS = ['src', 'href', 'srcset', 'data', 'poster', 'action'];
const TEXT_ATTRS = ['alt', 'aria-label', 'title', 'placeholder', 'value'];

/** @param {(s: string) => string} decode @param {string} value @returns {string | null} null for a malformed percent-escape */
function tryDecode(decode, value) {
  try { return decode(value); } catch { return null; }
}

/** @param {string} srcset @returns {string[]} the URL of every image candidate */
export function srcsetUrls(srcset) {
  // A candidate is a run of non-whitespace (the URL, which may itself contain commas, e.g. a data URI),
  // then an optional descriptor up to the next comma. A URL that ends in a comma has no descriptor:
  // the comma closes the candidate, and what follows is the next one.
  return [...srcset.matchAll(/[\s,]*(\S*[^\s,])(?:\s+[^,]*)?/g)].map((m) => m[1] ?? '');
}

/** @param {string} css @returns {string[]} every `url(...)` and `@import "..."` target */
function cssUrls(css) {
  const urls = [...css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")]*?))\s*\)/gi)].map((m) => m[1] ?? m[2] ?? m[3] ?? '');
  const imports = [...css.matchAll(/@import\s+(?:"([^"]*)"|'([^']*)')/gi)].map((m) => m[1] ?? m[2] ?? '');
  return [...imports, ...urls].filter(Boolean);
}

/** @param {HTMLElement} el */
const tagOf = (el) => el.rawTagName.toLowerCase();
/** @param {HTMLElement} el */
const relsOf = (el) => (el.getAttribute('rel') ?? '').toLowerCase().split(/\s+/).filter(Boolean);

/**
 * Every URL the browser fetches while rendering the page. `asset` marks the ones that must be files in dist.
 * @param {HTMLElement} root
 * @returns {{ url: string; asset: boolean }[]}
 */
function resourceUrls(root) {
  /** @type {{ url: string; asset: boolean }[]} */
  const out = [];
  for (const el of root.querySelectorAll('*')) {
    const tag = tagOf(el);
    const src = el.getAttribute('src');
    if (src !== undefined && SRC_TAGS.includes(tag)) out.push({ url: src, asset: ASSET_SRC_TAGS.includes(tag) });
    const srcset = el.getAttribute('srcset');
    if (srcset !== undefined && (tag === 'img' || tag === 'source')) for (const url of srcsetUrls(srcset)) out.push({ url, asset: true });
    const poster = el.getAttribute('poster');
    if (poster !== undefined && tag === 'video') out.push({ url: poster, asset: true });
    const data = el.getAttribute('data');
    if (data !== undefined && tag === 'object') out.push({ url: data, asset: false });
    const href = el.getAttribute('href');
    if (href !== undefined && tag === 'link') {
      const rels = relsOf(el);
      // canonical and alternate name a URL without loading it.
      if (!rels.includes('canonical') && !rels.includes('alternate')) out.push({ url: href, asset: rels.some((r) => ASSET_LINK_RELS.includes(r)) });
    }
    const style = el.getAttribute('style');
    if (style !== undefined) for (const url of cssUrls(style)) out.push({ url, asset: false });
    if (tag === 'style') for (const url of cssUrls(el.rawText)) out.push({ url, asset: false });
  }
  return out.map((r) => ({ ...r, url: r.url.trim() }));
}

/** @param {string} haystack @returns {string[]} the tracker needles present, each once */
function trackersIn(haystack) {
  const lower = haystack.toLowerCase();
  return TRACKERS.filter((needle) => lower.includes(needle));
}

/**
 * Collects every `@type` value and every string value in a JSON-LD tree.
 * @param {unknown} node
 * @param {{ types: Set<string>; strings: string[] }} into
 */
function walkJsonLd(node, into) {
  if (typeof node === 'string') { into.strings.push(node); return; }
  if (Array.isArray(node)) { for (const item of node) walkJsonLd(item, into); return; }
  if (node === null || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    if (key === '@type') for (const t of Array.isArray(value) ? value : [value]) into.types.add(String(t).replace(SCHEMA_PREFIX, ''));
    walkJsonLd(value, into);
  }
}

/**
 * Checks that need only the page itself.
 * @param {string} path dist-relative file path, used only to label issues
 * @param {string} html
 * @param {{ production: boolean }} opts
 * @returns {Issue[]}
 */
export function checkPage(path, html, { production }) {
  const root = parse(html);
  const elements = root.querySelectorAll('*');
  /** @type {Issue[]} */
  const issues = [];
  /** @param {string} rule @param {string} [detail] */
  const add = (rule, detail = '') => { issues.push({ path, rule, detail }); };

  const title = root.querySelector('title')?.text.trim() ?? '';
  if (!title) add('title-missing');
  const desc = root.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ?? '';
  if (desc.length < 50 || desc.length > 160) add('description-length', String(desc.length));
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute('href')?.trim() ?? '';
  // 404.html is served for any unknown address: it has none of its own to name.
  if (!canonical) { if (path !== '404.html') add('canonical-missing'); }
  else if (!/^https?:\/\/[^/]/i.test(canonical)) add('canonical-invalid', canonical);
  if (root.querySelector('html')?.getAttribute('lang') !== 'sr-Latn') add('lang');
  const h1 = root.querySelectorAll('h1').length;
  if (h1 !== 1) add('h1-count', String(h1));
  for (const img of root.querySelectorAll('img')) if (img.getAttribute('alt') === undefined) add('img-alt', img.getAttribute('src') ?? '');
  for (const { url } of resourceUrls(root)) if (ABSOLUTE.test(url)) add('third-party', url);
  for (const a of root.querySelectorAll('a')) {
    const h = a.getAttribute('href');
    if (h === undefined || h === '' || h === '#' || DEAD_SCHEME.test(h)) add('dead-link', a.text.trim());
  }

  // Preview builds must never be indexable; production builds must never show the preview banner.
  const robots = root.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '';
  if (!production && !robots.toLowerCase().includes('noindex')) add('robots-preview', `robots: ${robots || '(missing)'}`);
  if (production && html.includes(DEV_BANNER)) add('robots-preview', DEV_BANNER);

  // Trackers are looked for where they would run or load, not in prose: a cookie policy may name a service.
  const executable = elements.flatMap((el) => {
    const tag = tagOf(el);
    const attrs = [...URL_ATTRS, 'style'].map((name) => el.getAttribute(name) ?? '');
    return tag === 'script' || tag === 'style' ? [...attrs, el.rawText] : attrs;
  });
  for (const needle of trackersIn(executable.join('\n'))) add('storage-or-tracker', needle);

  const ld = { types: /** @type {Set<string>} */ (new Set()), strings: /** @type {string[]} */ ([]) };
  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    try { walkJsonLd(JSON.parse(script.rawText), ld); }
    catch (error) { add('jsonld-invalid', error instanceof Error ? error.message : String(error)); }
  }
  for (const t of ld.types) if (t.startsWith('Medical') || MEDICAL_TYPES.includes(t)) add('medical-schema', t);

  // Everything a visitor, a screen reader or a search engine is given besides the body text.
  const attributeText = elements.flatMap((el) => {
    const tag = tagOf(el);
    const values = TEXT_ATTRS.map((name) => el.getAttribute(name) ?? '');
    if (tag === 'meta') values.push(el.getAttribute('content') ?? '');
    const href = tag === 'a' ? el.getAttribute('href') : undefined;
    if (href) values.push(tryDecode(decodeURIComponent, href) ?? href);
    return values;
  });

  const body = root.querySelector('body');
  body?.querySelectorAll('script, style').forEach((n) => n.remove());
  const text = body?.text ?? '';
  const price = text.match(PRICE);
  if (price) add('price', price[0]);
  if (production) {
    const found = [title, text, ...attributeText, ...ld.strings].flatMap((s) => [...s.matchAll(PLACEHOLDER)].map((m) => m[0].replace(/\s+/g, ' ')));
    for (const placeholder of new Set(found)) add('placeholder', placeholder);
  }
  return issues;
}

/**
 * Checks the built CSS and JS files: third-party `url()`/`@import` targets in CSS, tracker code in both.
 * @param {Map<string, string>} assets dist-relative path of every `.css` and `.js` file → content
 * @returns {Issue[]}
 */
export function checkAssets(assets) {
  /** @type {Issue[]} */
  const issues = [];
  for (const [path, content] of assets) {
    if (path.endsWith('.css')) for (const url of cssUrls(content)) if (ABSOLUTE.test(url)) issues.push({ path, rule: 'third-party', detail: url });
    for (const needle of trackersIn(content)) issues.push({ path, rule: 'storage-or-tracker', detail: needle });
  }
  return issues;
}

/**
 * Maps a root-relative URL to the dist file it must be served from.
 * `<base>/kontakt/` → `kontakt/index.html`; `<base>/_astro/x.webp` and public files → the file itself.
 * @param {string} url
 * @param {string} basePath
 * @param {Set<string>} files
 * @returns {{ kind: 'outside' } | { kind: 'malformed' } | { kind: 'file'; file: string; exists: boolean; hash: string | undefined }}
 */
function resolve(url, basePath, files) {
  const [pathPart = '', rawHash] = url.split('#');
  if (!pathPart.startsWith(basePath)) return { kind: 'outside' };
  const rel = tryDecode(decodeURI, pathPart.slice(basePath.length).split('?')[0] ?? '');
  const hash = rawHash === undefined ? undefined : tryDecode(decodeURIComponent, rawHash);
  if (rel === null || hash === null) return { kind: 'malformed' };
  const file = rel === '' || rel.endsWith('/') ? `${rel}index.html` : rel;
  return { kind: 'file', file, exists: files.has(file), hash };
}

/**
 * Per-page checks plus the cross-page ones: duplicate titles, link targets, anchors and asset files.
 * @param {Map<string, string>} pages dist-relative file path → HTML
 * @param {{ basePath: string; production: boolean; files: Set<string> }} opts `files` is every dist-relative file path
 * @returns {Issue[]}
 */
export function checkSite(pages, { basePath, production, files }) {
  /** @type {Issue[]} */
  const issues = [];
  /** @type {Map<string, string>} */
  const seenTitles = new Map();
  /** @type {Map<string, Set<string | undefined>>} */
  const ids = new Map();
  for (const [path, html] of pages) ids.set(path, new Set(parse(html).querySelectorAll('[id]').map((n) => n.getAttribute('id'))));

  for (const [path, html] of pages) {
    /** @param {string} rule @param {string} detail */
    const add = (rule, detail) => { issues.push({ path, rule, detail }); };
    issues.push(...checkPage(path, html, { production }));
    const root = parse(html);
    const title = root.querySelector('title')?.text.trim();
    // 404.html has no URL of its own, so its title cannot compete with another page's.
    if (title && path !== '404.html') {
      if (seenTitles.has(title)) add('title-duplicate', `${title} (also ${seenTitles.get(title)})`);
      else seenTitles.set(title, path);
    }

    for (const a of root.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href');
      // '' and '#' are reported as dead-link by checkPage, and so is javascript:. Any other scheme leaves the site
      // (https:) or opens an application (mailto:, tel:, viber:), as does a protocol-relative address: nothing to resolve.
      if (!href || href === '#' || href.startsWith('//') || SCHEME.test(href.trim())) continue;
      if (href.startsWith('#')) {
        const id = tryDecode(decodeURIComponent, href.slice(1));
        if (id === null) add('link-broken', href);
        else if (!ids.get(path)?.has(id)) add('anchor-missing', href);
        continue;
      }
      if (!href.startsWith('/')) { add('link-broken', `relative: ${href}`); continue; }
      const r = resolve(href, basePath, files);
      if (r.kind === 'outside') add('link-outside-base', href);
      else if (r.kind === 'malformed' || !r.exists) add('link-broken', href);
      else if (r.hash && ids.has(r.file) && !ids.get(r.file)?.has(r.hash)) add('anchor-missing', href);
    }

    for (const { url, asset } of resourceUrls(root)) {
      // Absolute URLs are reported as third-party by checkPage; data: URIs and same-page fragments load no file.
      if (!asset || url === '' || url.startsWith('#') || url.startsWith('//') || SCHEME.test(url)) continue;
      if (!url.startsWith('/')) { add('asset-broken', `relative: ${url}`); continue; }
      const r = resolve(url, basePath, files);
      if (r.kind === 'outside') add('asset-outside-base', url);
      else if (r.kind === 'malformed' || !r.exists) add('asset-broken', url);
    }
  }
  return issues;
}

/** @param {string} url */
const xmlEscape = (url) => url.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * @param {Map<string, string>} pages dist-relative file path → HTML
 * @param {{ siteUrl: string; basePath: string; production: boolean }} opts
 * @returns {string} sitemap XML; 404.html is never listed, noindex pages are left out in production
 */
export function buildSitemap(pages, { siteUrl, basePath, production }) {
  const urls = [];
  for (const [path, html] of pages) {
    if (path === '404.html' || !path.endsWith('index.html')) continue;
    const robots = parse(html).querySelector('meta[name="robots"]')?.getAttribute('content') ?? '';
    if (production && robots.toLowerCase().includes('noindex')) continue;
    urls.push(xmlEscape(encodeURI(siteUrl.replace(/\/+$/, '') + basePath + path.replace(/index\.html$/, ''))));
  }
  urls.sort();
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`;
}
