import { escapeHtml, safeUrl } from './safe-html.ts';

export type SiteLinkInput = {
  key?: unknown;
  label?: unknown;
  labels?: unknown;
  href?: unknown;
  target?: unknown;
};

export type ResolvedSiteLink = {
  key?: string;
  label: string;
  href: string;
  target: '_self' | '_blank';
  external: boolean;
  current: boolean;
};

const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
const DANGEROUS_PATH = /(?:^|\/)(?:\.\.?)(?:\/|$)/;
const ALLOWED_KEYS = new Set(['key', 'label', 'labels', 'href', 'target']);

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function validateSiteLink(value: unknown, label = 'site link'): asserts value is SiteLinkInput {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  for (const key of Object.keys(value)) if (!ALLOWED_KEYS.has(key)) throw new Error(`${label}.${key} is not allowed`);
  if (value.href === undefined || typeof value.href !== 'string' || !value.href.trim()) throw new Error(`${label}.href is required`);
  if (value.key !== undefined && (typeof value.key !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value.key))) throw new Error(`${label}.key must be a safe identifier`);
  if (value.label !== undefined && (typeof value.label !== 'string' || value.label.length > 160)) throw new Error(`${label}.label must be a string of at most 160 characters`);
  if (value.labels !== undefined) {
    if (!isRecord(value.labels) || Object.entries(value.labels).some(([locale, text]) => !/^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/.test(locale) || typeof text !== 'string' || text.length > 160)) throw new Error(`${label}.labels must be a locale-to-string map with short string values`);
  }
  if (value.target !== undefined && value.target !== '_self' && value.target !== '_blank') throw new Error(`${label}.target must be _self or _blank`);
  const href = value.href.trim();
  if (href.length > 2048 || CONTROL.test(href) || href.includes('\\') || href.startsWith('//')) throw new Error(`${label}.href contains an unsafe URL`);
  if (DANGEROUS_PATH.test(href) || /%2e|%2f|%5c/i.test(href)) throw new Error(`${label}.href contains path traversal`);
  if (href.startsWith('#')) return;
  let decodedHref: string;
  try { decodedHref = decodeURIComponent(href); } catch { throw new Error(`${label}.href contains an invalid URL escape`); }
  if (CONTROL.test(decodedHref) || decodedHref.includes('\\') || DANGEROUS_PATH.test(decodedHref) || /%[0-9a-f]{2}/i.test(decodedHref)) throw new Error(`${label}.href contains an unsafe URL`);
  if (/^https?:\/\//i.test(href)) {
    try {
      const parsed = new URL(href);
      if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname) return;
    } catch { /* fall through to the common allow-list error */ }
    throw new Error(`${label}.href must be a valid http(s) URL`);
  }
  if (href.startsWith('/')) return;
  throw new Error(`${label}.href must be an internal path, fragment, or http(s) URL`);
}

function localeCandidates(locale: string, fallbackLocale: string): string[] {
  // Link labels have a deliberately small, documented precedence.  The
  // translation callback below still supplies the normal theme message
  // family/fallback chain for keyed links.
  const values = [locale, fallbackLocale, 'en'];
  return [...new Set(values.filter(Boolean))];
}

export function resolveLocalizedLinkLabel(link: SiteLinkInput, locale: string, fallbackLocale: string, translate: (key: string, fallback: string) => string): string {
  const labels = isRecord(link.labels) ? link.labels : {};
  for (const candidate of localeCandidates(locale, fallbackLocale)) {
    if (typeof labels[candidate] === 'string' && labels[candidate]) return labels[candidate];
  }
  if (typeof link.label === 'string' && link.label) return link.label;
  if (typeof link.key === 'string' && link.key) return translate(link.key, link.key);
  return String(link.href || 'Link');
}

function localizedHref(href: string, locale: string): string {
  return href.replaceAll(':locale', encodeURIComponent(locale));
}

export function resolveSiteLink(link: SiteLinkInput, options: { locale: string; fallbackLocale: string; currentPath?: string; namespace: 'navigation' | 'footer'; translate: (key: string, fallback: string) => string }): ResolvedSiteLink {
  validateSiteLink(link, `${options.namespace} link`);
  const href = localizedHref(String(link.href).trim(), options.locale);
  const external = /^https?:\/\//i.test(href);
  const currentPath = options.currentPath || '';
  const current = !external && (href.startsWith('#') ? false : href.split('#')[0].replace(/\/$/, '') === currentPath.replace(/\/$/, ''));
  const key = typeof link.key === 'string' ? link.key : undefined;
  const labelKey = key ? `${options.namespace}.${key}` : '';
  const label = resolveLocalizedLinkLabel(link, options.locale, options.fallbackLocale, (keyName, fallback) => options.translate(labelKey || keyName, fallback));
  return { key, label, href: safeUrl(href) === '#' ? '#' : href, target: link.target === '_blank' ? '_blank' : '_self', external, current };
}

export function resolveSiteLinks(value: unknown, options: { locale: string; fallbackLocale: string; currentPath?: string; namespace: 'navigation' | 'footer'; translate: (key: string, fallback: string) => string }): ResolvedSiteLink[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 64).map(link => resolveSiteLink(link, options));
}

export function renderSiteLink(link: { key?: string; label: string; href: string; target?: '_self' | '_blank'; current?: boolean }, className: string, escape = escapeHtml): string {
  const classes = className ? ` class="${escape(className)}"` : '';
  const current = link.current ? ' aria-current="page"' : '';
  const target = link.target === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : '';
  const key = link.key ? ` data-link-key="${escape(link.key)}"` : '';
  return `<a${classes}${key} href="${escape(link.href)}"${target}${current}>${escape(link.label)}</a>`;
}
