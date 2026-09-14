import type { ComponentPrivacyContext } from '../theme-api.ts';

type PrivacyRenderTools = {
  escapeHtml: (value: unknown) => string;
  safeUrl: (value: string) => string;
  translate: (key: string, fallback: string) => string;
};

/** Render the shared fallback markup used by the default consent component and a
 * theme without a custom shell. Provider scripts still come from adapters. */
export function renderPrivacyConsent(privacy: ComponentPrivacyContext, tools: PrivacyRenderTools): { markup: string; triggerMarkup: string } {
  if (!privacy.runtimeEnabled) return { markup: '', triggerMarkup: '' };
  const escape = tools.escapeHtml;
  const integrationMarkup = escape(JSON.stringify(privacy.integrations));
  const scriptMarkup = privacy.scriptSrc ? `<script type="module" src="${tools.safeUrl(privacy.scriptSrc)}"></script>` : '';
  const hasPlaceholder = privacy.integrations.some(integration => integration.placeholder === true);
  const placeholderAttributes = hasPlaceholder
    ? ` data-cookie-social-placeholder-title="${escape(privacy.socialPlaceholderTitle || 'Social content is paused')}" data-cookie-social-placeholder-description="${escape(privacy.socialPlaceholderDescription || 'Allow social content to load this embed.')}" data-cookie-social-placeholder-allow="${escape(privacy.socialPlaceholderAllowLabel || 'Allow social content')}"`
    : '';

  if (!privacy.enabled) {
    return {
      markup: `<section class="privacy-consent" data-cookie-consent data-cookie-ui="false" data-cookie-version="1" data-cookie-decision-retention-days="${privacy.decisionRetentionDays}" data-cookie-integrations="${integrationMarkup}"${placeholderAttributes}>${scriptMarkup}</section>`,
      triggerMarkup: ''
    };
  }

  const providerLabel = tools.translate('privacyConsent.providerLabel', 'Providers');
  const categoryMarkup = privacy.categories.map(category => {
    const providers = category.providers.length
      ? `<span class="cookie-option-meta"><span class="cookie-option-meta-label">${escape(providerLabel)}</span>${escape(category.providers.join(', '))}</span>`
      : '';
    return `<label class="cookie-option"><input type="checkbox" data-cookie-purpose="${escape(category.purpose)}"><span><strong>${escape(category.label)}</strong><small>${escape(category.description)}</small>${providers}</span></label>`;
  }).join('');
  const markup = `<section class="privacy-consent" data-cookie-consent data-cookie-ui="true" data-cookie-audience="human" data-cookie-version="1" data-cookie-decision-retention-days="${privacy.decisionRetentionDays}" data-cookie-integrations="${integrationMarkup}"${placeholderAttributes} aria-label="${escape(privacy.bannerLabel)}"><div class="cookie-banner" data-cookie-banner hidden role="region" aria-labelledby="cookie-banner-title"><div class="cookie-banner-copy"><p id="cookie-banner-title"><strong>${escape(privacy.title)}</strong></p><p>${escape(privacy.description)}</p></div><div class="cookie-actions"><button class="button-secondary" type="button" data-cookie-action="reject-optional">${escape(privacy.rejectLabel)}</button><button class="button-primary" type="button" data-cookie-action="open" aria-controls="cookie-dialog">${escape(privacy.settingsLabel)}</button><button class="button-primary" type="button" data-cookie-action="accept-all">${escape(privacy.acceptLabel)}</button></div><p class="privacy-links"><a href="${tools.safeUrl(privacy.policyHref)}">${escape(privacy.policyLabel)}</a></p></div><dialog id="cookie-dialog" class="cookie-dialog" data-cookie-dialog aria-modal="true" aria-labelledby="cookie-dialog-title" aria-describedby="cookie-dialog-description"><form method="dialog" class="cookie-dialog-card"><div class="cookie-dialog-heading"><h2 id="cookie-dialog-title">${escape(privacy.title)}</h2><button class="cookie-close" type="button" data-cookie-action="close" aria-label="${escape(privacy.closeLabel)}">×</button></div><p id="cookie-dialog-description">${escape(privacy.description)}</p><fieldset><legend>${escape(privacy.bannerLabel)}</legend>${categoryMarkup}</fieldset><p class="privacy-links"><a href="${tools.safeUrl(privacy.policyHref)}">${escape(privacy.policyLabel)}</a></p><div class="cookie-actions"><button class="button-secondary" type="button" data-cookie-action="reject-optional">${escape(privacy.rejectLabel)}</button><button class="button-primary" type="button" data-cookie-action="save">${escape(privacy.saveLabel)}</button></div></form></dialog>${scriptMarkup}</section>`;
  return {
    markup,
    triggerMarkup: `<button class="privacy-trigger" type="button" data-cookie-action="open" aria-controls="cookie-dialog">${escape(privacy.settingsLabel)}</button>`
  };
}
