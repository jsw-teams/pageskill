import { performance } from 'node:perf_hooks';
import type { BuildContext } from '../compiler/types.ts';
import { auditBrowserSite } from './browser.ts';
import { auditSourceDocuments } from './source.ts';
import { formatAccessibilityDiagnostics, formatAccessibilitySummary, hasAccessibilityErrors } from './diagnostics.ts';
import type { AccessibilityReport } from './types.ts';

export * from './types.ts';
export * from './contrast.ts';
export * from './diagnostics.ts';

export type AccessibilityAuditOptions = {
  routes?: string[];
  sourceFiles?: string[];
};

export async function auditGeneratedSite(ctx: BuildContext, options: AccessibilityAuditOptions = {}): Promise<AccessibilityReport> {
  const started = performance.now();
  const sourceDiagnostics = auditSourceDocuments(ctx, options.sourceFiles);
  const browser = await auditBrowserSite(ctx, options.routes);
  return {
    pages: browser.routes.length,
    auditedRoutes: browser.routes,
    diagnostics: [...sourceDiagnostics, ...browser.diagnostics],
    checks: browser.checks,
    browser: browser.browser,
    durationMs: performance.now() - started
  };
}

export function accessibilityFailure(report: AccessibilityReport): Error | undefined {
  return hasAccessibilityErrors(report) ? new Error(`${formatAccessibilitySummary(report)}\n${formatAccessibilityDiagnostics(report.diagnostics)}`) : undefined;
}
