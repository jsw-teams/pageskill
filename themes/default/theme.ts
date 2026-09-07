import { MarkdownError } from '../../src/lib/markdown.ts';
import type { DirectiveNode, MarkdownNode } from '../../src/lib/markdown.ts';
import { defineTheme, type ThemeBlockDefinition, type ThemeRenderContext, type ThemeShellContext } from '../../src/theme-api.ts';
import { BookOpen, ChartLine, Cookie, FileText, Globe, Layers, Map, Palette, Rocket, Settings2, ShieldCheck, Wrench, type IconNode } from 'lucide';

const featureIcons = [FileText, BookOpen, Layers, Rocket, Palette, Globe, ChartLine] as const;
const pipelineIcons = [FileText, Settings2, Layers, Rocket] as const;
const learningPathSteps = ['start', 'settings', 'markdown', 'first-content', 'cookies', 'customize'] as const;

function iconAttribute(value: string | number): string {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function iconSvg(node: IconNode, className: string): string {
  const [tag, sourceAttrs, children = []] = node;
  const attrs = { ...sourceAttrs, width: '1em', height: '1em', class: className, 'aria-hidden': 'true', focusable: 'false' };
  const attributeText = Object.entries(attrs).map(([key, value]) => `${key}="${iconAttribute(value)}"`).join(' ');
  const childText = children.map(([childTag, childAttrs]) => `<${childTag} ${Object.entries(childAttrs).map(([key, value]) => `${key}="${iconAttribute(value)}"`).join(' ')}></${childTag}>`).join('');
  return `<${tag} ${attributeText}>${childText}</${tag}>`;
}

function footerIcon(node: IconNode): string {
  return `<span class="footer-icon" aria-hidden="true">${iconSvg(node, 'footer-icon-svg')}</span>`;
}

function validateAttrs(node: DirectiveNode, definition: ThemeBlockDefinition) {
  for (const key of Object.keys(node.attrs)) {
    if (!(key in definition.schema)) {
      throw new MarkdownError(`unknown attribute "${key}" on Block "${node.name}"; available attributes: ${Object.keys(definition.schema).join(', ') || 'none'}`, node.position);
    }
  }
}

function numberAttr(node: DirectiveNode, key: string, min: number, max: number, fallback: number): number {
  const value = node.attrs[key] ?? String(fallback);
  if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) {
    throw new MarkdownError(`Block "${node.name}" attribute "${key}" must be an integer from ${min} to ${max}`, node.position);
  }
  return Number(value);
}

function enumAttr(node: DirectiveNode, key: string, values: string[], fallback: string): string {
  const value = node.attrs[key] || fallback;
  if (!values.includes(value)) throw new MarkdownError(`Block "${node.name}" attribute "${key}" must be one of ${values.join(', ')}`, node.position);
  return value;
}

function groupedContent(nodes: MarkdownNode[], context: ThemeRenderContext): string[] {
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

function pipelineSteps(nodes: MarkdownNode[], context: ThemeRenderContext): string {
  return groupedContent(nodes, context).map((content, index) => `<article class="pipeline-step"><span class="pipeline-number">${String(index + 1).padStart(2, '0')}</span><span class="pipeline-icon" aria-hidden="true">${iconSvg(pipelineIcons[index % pipelineIcons.length], 'ui-icon')}</span>${content}</article>`).join('');
}

function compilerBoardSteps(nodes: MarkdownNode[], context: ThemeRenderContext): string {
  return groupedContent(nodes, context).map((content, index) => `<article class="compiler-board-step board-step-${index + 1}"><span class="board-step-index">${String(index + 1).padStart(2, '0')}</span><span class="board-step-icon" aria-hidden="true">${iconSvg([FileText, Settings2, Rocket][index % 3], 'ui-icon')}</span>${content}</article>`).join('');
}

function renderLearningPath(node: DirectiveNode, context: ThemeRenderContext): string {
  validateAttrs(node, blocks['learning-path']);
  const cards = groupedContent(node.children, context);
  if (cards.length !== learningPathSteps.length) throw new MarkdownError('Block "learning-path" needs exactly six level-three headings with their supporting Markdown', node.position);
  const renderedCards = cards.map((content, index) => {
    const step = learningPathSteps[index];
    const imageSource = context.safeUrl(`/assets/learning/${step}.png`);
    return `<article class="learning-path-card learning-path-card-${step}"><div class="learning-path-art learning-path-art-${step}" aria-hidden="true"><img src="${imageSource}" alt="" aria-hidden="true" loading="lazy" decoding="async" width="112" height="112"></div><div class="learning-path-content">${content}</div></article>`;
  }).join('');
  return `<section class="block learning-path"><div class="learning-path-grid">${renderedCards}</div></section>`;
}

function markdownTable(node: DirectiveNode, message: string): { headers: string[]; rows: string[][] } {
  const lines = node.raw.replaceAll('\r', '').split('\n');
  const tableStart = lines.findIndex((line, index) => line.includes('|') && index + 1 < lines.length && lines[index + 1].split('|').filter(Boolean).every(cell => /^\s*:?-{3,}:?\s*$/.test(cell)));
  if (tableStart < 0) throw new MarkdownError(message, node.position);
  const splitRow = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
  const headers = splitRow(lines[tableStart]);
  const rows: string[][] = [];
  for (let index = tableStart + 2; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || !line.includes('|')) continue;
    const row = splitRow(line);
    if (row.length !== headers.length) throw new MarkdownError(`each comparison row needs ${headers.length} cells`, { ...node.position, line: node.position.line + index + 1 });
    rows.push(row);
  }
  if (headers.length < 3 || rows.length < 2) throw new MarkdownError(message, node.position);
  return { headers, rows };
}

function renderToolComparison(node: DirectiveNode, context: ThemeRenderContext): string {
  validateAttrs(node, blocks['tool-comparison']);
  const table = markdownTable(node, 'Block "tool-comparison" needs a Markdown table with a decision-question column and at least two products');
  const label = context.translate('toolComparison.label', 'Authoring paths documented by each project');
  const note = context.translate('toolComparison.note', 'Adjacent-tool cells name entries from their official docs; the Pageskill column comes from this repository.');
  const headers = table.headers.map((header, index) => `<th scope="col" class="${index === table.headers.length - 1 ? 'is-pagekiln' : ''}">${context.renderInline(header)}</th>`).join('');
  const rows = table.rows.map(row => `<tr>${row.map((value, index) => {
    const className = index === table.headers.length - 1 ? 'is-pagekiln' : '';
    const label = index > 0 ? ` data-label="${context.escapeHtml(table.headers[index])}"` : '';
    const tag = index === 0 ? 'th' : 'td';
    const scope = index === 0 ? ' scope="row"' : '';
    return `<${tag}${scope} class="${className}"${label}>${context.renderInline(value)}</${tag}>`;
  }).join('')}</tr>`).join('');
  return `<figure class="block tool-comparison" aria-label="${context.escapeHtml(label)}"><figcaption><strong>${context.escapeHtml(label)}</strong><span>${context.escapeHtml(note)}</span></figcaption><div class="tool-comparison-scroll"><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div></figure>`;
}

function benchmarkRows(node: DirectiveNode): { headers: string[]; rows: Array<{ label: string; values: number[] }> } {
  const table = markdownTable(node, 'Block "benchmark-chart" needs a Markdown table with a scenario column and numeric columns');
  const rows = table.rows.map((row, rowIndex) => {
    const values = row.slice(1).map((value, columnIndex) => {
      const number = Number(value.replaceAll(',', ''));
      if (!Number.isFinite(number) || number < 0) throw new MarkdownError(`benchmark value in row ${rowIndex + 1}, column ${columnIndex + 2} must be a non-negative number`, { ...node.position, line: node.position.line + rowIndex + 3 });
      return number;
    });
    return { label: row[0], values };
  });
  if (rows.length > 12) throw new MarkdownError('Block "benchmark-chart" accepts at most 12 scenarios', node.position);
  return { headers: table.headers, rows };
}

function renderBenchmarkChart(node: DirectiveNode, context: ThemeRenderContext): string {
  validateAttrs(node, blocks['benchmark-chart']);
  const table = benchmarkRows(node);
  const label = context.translate('benchmarkChart.label', 'Pageskill local measurement: build time (seconds)');
  const note = context.translate('benchmarkChart.note', 'One generated Markdown fixture; values are recorded measurements, not cross-tool estimates.');
  const max = Math.max(...table.rows.flatMap(row => row.values), 1);
  const headers = table.headers.map((header, index) => `<th scope="col" class="${index === table.headers.length - 1 ? 'is-largest' : ''}">${context.renderInline(header)}</th>`).join('');
  const rows = table.rows.map(row => `<tr><th scope="row">${context.renderInline(row.label)}</th>${row.values.map((value, index) => `<td data-label="${context.escapeHtml(table.headers[index + 1])}"><div class="benchmark-value"><strong>${context.escapeHtml(value.toFixed(2))} s</strong><span class="benchmark-track"><i style="width:${(value / max * 100).toFixed(2)}%"></i></span></div></td>`).join('')}</tr>`).join('');
  return `<figure class="block benchmark-chart" aria-label="${context.escapeHtml(label)}"><figcaption><strong>${context.escapeHtml(label)}</strong><span>${context.escapeHtml(note)}</span></figcaption><div class="benchmark-chart-scroll"><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div></figure>`;
}

function automaticToc(context: ThemeRenderContext): string {
  const headings = context.doc.nodes.filter(node => node.kind === 'heading' && node.depth > 1 && node.depth < 4) as Extract<MarkdownNode, { kind: 'heading' }>[];
  if (headings.length < 2) return '';
  const label = context.translate('toc.title', 'Table of contents');
  const onThisPage = context.translate('toc.onThisPage', 'On this page');
  return `<aside class="pattern-toc"><details class="toc-drawer" open><summary><span class="toc-summary-icon" aria-hidden="true">${iconSvg(BookOpen, 'toc-icon')}</span><span>${context.escapeHtml(label)}</span></summary><nav class="toc-panel" aria-label="${context.escapeHtml(label)}"><strong>${context.escapeHtml(onThisPage)}</strong><ol>${headings.map(heading => `<li class="toc-depth-${heading.depth}"><a href="#${context.escapeHtml(heading.id)}">${context.renderInline(heading.text)}</a></li>`).join('')}</ol></nav></details></aside>`;
}

function blogRelations(context: ThemeRenderContext): string {
  return context.blogRelations();
}

function postExcerpt(post: ThemeRenderContext['doc'], context: ThemeRenderContext): string {
  const source = String(post.excerpt || post.description || '')
    .replace(/^\s*#{1,6}\s+[^\n]*(?:\n|$)/gmu, '')
    .replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/gmu, '')
    .replace(/^\s*>\s?/gmu, '')
    .replace(/^\s*[-*_| :]+\s*$/gmu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return source ? context.renderInline(source.slice(0, 320)) : '';
}

function postCover(post: ThemeRenderContext['doc'], context: ThemeRenderContext, index?: number): string {
  const markerLabel = context.translate('collections.posts', 'Product notes');
  const cover = post.data?.cover ? context.safeUrl(String(post.data.cover)) : '';
  const image = cover ? `<img src="${cover}" alt="" loading="${index === undefined ? 'eager' : 'lazy'}" decoding="async">` : '';
  return `<div class="post-card-cover${cover ? ' has-image' : ''}">${image}<span>${context.escapeHtml(markerLabel)}</span></div>`;
}

const blocks: Record<string, ThemeBlockDefinition> = {
  hero: { name: 'hero', schema: { tone: 'string', align: 'string' }, defaults: { tone: 'default', align: 'left' }, render: (node, context) => { validateAttrs(node, blocks.hero); const tone = enumAttr(node, 'tone', ['default', 'brand', 'muted'], 'default'); const align = enumAttr(node, 'align', ['left', 'center', 'right'], 'left'); return `<section class="block hero tone-${context.escapeHtml(tone)} align-${context.escapeHtml(align)}"><span class="hero-tool-mark" aria-hidden="true">${iconSvg(Wrench, 'hero-tool-icon')}</span>${context.renderNodes(node.children)}</section>`; } },
  'feature-grid': { name: 'feature-grid', schema: { columns: 'number' }, defaults: { columns: '3' }, render: (node, context) => { validateAttrs(node, blocks['feature-grid']); const columns = numberAttr(node, 'columns', 1, 6, 3); return `<section class="block feature-grid" style="--columns:${columns}">${groupedContent(node.children, context).map((content, index) => `<article><span class="feature-icon" aria-hidden="true">${iconSvg(featureIcons[index % featureIcons.length], 'ui-icon')}</span>${content}</article>`).join('')}</section>`; } },
  'learning-path': { name: 'learning-path', schema: {}, contexts: ['page'], resources: { styles: ['blocks/learning-path.css'] }, render: renderLearningPath },
  'compiler-board': { name: 'compiler-board', schema: {}, render: (node, context) => { validateAttrs(node, blocks['compiler-board']); const label = context.translate('compilerBoard', 'Pageskill compiler model'); return `<section class="block compiler-board" aria-label="${context.escapeHtml(label)}"><div class="compiler-board-grid">${compilerBoardSteps(node.children, context)}</div></section>`; } },
  metrics: { name: 'metrics', schema: {}, render: (node, context) => { validateAttrs(node, blocks.metrics); const label = context.translate('metrics', 'Measured build data'); return `<section class="block metrics" aria-label="${context.escapeHtml(label)}"><div class="metrics-grid">${groupedContent(node.children, context).map((content, index) => `<article class="metric-card"><span class="metric-index">${String(index + 1).padStart(2, '0')}</span>${content}</article>`).join('')}</div></section>`; } },
  'tool-comparison': { name: 'tool-comparison', schema: {}, example: ':::tool-comparison\n| Decision | Tool A | Pageskill |\n| --- | --- | --- |\n| Content entry | Markdown | GFM + Blocks |\n:::', render: renderToolComparison },
  'benchmark-chart': { name: 'benchmark-chart', schema: {}, example: ':::benchmark-chart\n| Scenario | 100 docs | 1,000 docs |\n| --- | ---: | ---: |\n| Cold build | 0.20 | 0.70 |\n:::', render: renderBenchmarkChart },
  'research-matrix': { name: 'research-matrix', schema: {}, render: (node, context) => { validateAttrs(node, blocks['research-matrix']); const label = context.translate('research', 'Official-source comparison'); return `<section id="research" class="block research-matrix" aria-label="${context.escapeHtml(label)}">${context.renderNodes(node.children)}</section>`; } },
  comparison: { name: 'comparison', schema: {}, render: (node, context) => { validateAttrs(node, blocks.comparison); const cards = groupedContent(node.children, context); if (cards.length < 2) throw new MarkdownError('Block "comparison" needs at least two comparison columns; add two level-three headings with their supporting Markdown', node.position); const label = context.translate('comparison', 'Product comparison'); return `<section id="comparison" class="block comparison" aria-label="${context.escapeHtml(label)}"><div class="comparison-grid">${cards.map((content, index) => `<article class="comparison-side comparison-side-${index + 1}"><span class="comparison-index">${String(index + 1).padStart(2, '0')}</span>${content}</article>`).join('')}</div></section>`; } },
  pipeline: { name: 'pipeline', schema: {}, render: (node, context) => { validateAttrs(node, blocks.pipeline); const label = context.translate('pipeline', 'Compiler pipeline'); return `<section class="block pipeline" aria-label="${context.escapeHtml(label)}"><div class="pipeline-track">${pipelineSteps(node.children, context)}</div></section>`; } },
  'post-list': { name: 'post-list', schema: { limit: 'number' }, defaults: { limit: '6' }, dependencies: (_node, context) => [`collection:posts:${context.doc.locale}`], render: (node, context) => { validateAttrs(node, blocks['post-list']); const limit = numberAttr(node, 'limit', 1, 50, 6); const posts = context.collection('posts').slice(0, limit); const heading = context.translate('latestPosts', 'Latest product notes'); return `<section class="block post-list"><div class="post-list-heading"><h2>${context.escapeHtml(heading)}</h2><a href="${context.safeUrl(`/${context.doc.locale}/posts/`)}">${context.escapeHtml(context.translate('allPosts', 'View all product notes'))}</a></div>${posts.length ? `<div class="post-list-grid">${posts.map((post, index) => `<article class="post-card">${postCover(post, context, index)}<div class="post-card-body"><h3><a href="${context.safeUrl(context.routeFor(post))}">${context.escapeHtml(post.title)}</a></h3>${post.date ? `<time datetime="${context.escapeHtml(post.date)}">${context.escapeHtml(context.formatDate(post.date))}</time>` : ''}${postExcerpt(post, context) ? `<p class="post-excerpt">${postExcerpt(post, context)}</p>` : ''}</div></article>`).join('')}</div>` : `<p class="empty">${context.escapeHtml(context.translate('noPosts', 'No product notes yet.'))}</p>`}</section>`; } },
  toc: { name: 'toc', schema: {}, render: (_node, context) => { const headings = context.doc.nodes.filter(node => node.kind === 'heading' && node.depth > 1) as Extract<MarkdownNode, { kind: 'heading' }>[]; const label = context.translate('toc.title', 'Table of contents'); const onThisPage = context.translate('toc.onThisPage', 'On this page'); return `<nav class="block toc" aria-label="${context.escapeHtml(label)}"><strong>${context.escapeHtml(onThisPage)}</strong><ul>${headings.map(heading => `<li><a href="#${context.escapeHtml(heading.id)}">${context.renderInline(heading.text)}</a></li>`).join('')}</ul></nav>`; } },
  cta: { name: 'cta', schema: { href: 'string' }, render: (node, context) => { validateAttrs(node, blocks.cta); const href = node.attrs.href ? context.safeUrl(node.attrs.href) : '#'; const label = context.translate('continue', 'Continue'); return `<section class="block landing-cta">${context.renderNodes(node.children)}${node.attrs.href ? `<a class="button" href="${href}">${context.escapeHtml(label)}</a>` : ''}</section>`; } }
};

function shell(context: ThemeShellContext) {
  const pageLanguages = context.doc.collection === 'posts' ? context.languageLinks : '';
  const languageNav = pageLanguages ? `<nav class="languages" aria-label="${context.escapeHtml(context.languageLabel)}"><span class="languages-heading" aria-hidden="true">${context.escapeHtml(context.languageLabel)}</span><div class="languages-list">${pageLanguages}</div></nav>` : '';
  const archiveCollection = String(context.config.archive?.collection || 'posts');
  const collectionKey = context.doc.collection === 'archive' ? archiveCollection : context.doc.collection;
  const collectionLabel = context.translate(`collections.${collectionKey}`, collectionKey);
  const pageHeader = context.doc.source.startsWith('generated:') ? '' : `<header class="page-header"><p class="eyebrow">${context.escapeHtml(collectionLabel)}</p><h1>${context.escapeHtml(context.doc.title)}</h1>${context.doc.description ? `<p>${context.escapeHtml(context.doc.description)}</p>` : ''}${languageNav}</header>`;
  const primaryNav = context.navigationLinks ? `<nav class="primary-nav" aria-label="${context.escapeHtml(context.navigationLabel)}">${context.navigationLinks}</nav>` : '';
  const headerActions = `${context.searchMarkup}${primaryNav}`;
  const siteMapLabel = context.translate('siteMap', context.doc.locale.startsWith('zh-tw') ? '網站地圖' : context.doc.locale.startsWith('zh') ? '站点地图' : 'Site map');
  const privacyPolicy = context.privacy.enabled ? `<a class="footer-tool-link" href="${context.safeUrl(context.privacy.policyHref)}">${footerIcon(ShieldCheck)}<span>${context.escapeHtml(context.privacy.policyLabel)}</span></a>` : '';
  const privacyTrigger = context.privacyTriggerMarkup ? context.privacyTriggerMarkup.replace('>', `>${footerIcon(Cookie)}`) : '';
  const footerTools = `<nav class="footer-tools" aria-label="${context.escapeHtml(siteMapLabel)}"><a class="footer-tool-link" href="/sitemap.xml">${footerIcon(Map)}<span>${context.escapeHtml(siteMapLabel)}</span></a>${privacyPolicy}${privacyTrigger}</nav>`;
  return `<!doctype html><html lang="${context.escapeHtml(context.doc.locale)}"><head>${context.head}</head><body class="${context.bodyClass}" data-pattern="${context.escapeHtml(context.doc.pattern)}">${context.privacyMarkup}<a class="skip" href="#main">${context.escapeHtml(context.skipLabel)}</a><header class="site-header"><div class="header-inner"><a class="brand" href="${context.homeHref}"><img class="brand-mark" src="${context.brandIcon}" alt="" width="32" height="32"><span class="brand-copy"><strong>${context.escapeHtml(context.siteName)}</strong><small>${context.escapeHtml(context.headerNote)}</small></span></a>${headerActions ? `<div class="header-actions">${headerActions}</div>` : ''}</div></header><main id="main" class="${context.mainClass}">${pageHeader}${context.content}</main><footer class="site-footer"><div class="footer-grid">${footerTools}</div>${context.showAttribution ? `<div class="footer-bottom"><span class="footer-credit">${context.attribution}</span></div>` : ''}</footer></body></html>`;
}

function shellWithPrivacy(context: ThemeShellContext) {
  return shell(context);
}

export default defineTheme({
  name: 'default',
  blocks,
  patterns: {
    landing: { name: 'landing', contexts: ['page'], render: content => content },
    document: { name: 'document', contexts: ['page', 'custom'], render: (content, context) => `<div class="document-layout">${automaticToc(context)}<article class="document-body">${content}</article></div>` },
    docs: { name: 'docs', contexts: ['page', 'docs'], render: (content, context) => `<div class="document-layout docs-layout">${automaticToc(context)}<article class="document-body">${content}</article></div>` },
  blog: { name: 'blog', contexts: ['post', 'blog'], render: (content, context) => { const postLabel = context.translate('collections.posts', 'Product notes'); return `<div class="document-layout post-layout">${automaticToc(context)}<article class="post"><header class="post-cover post-cover-detail${context.doc.data?.cover ? ' has-image' : ''}">${context.doc.data?.cover ? `<img src="${context.safeUrl(String(context.doc.data.cover))}" alt="" loading="eager" decoding="async">` : ''}<span>${context.escapeHtml(postLabel)}</span><h2>${context.escapeHtml(context.doc.title)}</h2>${context.doc.description ? `<p>${context.escapeHtml(context.doc.description)}</p>` : ''}</header>${context.doc.date ? `<p class="post-date"><time datetime="${context.escapeHtml(context.doc.date)}">${context.escapeHtml(context.formatDate(context.doc.date))}</time></p>` : ''}${content}${blogRelations(context)}</article></div>`; } }
  },
  shell: shellWithPrivacy
});
