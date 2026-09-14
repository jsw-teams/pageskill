import type { AccessibilityDiagnostic, AccessibilityLevel, AccessibilityReport } from './types.ts';

function sourceLabel(diagnostic: AccessibilityDiagnostic): string {
  return diagnostic.sourceFile || diagnostic.route || 'generated site';
}

export function formatAccessibilityDiagnostic(diagnostic: AccessibilityDiagnostic): string {
  const location = [sourceLabel(diagnostic), diagnostic.selector].filter(Boolean).join(' ');
  const wcag = diagnostic.wcag?.length ? ` [${diagnostic.wcag.join(', ')}]` : '';
  return `${diagnostic.level.toUpperCase()} ${diagnostic.rule} ${location}: ${diagnostic.message}${wcag}`;
}

export function formatAccessibilitySummary(report: AccessibilityReport): string {
  const errors = report.diagnostics.filter(diagnostic => diagnostic.level === 'error').length;
  const warnings = report.diagnostics.filter(diagnostic => diagnostic.level === 'warning').length;
  const status = errors ? 'FAILED' : warnings ? 'PASSED WITH WARNINGS' : 'PASSED';
  const browser = report.browser ? `; browser: ${report.browser}` : '';
  return `Accessibility ${status}: ${report.pages} page(s), ${report.checks.length} check group(s), ${errors} error(s), ${warnings} warning(s)${browser} (${Math.round(report.durationMs)}ms)`;
}

export function formatAccessibilityDiagnostics(diagnostics: AccessibilityDiagnostic[]): string {
  return diagnostics.length ? diagnostics.map(formatAccessibilityDiagnostic).join('\n') : 'No accessibility diagnostics.';
}

export function hasAccessibilityErrors(report: AccessibilityReport): boolean {
  return report.diagnostics.some(diagnostic => diagnostic.level === 'error');
}

export function diagnosticsForRule(level: AccessibilityLevel, rule: string, message: string, details: Partial<AccessibilityDiagnostic> = {}): AccessibilityDiagnostic {
  return { level, rule, message, ...details };
}
