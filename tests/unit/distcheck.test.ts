import { describe, expect, test } from 'vitest';
import { buildSitemap, checkAssets, checkPage, checkSite, srcsetUrls } from '../../scripts/lib/distcheck.mjs';

const page = (o: { title?: string; desc?: string; body?: string; canonical?: boolean | string; lang?: string; robots?: string; head?: string } = {}) => `<!doctype html>
<html lang="${o.lang ?? 'sr-Latn'}"><head>${o.title === '' ? '' : `<title>${o.title ?? 'Naslov – Trezvenoumlje'}</title>`}
<meta name="description" content="${o.desc ?? 'Opis stranice koji je dovoljno dug da prođe proveru dužine opisa.'}">
<meta name="robots" content="${o.robots ?? 'index, follow'}">
${o.canonical === false ? '' : `<link rel="canonical" href="${typeof o.canonical === 'string' ? o.canonical : 'https://example.rs/x/'}">`}${o.head ?? ''}</head>
<body><main>${o.body ?? '<h1>Naslov</h1>'}</main></body></html>`;

// A preview build marks every page noindex; the preview-mode tests use that as their clean baseline.
const previewPage = (o: Parameters<typeof page>[0] = {}) => page({ robots: 'noindex, nofollow', ...o });
const PREVIEW = { production: false };
const PRODUCTION = { production: true };

const rules = (issues: { rule: string }[]) => issues.map((i) => i.rule).sort();

describe('srcsetUrls', () => {
  test.each([
    ['/a, https://cdn.e.com/b 2x', ['/a', 'https://cdn.e.com/b']],
    ['/a,\n/b 2x, /c', ['/a', '/b', '/c']],
    ['/a.webp 1x, /b.webp 2x', ['/a.webp', '/b.webp']],
    ['  /a.avif 320w ,/b.avif 640w  ', ['/a.avif', '/b.avif']],
    ['data:image/png;base64,AA,BB 1x, /b.webp 2x', ['data:image/png;base64,AA,BB', '/b.webp']],
    ['/a', ['/a']],
    ['', []],
  ])('%j', (srcset, urls) => { expect(srcsetUrls(srcset)).toEqual(urls); });

  test('a third-party candidate after a candidate without a descriptor is flagged', () => {
    const body = '<h1>A</h1><img alt="" src="/a" srcset="/a, https://cdn.e.com/b 2x">';
    expect(checkPage('x', previewPage({ body }), PREVIEW)).toEqual([{ path: 'x', rule: 'third-party', detail: 'https://cdn.e.com/b' }]);
  });
});

describe('checkPage', () => {
  test('a clean page has no issues', () => {
    expect(checkPage('x/index.html', page(), PRODUCTION)).toEqual([]);
    expect(checkPage('x/index.html', previewPage(), PREVIEW)).toEqual([]);
  });
  test('missing title, canonical and wrong lang', () => {
    expect(rules(checkPage('x/index.html', previewPage({ title: '', canonical: false, lang: 'en' }), PREVIEW)))
      .toEqual(['canonical-missing', 'lang', 'title-missing']);
  });
  test('404.html has no address of its own, so it needs no canonical; a canonical it does carry is still validated', () => {
    expect(checkPage('404.html', previewPage({ canonical: false }), PREVIEW)).toEqual([]);
    expect(rules(checkPage('404/index.html', previewPage({ canonical: false }), PREVIEW))).toEqual(['canonical-missing']);
    expect(rules(checkPage('404.html', previewPage({ canonical: '/404/' }), PREVIEW))).toEqual(['canonical-invalid']);
  });
  test('description length bounds', () => {
    expect(rules(checkPage('x', previewPage({ desc: 'Kratko.' }), PREVIEW))).toEqual(['description-length']);
    expect(rules(checkPage('x', previewPage({ desc: 'a'.repeat(161) }), PREVIEW))).toEqual(['description-length']);
    expect(checkPage('x', previewPage({ desc: 'a'.repeat(50) }), PREVIEW)).toEqual([]);
    expect(checkPage('x', previewPage({ desc: 'a'.repeat(160) }), PREVIEW)).toEqual([]);
  });
  test('h1 count, missing alt (empty alt allowed), dead link', () => {
    const body = '<h1>A</h1><h1>B</h1><img src="/a.webp"><img src="/b.webp" alt=""><a href="#">x</a>';
    expect(rules(checkPage('x', previewPage({ body }), PREVIEW))).toEqual(['dead-link', 'h1-count', 'img-alt']);
  });
  test('third-party resources are flagged, plain external links are not', () => {
    const body = '<h1>A</h1><script src="https://cdn.example.com/a.js"></script><iframe src="//youtube.com/embed/x"></iframe><a href="https://example.com">ok</a>';
    expect(rules(checkPage('x', previewPage({ body }), PREVIEW))).toEqual(['third-party', 'third-party']);
  });
  test('a third-party stylesheet is flagged, an absolute canonical is not', () => {
    const head = '<link rel="stylesheet" href="https://cdn.example.com/a.css">';
    expect(rules(checkPage('x', previewPage({ head }), PREVIEW))).toEqual(['third-party']);
  });
  test('inline JSON-LD and inline scripts are not third-party resources', () => {
    const head = '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","url":"https://example.rs/"}</script>';
    const body = '<h1>A</h1><script>document.documentElement.dataset.js = "1";</script>';
    expect(checkPage('x', previewPage({ head, body }), PREVIEW)).toEqual([]);
  });
  test('placeholders fail only in production', () => {
    const body = '<h1>A</h1><p>Pozovite [BROJ HITNE SLUŽBE]</p>';
    expect(checkPage('x', previewPage({ body }), PREVIEW)).toEqual([]);
    expect(rules(checkPage('x', page({ body }), PRODUCTION))).toEqual(['placeholder']);
  });
  test('a price amount is always an error', () => {
    expect(rules(checkPage('x', previewPage({ body: '<h1>A</h1><p>1.234 RSD</p>' }), PREVIEW))).toEqual(['price']);
  });

  describe('robots-preview', () => {
    test('preview: a page without noindex is flagged', () => {
      expect(rules(checkPage('x', page({ robots: 'index, follow' }), PREVIEW))).toEqual(['robots-preview']);
      expect(rules(checkPage('x', page().replace(/<meta name="robots"[^>]*>/, ''), PREVIEW))).toEqual(['robots-preview']);
    });
    test('production: the dev banner text is flagged, noindex pages are allowed', () => {
      const body = '<h1>A</h1><div><strong>Dev pregled</strong> · sadržaj još nije konačan</div>';
      expect(rules(checkPage('x', page({ body }), PRODUCTION))).toEqual(['robots-preview']);
      expect(checkPage('x', page({ robots: 'noindex, follow' }), PRODUCTION)).toEqual([]);
    });
    test('preview: the dev banner text is allowed', () => {
      const body = '<h1>A</h1><div><strong>Dev pregled</strong></div>';
      expect(checkPage('x', previewPage({ body }), PREVIEW)).toEqual([]);
    });
  });

  describe('canonical', () => {
    test('an empty href counts as missing', () => {
      expect(rules(checkPage('x', previewPage({ canonical: '' }), PREVIEW))).toEqual(['canonical-missing']);
      expect(rules(checkPage('x', previewPage({ canonical: '  ' }), PREVIEW))).toEqual(['canonical-missing']);
    });
    test.each(['/x/', '//example.rs/x/', 'example.rs/x/', 'ftp://example.rs/x/'])('%s is not an absolute http(s) URL', (canonical) => {
      expect(checkPage('x', previewPage({ canonical }), PREVIEW)).toEqual([{ path: 'x', rule: 'canonical-invalid', detail: canonical }]);
    });
    test('http and https canonicals are valid', () => {
      expect(checkPage('x', previewPage({ canonical: 'http://localhost:4321/x/' }), PREVIEW)).toEqual([]);
    });
  });

  describe('placeholder', () => {
    const found = (html: string) => checkPage('x', html, PRODUCTION).filter((i) => i.rule === 'placeholder').map((i) => i.detail);
    test('two adjacent placeholder elements are both reported', () => {
      const body = '<h1>A</h1><footer><span>[ADRESA]</span><span>[TELEFON]</span></footer>';
      expect(checkPage('x', page({ body }), PRODUCTION)).toEqual([
        { path: 'x', rule: 'placeholder', detail: '[ADRESA]' },
        { path: 'x', rule: 'placeholder', detail: '[TELEFON]' },
      ]);
    });
    test('a placeholder split across a line break is reported, with whitespace collapsed', () => {
      expect(found(page({ body: '<h1>A</h1><p>Pozovite [BROJ HITNE\n   SLUŽBE] odmah</p>' }))).toEqual(['[BROJ HITNE SLUŽBE]']);
    });
    test('the same placeholder twice on a page is reported once', () => {
      expect(found(page({ body: '<h1>A</h1><p>[TELEFON]</p><p>[TELEFON]</p><a href="tel:[TELEFON]">[TELEFON]</a>' }))).toEqual(['[TELEFON]']);
    });
    test('a Markdown-looking sequence in rendered text is still a placeholder', () => {
      expect(found(page({ body: '<h1>A</h1><p>![SLIKA](x) i [TEKST](y)</p>' }))).toEqual(['[SLIKA]', '[TEKST]']);
    });
    const ld = (obj: object) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
    const locations: [string, Parameters<typeof page>[0], string][] = [
      ['<title>', { title: 'Kontakt [GRAD] – Trezvenoumlje' }, '[GRAD]'],
      ['meta description', { desc: 'Opis stranice koji je dovoljno dug i sadrži [TELEFON] u tekstu.' }, '[TELEFON]'],
      ['og meta content', { head: '<meta property="og:title" content="Naslov [GRAD]">' }, '[GRAD]'],
      ['alt', { body: '<h1>A</h1><img src="/a.webp" alt="Portret [IME]">' }, '[IME]'],
      ['aria-label', { body: '<h1>A</h1><a href="/x/" aria-label="Pozovite [TELEFON]">x</a>' }, '[TELEFON]'],
      ['title attribute', { body: '<h1>A</h1><abbr title="[PUN NAZIV]">TU</abbr>' }, '[PUN NAZIV]'],
      ['placeholder attribute', { body: '<h1>A</h1><input placeholder="npr. [PRIMER]">' }, '[PRIMER]'],
      ['value attribute', { body: '<h1>A</h1><input type="hidden" value="[PRIMALAC]">' }, '[PRIMALAC]'],
      ['mailto href', { body: '<h1>A</h1><a href="mailto:kontakt@[domen].rs">pišite</a>' }, '[domen]'],
      ['percent-encoded mailto href', { body: '<h1>A</h1><a href="mailto:kontakt@%5Bdomen%5D.rs">pišite</a>' }, '[domen]'],
      ['tel href', { body: '<h1>A</h1><a href="tel:[TELEFON]">pozovite</a>' }, '[TELEFON]'],
      ['JSON-LD string value', { head: ld({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'P', acceptedAnswer: { '@type': 'Answer', text: 'Pozovite [BROJ HITNE SLUŽBE].' } }] }) }, '[BROJ HITNE SLUŽBE]'],
    ];
    test.each(locations)('is found in %s', (_where, fixture, expected) => {
      expect(checkPage('x', page(fixture), PRODUCTION)).toEqual([{ path: 'x', rule: 'placeholder', detail: expected }]);
    });
    test.each(locations)('in %s is not an error in preview', (_where, fixture) => {
      expect(checkPage('x', previewPage(fixture), PREVIEW)).toEqual([]);
    });
    test('an href with a malformed percent-escape is searched as written', () => {
      expect(found(page({ body: '<h1>A</h1><a href="mailto:a%@[domen].rs">x</a>' }))).toEqual(['[domen]']);
    });
  });

  describe('jsonld-invalid', () => {
    test('JSON-LD that does not parse is reported in preview and production', () => {
      const head = '<script type="application/ld+json">{"@type": "Organization",</script>';
      expect(rules(checkPage('x', previewPage({ head }), PREVIEW))).toEqual(['jsonld-invalid']);
      expect(rules(checkPage('x', page({ head }), PRODUCTION))).toEqual(['jsonld-invalid']);
    });
  });

  describe('third-party beyond src', () => {
    test.each([
      ['img srcset candidate', { body: '<h1>A</h1><img alt="" src="/a.webp" srcset="/a.webp 1x, https://cdn.example.com/b.webp 2x">' }, 'https://cdn.example.com/b.webp'],
      ['source srcset', { body: '<h1>A</h1><picture><source srcset="/a.avif 320w, //cdn.example.com/a.avif 640w"><img alt="" src="/a.webp"></picture>' }, '//cdn.example.com/a.avif'],
      ['video poster', { body: '<h1>A</h1><video poster="https://cdn.example.com/p.jpg"></video>' }, 'https://cdn.example.com/p.jpg'],
      ['audio src', { body: '<h1>A</h1><audio src="https://cdn.example.com/a.mp3"></audio>' }, 'https://cdn.example.com/a.mp3'],
      ['embed src', { body: '<h1>A</h1><embed src="https://cdn.example.com/a.pdf">' }, 'https://cdn.example.com/a.pdf'],
      ['object data', { body: '<h1>A</h1><object data="https://cdn.example.com/a.svg"></object>' }, 'https://cdn.example.com/a.svg'],
      ['link preconnect', { head: '<link rel="preconnect" href="https://cdn.example.com">' }, 'https://cdn.example.com'],
      ['link preload', { head: '<link rel="preload" as="font" href="https://cdn.example.com/f.woff2" crossorigin>' }, 'https://cdn.example.com/f.woff2'],
      ['link icon', { head: '<link rel="icon" href="//cdn.example.com/favicon.ico">' }, '//cdn.example.com/favicon.ico'],
      ['inline style @import string', { head: '<style>@import "https://cdn.example.com/a.css";</style>' }, 'https://cdn.example.com/a.css'],
      ['inline style @import url()', { head: '<style>@import url(https://cdn.example.com/a.css);</style>' }, 'https://cdn.example.com/a.css'],
      ['inline style url()', { head: "<style>body{background:url( 'https://cdn.example.com/a.png' )}</style>" }, 'https://cdn.example.com/a.png'],
      ['style attribute url()', { body: '<h1>A</h1><p style="background:url(//cdn.example.com/a.png)">x</p>' }, '//cdn.example.com/a.png'],
    ] as [string, Parameters<typeof page>[0], string][])('%s', (_what, fixture, url) => {
      expect(checkPage('x', previewPage(fixture), PREVIEW)).toEqual([{ path: 'x', rule: 'third-party', detail: url }]);
    });
    test('canonical and alternate links, local and data URLs are not third-party loads', () => {
      const head = '<link rel="alternate" type="application/rss+xml" href="https://example.rs/rss.xml"><link rel="alternate" hreflang="en" href="https://example.com/">'
        + '<link rel="icon" href="/favicon.svg"><style>@import "/a.css";body{background:url(/a.png)}i{background:url("data:image/png;base64,AAAA")}</style>';
      const body = '<h1>A</h1><img alt="" src="data:image/png;base64,AA,BB" srcset="data:image/png;base64,AA,BB 1x, /b.webp 2x"><p style="color:red;background:url(/a.png)">x</p>';
      expect(checkPage('x', previewPage({ head, body }), PREVIEW)).toEqual([]);
    });
  });

  describe('storage-or-tracker', () => {
    test('a mention in visible prose is allowed', () => {
      const body = '<h1>Kolačići</h1><p>Ne koristimo google-analytics, googletagmanager, gtag(), fbq(), connect.facebook.net, fonts.googleapis.com ni fonts.gstatic.com.</p>';
      expect(checkPage('x', previewPage({ body }), PREVIEW)).toEqual([]);
    });
    test('an external tracker script is flagged (and is a third-party load)', () => {
      const head = '<script async src="https://www.GoogleTagManager.com/gtag/js?id=G-1"></script>';
      expect(checkPage('x', previewPage({ head }), PREVIEW)).toEqual([
        { path: 'x', rule: 'third-party', detail: 'https://www.GoogleTagManager.com/gtag/js?id=G-1' },
        { path: 'x', rule: 'storage-or-tracker', detail: 'googletagmanager' },
      ]);
    });
    test.each([
      ['<script>window.dataLayer=[];function gtag(){dataLayer.push(arguments)}</script>', 'gtag('],
      ['<script>fbq("init", "1")</script>', 'fbq('],
      ['<script>var u = "https://www.google-analytics.com/collect";</script>', 'google-analytics'],
      ['<style>.a{font-family:x;src:url(/f.woff2)}/* fonts.gstatic.com */</style>', 'fonts.gstatic.com'],
      ['<form action="https://connect.facebook.net/x"></form>', 'connect.facebook.net'],
    ])('flags %s', (snippet, needle) => {
      expect(checkPage('x', previewPage({ body: `<h1>A</h1>${snippet}` }), PREVIEW)).toEqual([{ path: 'x', rule: 'storage-or-tracker', detail: needle }]);
    });
    test.each([
      ['<link rel="preconnect" href="https://fonts.gstatic.com">', 'fonts.gstatic.com'],
      ['<link rel="stylesheet" href="https://FONTS.GOOGLEAPIS.COM/css2?family=Lato">', 'fonts.googleapis.com'],
      ['<img alt="" src="/a.webp" srcset="https://www.google-analytics.com/p.gif 1x">', 'google-analytics'],
      ['<p style="background:url(https://connect.facebook.net/p.gif)">x</p>', 'connect.facebook.net'],
    ])('flags %s together with the third-party load', (snippet, needle) => {
      const issues = checkPage('x', previewPage({ body: `<h1>A</h1>${snippet}` }), PREVIEW);
      expect(rules(issues)).toEqual(['storage-or-tracker', 'third-party']);
      expect(issues.find((i) => i.rule === 'storage-or-tracker')?.detail).toBe(needle);
    });
    test('reports each needle once, with the needle as the detail', () => {
      const head = '<script>gtag("a");gtag("b");fbq("c")</script>';
      expect(checkPage('x', previewPage({ head }), PREVIEW)).toEqual([
        { path: 'x', rule: 'storage-or-tracker', detail: 'gtag(' },
        { path: 'x', rule: 'storage-or-tracker', detail: 'fbq(' },
      ]);
    });
  });

  describe('medical-schema', () => {
    const ld = (obj: object) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
    const check = (type: unknown) => checkPage('x', previewPage({ head: ld({ '@context': 'https://schema.org', '@type': type, name: 'X' }) }), PREVIEW);
    test.each(['MedicalOrganization', 'MedicalClinic', 'Physician', 'MedicalBusiness', 'Hospital', 'Dentist', 'Pharmacy', 'MedicalCondition'])('flags @type %s', (type) => {
      expect(check(type)).toEqual([{ path: 'x', rule: 'medical-schema', detail: type }]);
    });
    test.each([
      ['https://schema.org/MedicalClinic', 'MedicalClinic'],
      ['http://schema.org/Physician', 'Physician'],
      ['schema:Hospital', 'Hospital'],
    ])('normalises %s before matching', (type, normalised) => {
      expect(check(type)).toEqual([{ path: 'x', rule: 'medical-schema', detail: normalised }]);
    });
    test('flags a nested type and a type array', () => {
      const head = ld({ '@context': 'https://schema.org', '@graph': [{ '@type': 'Person', worksFor: { '@type': ['Organization', 'MedicalClinic'] } }] });
      expect(rules(checkPage('x', previewPage({ head }), PREVIEW))).toEqual(['medical-schema']);
    });
    test('allowed types and the same words outside @type are fine', () => {
      const head = ld({ '@context': 'https://schema.org', '@type': ['Organization', 'https://schema.org/EducationalOrganization'], description: 'Nismo Hospital ni MedicalClinic.' });
      expect(checkPage('x', previewPage({ head, body: '<h1>A</h1><p>Physician</p>' }), PREVIEW)).toEqual([]);
    });
  });
});

describe('checkAssets', () => {
  const mk = (entries: Record<string, string>) => new Map(Object.entries(entries));
  test('clean CSS and JS have no issues', () => {
    const assets = mk({
      '_astro/a.css': '@font-face{font-family:Lato;src:url(/trezvenoumlje/_astro/lato.woff2) format("woff2")}i{background:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\'/%3E")}',
      '_astro/a.js': 'const docs = "https://example.com/docs"; console.log(docs);',
    });
    expect(checkAssets(assets)).toEqual([]);
  });
  test('absolute url() and @import targets in CSS are third-party loads', () => {
    const assets = mk({ '_astro/a.css': '@import "//cdn.example.com/a.css";a{background:url(https://cdn.example.com/a.png)}' });
    expect(checkAssets(assets)).toEqual([
      { path: '_astro/a.css', rule: 'third-party', detail: '//cdn.example.com/a.css' },
      { path: '_astro/a.css', rule: 'third-party', detail: 'https://cdn.example.com/a.png' },
    ]);
  });
  test('a CSS file importing Google Fonts is a third-party load and a tracker', () => {
    const assets = mk({ '_astro/a.css': '@import url(https://fonts.googleapis.com/css2?family=Lato);' });
    expect(checkAssets(assets)).toEqual([
      { path: '_astro/a.css', rule: 'third-party', detail: 'https://fonts.googleapis.com/css2?family=Lato' },
      { path: '_astro/a.css', rule: 'storage-or-tracker', detail: 'fonts.googleapis.com' },
    ]);
  });
  test('tracker code in a JS file is flagged; absolute URLs in JS are not parsed as CSS', () => {
    const assets = mk({ '_astro/a.js': 'const s="url(https://cdn.example.com/a.png)";window.GTAG("config");gtag("js")' });
    expect(checkAssets(assets)).toEqual([{ path: '_astro/a.js', rule: 'storage-or-tracker', detail: 'gtag(' }]);
  });
});

describe('checkSite', () => {
  const base = '/trezvenoumlje/';
  const mk = (entries: Record<string, string>) => new Map(Object.entries(entries));
  test('resolves base-prefixed links, directories and anchors', () => {
    const pages = mk({
      'index.html': previewPage({ title: 'Home', body: '<h1>A</h1><a href="/trezvenoumlje/kontakt/">k</a><a href="/trezvenoumlje/usluge/#programi">p</a><a href="/trezvenoumlje/og.png">f</a>' }),
      'kontakt/index.html': previewPage({ title: 'Kontakt' }),
      'usluge/index.html': previewPage({ title: 'Usluge', body: '<h1>U</h1><section id="programi"></section>' }),
    });
    expect(checkSite(pages, { basePath: base, production: false, files: new Set([...pages.keys(), 'og.png']) })).toEqual([]);
  });
  test('flags broken link, missing anchor and link outside the base path', () => {
    const pages = mk({
      'index.html': previewPage({ title: 'Home', body: '<h1>A</h1><a href="/trezvenoumlje/nema/">x</a><a href="/trezvenoumlje/kontakt/#nema">y</a><a href="/kontakt/">z</a>' }),
      'kontakt/index.html': previewPage({ title: 'Kontakt' }),
    });
    expect(rules(checkSite(pages, { basePath: base, production: false, files: new Set(pages.keys()) })))
      .toEqual(['anchor-missing', 'link-broken', 'link-outside-base']);
  });
  test('duplicate titles are flagged once per extra page', () => {
    const pages = mk({ 'a/index.html': previewPage({ title: 'Isto' }), 'b/index.html': previewPage({ title: 'Isto' }), 'c/index.html': previewPage({ title: 'Isto' }) });
    expect(rules(checkSite(pages, { basePath: '/', production: false, files: new Set(pages.keys()) }))).toEqual(['title-duplicate', 'title-duplicate']);
  });
  test('404.html is excluded from the duplicate-title rule', () => {
    const pages = mk({ '404.html': previewPage({ title: 'Isto' }), 'a/index.html': previewPage({ title: 'Isto' }) });
    expect(checkSite(pages, { basePath: '/', production: false, files: new Set(pages.keys()) })).toEqual([]);
  });
  test('external, mailto and tel links are never checked', () => {
    const body = '<h1>A</h1><a href="https://example.com/nema/">a</a><a href="http://example.com">b</a><a href="//example.com/x">c</a><a href="mailto:a@example.com">d</a><a href="tel:+381000000">e</a>';
    const pages = mk({ 'index.html': previewPage({ body }) });
    expect(checkSite(pages, { basePath: base, production: false, files: new Set(pages.keys()) })).toEqual([]);
  });
  test('links to built assets under _astro/ and to public files resolve to files in dist', () => {
    const body = '<h1>A</h1><a href="/trezvenoumlje/_astro/x.abc123.webp">slika</a><a href="/trezvenoumlje/favicon.svg">ikona</a><a href="/trezvenoumlje/_astro/nema.webp">nema</a>';
    const pages = mk({ 'index.html': previewPage({ body }) });
    const files = new Set([...pages.keys(), '_astro/x.abc123.webp', 'favicon.svg']);
    expect(checkSite(pages, { basePath: base, production: false, files })).toEqual([
      { path: 'index.html', rule: 'link-broken', detail: '/trezvenoumlje/_astro/nema.webp' },
    ]);
  });
  test('the same links resolve when the site is served from the domain root', () => {
    const body = '<h1>A</h1><a href="/kontakt/">k</a><a href="/_astro/x.webp">s</a><a href="/">home</a>';
    const pages = mk({ 'index.html': previewPage({ title: 'Home', body }), 'kontakt/index.html': previewPage({ title: 'Kontakt' }) });
    expect(checkSite(pages, { basePath: '/', production: false, files: new Set([...pages.keys(), '_astro/x.webp']) })).toEqual([]);
  });
  test('hash-only links are checked against ids on the same page', () => {
    const body = '<h1>A</h1><a href="#sadrzaj">skip</a><a href="#nedelja-3">3</a><a href="#nema">x</a><main id="sadrzaj"><section id="nedelja-3"></section></main>';
    const pages = mk({
      'index.html': previewPage({ title: 'Home', body }),
      'drugo/index.html': previewPage({ title: 'Drugo', body: '<h1>B</h1><p id="nema"></p>' }),
    });
    expect(checkSite(pages, { basePath: base, production: false, files: new Set(pages.keys()) })).toEqual([
      { path: 'index.html', rule: 'anchor-missing', detail: '#nema' },
    ]);
  });
  test('a hash-only link with a percent-encoded id matches the decoded id', () => {
    const pages = mk({ 'index.html': previewPage({ body: '<h1>A</h1><a href="#%C5%A1ta">x</a><p id="šta"></p>' }) });
    expect(checkSite(pages, { basePath: base, production: false, files: new Set(pages.keys()) })).toEqual([]);
  });
});

describe('checkSite: malformed percent-escapes', () => {
  const mk = (entries: Record<string, string>) => new Map(Object.entries(entries));
  test('a malformed escape in a path or hash is link-broken, not a crash', () => {
    const body = '<h1>A</h1><a href="/trezvenoumlje/100%/">a</a><a href="#100%">b</a><a href="/trezvenoumlje/#100%">c</a>';
    const pages = mk({ 'index.html': previewPage({ body }) });
    expect(checkSite(pages, { basePath: '/trezvenoumlje/', production: false, files: new Set(pages.keys()) })).toEqual([
      { path: 'index.html', rule: 'link-broken', detail: '/trezvenoumlje/100%/' },
      { path: 'index.html', rule: 'link-broken', detail: '#100%' },
      { path: 'index.html', rule: 'link-broken', detail: '/trezvenoumlje/#100%' },
    ]);
  });
});

describe('checkSite: assets', () => {
  const mk = (entries: Record<string, string>) => new Map(Object.entries(entries));
  const run = (basePath: string, fixture: Parameters<typeof page>[0], extra: string[] = []) => {
    const pages = mk({ 'index.html': previewPage(fixture) });
    return checkSite(pages, { basePath, production: false, files: new Set([...pages.keys(), ...extra]) });
  };

  describe('under /trezvenoumlje/', () => {
    const base = '/trezvenoumlje/';
    test('an image missing the base prefix is outside the base', () => {
      expect(run(base, { body: '<h1>A</h1><img alt="" src="/_astro/x.webp">' }, ['_astro/x.webp'])).toEqual([
        { path: 'index.html', rule: 'asset-outside-base', detail: '/_astro/x.webp' },
      ]);
    });
    test('a stylesheet pointing at a missing file is broken', () => {
      expect(run(base, { head: '<link rel="stylesheet" href="/trezvenoumlje/_astro/nema.css">' })).toEqual([
        { path: 'index.html', rule: 'asset-broken', detail: '/trezvenoumlje/_astro/nema.css' },
      ]);
    });
    test('a correct built image present in dist is fine', () => {
      expect(run(base, { body: '<h1>A</h1><img alt="" src="/trezvenoumlje/_astro/x.webp">' }, ['_astro/x.webp'])).toEqual([]);
    });
  });

  describe('under /', () => {
    test('a built image present in dist is fine', () => {
      expect(run('/', { body: '<h1>A</h1><img alt="" src="/_astro/x.webp">' }, ['_astro/x.webp'])).toEqual([]);
    });
    test('a stylesheet pointing at a missing file is broken', () => {
      expect(run('/', { head: '<link rel="stylesheet" href="/_astro/nema.css">' })).toEqual([
        { path: 'index.html', rule: 'asset-broken', detail: '/_astro/nema.css' },
      ]);
    });
    test('an image carrying a stale base prefix is broken', () => {
      expect(run('/', { body: '<h1>A</h1><img alt="" src="/trezvenoumlje/_astro/x.webp">' }, ['_astro/x.webp'])).toEqual([
        { path: 'index.html', rule: 'asset-broken', detail: '/trezvenoumlje/_astro/x.webp' },
      ]);
    });
  });

  test('every asset-bearing attribute is resolved', () => {
    const head = '<link rel="icon" href="/trezvenoumlje/nema.svg"><link rel="modulepreload" href="/trezvenoumlje/_astro/nema-pre.js"><link rel="manifest" href="/nema.webmanifest">'
      + '<link rel="preload" as="font" href="/trezvenoumlje/_astro/nema.woff2">';
    const body = '<h1>A</h1><script src="/trezvenoumlje/_astro/nema.js"></script>'
      + '<img alt="" src="/trezvenoumlje/_astro/x.webp" srcset="/trezvenoumlje/_astro/x.webp 1x, /trezvenoumlje/_astro/nema-2x.webp 2x">'
      + '<picture><source srcset="/_astro/van.avif 640w"><source src="/trezvenoumlje/nema.webm"></picture>'
      + '<video src="/trezvenoumlje/nema.mp4" poster="/trezvenoumlje/nema.jpg"></video><audio src="/trezvenoumlje/nema.mp3"></audio>';
    expect(run('/trezvenoumlje/', { head, body }, ['_astro/x.webp']).map((i) => `${i.rule} ${i.detail}`).sort()).toEqual([
      'asset-broken /trezvenoumlje/_astro/nema-2x.webp',
      'asset-broken /trezvenoumlje/_astro/nema-pre.js',
      'asset-broken /trezvenoumlje/_astro/nema.js',
      'asset-broken /trezvenoumlje/_astro/nema.woff2',
      'asset-broken /trezvenoumlje/nema.jpg',
      'asset-broken /trezvenoumlje/nema.mp3',
      'asset-broken /trezvenoumlje/nema.mp4',
      'asset-broken /trezvenoumlje/nema.svg',
      'asset-broken /trezvenoumlje/nema.webm',
      'asset-outside-base /_astro/van.avif',
      'asset-outside-base /nema.webmanifest',
    ]);
  });
  test('data URIs, fragments, query strings and non-asset links are not resolved', () => {
    const head = '<link rel="alternate" type="application/rss+xml" href="/trezvenoumlje/nema.xml"><link rel="stylesheet" href="/trezvenoumlje/_astro/a.css?v=2">';
    const body = '<h1>A</h1><img alt="" src="data:image/png;base64,AA,BB" srcset="data:image/png;base64,AA,BB 1x"><svg><use href="#ikona"></use></svg><img alt="" src="#ikona">';
    expect(run('/trezvenoumlje/', { head, body }, ['_astro/a.css'])).toEqual([]);
  });
  test('a relative asset URL and a malformed escape are broken', () => {
    const body = '<h1>A</h1><img alt="" src="slika.webp"><img alt="" src="/trezvenoumlje/100%.webp">';
    expect(run('/trezvenoumlje/', { body })).toEqual([
      { path: 'index.html', rule: 'asset-broken', detail: 'relative: slika.webp' },
      { path: 'index.html', rule: 'asset-broken', detail: '/trezvenoumlje/100%.webp' },
    ]);
  });
});

describe('buildSitemap', () => {
  const pages = new Map([
    ['index.html', page()], ['kontakt/index.html', page()], ['404.html', page()],
    ['nacrt/index.html', page({ robots: 'noindex, follow' })],
  ]);
  test('production: absolute urls, excludes 404 and noindex pages', () => {
    const xml = buildSitemap(pages, { siteUrl: 'https://example.rs', basePath: '/', production: true });
    expect(xml).toContain('<loc>https://example.rs/</loc>');
    expect(xml).toContain('<loc>https://example.rs/kontakt/</loc>');
    expect(xml).not.toContain('404');
    expect(xml).not.toContain('nacrt');
  });
  test('preview: lists every page except 404, under the base path', () => {
    const xml = buildSitemap(pages, { siteUrl: 'https://x.github.io', basePath: '/trezvenoumlje/', production: false });
    expect(xml).toContain('<loc>https://x.github.io/trezvenoumlje/nacrt/</loc>');
    expect(xml).not.toContain('404');
  });
  test('urls are percent-encoded and XML-escaped', () => {
    const odd = new Map([['a&b/index.html', page()], ['šta <je>/index.html', page()]]);
    const xml = buildSitemap(odd, { siteUrl: 'https://example.rs', basePath: '/', production: true });
    expect(xml).toContain('<loc>https://example.rs/a&amp;b/</loc>');
    expect(xml).toContain('<loc>https://example.rs/%C5%A1ta%20%3Cje%3E/</loc>');
  });
  test('production: the noindex check ignores case', () => {
    const upper = new Map([['index.html', page()], ['skriveno/index.html', page({ robots: 'NOINDEX, follow' })]]);
    expect(buildSitemap(upper, { siteUrl: 'https://example.rs', basePath: '/', production: true })).not.toContain('skriveno');
  });
  test('all trailing slashes are stripped from the site url', () => {
    const xml = buildSitemap(pages, { siteUrl: 'https://example.rs//', basePath: '/', production: true });
    expect(xml).toContain('<loc>https://example.rs/</loc>');
    expect(xml).toContain('<loc>https://example.rs/kontakt/</loc>');
  });
});
