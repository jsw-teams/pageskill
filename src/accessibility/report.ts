import type { AccessibilityDiagnostic, AccessibilityReport } from './types.ts';

type ReportFormat = 'html' | 'pdf';

function escape(value: unknown): string {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function reportPath(value: unknown): string {
  return String(value || '').replace(/^\.pageskill\/reports\/accessibility\//, '');
}

function diagnosticRows(diagnostics: AccessibilityDiagnostic[]): string {
  return diagnostics.map((item, index) => `<tr><td>${index + 1}</td><td><span class="severity ${escape(item.level)}">${escape(item.level)}</span></td><td>${escape(item.rule)}</td><td>${escape(item.component || '-')}</td><td><code>${escape(item.route || item.sourceFile || '-')}</code></td><td>${escape(item.message)}</td></tr>`).join('');
}

function routeGroups(report: AccessibilityReport): string {
  const groups = new Map<string, string[]>();
  for (const route of report.auditedRoutes) {
    const locale = /^\/(zh-sg|zh-tw|en)(?:\/|$)/.exec(route)?.[1] || 'shared';
    const values = groups.get(locale) || [];
    values.push(route);
    groups.set(locale, values);
  }
  return [...groups].map(([locale, routes]) => `<section class="route-group"><h3>${escape(locale)}</h3><p>${routes.map(route => `<code>${escape(route)}</code>`).join(' ')}</p></section>`).join('');
}

function pdfScreenshots(report: AccessibilityReport): AccessibilityReport['screenshots'] {
  const annotated = report.screenshots.filter(item => item.annotatedPath);
  if (annotated.length) return annotated;
  // Full-page captures of content-heavy routes can be several screen-heights
  // tall. Shrinking those images onto paper makes their text unreadable, so
  // the printable baseline uses only the intentionally short entry and 404
  // routes. The HTML report retains every original capture.
  const preferredRoutes = ['/', '/404.html'];
  const selected: AccessibilityReport['screenshots'] = [];
  for (const route of preferredRoutes) {
    const match = report.screenshots.find(item => item.route === route && (item.viewport === '375x812' || item.viewport === '320x800'));
    if (match && !selected.includes(match)) selected.push(match);
  }
  if (!selected.length && report.screenshots[0]) selected.push(report.screenshots[0]);
  return selected.slice(0, 3);
}

function screenshots(report: AccessibilityReport, format: ReportFormat): string {
  const values = format === 'pdf' ? pdfScreenshots(report) : report.screenshots;
  if (!values.length) return '<p class="empty">No screenshots were produced.</p>';
  return values.map((item, index) => {
    const source = reportPath(item.annotatedPath || item.path);
    const kind = item.annotatedPath ? 'Issue evidence' : 'Representative baseline';
    return `<figure><img src="${escape(source)}" alt="${escape(`${kind} for ${item.route} at ${item.viewport}`)}"><figcaption><strong>Figure ${index + 1}. ${escape(kind)}</strong><span><code>${escape(item.route)}</code> at ${escape(item.viewport)}</span></figcaption></figure>`;
  }).join('');
}

function detailScreenshots(report: AccessibilityReport): string {
  const values = report.detailScreenshots || [];
  if (!values.length) return '<p class="empty">No component detail screenshots were available for this build.</p>';
  return values.map((item, index) => `<figure><img src="${escape(reportPath(item.path))}" alt="${escape(`${item.title} on ${item.route} at ${item.viewport}`)}"><figcaption><strong>Detail ${index + 1}. ${escape(item.title)}</strong><span>${escape(item.description)}</span><span><code>${escape(item.route)}</code> at ${escape(item.viewport)}</span></figcaption></figure>`).join('');
}

function configuredApis(report: AccessibilityReport): string {
  const apis = report.clientBoundary?.apis || [];
  if (!apis.length) return '<p class="empty">No browser API is configured in this build.</p>';
  return `<table><thead><tr><th>API id</th><th>Origin</th><th>Auth</th><th>Client token</th></tr></thead><tbody>${apis.map(api => `<tr><td><code>${escape(api.id)}</code></td><td><code>${escape(api.origin)}</code></td><td>${escape(api.auth)}</td><td>${escape(api.clientToken)}</td></tr>`).join('')}</tbody></table>`;
}

function configuredIntegrations(report: AccessibilityReport): string {
  const integrations = report.clientBoundary?.integrations || [];
  if (!integrations.length) return '<p class="empty">No third-party browser Provider is enabled in this build.</p>';
  return `<table><thead><tr><th>Provider</th><th>Purpose</th><th>Consent</th><th>Load</th><th>Privacy policy</th></tr></thead><tbody>${integrations.map(item => `<tr><td><code>${escape(item.id)}</code></td><td>${escape(item.purpose)}</td><td>${escape(item.consent)}</td><td>${escape(item.load)}</td><td>${escape(item.privacyPolicy)}</td></tr>`).join('')}</tbody></table>`;
}

export function accessibilityReportHtml(report: AccessibilityReport, format: ReportFormat = 'html'): string {
  const errors = report.diagnostics.filter(item => item.level === 'error').length;
  const warnings = report.diagnostics.filter(item => item.level === 'warning').length;
  const rows = diagnosticRows(report.diagnostics);
  const print = format === 'pdf';
  const clientBoundary = report.clientBoundary || { buildOutput: 'static-only', browserRequests: 'configured-origins-only', dynamicServices: 'external-api', secrets: 'private-excluded', apis: [], integrations: [] };
  const detailCount = report.detailScreenshots?.length || 0;
  const evidenceIntro = print
    ? `This printable report includes ${detailCount} focused Component details plus ${report.diagnostics.length ? 'annotated issue evidence' : 'a small readable responsive baseline sample'}. The companion HTML report and screenshots directory retain all ${report.summary.screenshotCount} captures at their original resolution.`
    : `This interactive report contains ${detailCount} focused Component details and all ${report.screenshots.length} responsive captures. Open an image to inspect it at its original resolution.`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pageskill accessibility report</title>
<style>
:root{color-scheme:light;--ink:#183128;--muted:#52655d;--line:#cbd8d2;--soft:#edf4f0;--error:#9d1c1c;--warning:#805b00}*{box-sizing:border-box}body{background:#fff;color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;margin:0}main{margin:0 auto;max-width:1180px;padding:40px 32px 72px}h1{font-size:2.3rem;line-height:1.08;margin:0 0 10px}h2{border-bottom:2px solid var(--line);font-size:1.45rem;margin:42px 0 18px;padding-bottom:7px}h3{font-size:1rem;margin:0 0 5px}.lede{color:var(--muted);font-size:1.05rem;margin:0 0 24px}.summary{display:grid;gap:12px;grid-template-columns:repeat(4,minmax(0,1fr));margin:24px 0}.metric{background:var(--soft);border-radius:10px;padding:14px}.metric strong{display:block;font-size:1.55rem}.metric span{color:var(--muted);font-size:.82rem}.status{font-weight:750;text-transform:capitalize}.scope{display:grid;gap:8px 24px;grid-template-columns:max-content 1fr}.scope dt{color:var(--muted);font-weight:700}.scope dd{margin:0}.severity{border-radius:999px;font-size:.75rem;font-weight:800;padding:2px 7px;text-transform:uppercase}.severity.error{background:#fdeaea;color:var(--error)}.severity.warning{background:#fff3cf;color:var(--warning)}table{border-collapse:collapse;font-size:.88rem;width:100%}th,td{border:1px solid var(--line);padding:8px;text-align:left;vertical-align:top}th{background:var(--soft)}td code,.route-group code{overflow-wrap:anywhere}.empty{background:var(--soft);border-radius:8px;padding:14px}.evidence-intro{color:var(--muted);max-width:78ch}.screenshots{display:grid;gap:26px;grid-template-columns:repeat(auto-fit,minmax(310px,1fr))}.screenshots figure{border:1px solid var(--line);border-radius:10px;margin:0;overflow:hidden}.screenshots img{background:#f7f7f7;display:block;height:auto;width:100%}.screenshots figcaption{display:grid;gap:2px;padding:10px 12px}.screenshots figcaption span{color:var(--muted);font-size:.84rem}.routes{column-count:2;column-gap:24px}.route-group{break-inside:avoid;margin-bottom:18px}.route-group p{display:grid;gap:4px;margin:0}.manual li{margin:.3rem 0}
${print ? `@page{size:A4;margin:16mm 15mm 20mm}body{font-size:10.5pt}main{max-width:none;padding:0}h1{font-size:24pt}h2{break-after:avoid;font-size:15pt;margin-top:24pt}.summary{grid-template-columns:repeat(4,1fr)}.metric{padding:9pt}.metric strong{font-size:17pt}table{font-size:8.5pt}thead{display:table-header-group}tr,figure,.client-boundary{break-inside:avoid}.visual-evidence{break-before:page}.screenshots{display:grid;grid-template-columns:1fr 1fr;gap:10pt}.screenshots figure{margin:0}.screenshots img{height:76mm;object-fit:contain;width:100%}.responsive-baselines .screenshots{display:block}.responsive-baselines .screenshots figure{margin:0 0 18pt}.responsive-baselines .screenshots img{height:auto;max-height:158mm}.routes{column-count:2}.full-evidence{display:none}` : `.screenshots figure a{color:inherit}`}
</style></head><body><main>
<header><h1>Accessibility report</h1><p class="lede">Pageskill four-layer development audit</p></header>
<section class="summary" aria-label="Audit summary"><div class="metric"><strong class="status">${escape(report.summary.status.replaceAll('-', ' '))}</strong><span>Status</span></div><div class="metric"><strong>${report.pages}</strong><span>Pages checked</span></div><div class="metric"><strong>${errors}</strong><span>Errors</span></div><div class="metric"><strong>${warnings}</strong><span>Warnings</span></div></section>
<section><h2>Scope and method</h2><dl class="scope"><dt>Browser</dt><dd>${escape(report.browser || 'Source checks only')}</dd><dt>Viewports</dt><dd>${escape(report.viewports.join(', '))}</dd><dt>Duration</dt><dd>${Math.max(0, report.durationMs / 1000).toFixed(1)} seconds</dd><dt>Evidence</dt><dd>${report.summary.screenshotCount} screenshots stored privately under <code>.pageskill/reports/accessibility/screenshots/</code></dd></dl><ul>${report.checks.map(check => `<li>${escape(check)}</li>`).join('')}</ul></section>
<section class="client-boundary"><h2>Client, API, and Provider boundary</h2><p>This report was generated automatically by <code>page c</code> from the current static build. Every Component uses one Client Runtime contract. Generated assets remain same-site; a Component with <code>client.api</code> may call only its named <code>config.apis</code> URL, including a configured third-party origin. Browser audit traffic is sandboxed and never invokes upstream services. Token values are never printed: static configuration contains only public client data, while private credentials require an external service. Browser Providers are separately governed by trusted adapters, consent policy, and localized privacy-policy acknowledgement.</p><dl class="scope"><dt>Build output</dt><dd>${escape(clientBoundary.buildOutput)}</dd><dt>Browser requests</dt><dd>${escape(clientBoundary.browserRequests)}</dd><dt>Dynamic services</dt><dd>${escape(clientBoundary.dynamicServices)}</dd><dt>Private secrets</dt><dd>${escape(clientBoundary.secrets)}</dd></dl><h3>Named APIs</h3>${configuredApis(report)}<h3>Third-party Providers</h3>${configuredIntegrations(report)}</section>
<section><h2>Diagnostics</h2>${rows ? `<table><thead><tr><th>#</th><th>Level</th><th>Rule</th><th>Component</th><th>Location</th><th>Message</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="empty">No accessibility diagnostics were found.</p>'}</section>
<section class="visual-evidence"><h2>Component detail evidence</h2><p class="evidence-intro">${escape(evidenceIntro)}</p><div class="screenshots">${detailScreenshots(report)}</div></section>
<section class="responsive-baselines"><h2>Responsive baselines</h2><div class="screenshots">${screenshots(report, format)}</div></section>
<section><h2>Audited routes</h2><div class="routes">${routeGroups(report)}</div></section>
<section class="manual"><h2>Manual follow-up</h2><ul>${report.manualTests.map(item => `<li>${escape(item)}</li>`).join('')}</ul></section>
</main></body></html>`;
}
