/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
