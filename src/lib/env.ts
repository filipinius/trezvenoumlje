export type SiteEnv = 'preview' | 'production';
export interface EnvConfig { env: SiteEnv; siteUrl: string; basePath: string }

export function readEnv(src: { PUBLIC_SITE_ENV?: string; SITE?: string; BASE_URL?: string }): EnvConfig {
  const env: SiteEnv = src.PUBLIC_SITE_ENV === 'production' ? 'production' : 'preview';
  const siteUrl = (src.SITE || 'http://localhost:4321').replace(/\/+$/, '');
  const trimmed = (src.BASE_URL || '/').replace(/^\/+|\/+$/g, '');
  return { env, siteUrl, basePath: trimmed ? `/${trimmed}/` : '/' };
}
