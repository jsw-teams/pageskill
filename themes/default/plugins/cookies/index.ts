import type { ThemePluginDefinition, ThemeShellContext } from '../../../../src/theme-api.ts';

/** Render consent controls from validated compiler data; provider code stays in the browser module. */
export function renderCookieConsent(context: ThemeShellContext): { markup: string; triggerMarkup: string } {
  const privacy = context.privacy;
  if (!privacy.enabled) return { markup: '', triggerMarkup: '' };
  const escape = context.escapeHtml;
  const integrationMarkup = escape(JSON.stringify(privacy.integrations));
  const gatedMarkup = privacy.gatedScripts.map(script => `<template data-cookie-script data-cookie-category="${escape(script.category)}" data-cookie-src="${context.safeUrl(script.href)}"></template>`).join('');
  const retentionUnit = context.doc.locale.startsWith('zh') ? '天' : 'days';
  const providerLabel = context.translate('cookieConsent.providerLabel', context.doc.locale.startsWith('zh') ? '提供者' : 'Provider');
  const retentionLabel = context.translate('cookieConsent.retentionLabel', context.doc.locale.startsWith('zh') ? '保存期限' : 'Retention');
  const retentionSession = context.translate('cookieConsent.retentionSession', context.doc.locale.startsWith('zh') ? '会话期间' : 'Session');
  const categoryMarkup = privacy.categories.map(category => {
    const retention = category.retentionDays > 0 ? `${category.retentionDays} ${retentionUnit}` : retentionSession;
    const metadata = `<span class="cookie-option-meta">${category.provider ? `<span><span class="cookie-option-meta-label">${escape(providerLabel)}</span>${escape(category.provider)}</span>` : ''}<span><span class="cookie-option-meta-label">${escape(retentionLabel)}</span>${escape(retention)}</span></span>`;
    return `<label class="cookie-option"><input type="checkbox" data-cookie-category="${escape(category.id)}"${category.required ? ' checked disabled' : category.defaultValue ? ' checked' : ''}><span><strong>${escape(category.label)}</strong><small>${escape(category.description)}</small>${metadata}</span></label>`;
  }).join('');
  const markup = `<section class="privacy-consent" data-cookie-consent data-cookie-audience="human" data-cookie-version="1" data-cookie-storage="${escape(privacy.storage)}" data-cookie-retention-days="${privacy.retentionDays}" data-cookie-integrations="${integrationMarkup}" aria-label="${escape(privacy.bannerLabel)}"><div class="cookie-banner" data-cookie-banner hidden role="region" aria-labelledby="cookie-banner-title"><div class="cookie-banner-copy"><p id="cookie-banner-title"><strong>${escape(privacy.title)}</strong></p><p>${escape(privacy.description)}</p></div><div class="cookie-actions"><button class="button-secondary" type="button" data-cookie-action="reject-optional">${escape(privacy.rejectLabel)}</button><button class="button-primary" type="button" data-cookie-action="open" aria-controls="cookie-dialog">${escape(privacy.settingsLabel)}</button><button class="button-primary" type="button" data-cookie-action="accept-all">${escape(privacy.acceptLabel)}</button></div><p class="privacy-links"><a href="${privacy.policyHref}">${escape(privacy.policyLabel)}</a></p></div><dialog id="cookie-dialog" class="cookie-dialog" data-cookie-dialog aria-labelledby="cookie-dialog-title" aria-describedby="cookie-dialog-description"><form method="dialog" class="cookie-dialog-card"><div class="cookie-dialog-heading"><h2 id="cookie-dialog-title">${escape(privacy.title)}</h2><button class="cookie-close" type="button" data-cookie-action="close" aria-label="${escape(privacy.closeLabel)}">×</button></div><p id="cookie-dialog-description">${escape(privacy.description)}</p><fieldset><legend>${escape(privacy.bannerLabel)}</legend>${categoryMarkup}</fieldset><p class="privacy-links"><a href="${privacy.policyHref}">${escape(privacy.policyLabel)}</a></p><div class="cookie-actions"><button class="button-secondary" type="button" data-cookie-action="reject-optional">${escape(privacy.rejectLabel)}</button><button class="button-primary" type="button" data-cookie-action="save">${escape(privacy.saveLabel)}</button></div></form></dialog>${gatedMarkup}<script type="module" src="${escape(privacy.scriptSrc)}"></script></section>`;
  return { markup, triggerMarkup: `<button class="privacy-trigger" type="button" data-cookie-action="open" aria-controls="cookie-dialog">${escape(privacy.settingsLabel)}</button>` };
}

export const plugin: ThemePluginDefinition = {
  implementation: 'plugins/cookies/index.ts',
  resources: { styles: ['plugins/cookies/style.css'], scripts: ['plugins/cookies/script.js'] },
  i18n: 'plugins/cookies/messages.yml',
  defaults: {
    enabled: true,
    provider: 'Pageskill',
    storage: 'cookie',
    retentionDays: 365,
    categories: [
      { id: 'essential', required: true, default: true, retentionDays: 365 },
      { id: 'analytics', required: false, default: false, retentionDays: 0 },
      { id: 'advertising', required: false, default: false, retentionDays: 0 },
      { id: 'security', required: false, default: false, retentionDays: 0 },
      { id: 'social', required: false, default: false, retentionDays: 0 }
    ],
    // Provider names and fields mirror the public web integrations. The
    // browser module owns their fixed script endpoints; the site only supplies
    // public account values and the consent category.
    integrations: [
      { provider: 'google-analytics', enabled: false, measurementId: '', category: 'analytics' },
      { provider: 'google-ads', enabled: false, tagId: '', category: 'advertising' },
      { provider: 'cloudflare-web-analytics', enabled: false, token: '', category: 'analytics' },
      { provider: 'baidu-tongji', enabled: false, siteSignature: '', category: 'analytics' },
      { provider: 'recaptcha', enabled: false, siteKey: '', category: 'security' },
      { provider: 'hcaptcha', enabled: false, siteKey: '', category: 'security' },
      { provider: 'turnstile', enabled: false, siteKey: '', category: 'security' },
      { provider: 'x-for-websites', enabled: false, category: 'social' }
    ],
    gatedScripts: [],
    // Consent wording is configured per theme instance; provider capability
    // registration remains in this code-owned schema and implementation.
    copy: {}
  },
  schema: {
    enabled: { type: 'boolean' },
    provider: { type: 'string' },
    storage: { type: 'string', enum: ['cookie', 'localStorage'] },
    retentionDays: { type: 'number', min: 0, max: 3650 },
    categories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          required: { type: 'boolean' },
          default: { type: 'boolean' },
          defaultValue: { type: 'boolean' },
          provider: { type: 'string' },
          label: { type: 'string' },
          description: { type: 'string' },
          retentionDays: { type: 'number', min: 0, max: 3650 }
        }
      }
    },
    integrations: {
      type: 'array',
      items: {
        type: 'object',
        // A third-party theme can extend this data shape, but it must register
        // its own browser/server implementation before an unknown provider can
        // perform any work.
        additionalProperties: true,
        properties: {
          provider: { type: 'string', required: true },
          enabled: { type: 'boolean' },
          category: { type: 'string' },
          measurementId: { type: 'string' },
          tagId: { type: 'string' },
          token: { type: 'string' },
          siteSignature: { type: 'string' },
          siteKey: { type: 'string' }
        }
      }
    },
    gatedScripts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          src: { type: 'string' },
          source: { type: 'string' },
          category: { type: 'string' }
        }
      }
    },
    // Locale maps may contain only the labels/categories translated so far.
    copy: { type: 'object', additionalProperties: true }
  }
};
