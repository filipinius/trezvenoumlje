import { defineConfig } from 'astro/config';

const siteUrl = process.env.SITE_URL ?? 'http://localhost:4321';
const basePath = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site: siteUrl,
  base: basePath,
  trailingSlash: 'always',
  build: { format: 'directory' },
  image: { layout: 'constrained' },
  vite: {
    define: {
      'import.meta.env.PUBLIC_SITE_ENV': JSON.stringify(process.env.SITE_ENV ?? 'preview'),
    },
  },
});
