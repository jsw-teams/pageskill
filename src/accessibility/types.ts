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

export type AccessibilityDetailScreenshot = {
  id: string;
  title: string;
  description: string;
  route: string;
  viewport: string;
  path: string;
};

export type AccessibilityReport = {
  summary: { pages: number; errors: number; warnings: number; screenshotCount: number; status: 'passed' | 'passed-with-warnings' | 'failed' };
  pages: number;
  pagesChecked: string[];
  auditedRoutes: string[];
  rules: string[];
  diagnostics: AccessibilityDiagnostic[];
  checks: string[];
  clientBoundary: {
    buildOutput: 'static-only';
    browserRequests: 'configured-origins-only';
    dynamicServices: 'external-api';
    secrets: 'private-excluded';
    apis: Array<{ id: string; origin: string; auth: 'bearer' | 'x-api-key'; clientToken: 'configured' | 'none' }>;
    integrations: Array<{ id: string; purpose: string; consent: string; load: string; privacyPolicy: 'acknowledged' }>;
  };
  browser?: string;
  viewports: string[];
  screenshots: Array<{ route: string; viewport: string; path: string; annotatedPath?: string }>;
  detailScreenshots: AccessibilityDetailScreenshot[];
  keyboardChecks: string[];
  dynamicChecks: string[];
  contrastChecks: string[];
  manualTests: string[];
  durationMs: number;
};
