import path from 'node:path';

export function normalizePath(value: string): string {
  return value.replaceAll('\\', '/');
}

export type RelativePathOptions = { allowEmpty?: boolean; rejectDoubleDot?: boolean };

/**
 * Validate an untrusted relative path before resolving it.  Backslashes are
 * separators on Windows even when a manifest uses POSIX-style paths.
 */
export function safeRelativePath(value: unknown, label: string, options: RelativePathOptions = {}): string {
  if (typeof value !== 'string') throw new Error(`${label} must be a relative path`);
  const raw = value;
  if (!raw) {
    if (options.allowEmpty) return '';
    throw new Error(`${label} must be a non-empty relative path`);
  }
  if (/[\u0000-\u001f\u007f-\u009f]/.test(raw)) throw new Error(`${label} contains control characters`);
  const normalized = normalizePath(raw);
  if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) throw new Error(`${label} must be a relative path`);
  if (options.rejectDoubleDot && raw.includes('..')) throw new Error(`${label} must not contain ".."`);
  if (normalized.split('/').some(part => part === '..')) throw new Error(`${label} must not escape its root`);
  if (normalized.split('/').some(part => part.includes(':'))) throw new Error(`${label} contains an unsafe path component`);
  if (normalized.split('/').some(part => part !== '.' && /[. ]$/.test(part))) throw new Error(`${label} contains an unsafe path component`);
  const canonical = normalized.split('/').filter(part => part && part !== '.').join('/');
  if (!canonical && !options.allowEmpty) throw new Error(`${label} must be a non-empty relative path`);
  return canonical;
}

export function pathIsWithin(root: string, target: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

export function containedPath(root: string, value: unknown, label: string): string {
  const relative = safeRelativePath(value, label);
  const target = path.resolve(root, relative);
  if (!pathIsWithin(root, target) || target === path.resolve(root)) throw new Error(`${label} escapes its root`);
  return target;
}

export function projectRelativePath(root: string, target: string): string {
  return normalizePath(path.relative(path.resolve(root), path.resolve(target)));
}
