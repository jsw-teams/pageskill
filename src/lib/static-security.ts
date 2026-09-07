/**
 * URL path validation shared by static Fetch handlers.
 *
 * This module deliberately has no Node or platform imports.  Dynamic routes
 * have their own parameter contract; these checks are for paths that may be
 * translated into files under a public static root.
 */

export type StaticPathOptions = {
  /** A configured public asset directory, for example `static` or `dist`. */
  staticDirectory?: string;
};

export type StaticPathResult =
  | { ok: true; pathname: string }
  | { ok: false; reason: 'invalid' | 'private' };

const PRIVATE_ROOT_DIRECTORIES = new Set(['server', '_pagekiln', '.pagekiln']);
const PRIVATE_ROOT_FILES = new Set([
  '.assetsignore',
  '_worker.js',
  'cloudflare-worker.mjs',
  'vps-server.mjs',
  'wrangler.toml'
]);

// A second decode by a hosting adapter must not turn an apparently ordinary
// filename into a separator, a dot segment, or a private name.
const ENCODED_SEPARATOR = /%2f|%5c/i;
const RESIDUAL_ENCODED_BYTE = /%[0-9a-f]{2}/i;
const MALFORMED_PERCENT = /%(?![0-9a-f]{2})/i;

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) || 0;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

function startsWithSegments(value: string[], prefix: string[]): boolean {
  if (!prefix.length || prefix.length > value.length) return false;
  for (let index = 0; index < prefix.length; index += 1) {
    if (value[index].toLocaleLowerCase() !== prefix[index]) return false;
  }
  return true;
}

function aliasSegments(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  const normalized = value.replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
  if (!normalized || normalized === '.') return [];
  const segments = normalized.split('/').filter(Boolean);
  // A deployment alias containing traversal or an encoded separator should
  // never make a request appear to be rooted at a different directory.
  if (segments.some(segment => segment === '.' || segment === '..' || segment.includes(':') || hasControlCharacter(segment))) return [];
  return segments.map(segment => segment.toLocaleLowerCase());
}

function stripPublicAliases(segments: string[], staticDirectory?: string): string[] {
  const aliases = [['dist'], aliasSegments(staticDirectory)].filter(alias => alias.length).sort((left, right) => right.length - left.length);
  let remaining = segments;
  let changed = true;
  // Strip aliases repeatedly so `/dist/static/...` and `/static/dist/...`
  // cannot reach a private root by changing the order of the prefixes.
  while (changed && remaining.length) {
    changed = false;
    for (const alias of aliases) {
      if (!startsWithSegments(remaining, alias)) continue;
      remaining = remaining.slice(alias.length);
      changed = true;
      break;
    }
  }
  return remaining;
}

function isPrivateArtifact(segment: string): boolean {
  const lower = segment.toLocaleLowerCase();
  return PRIVATE_ROOT_DIRECTORIES.has(lower) || PRIVATE_ROOT_FILES.has(lower);
}

function isPrivatePath(segments: string[], staticDirectory?: string): boolean {
  const publicRoot = stripPublicAliases(segments, staticDirectory);
  if (!publicRoot.length) return false;

  // The generated deployment/runtime directories and files are private only
  // at the public root.  A content route such as `/en/server/` remains valid.
  if (isPrivateArtifact(publicRoot[0])) return true;

  // `/.well-known/` is a standard public directory.  Its descendants still
  // must use normal names and cannot contain internal artifacts.
  const wellKnownRoot = publicRoot[0].toLocaleLowerCase() === '.well-known';
  const firstDescendant = wellKnownRoot ? 1 : 0;
  for (let index = firstDescendant; index < publicRoot.length; index += 1) {
    const segment = publicRoot[index];
    if (segment.startsWith('.') || wellKnownRoot && isPrivateArtifact(segment)) return true;
  }
  return false;
}

function canonicalPath(segments: string[], trailingSlash: boolean): string {
  return `/${segments.join('/')}${trailingSlash && segments.length ? '/' : ''}`;
}

function decodePathnameInternal(pathname: string): { pathname: string; segments: string[] } | null {
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) return null;
  if (pathname.includes('\\') || pathname.includes('?') || pathname.includes('#')) return null;
  if (MALFORMED_PERCENT.test(pathname) || ENCODED_SEPARATOR.test(pathname) || hasControlCharacter(pathname)) return null;

  const rawSegments = pathname.split('/').filter(Boolean);
  if (rawSegments.some(segment => segment === '.' || segment === '..')) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (!decoded.startsWith('/') || decoded.includes('\\') || hasControlCharacter(decoded)) return null;
  if (ENCODED_SEPARATOR.test(decoded) || RESIDUAL_ENCODED_BYTE.test(decoded)) return null;

  const segments = decoded.split('/').filter(Boolean);
  if (segments.some(segment => segment === '.' || segment === '..' || segment.includes(':') || segment.endsWith('.') || segment.endsWith(' '))) return null;
  // A separator produced by an unusual decoder or a second decode is never a
  // valid single static segment.  Reconstruct a canonical slash path so alias
  // checks do not depend on repeated slashes in the incoming URL.
  const trailingSlash = decoded.length > 1 && decoded.endsWith('/');
  const canonical = `/${segments.join('/')}${trailingSlash ? '/' : ''}`;
  return { pathname: canonical, segments };
}

/** Decode and structurally validate a pathname without applying public-root rules. */
export function decodePathname(pathname: string): string | null {
  return decodePathnameInternal(pathname)?.pathname || null;
}

/**
 * Classify a static pathname and return its canonical decoded form when it is
 * safe and public.  The root `/dist/` and configured static directory are
 * aliases for the same public root and are removed before private checks.
 */
export function classifyPublicPath(pathname: string, options: StaticPathOptions = {}): StaticPathResult {
  const decoded = decodePathnameInternal(pathname);
  if (!decoded) return { ok: false, reason: 'invalid' };
  if (isPrivatePath(decoded.segments, options.staticDirectory)) return { ok: false, reason: 'private' };
  // `/dist/...` is the legacy root URL and a configured public directory is
  // an adapter alias. Both must resolve to the same public asset key so a
  // handler can serve the old URL without exposing the private build root.
  const publicSegments = stripPublicAliases(decoded.segments, options.staticDirectory);
  const trailingSlash = decoded.pathname.length > 1 && decoded.pathname.endsWith('/');
  return { ok: true, pathname: `/${publicSegments.join('/')}${trailingSlash && publicSegments.length ? '/' : ''}` };
}

/** Decode and validate a public static pathname. */
export function decodePublicPath(pathname: string, options: StaticPathOptions = {}): string | null {
  const decoded = decodePathnameInternal(pathname);
  if (!decoded || isPrivatePath(decoded.segments, options.staticDirectory)) return null;
  const publicSegments = stripPublicAliases(decoded.segments, options.staticDirectory);
  return canonicalPath(publicSegments, decoded.pathname.endsWith('/'));
}

/** Check whether a static pathname is safe to expose from the public root. */
export function isPublicPath(pathname: string, options: StaticPathOptions = {}): boolean {
  return classifyPublicPath(pathname, options).ok;
}

function rawPathFromUrl(value: string): string | null {
  const absolute = /^[a-z][a-z\d+.-]*:\/\/[^/?#]*/i.exec(value);
  const pathStart = absolute ? absolute[0].length : 0;
  const candidate = value.slice(pathStart);
  if (absolute && !candidate) return '/';
  const end = candidate.search(/[?#]/);
  const pathname = end < 0 ? candidate : candidate.slice(0, end);
  return pathname || '/';
}

/** Extract, decode, and validate the pathname from a request URL. */
export function publicPathFromUrl(value: string | URL, options: StaticPathOptions = {}): string | null {
  if (typeof value === 'string') {
    const pathname = rawPathFromUrl(value);
    return pathname ? decodePublicPath(pathname, options) : null;
  }
  try {
    return decodePublicPath(value.pathname, options);
  } catch {
    return null;
  }
}

/** Return the validation result for a request URL, preserving invalid/private distinction. */
export function classifyPublicUrl(value: string | URL, options: StaticPathOptions = {}): StaticPathResult {
  if (typeof value === 'string') {
    const pathname = rawPathFromUrl(value);
    return pathname ? classifyPublicPath(pathname, options) : { ok: false, reason: 'invalid' };
  }
  try {
    return classifyPublicPath(value.pathname, options);
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}
