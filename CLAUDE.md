# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Public website of the Trezvenoumlje centre: a static Astro 7 site (strict TypeScript, plain CSS, no UI framework), deployed as a dev preview to GitHub Pages. Site content, UI text and `README.md` are Serbian in Latin script; code, comments and commit messages are English. `README.md` is the editor-facing reference for every content collection and its fields — keep it in sync when a schema changes.

## Commands

Node 22.19+ (`.nvmrc`).

```bash
npm run dev          # astro dev (preview mode, base "/")
npm run build        # astro build + scripts/postbuild.mjs (sitemap + dist checks; fails the build on any issue)
npm run check        # astro check && tsc --noEmit
npm test             # vitest, tests/unit/**
npm run e2e          # playwright, tests/e2e/** (desktop + mobile projects)
npm run verify       # check + test + e2e — run before anything goes to main (takes a few minutes)
```

Single tests:

```bash
npx vitest run tests/unit/seo.test.ts
npx vitest run -t "part of the test name"
npx playwright test tests/e2e/contact.spec.ts --project=desktop
npx playwright test -g "part of the test name"
```

E2E notes:

- First run needs `npx playwright install chromium`.
- Playwright starts its own server: `npm run build` then `astro preview` on port 4399 under base `/trezvenoumlje/` (`playwright.config.ts`). Locally it reuses a server already listening on 4399, so a leftover preview serves a **stale build** — stop it after changing source.
- Tests navigate with addresses relative to `baseURL` (`page.goto('kontakt/')`), never with a leading slash.
- `BASE` in `playwright.config.ts` must match the repository name used by GitHub Pages.

Production build (not used by CI yet): `SITE_ENV=production SITE_URL=https://<domain> BASE_PATH=/ npm run build`. It fails on purpose while any `[PLACEHOLDER]` is visible or a legal page is still a draft.

Push to `main` runs `.github/workflows/deploy.yml`: check, unit tests, e2e, preview build, deploy to Pages.

## Architecture

### Environment: preview vs production

Three env vars drive everything: `SITE_ENV` (`preview` default | `production`), `SITE_URL`, `BASE_PATH`. `astro.config.mjs` maps them to `site`, `base` and `import.meta.env.PUBLIC_SITE_ENV`; `src/lib/env.ts` normalises them and `src/lib/site.ts` exports the result (`site`, `isPreview`, `href()`, `abs()`). `scripts/postbuild.mjs` reads the same three vars independently from `process.env`.

- **Every internal link and asset URL goes through `href('/path/')`** (or `abs()` for absolute URLs). The site is served under `/trezvenoumlje/` in preview and `/` in production; a hard-coded `/path` is reported by postbuild as `link-outside-base`. Paths end with a slash (`trailingSlash: 'always'`).
- Preview: every page is `noindex`, drafts are visible, placeholders are highlighted, the "Dev pregled" banner shows. Production: only `objavljeno` entries, placeholders fail the build.

### Content layer

- Schemas live in `src/content/schemas.ts` (Zod), wired to collections in `src/content.config.ts`. JSON collections, except `clanci` and `pravno` which are Markdown.
- Pages read content through `src/lib/content.ts`, not `getCollection` directly: `getVisible()` applies the `status` rule (`nacrt` / `pregled` / `objavljeno`, see `src/lib/status.ts`), and the other helpers add the editorial ordering.
- `assertContentIntegrity()` (called from `BaseLayout`) enforces cross-entry rules the schemas cannot express — duplicate slugs, unknown `ciljneGrupe`, a story's missing week. The pure rules are in `src/lib/integrity.ts`; `content.ts` feeds them raw files via `import.meta.glob` because the loader would silently drop a duplicate slug.
- Text fields reject Cyrillic at schema level.
- A bracketed value such as `[TELEFON]` means "not filled in yet". Render any field that may contain one with `<Text value=… />` so preview highlights it.
- Images are `.webp` files under `src/assets/img/`, referenced from content by file name and resolved with `getImageAsset()` in `src/lib/images.ts` (throws on a missing file).
- `tests/unit/content-integrity.test.ts` pins content invariants, including **hard-coded entry counts** (usluge, programi, pitanja, 50 stories / 10 weeks) and specific entries. Adding or removing content in those collections means updating that test.

### Page shell and SEO

Every page renders through `src/layouts/BaseLayout.astro` with a `seo` object (`SeoInput` in `src/lib/seo.ts`), optional `jsonLd` and `breadcrumbs`. `Head.astro` + `buildSeo()` produce title, description, canonical, robots and OG tags; JSON-LD builders are in `src/lib/jsonld.ts`.

### Postbuild gate (`scripts/lib/distcheck.mjs`)

Runs over the built `dist/` on every build and exits non-zero on any issue. A new page or component must satisfy it:

- non-empty unique `<title>`, description of 50–160 characters, canonical, `lang="sr-Latn"`, exactly one `<h1>`, `alt` on every `<img>`
- no third-party resource in HTML or CSS (fonts are self-hosted via `@fontsource`), no tracker code
- no dead links (`href=""`, `#`, `javascript:`), every internal link, anchor and asset resolves to a file in `dist` under the base path
- no price amount (`\d+ RSD`) in page text, no medical schema.org types in JSON-LD
- production only: no `[placeholder]` anywhere in text, attributes or JSON-LD

The rules are pure functions with unit tests in `tests/unit/distcheck.test.ts`; `postbuild.mjs` only does the file I/O.

### Client scripts

No framework: small TypeScript modules in `src/scripts/`, and every page must work with JavaScript off (e2e covers this with `noJsContext`). Logic is kept DOM-free in `src/lib/` so it can be unit-tested (e.g. `contact.ts` holds validation, `scripts/contact-form.ts` only renders the outcome).

- `dialog.ts` is loaded on every page; triggers use `data-dialog-open="<dialog id>"`.
- `video.ts` inserts the YouTube (`youtube-nocookie`) iframe only after the click and removes it on close — no request leaves the origin on page load. `tests/e2e/privacy.spec.ts` sweeps for foreign requests.
- `story-overlay.ts`: on the story library page a card click fetches the story's own page and shows its `<article data-story>` in a dialog, demoting headings one level. Changes to the story page markup (`StoryArticle.astro`) affect the overlay.
- The contact form does not send anything yet: `src/lib/contact-transport.ts` is a stub to replace when a backend exists.

## Rules

- **No prices in the repository until the owner approves them.** `prikazCene` stays `skriveno` and `cena` stays unset; a unit test and the postbuild check both enforce it.
- **`design-source/` is never committed** (gitignored; it is the input of the one-off `scripts/import-stories.mjs`).
- `id` of FAQ entries, stories, and story/week questions (`p02`, `p02-q1`, `n01-o5`) and story slugs are permanent: a separate portal project binds user answers to them. Never rename, renumber or reuse them.
- Medical framing is deliberately avoided (the centre is not a health institution): no `Medical*`/`Physician`-type structured data.

## Background docs

`docs/superpowers/specs/2026-10-03-javni-sajt-design.md` is the design spec (scope, page list, SEO and privacy requirements); `docs/superpowers/plans/2026-10-03-javni-sajt.md` is the implementation plan it was built from.
