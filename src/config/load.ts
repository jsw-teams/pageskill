import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseYaml } from '../lib/yaml.ts';
import { applyConfigDefaults } from './defaults.ts';
import { isRecord, mergeConfigLayers } from './merge.ts';
import { validateConfig, validateConfigLayer, validateThemeInstanceLayer } from './validate.ts';
import { normalizePath, pathIsWithin, safeRelativePath } from './paths.ts';

const MAX_EXTENDS_DEPTH = 16;

function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 20);
}

function displayPath(root: string, file: string): string {
  return normalizePath(path.relative(root, file)) || path.basename(file);
}

function fileKey(file: string): string {
  const resolved = path.resolve(file);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

async function realPathInside(root: string, file: string, label: string, mustExist = true): Promise<string> {
  const absoluteRoot = await fs.realpath(root);
  const lexical = path.resolve(root, file);
  if (!pathIsWithin(absoluteRoot, lexical) || lexical === path.resolve(root)) throw new Error(`${label} must stay inside the project root`);
  if (!mustExist) return lexical;
  let real: string;
  try { real = await fs.realpath(lexical); } catch (error: any) {
    if (error?.code === 'ENOENT') throw new Error(`${label} does not exist: ${displayPath(root, lexical)}`);
    throw error;
  }
  if (!pathIsWithin(absoluteRoot, real) || real === absoluteRoot) throw new Error(`${label} escapes the project root through a symbolic link`);
  return real;
}

function parseObject(source: string, file: string, enforceSiteSurface = true): Record<string, any> {
  let value: unknown;
  try { value = parseYaml(source); } catch (error: any) {
    throw new Error(`${file}: invalid YAML: ${error?.message || String(error)}`);
  }
  if (!isRecord(value)) throw new Error(`${file}: configuration root must be a YAML object`);
  if (enforceSiteSurface) {
    validateConfigLayer(value, file);
  }
  return value;
}

type LoadState = { root: string; ordered: string[]; sources: Map<string, string>; seen: Set<string>; active: string[] };

async function loadLayer(file: string, state: LoadState, depth: number, referenceLabel = 'config extends path'): Promise<Record<string, any>> {
  if (depth > MAX_EXTENDS_DEPTH) throw new Error(`${displayPath(state.root, file)}: extends exceeds the maximum depth of ${MAX_EXTENDS_DEPTH}`);
  const canonical = await realPathInside(state.root, file, referenceLabel);
  const key = fileKey(canonical);
  const cycleIndex = state.active.findIndex(item => item === key);
  if (cycleIndex >= 0) {
    const chain = [...state.active.slice(cycleIndex), key].map(item => displayPath(state.root, item)).join(' -> ');
    throw new Error(`${displayPath(state.root, file)}: circular extends reference: ${chain}`);
  }
  if (state.seen.has(key)) return {};
  const source = await fs.readFile(canonical, 'utf8');
  const label = displayPath(state.root, canonical);
  const layer = parseObject(source, label);
  state.active.push(key);
  const parents: Record<string, any>[] = [];
  const extendsValue = layer.extends;
  const entries = extendsValue === undefined || extendsValue === null ? [] : Array.isArray(extendsValue) ? extendsValue : [extendsValue];
  for (let index = 0; index < entries.length; index += 1) {
    const value = entries[index];
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${label}: extends[${index}] must be a non-empty relative path`);
    let relative: string;
    try { relative = safeRelativePath(value, `${label}: extends[${index}]`, { rejectDoubleDot: true }); }
    catch (error: any) { throw new Error(error.message); }
    if (!relative) throw new Error(`${label}: extends[${index}] must be a non-empty relative path`);
    const child = path.resolve(path.dirname(canonical), relative);
    if (!pathIsWithin(state.root, child)) throw new Error(`${label}: extends[${index}] escapes the project root`);
    parents.push(await loadLayer(child, state, depth + 1, `${label}: extends[${index}]`));
  }
  state.active.pop();
  state.seen.add(key);
  state.ordered.push(canonical);
  state.sources.set(key, source);
  const { extends: _extends, ...own } = layer;
  return mergeConfigLayers([...parents, own]);
}

export type LoadedConfig = { config: Record<string, any>; configFiles: string[]; configHash: string };

export async function loadConfig(root: string): Promise<LoadedConfig> {
  const projectRoot = await fs.realpath(root);
  const rootFile = await realPathInside(projectRoot, 'config.yml', 'config.yml');
  const state: LoadState = { root: projectRoot, ordered: [], sources: new Map(), seen: new Set(), active: [] };
  const merged = await loadLayer(rootFile, state, 0, 'config.yml');
  const config = applyConfigDefaults(merged);
  validateConfig(config, displayPath(projectRoot, rootFile));
  const hashInput = state.ordered.map(file => `${displayPath(projectRoot, file)}\n${state.sources.get(fileKey(file)) || ''}`).join('\n---\n') + `\n---final---\n${JSON.stringify(config)}`;
  return { config, configFiles: state.ordered, configHash: hash(hashInput) };
}

export type LoadedThemeConfig = { config: Record<string, any>; file?: string; source: string };

/** Load only the site-owned instance file explicitly selected by theme.config.
 * Theme packages keep implementation and code-owned defaults in TypeScript;
 * an omitted instance file deliberately means an empty override object. */
export async function loadThemeConfig(root: string, config: Record<string, any>): Promise<LoadedThemeConfig> {
  const explicit = config.theme && typeof config.theme === 'object' ? config.theme.config : undefined;
  if (explicit === undefined || explicit === null || explicit === '') return { config: {}, source: '' };
  if (typeof explicit !== 'string') throw new Error('config.yml: theme.config must be a project-relative YAML file');
  const relative = safeRelativePath(explicit, 'config.yml: theme.config', { rejectDoubleDot: true });
  const file = await realPathInside(root, relative, 'config.yml: theme.config');
  const source = await fs.readFile(file, 'utf8');
  const label = displayPath(root, file);
  const parsed = parseObject(source, label, false);
  validateThemeInstanceLayer(parsed, label);
  return { config: parsed, file, source };
}
