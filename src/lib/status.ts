import type { SiteEnv } from './env';
export type Status = 'nacrt' | 'pregled' | 'objavljeno';

export function isVisible(status: Status, env: SiteEnv): boolean {
  return env === 'preview' || status === 'objavljeno';
}
export function isIndexable(entry: { status: Status; noindex?: boolean }, env: SiteEnv): boolean {
  return env === 'production' && entry.status === 'objavljeno' && !entry.noindex;
}
