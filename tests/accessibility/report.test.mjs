import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../..', import.meta.url));

test('g writes a complete zero-error browser accessibility report', async () => {
  const report = JSON.parse(await readFile(path.join(root, '.pageskill', 'accessibility.json'), 'utf8'));
  assert.ok(report.pages >= 1);
  assert.ok(report.auditedRoutes.includes('/en/'));
  assert.ok(report.auditedRoutes.includes('/en/posts/markdown/'));
  assert.ok(report.checks.includes('axe-core WCAG 2.2 AA'));
  assert.ok(report.checks.includes('keyboard and component interactions'));
  assert.equal(report.diagnostics.filter(item => item.level === 'error').length, 0);
  assert.equal(report.diagnostics.filter(item => item.level === 'warning').length, 0);
  assert.match(report.browser, /Edge|Chromium/);
});
