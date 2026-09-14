import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import { escapeHtml } from './safe-html.ts';

export type SourcePosition = { file: string; line: number; column: number };
type RenderedNode = { html: string; position: SourcePosition };
export type DirectiveNode = { kind: 'directive'; name: string; attrs: Record<string, string>; children: MarkdownNode[]; raw: string; position: SourcePosition };
export type MarkdownNode =
  | ({ kind: 'heading'; depth: number; text: string; id: string } & RenderedNode)
  | ({ kind: 'paragraph'; lines: string[] } & RenderedNode)
  | ({ kind: 'list'; ordered: boolean } & RenderedNode)
  | ({ kind: 'blockquote' } & RenderedNode)
  | ({ kind: 'code'; language: string; value: string } & RenderedNode)
  | ({ kind: 'table' } & RenderedNode)
  | ({ kind: 'hr' } & RenderedNode)
  | DirectiveNode;

export class MarkdownError extends Error {
  readonly position: SourcePosition;

  constructor(message: string, position: SourcePosition) {
    super(`${position.file}:${position.line}:${position.column}: ${message}`);
    this.name = 'MarkdownError';
    this.position = position;
  }
}

function position(file: string, line: number, column = 1): SourcePosition { return { file, line, column }; }

function slug(value: string) {
  return value.toLocaleLowerCase().normalize('NFKC').replace(/[^\p{Letter}\p{Number}\s-]/gu, '').trim().replace(/[\s_-]+/g, '-') || 'section';
}

function sanitizeUrl(value: string): string {
  const input = String(value || '').trim();
  if (!input) return '#';
  if (/^#[A-Za-z][A-Za-z0-9._:-]{0,160}$/.test(input)) return input;
  if (/[\u0000-\u001f\u007f-\u009f\\]/.test(input)) return '#';
  try {
    const url = new URL(input, 'https://pageskill.invalid');
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? input : '#';
  } catch {
    return '#';
  }
}

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
  breaks: false
}).use(taskLists, { enabled: false, label: true, labelAfter: true });

markdown.validateLink = () => true;
markdown.normalizeLink = sanitizeUrl;
markdown.normalizeLinkText = sanitizeUrl;

type MarkdownEnvironment = { headingCounts: Map<string, number>; tableHeaders?: string[]; tableColumn?: number };

markdown.renderer.rules.heading_open = (tokens, index, options, environment, renderer) => {
  const token = tokens[index];
  const inline = tokens[index + 1];
  const env = environment as MarkdownEnvironment;
  const base = slug(inline?.content || 'section');
  const count = env.headingCounts.get(base) || 0;
  env.headingCounts.set(base, count + 1);
  token.attrSet('id', count ? `${base}-${count + 1}` : base);
  return renderer.renderToken(tokens, index, options);
};

markdown.renderer.rules.table_open = (_tokens, _index, _options, environment) => {
  const env = environment as MarkdownEnvironment;
  env.tableHeaders = [];
  env.tableColumn = 0;
  return '<div class="table-wrap" tabindex="0"><table>';
};
markdown.renderer.rules.tr_open = (tokens, index, options, environment, renderer) => {
  const env = environment as MarkdownEnvironment;
  env.tableColumn = 0;
  return renderer.renderToken(tokens, index, options);
};
markdown.renderer.rules.th_open = (tokens, index, options, environment, renderer) => {
  const env = environment as MarkdownEnvironment;
  const inline = tokens[index + 1];
  if (inline?.type === 'inline' && env.tableHeaders) env.tableHeaders.push(inline.content || '');
  tokens[index].attrSet('scope', 'col');
  return renderer.renderToken(tokens, index, options);
};
markdown.renderer.rules.th_close = (tokens, index, options, environment, renderer) => {
  const env = environment as MarkdownEnvironment;
  env.tableColumn = (env.tableColumn || 0) + 1;
  return renderer.renderToken(tokens, index, options);
};
markdown.renderer.rules.td_open = (tokens, index, options, environment, renderer) => {
  const env = environment as MarkdownEnvironment;
  const column = env.tableColumn || 0;
  const label = env.tableHeaders?.[column];
  if (label) tokens[index].attrSet('data-label', escapeHtml(label));
  env.tableColumn = column + 1;
  return renderer.renderToken(tokens, index, options);
};
markdown.renderer.rules.table_close = () => '</table></div>';

const defaultImage = markdown.renderer.rules.image;
markdown.renderer.rules.image = (tokens, index, options, environment, renderer) => {
  tokens[index].attrSet('loading', 'lazy');
  tokens[index].attrSet('decoding', 'async');
  return defaultImage ? defaultImage(tokens, index, options, environment, renderer) : renderer.renderToken(tokens, index, options);
};

markdown.renderer.rules.fence = (tokens, index, options) => {
  const token = tokens[index];
  const rawLanguage = token.info?.trim().split(/\s+/)[0] || '';
  const language = /^[A-Za-z0-9_-]{1,32}$/.test(rawLanguage) ? rawLanguage : '';
  const languageLabel = language ? `<span class="code-language" data-code-language>${escapeHtml(language)}</span>` : '';
  const button = '<button type="button" class="code-copy" data-code-copy aria-label="Copy code">Copy</button>';
  const status = '<span class="code-copy-status sr-only" data-code-copy-status aria-live="polite"></span>';
  const className = language ? ` class="language-${escapeHtml(language)}"` : '';
  return `<div class="code-block" data-code-block><div class="code-block-toolbar">${languageLabel}${button}${status}</div><pre tabindex="0"><code${className}>${escapeHtml(token.content || '')}</code></pre></div>`;
};

function parseAttrs(source: string, file: string, line: number): Record<string, string> {
  const attrs: Record<string, string> = {};
  let index = 0;
  while (index < source.length) {
    while (/\s/.test(source[index] || '')) index += 1;
    if (index >= source.length) break;
    const key = source.slice(index).match(/^([\w-]+)=/);
    if (!key) throw new MarkdownError(`invalid Block attribute near "${source.slice(index)}"; use key="value"`, position(file, line, index + 1));
    index += key[0].length;
    const quote = source[index];
    if (quote === '"' || quote === "'") {
      const end = source.indexOf(quote, index + 1);
      if (end < 0) throw new MarkdownError(`unterminated value for attribute "${key[1]}"`, position(file, line, index + 1));
      attrs[key[1]] = source.slice(index + 1, end);
      index = end + 1;
    } else {
      const value = source.slice(index).match(/^[^\s]+/);
      if (!value) throw new MarkdownError(`missing value for attribute "${key[1]}"`, position(file, line, index + 1));
      attrs[key[1]] = value[0];
      index += value[0].length;
    }
  }
  return attrs;
}

function isDirectiveOpen(line: string) { return line.match(/^\s*:::([\w-]+)(?:\{(.*)\})?\s*$/); }
function isDirectiveClose(line: string) { return /^\s*:::\s*$/.test(line); }

function kindFor(type: string): MarkdownNode['kind'] {
  if (type.startsWith('heading_')) return 'heading';
  if (type.startsWith('paragraph_')) return 'paragraph';
  if (type.startsWith('bullet_list_') || type.startsWith('ordered_list_')) return 'list';
  if (type.startsWith('blockquote_')) return 'blockquote';
  if (type === 'fence' || type === 'code_block') return 'code';
  if (type.startsWith('table_')) return 'table';
  if (type === 'hr') return 'hr';
  return 'paragraph';
}

function markdownNodes(source: string, file: string, firstLine: number, environment: MarkdownEnvironment): MarkdownNode[] {
  if (!source.trim()) return [];
  const tokens = markdown.parse(source, {});
  const nodes: MarkdownNode[] = [];
  let index = 0;
  while (index < tokens.length) {
    const start = index;
    const first = tokens[index];
    if (first.nesting === 1) {
      let depth = 1;
      index += 1;
      while (index < tokens.length && depth > 0) {
        depth += tokens[index].nesting;
        index += 1;
      }
    } else {
      index += 1;
    }
    const group = tokens.slice(start, index);
    const map = first.map || [0, 1];
    const sourcePosition = position(file, firstLine + map[0]);
    const html = markdown.renderer.render(group, markdown.options, environment);
    const kind = kindFor(first.type);
    if (kind === 'heading') {
      const inline = group.find(token => token.type === 'inline');
      nodes.push({ kind, depth: Number(first.tag.slice(1)) || 1, text: inline?.content || '', id: String(first.attrGet('id') || slug(inline?.content || 'section')), html, position: sourcePosition });
    } else if (kind === 'paragraph') {
      const inline = group.find(token => token.type === 'inline');
      nodes.push({ kind, lines: (inline?.content || '').split('\n'), html, position: sourcePosition });
    } else if (kind === 'list') {
      nodes.push({ kind, ordered: first.type.startsWith('ordered_'), html, position: sourcePosition });
    } else if (kind === 'code') {
      nodes.push({ kind, language: first.info?.trim().split(/\s+/)[0] || '', value: first.content || '', html, position: sourcePosition });
    } else {
      nodes.push({ kind, html, position: sourcePosition } as MarkdownNode);
    }
  }
  return nodes;
}

export function parseMarkdown(source: string, file: string, firstLine = 1): MarkdownNode[] {
  const lines = source.replaceAll('\r', '').split('\n');
  let cursor = 0;
  const environment: MarkdownEnvironment = { headingCounts: new Map() };

  const plainEnd = (start: number) => {
    let index = start;
    let fence = '';
    let fenceLength = 0;
    while (index < lines.length) {
      const raw = lines[index];
      const marker = raw.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (marker) {
        const character = marker[1][0];
        if (!fence) {
          fence = character;
          fenceLength = marker[1].length;
        } else if (character === fence && marker[1].length >= fenceLength && /^\s*$/.test(raw.slice(marker[0].length))) {
          fence = '';
          fenceLength = 0;
        }
        index += 1;
        continue;
      }
      if (!fence && (isDirectiveOpen(raw) || isDirectiveClose(raw))) break;
      index += 1;
    }
    return index;
  };

  const parseSequence = (stopAtClose = false, opening?: { name: string; line: number }): MarkdownNode[] => {
    const nodes: MarkdownNode[] = [];
    while (cursor < lines.length) {
      const raw = lines[cursor];
      const lineNumber = firstLine + cursor;
      if (isDirectiveClose(raw)) {
        if (!stopAtClose) throw new MarkdownError('unexpected Block closing marker', position(file, lineNumber));
        cursor += 1;
        return nodes;
      }
      const directive = isDirectiveOpen(raw);
      if (directive) {
        const startLine = lineNumber;
        const contentStart = cursor + 1;
        cursor += 1;
        const children = parseSequence(true, { name: directive[1], line: startLine });
        const contentEnd = Math.max(contentStart, cursor - 1);
        nodes.push({
          kind: 'directive',
          name: directive[1],
          attrs: parseAttrs(directive[2] || '', file, startLine),
          children,
          raw: lines.slice(contentStart, contentEnd).join('\n'),
          position: position(file, startLine)
        });
        continue;
      }

      const plainStart = cursor;
      cursor = plainEnd(cursor);
      nodes.push(...markdownNodes(lines.slice(plainStart, cursor).join('\n'), file, firstLine + plainStart, environment));
    }
    if (stopAtClose) throw new MarkdownError(`unclosed Block directive${opening ? ` "${opening.name}"` : ''}`, position(file, opening?.line || firstLine + lines.length - 1));
    return nodes;
  };

  return parseSequence();
}

export function renderInline(value: string): string {
  return markdown.renderInline(value);
}

export function flattenDirectives(nodes: MarkdownNode[]): DirectiveNode[] {
  return nodes.flatMap(node => node.kind === 'directive' ? [node, ...flattenDirectives(node.children)] : []);
}
