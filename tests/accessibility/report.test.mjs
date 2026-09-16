import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../..', import.meta.url));

test('c writes a complete zero-error browser accessibility PDF report', async () => {
  const pdf = await readFile(path.join(root, '.pageskill', 'reports', 'accessibility', 'report.pdf'));
  const reportJson = JSON.parse(await readFile(path.join(root, '.pageskill', 'reports', 'accessibility', 'report.json'), 'utf8'));
  const summary = JSON.parse(await readFile(path.join(root, '.pageskill', 'reports', 'accessibility', 'summary.json'), 'utf8'));
  const report = reportJson;
  assert.ok(report.pages >= 1);
  assert.ok(report.auditedRoutes.includes('/en/'));
  assert.ok(report.auditedRoutes.includes('/en/posts/markdown/'));
  assert.ok(report.checks.includes('axe-core WCAG 2.2 AA'));
  assert.ok(report.checks.includes('keyboard and component interactions'));
  assert.equal(report.diagnostics.filter(item => item.level === 'error').length, 0);
  assert.equal(report.diagnostics.filter(item => item.level === 'warning').length, 0);
  assert.match(report.browser, /Edge|Chromium/);
  assert.deepEqual(report.viewports, ['320x800', '375x812', '768x1024', '1280x800', '1440x900']);
  assert.ok(reportJson.screenshots.length >= report.pages);
  assert.equal(summary.screenshotCount, reportJson.screenshots.length + reportJson.detailScreenshots.length);
  assert.ok(reportJson.detailScreenshots.length >= 3);
  assert.ok(reportJson.detailScreenshots.some(item => item.id === 'api-configuration'));
  assert.ok(reportJson.detailScreenshots.some(item => item.id === 'provider-privacy'));
  assert.equal(pdf.subarray(0, 5).toString('ascii'), '%PDF-');
  assert.ok(pdf.byteLength > 1000);
  assert.ok(pdf.byteLength < 8 * 1024 * 1024, `printable report is unexpectedly large: ${pdf.byteLength} bytes`);
  assert.match(pdf.toString('latin1'), /\/StructTreeRoot/, 'PDF should contain a tagged structure tree');
  assert.ok(reportJson.screenshots.some(item => item.route === '/en/' && item.viewport === '320x800'));
  assert.equal(await exists(path.join(root, 'dist', 'public', '.pageskill', 'reports', 'accessibility')), false);
  assert.equal(await exists(path.join(root, 'dist', 'public', '.pageskill', 'build-profile.json')), false);
  assert.equal(await exists(path.join(root, '.pageskill', 'build-profile.json')), true);
  assert.equal(await exists(path.join(root, '.pageskill', 'reports', 'accessibility', '.report-print.html')), false);
});

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}
