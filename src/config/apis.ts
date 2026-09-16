import { isRecord } from './merge.ts';

export type ClientApiConfig = {
  id: string;
  url: string;
  token?: string;
  auth: 'bearer' | 'x-api-key';
};

const API_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function validateClientApis(config: Record<string, any>, source = 'config.yml'): void {
  const value = config.apis;
  if (value === undefined || value === null) return;
  if (!isRecord(value)) throw new Error(`${source}: apis must be a mapping keyed by API id`);
  for (const [id, raw] of Object.entries(value)) {
    const label = `${source}: apis.${id}`;
    if (!API_ID.test(id)) throw new Error(`${label} must use a safe API id`);
    if (!isRecord(raw)) throw new Error(`${label} must be a mapping`);
    for (const key of Object.keys(raw)) if (!['url', 'token', 'auth'].includes(key)) throw new Error(`${label}.${key} is not supported`);
    if (typeof raw.url !== 'string' || !raw.url.trim()) throw new Error(`${label}.url is required`);
    let url: URL;
    try { url = new URL(raw.url); } catch { throw new Error(`${label}.url must be an absolute URL`); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) throw new Error(`${label}.url must be an HTTP(S) URL without credentials or a fragment`);
    if (raw.token !== undefined && (typeof raw.token !== 'string' || !raw.token || raw.token.length > 4096 || /[\r\n]/.test(raw.token))) throw new Error(`${label}.token must be a non-empty single-line client token of at most 4096 characters`);
    if (raw.auth !== undefined && !['bearer', 'x-api-key'].includes(raw.auth)) throw new Error(`${label}.auth must be bearer or x-api-key`);
  }
}

export function resolveClientApis(config: Record<string, any>): Record<string, ClientApiConfig> {
  validateClientApis(config);
  const value = isRecord(config.apis) ? config.apis : {};
  return Object.fromEntries(Object.entries(value).map(([id, raw]) => {
    const item = raw as Record<string, any>;
    return [id, { id, url: new URL(String(item.url)).href, ...(item.token ? { token: String(item.token) } : {}), auth: item.auth === 'x-api-key' ? 'x-api-key' : 'bearer' } satisfies ClientApiConfig];
  }));
}
