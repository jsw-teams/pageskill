import assert from 'node:assert/strict';
import test from 'node:test';
import { accessibilityReportHtml } from '../../src/runtime/accessibility/report.js';

const report = {
  summary: { pages: 2, errors: 0, warnings: 0, screenshotCount: 6, status: 'passed' },
  pages: 2,
  pagesChecked: ['/', '/en/'],
  auditedRoutes: ['/', '/en/'],
  rules: [], diagnostics: [],
  checks: ['axe-core WCAG 2.2 AA'], browser: 'Chromium', viewports: ['320x800', '1280x800'],
  screenshots: [
    { route: '/', viewport: '320x800', path: '.pageskill/reports/accessibility/screenshots/home-320x800.png' },
    { route: '/', viewport: '1280x800', path: '.pageskill/reports/accessibility/screenshots/home-1280x800.png' },
    { route: '/en/', viewport: '320x800', path: '.pageskill/reports/accessibility/screenshots/en-320x800.png' },
    { route: '/en/', viewport: '1280x800', path: '.pageskill/reports/accessibility/screenshots/en-1280x800.png' }
  ],
  detailScreenshots: [
    { id: 'search-results', title: 'Search results state', description: 'Live results region.', route: '/en/', viewport: '1280x800', path: '.pageskill/reports/accessibility/screenshots/detail-search-results.png' },
    { id: 'api-configuration', title: 'Named API configuration', description: 'Configured API id.', route: '/en/', viewport: '1280x800', path: '.pageskill/reports/accessibility/screenshots/detail-api-configuration.png' }
  ],
  clientBoundary: { buildOutput: 'static-only', browserRequests: 'configured-origins-only', dynamicServices: 'external-api', secrets: 'private-excluded', apis: [{ id: 'comments', origin: 'https://api.example.com', auth: 'bearer', clientToken: 'configured' }], integrations: [{ id: 'analytics', purpose: 'measurement', consent: 'optional', load: 'consent', privacyPolicy: 'acknowledged' }] },
  keyboardChecks: [], dynamicChecks: [], contrastChecks: [], manualTests: ['Manual review'], durationMs: 1200
};

test('HTML retains complete evidence while printable report stays readable', () => {
  const html = accessibilityReportHtml(report, 'html');
  const printable = accessibilityReportHtml(report, 'pdf');
  assert.equal((html.match(/<figure>/g) || []).length, 6);
  assert.equal((printable.match(/<figure>/g) || []).length, 3);
  assert.match(printable, /2 focused Component details/);
  assert.match(printable, /companion HTML report and screenshots directory retain all 6 captures/);
  assert.match(printable, /@page\{size:A4/);
  assert.match(printable, /generated automatically by <code>page c<\/code>/);
  assert.match(printable, /configured third-party origin/);
  assert.match(printable, /public client data/);
  assert.match(printable, /api\.example\.com/);
  assert.match(printable, /Third-party Providers/);
  assert.match(printable, /analytics/);
  assert.doesNotMatch(printable, /public-client-token/);
});

test('printable report prioritizes annotated issue evidence', () => {
  const failing = structuredClone(report);
  failing.summary = { ...failing.summary, errors: 1, status: 'failed' };
  failing.diagnostics = [{ level: 'error', rule: 'axe/name', message: 'Missing name', route: '/en/', selector: 'button' }];
  failing.screenshots[2].annotatedPath = '.pageskill/reports/accessibility/screenshots/en-320x800-E01.png';
  const printable = accessibilityReportHtml(failing, 'pdf');
  assert.equal((printable.match(/<figure>/g) || []).length, 3);
  assert.match(printable, /Issue evidence/);
  assert.match(printable, /en-320x800-E01\.png/);
});
