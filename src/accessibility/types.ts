export type AccessibilityLevel = 'error' | 'warning';

export type AccessibilityDiagnostic = {
  level: AccessibilityLevel;
  rule: string;
  message: string;
  route?: string;
  component?: string;
  sourceFile?: string;
  selector?: string;
  element?: string;
  wcag?: string[];
  viewport?: string;
  layer?: 'source' | 'html' | 'browser' | 'keyboard' | 'dynamic' | 'contrast' | 'manual';
};

export type AccessibilityReport = {
  summary: { pages: number; errors: number; warnings: number; screenshotCount: number; status: 'passed' | 'passed-with-warnings' | 'failed' };
  pages: number;
  pagesChecked: string[];
  auditedRoutes: string[];
  rules: string[];
  diagnostics: AccessibilityDiagnostic[];
  checks: string[];
  browser?: string;
  viewports: string[];
  screenshots: Array<{ route: string; viewport: string; path: string; annotatedPath?: string }>;
  keyboardChecks: string[];
  dynamicChecks: string[];
  contrastChecks: string[];
  manualTests: string[];
  durationMs: number;
};
