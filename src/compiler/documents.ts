import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseYaml, YamlError } from '../lib/yaml.ts';
import { MarkdownError } from '../lib/markdown.ts';
import { calculateContentMetrics, DEFAULT_CONTENT_METRICS_OPTIONS } from '../lib/content-metrics.ts';
import { parseIsoTimestamp } from '../lib/content-dates.ts';
import { isRecord } from '../config/merge.ts';
import { normalizePath } from '../config/paths.ts';
import type { Document } from './types.ts';

const MAX_SOURCE_PARSE_CACHE = 64;

export type ParsedDocumentSource = {
  data: Record<string, any>;
  body: string;
  excerpt: string;
  bodyLine: number;
};

export type DocumentSourceCache = Map<string, ParsedDocumentSource>;

function shortHash(value: string | Uint8Array): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 20);
}

function localizedValue(value: unknown, locale: string, fallback: string): string {
  if (value && typeof value === 'object') {
    const map = value as Record<string, unknown>;
    return String(map[locale] ?? map.en ?? Object.values(map).find(entry => entry !== undefined && entry !== null) ?? fallback);
  }
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

export function splitMoreMarker(body: string): { markdown: string; excerpt: string } {
  const marker = /(?:^|\n)\s*(?:<more>|<!--\s*more\s*-->)\s*(?=\n|$)/i;
  const match = marker.exec(body.replaceAll('\r', ''));
  if (!match || match.index < 0) return { markdown: body, excerpt: body.trim() };
  const before = body.slice(0, match.index + (match[0].startsWith('\n') ? 1 : 0));
  return { markdown: body.replace(match[0], '\n'), excerpt: before.trim() };
}

export function parseFrontmatter(source: string, file: string): ParsedDocumentSource {
  const lines = source.replaceAll('\r', '').split('\n');
  if (lines[0] !== '---') {
    const split = splitMoreMarker(source);
    return { data: {}, body: split.markdown, excerpt: split.excerpt, bodyLine: 1 };
  }
  let closing = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index] === '---' || lines[index] === '...') {
      closing = index;
      break;
    }
  }
  if (closing < 0) throw new MarkdownError('unclosed YAML frontmatter; add a closing --- line', { file, line: 1, column: 1 });
  try {
    const split = splitMoreMarker(lines.slice(closing + 1).join('\n'));
    const data = parseYaml(lines.slice(1, closing).join('\n'));
    return { data: isRecord(data) ? data : {}, body: split.markdown, excerpt: split.excerpt, bodyLine: closing + 2 };
  } catch (error) {
    if (error instanceof YamlError) throw new MarkdownError(`invalid YAML frontmatter: ${error.message}`, { file, line: error.line + 1, column: error.column });
    throw error;
  }
}

export function documentIdentity(root: string, file: string): { collection: string; id: string; locale: string } {
  const content = path.join(root, 'content');
  const relative = normalizePath(path.relative(content, file));
  const parts = relative.split('/');
  const collection = parts.shift() || 'pages';
  const filename = parts.pop() || '';
  const extension = path.extname(filename);
  const stem = filename.slice(0, -extension.length);
  const localeMatch = stem.match(/^(?:index\.)?([A-Za-z]{2,}(?:-[A-Za-z0-9]+)?)$/);
  const locale = localeMatch?.[1] || 'en';
  const idParts = [...parts];
  if (!localeMatch) idParts.push(stem);
  let id = idParts.join('/') || 'home';
  if (id === 'index') id = 'home';
  return { collection, id, locale };
}

export function defaultComponent(config: Record<string, any>, collection: string, id = ''): string {
  const settings = config.content?.collections?.[collection];
  const configured = settings && typeof settings === 'object' && !Array.isArray(settings) ? settings.component : undefined;
  if (configured) return String(configured);
  if (collection === 'posts' || collection === 'updates' || ['post', 'release'].includes(String(settings?.contentType || ''))) return 'post';
  return 'page';
}

export function contentMetricsOptions(themeConfig: Record<string, any>): { wordsPerMinute: number; cjkCharactersPerMinute: number } {
  const setting = isRecord(themeConfig.components?.postMeta) ? themeConfig.components.postMeta : {};
  const wordsPerMinute = Number(setting.wordsPerMinute);
  const cjkCharactersPerMinute = Number(setting.cjkCharactersPerMinute);
  return {
    wordsPerMinute: Number.isFinite(wordsPerMinute) && wordsPerMinute > 0 ? wordsPerMinute : DEFAULT_CONTENT_METRICS_OPTIONS.wordsPerMinute,
    cjkCharactersPerMinute: Number.isFinite(cjkCharactersPerMinute) && cjkCharactersPerMinute > 0 ? cjkCharactersPerMinute : DEFAULT_CONTENT_METRICS_OPTIONS.cjkCharactersPerMinute
  };
}

export async function loadDocument(
  root: string,
  file: string,
  config: Record<string, any>,
  sourceCache?: DocumentSourceCache,
  themeConfig: Record<string, any> = {}
): Promise<Document> {
  const [source, stat] = await Promise.all([fs.readFile(file, 'utf8'), fs.stat(file)]);
  const identity = documentIdentity(root, file);
  const hash = shortHash(source);
  let frontmatter = sourceCache?.get(hash);
  if (!frontmatter) {
    frontmatter = parseFrontmatter(source, file);
    if (sourceCache) {
      if (sourceCache.size >= MAX_SOURCE_PARSE_CACHE) sourceCache.delete(sourceCache.keys().next().value as string);
      sourceCache.set(hash, frontmatter);
    }
  }
  const data = frontmatter.data;
  const date = data.date === undefined || data.date === null || data.date === '' ? undefined : String(data.date).trim();
  const updated = data.updated === undefined || data.updated === null || data.updated === '' ? undefined : String(data.updated).trim();
  const metrics = calculateContentMetrics(frontmatter.body, contentMetricsOptions(themeConfig));
  return {
    ...identity,
    contentKey: `${identity.collection}:${identity.id}`,
    source: file,
    title: String(data.title || identity.id),
    description: String(data.description || ''),
    component: String(data.component || defaultComponent(config, identity.collection, identity.id)),
    date,
    updated,
    author: data.author ? String(data.author) : localizedValue(config.author, identity.locale, 'Site Owner'),
    cover: data.cover ? String(data.cover) : undefined,
    data,
    markdown: frontmatter.body,
    excerpt: frontmatter.excerpt,
    bodyLine: frontmatter.bodyLine,
    nodes: [],
    directives: [],
    metrics,
    dependencyKeys: [],
    componentNames: [],
    hash,
    stat: { mtimeMs: stat.mtimeMs, size: stat.size }
  };
}

function schemaType(value: unknown): string {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function isPostCollection(config: Record<string, any>, collection: string): boolean {
  const settings = config.content?.collections?.[collection];
  return collection === 'posts' || collection === 'updates' || Boolean(settings && typeof settings === 'object' && !Array.isArray(settings) && ['post', 'release'].includes(String(settings.contentType)));
}

export function documentSchemaDiagnostics(config: Record<string, any>, doc: Document): string[] {
  const diagnostics: string[] = [];
  if (Object.prototype.hasOwnProperty.call(doc.data, 'pattern')) diagnostics.push(`${doc.source}:1:1: frontmatter field "pattern" was removed; choose a Component with "component"`);
  if (Object.prototype.hasOwnProperty.call(doc.data, 'update')) diagnostics.push(`${doc.source}:1:1: frontmatter field "update" was removed; use "updated" for the last substantive edit`);
  const configuredKind = doc.data.kind;
  const expectedKind = String(config.content?.collections?.[doc.collection]?.contentType || (doc.collection === 'updates' ? 'release' : doc.collection === 'posts' ? 'post' : 'page'));
  if (configuredKind !== undefined && String(configuredKind) !== expectedKind) diagnostics.push(`${doc.source}:1:1: frontmatter field "kind" must be "${expectedKind}" for collection "${doc.collection}"`);
  if (expectedKind === 'release' && Object.prototype.hasOwnProperty.call(doc.data, 'category')) diagnostics.push(`${doc.source}:1:1: release documents do not use category; use kind: release and the updates collection`);
  const schema = config.content?.collections?.[doc.collection]?.schema;
  if (schema && typeof schema === 'object' && !Array.isArray(schema)) {
    for (const [key, rawRule] of Object.entries(schema as Record<string, any>)) {
      const rule = typeof rawRule === 'string' ? { type: rawRule, required: false } : rawRule || {};
      const value = doc.data[key];
      if (rule.required && (value === undefined || value === null || value === '')) {
        diagnostics.push(`${doc.source}:1:1: frontmatter field "${key}" is required by collection "${doc.collection}"`);
        continue;
      }
      if (value !== undefined && rule.type && schemaType(value) !== rule.type) {
        diagnostics.push(`${doc.source}:1:1: frontmatter field "${key}" must be ${rule.type}; received ${schemaType(value)}`);
      }
    }
  }
  if (isPostCollection(config, doc.collection) && doc.data.date !== undefined && parseIsoTimestamp(doc.date) === undefined) {
    diagnostics.push(`${doc.source}:1:1: frontmatter field "date" must be a valid ISO publication date (YYYY-MM-DD)`);
  }
  const hasUpdated = Object.prototype.hasOwnProperty.call(doc.data, 'updated');
  if (isPostCollection(config, doc.collection) && hasUpdated) {
    const updatedTime = parseIsoTimestamp(doc.updated);
    if (updatedTime === undefined) diagnostics.push(`${doc.source}:1:1: frontmatter field "updated" must be a valid ISO date or datetime`);
    const dateTime = parseIsoTimestamp(doc.date);
    if (updatedTime !== undefined && dateTime !== undefined && updatedTime < dateTime) diagnostics.push(`${doc.source}:1:1: frontmatter field "updated" must not be earlier than "date"`);
  }
  return diagnostics;
}
