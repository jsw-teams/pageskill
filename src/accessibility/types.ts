export type AccessibilityLevel = 'error' | 'warning';

export type AccessibilityDiagnostic = {
  level: AccessibilityLevel;
  rule: string;
  message: string;
  route?: string;
  sourceFile?: string;
  selector?: string;
  element?: string;
  wcag?: string[];
};

export type AccessibilityReport = {
  pages: number;
  auditedRoutes: string[];
  diagnostics: AccessibilityDiagnostic[];
  checks: string[];
  browser?: string;
  durationMs: number;
};
