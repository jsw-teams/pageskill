import { parseMarkdown, type MarkdownNode } from '../lib/markdown.ts';
import type { BuildContext, Document } from '../compiler/types.ts';
import { diagnosticsForRule } from './diagnostics.ts';
import type { AccessibilityDiagnostic } from './types.ts';

function nodeHeadingDiagnostics(doc: Document, nodes: MarkdownNode[]): AccessibilityDiagnostic[] {
  const diagnostics: AccessibilityDiagnostic[] = [];
  let previous = 0;
  for (const node of nodes) {
    if (node.kind !== 'heading') continue;
    if (previous && node.depth > previous + 1) diagnostics.push(diagnosticsForRule('warning', 'source/heading-order', `Heading level jumps from h${previous} to h${node.depth}.`, { sourceFile: doc.source, element: `<h${node.depth}>`, wcag: ['WCAG 1.3.1'] }));
    previous = node.depth;
  }
  return diagnostics;
}

/** Check source-level information that is easiest to explain at the Markdown
 * location, before a renderer turns it into HTML. */
export function auditSourceDocuments(ctx: BuildContext, sourceFiles?: string[]): AccessibilityDiagnostic[] {
  const diagnostics: AccessibilityDiagnostic[] = [];
  const selected = sourceFiles?.length ? new Set(sourceFiles.map(file => file.toLocaleLowerCase())) : undefined;
  for (const doc of ctx.docs) {
    if (selected && !selected.has(doc.source.toLocaleLowerCase())) continue;
    let nodes: MarkdownNode[];
    try { nodes = parseMarkdown(doc.markdown, doc.source, doc.bodyLine || 1); }
    catch { continue; }
    diagnostics.push(...nodeHeadingDiagnostics(doc, nodes));
    const lines = doc.markdown.replaceAll('\r', '').split('\n');
    lines.forEach(line => {
      if (/!\[\s*\]\(/.test(line)) diagnostics.push(diagnosticsForRule('warning', 'source/image-alt', 'Image alt text is empty; use an empty alt only for a deliberately decorative image.', { sourceFile: doc.source, element: line.trim().slice(0, 160), wcag: ['WCAG 1.1.1'] }));
      if (/\[[^\]]*\]\(\s*\)/.test(line)) diagnostics.push(diagnosticsForRule('error', 'source/link-target', 'Markdown link has an empty destination.', { sourceFile: doc.source, element: line.trim().slice(0, 160), wcag: ['WCAG 2.4.4'] }));
      if (/\[\s*(?:click here|here|more)\s*\]\(/i.test(line)) diagnostics.push(diagnosticsForRule('warning', 'source/link-name', 'Link text should describe its destination instead of using a generic phrase.', { sourceFile: doc.source, element: line.trim().slice(0, 160), wcag: ['WCAG 2.4.4'] }));
      if (/^\s*<img\b/i.test(line)) diagnostics.push(diagnosticsForRule('error', 'source/raw-html', 'Raw HTML images are not part of the Markdown content contract; use Markdown image syntax with alt text.', { sourceFile: doc.source, element: line.trim().slice(0, 160), wcag: ['WCAG 1.1.1'] }));
    });
  }
  return diagnostics;
}
