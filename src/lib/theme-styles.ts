export const INLINE_STYLE_MAX_BYTES = 2048;
export const INLINE_STYLE_BUDGET_BYTES = 4096;

export type ThemeStyleTag =
  | { kind: 'inline'; css: string; bytes: number }
  | { kind: 'external'; path: string };

export type ThemeStylePlanOptions = {
  inlineStyles?: boolean;
  maxFileBytes?: number;
  maxTotalBytes?: number;
  alwaysExternal?: Iterable<string>;
};

function normalizeStylePath(value: string): string {
  const parts = value.replaceAll('\\', '/').split('/');
  return parts.filter(part => part !== '.' && part !== '').join('/');
}

function isSafeRelativeCssPath(value: string): boolean {
  const normalized = value.replaceAll('\\', '/');
  if (!normalized || normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) return false;
  if (normalized.split('/').some(part => part === '..')) return false;
  if (/[\u0000-\u001f\u007f]/.test(normalized)) return false;
  return normalized.toLowerCase().endsWith('.css');
}

function utf8Bytes(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function withoutCssComments(source: string): string | null {
  let result = '';
  let cursor = 0;
  while (cursor < source.length) {
    const start = source.indexOf('/*', cursor);
    if (start < 0) {
      result += source.slice(cursor);
      break;
    }
    result += source.slice(cursor, start);
    const end = source.indexOf('*/', start + 2);
    if (end < 0) return null;
    result += ' ';
    cursor = end + 2;
  }
  return result;
}

/**
 * Returns true when embedding the source could make relative references resolve
 * against the page, or when the source could terminate the HTML style element.
 */
export function hasUnsafeInlineCss(source: string): boolean {
  if (source.includes('\\') || source.includes('<') || source.includes('\uFEFF')) return true;
  const scan = withoutCssComments(source);
  if (scan === null) return true;
  const hasHazard = (candidate: string) => /u\s*r\s*l\s*\(/i.test(candidate)
    || /(?:-webkit-)?image\s*-?\s*set\s*\(/i.test(candidate)
    || /image\s*\(/i.test(candidate)
    || /src\s*\(/i.test(candidate)
    || /@\s*(?:import|charset|namespace)\b/i.test(candidate);
  return hasHazard(source) || hasHazard(scan);
}

/**
 * Plan stylesheet tags without reading files or rewriting CSS source. The
 * caller supplies the already-read theme CSS map so page rendering stays
 * synchronous and does not perform per-page filesystem I/O.
 */
export function planThemeStyles(
  styles: readonly string[],
  sources: ReadonlyMap<string, string>,
  options: ThemeStylePlanOptions = {}
): ThemeStyleTag[] {
  const inlineStyles = options.inlineStyles !== false;
  const maxFileBytes = options.maxFileBytes ?? INLINE_STYLE_MAX_BYTES;
  const maxTotalBytes = options.maxTotalBytes ?? INLINE_STYLE_BUDGET_BYTES;
  const alwaysExternal = new Set([...options.alwaysExternal || []].map(value => normalizeStylePath(String(value))));
  const seen = new Set<string>();
  const tags: ThemeStyleTag[] = [];
  let totalBytes = 0;

  for (const rawStyle of styles) {
    const rawPath = String(rawStyle);
    const path = normalizeStylePath(rawPath);
    if (!path || seen.has(path)) continue;
    seen.add(path);

    const source = sources.get(path);
    const bytes = source === undefined ? 0 : utf8Bytes(source);
    const previous = tags[tags.length - 1];
    const separatorBytes = previous?.kind === 'inline' ? 1 : 0;
    const eligible = inlineStyles
      && !alwaysExternal.has(path)
      && source !== undefined
      && isSafeRelativeCssPath(rawPath)
      && bytes <= maxFileBytes
      && totalBytes + separatorBytes + bytes <= maxTotalBytes
      && !hasUnsafeInlineCss(source);

    if (!eligible) {
      tags.push({ kind: 'external', path: rawPath });
      continue;
    }

    totalBytes += separatorBytes + bytes;
    if (previous?.kind === 'inline') {
      previous.css += `\n${source}`;
      previous.bytes += separatorBytes + bytes;
    } else {
      tags.push({ kind: 'inline', css: source, bytes });
    }
  }
  return tags;
}
