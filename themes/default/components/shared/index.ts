import { MarkdownError } from '../../../../src/lib/markdown.ts';
import type { DirectiveNode, MarkdownNode } from '../../../../src/lib/markdown.ts';
import type { IconNode } from 'lucide';
import type { ThemeBlockDefinition, ThemeRenderContext } from '../../../../src/theme-api.ts';

export function iconAttribute(value: string | number): string {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function iconSvg(node: IconNode, className: string): string {
  const [tag, sourceAttrs, children = []] = node;
  const attrs = { ...sourceAttrs, width: '1em', height: '1em', class: className, 'aria-hidden': 'true', focusable: 'false' };
  const attributeText = Object.entries(attrs).map(([key, value]) => `${key}="${iconAttribute(value)}"`).join(' ');
  const childText = children.map(([childTag, childAttrs]) => `<${childTag} ${Object.entries(childAttrs).map(([key, value]) => `${key}="${iconAttribute(value)}"`).join(' ')}></${childTag}>`).join('');
  return `<${tag} ${attributeText}>${childText}</${tag}>`;
}

export function footerIcon(node: IconNode): string {
  return `<span class="footer-icon" aria-hidden="true">${iconSvg(node, 'footer-icon-svg')}</span>`;
}

export function validateAttrs(node: DirectiveNode, definition: ThemeBlockDefinition): void {
  for (const key of Object.keys(node.attrs)) {
    if (!(key in definition.schema)) {
      throw new MarkdownError(`unknown attribute "${key}" on Block "${node.name}"; available attributes: ${Object.keys(definition.schema).join(', ') || 'none'}`, node.position);
    }
  }
}

export function numberAttr(node: DirectiveNode, key: string, min: number, max: number, fallback: number): number {
  const value = node.attrs[key] ?? String(fallback);
  if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) {
    throw new MarkdownError(`Block "${node.name}" attribute "${key}" must be an integer from ${min} to ${max}`, node.position);
  }
  return Number(value);
}

export function enumAttr(node: DirectiveNode, key: string, values: string[], fallback: string): string {
  const value = node.attrs[key] || fallback;
  if (!values.includes(value)) throw new MarkdownError(`Block "${node.name}" attribute "${key}" must be one of ${values.join(', ')}`, node.position);
  return value;
}

export function groupedContent(nodes: MarkdownNode[], context: ThemeRenderContext): string[] {
  const cards: string[] = [];
  let current = '';
  for (const node of nodes) {
    if (node.kind === 'heading' && node.depth >= 3 && current) {
      cards.push(current);
      current = '';
    }
    current += context.renderNodes([node]);
  }
  if (current) cards.push(current);
  return cards;
}

export function postExcerpt(post: ThemeRenderContext['doc'], context: ThemeRenderContext): string {
  // Summaries come from frontmatter only.  Falling back to the parsed body
  // turns code samples and the first heading into misleading card copy.
  const source = String(post.description || '')
    .replace(/^\s*#{1,6}\s+[^\n]*(?:\n|$)/gmu, '')
    .replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/gmu, '')
    .replace(/^\s*>\s?/gmu, '')
    .replace(/^\s*[-*_| :]+\s*$/gmu, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!source || source.replace(/\s+/g, ' ') === post.title.trim().replace(/\s+/g, ' ')) return '';
  return context.renderInline(source.slice(0, 320));
}

function coverUrl(value: unknown, context: ThemeRenderContext): string {
  const raw = typeof value === 'string' ? value.trim().replaceAll('\\', '/') : '';
  if (!raw || raw.startsWith('//') || /(?:^|\/)\.\.(?:\/|$)/.test(raw)) return '';
  if (/^[a-z][a-z\d+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw)) return '';
  const candidate = /^https?:\/\//i.test(raw) || raw.startsWith('/') ? raw : `/assets/${raw.replace(/^assets\//i, '')}`;
  const safe = context.safeUrl(candidate);
  return safe === '#' ? '' : safe;
}

export function postAuthor(post: ThemeRenderContext['doc'], context: ThemeRenderContext): string {
  const value = post.author || post.data?.author || context.localized(context.config?.author, 'Site Owner');
  return String(value || 'Site Owner').trim() || 'Site Owner';
}

export function postCoverImage(post: ThemeRenderContext['doc'], context: ThemeRenderContext): string {
  const cover = coverUrl(post.cover || post.data?.cover || post.data?.ogImage, context);
  if (!cover) return '';
  const coverAltLabel = context.translate('post.coverAlt', 'Cover image');
  const alt = context.escapeHtml(`${coverAltLabel}: ${post.title}`);
  return `<figure class="post-cover"><img src="${cover}" alt="${alt}" width="1200" height="630" sizes="(max-width: 760px) 100vw, 1000px" loading="eager" fetchpriority="high" decoding="async"></figure>`;
}

export function postCover(post: ThemeRenderContext['doc'], context: ThemeRenderContext, index?: number, collection = 'posts'): string {
  const rawCategory = String(post.data?.category ?? post.data?.type ?? '').trim().toLocaleLowerCase();
  const category = rawCategory || 'uncategorized';
  const markerKey = collection === 'updates'
    ? 'collections.updates'
    : category === 'tutorial'
      ? 'collections.tutorials'
      : category === 'uncategorized'
        ? 'collections.uncategorized'
        : `categories.${category}`;
  const fallback = collection === 'updates' ? 'Updates' : category === 'tutorial' ? 'Tutorials' : category === 'uncategorized' ? 'Uncategorized' : category;
  const markerLabel = context.translate(markerKey, fallback);
  const cover = coverUrl(post.cover || post.data?.cover || post.data?.ogImage, context);
  if (!cover) return `<div class="post-card-cover"><span>${context.escapeHtml(markerLabel)}</span></div>`;
  const alt = context.escapeHtml(`${context.translate('post.coverAlt', 'Cover image')}: ${post.title}`);
  const eager = index === 0 || index === undefined;
  const image = `<img src="${cover}" alt="${alt}" width="1200" height="630" sizes="(max-width: 600px) 100vw, (max-width: 980px) 50vw, 33vw" loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''} decoding="async">`;
  return `<div class="post-card-cover has-image">${image}<span>${context.escapeHtml(markerLabel)}</span></div>`;
}
