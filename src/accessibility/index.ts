import { performance } from 'node:perf_hooks';
import type { BuildContext } from '../compiler/types.ts';
import { auditBrowserSite } from './browser.ts';
import { auditSourceDocuments } from './source.ts';
import { formatAccessibilityDiagnostics, formatAccessibilitySummary, hasAccessibilityErrors } from './diagnostics.ts';
import type { AccessibilityReport } from './types.ts';

export * from './types.ts';
export * from './contrast.ts';
export * from './diagnostics.ts';
export { writeBrowserPdf } from './browser.ts';

export type AccessibilityAuditOptions = {
  routes?: string[];
  sourceFiles?: string[];
};

export async function auditGeneratedSite(ctx: BuildContext, options: AccessibilityAuditOptions = {}): Promise<AccessibilityReport> {
  const started = performance.now();
  const sourceDiagnostics = auditSourceDocuments(ctx, options.sourceFiles);
  const browser = await auditBrowserSite(ctx, options.routes);
  const diagnostics = [...sourceDiagnostics, ...browser.diagnostics];
  const errors = diagnostics.filter(diagnostic => diagnostic.level === 'error').length;
  const warnings = diagnostics.filter(diagnostic => diagnostic.level === 'warning').length;
  const checks = browser.checks;
  return {
    summary: { pages: browser.routes.length, errors, warnings, screenshotCount: browser.screenshots.length, status: errors ? 'failed' : warnings ? 'passed-with-warnings' : 'passed' },
    pages: browser.routes.length,
    pagesChecked: browser.routes,
    auditedRoutes: browser.routes,
    rules: [...new Set(diagnostics.map(diagnostic => diagnostic.rule))].sort(),
    diagnostics,
    checks,
    browser: browser.browser,
    viewports: browser.viewports,
    screenshots: browser.screenshots,
    keyboardChecks: checks.filter(check => /keyboard|focus/i.test(check)),
    dynamicChecks: checks.filter(check => /dynamic|interaction|component/i.test(check)),
    contrastChecks: checks.filter(check => /contrast/i.test(check)),
    manualTests: ['Keyboard and screen-reader review of generated routes', 'Content language, link purpose, and alternative-text review', 'Third-party integration consent and runtime behavior review'],
    durationMs: performance.now() - started
  };
}

export function accessibilityFailure(report: AccessibilityReport): Error | undefined {
  return hasAccessibilityErrors(report) ? new Error(`${formatAccessibilitySummary(report)}\n${formatAccessibilityDiagnostics(report.diagnostics)}`) : undefined;
}
