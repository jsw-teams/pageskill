import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { auditSourceDocuments } from '../../src/runtime/accessibility/source.js';

const root = fileURLToPath(new URL('../..', import.meta.url));

test('source audit reports author-actionable Markdown accessibility issues', async () => {
  const markdown = await readFile(path.join(root, 'tests', 'fixtures', 'accessibility', 'broken.md'), 'utf8');
  const body = markdown.slice(markdown.indexOf('---', 4) + 3).trim();
  const diagnostics = auditSourceDocuments({ docs: [{ source: path.join(root, 'tests', 'fixtures', 'accessibility', 'broken.md'), markdown: body, bodyLine: 6 }] });
  assert.ok(diagnostics.some(item => item.rule === 'source/heading-order'));
  assert.ok(diagnostics.some(item => item.rule === 'source/image-alt'));
  assert.ok(diagnostics.some(item => item.rule === 'source/link-target'));
  assert.ok(diagnostics.some(item => item.rule === 'source/raw-html'));
});
