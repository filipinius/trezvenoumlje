import { readEnv } from './env';
import { absoluteUrl, withBase } from './url';

export const site = readEnv({
  PUBLIC_SITE_ENV: import.meta.env.PUBLIC_SITE_ENV,
  SITE: import.meta.env.SITE,
  BASE_URL: import.meta.env.BASE_URL,
});
export const isPreview = site.env === 'preview';
export const href = (path: string): string => withBase(path, site.basePath);
export const abs = (path: string): string => absoluteUrl(path, site);
