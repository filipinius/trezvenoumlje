import type { EnvConfig } from './env';

// Fragment, scheme (https:, mailto:, tel:) or protocol-relative (//host) → not an internal path.
const EXTERNAL = /^(#|\/\/|[a-z][a-z0-9+.-]*:)/i;

export function withBase(path: string, basePath: string): string {
  if (EXTERNAL.test(path)) return path;
  if (!path.startsWith('/')) throw new Error(`Internal path must start with "/": ${path}`);
  if (basePath !== '/' && (path === basePath.slice(0, -1) || path.startsWith(basePath))) return path;
  return basePath.replace(/\/$/, '') + path;
}

export function absoluteUrl(path: string, cfg: EnvConfig): string {
  if (EXTERNAL.test(path)) return path;
  return cfg.siteUrl + withBase(path, cfg.basePath);
}
