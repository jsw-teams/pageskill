import assert from 'node:assert/strict';
import test from 'node:test';
import { validateConfigLayer } from '../src/runtime/config/validate.js';
import { resolveConfiguredIntegrations, validateConfiguredIntegrations } from '../src/runtime/config/integrations.js';
import { renderPrivacyConsent } from '../src/runtime/lib/privacy-consent.js';
import { integrationAdapters } from '../.pageskill/theme-runtime/themes/default/components/consent/integrations.js';

const theme = { components: { consent: { integrations: integrationAdapters } } };

test('site integrations use adapter-owned purpose and default enabled state', () => {
  const config = {
    integrations: {
      'google-analytics': { measurementId: 'G-AAA' },
      turnstile: { siteKey: '0x4AAAA' },
      'google-ads': { enabled: false, tagId: 'AW-PAUSED' }
    }
  };
  validateConfiguredIntegrations(config, theme);
  const resolved = resolveConfiguredIntegrations(config, theme);
  assert.deepEqual(resolved.map(item => ({ id: item.id, enabled: item.enabled, purpose: item.purpose, consent: item.consent, load: item.load })), [
    { id: 'google-analytics', enabled: true, purpose: 'measurement', consent: 'required', load: 'consent' },
    { id: 'turnstile', enabled: true, purpose: 'fraud-prevention', consent: 'none', load: 'on-demand' },
    { id: 'google-ads', enabled: false, purpose: 'advertising', consent: 'required', load: 'consent' }
  ]);
});

test('adapter schema rejects site purpose, arbitrary scripts, and secrets', () => {
  assert.throws(() => validateConfiguredIntegrations({ integrations: { 'google-analytics': { measurementId: 'G-AAA', purpose: 'advertising' } } }, theme), /purpose.*not supported/);
  assert.throws(() => validateConfigLayer({ integrations: { turnstile: { siteKey: 'x', gatedScripts: [] } } }), /gatedScripts.*not allowed/);
  assert.throws(() => validateConfiguredIntegrations({ integrations: { turnstile: { siteKey: 'x', secret: 'private' } } }, theme), /secret.*not supported/);
  assert.throws(() => validateConfiguredIntegrations({ integrations: { 'google-analytics': { measurementId: 'UA-OLD' } } }, theme), /invalid format/);
  assert.throws(() => validateConfigLayer({ privacyConsent: {} }), /privacyConsent was removed/);
  assert.throws(() => validateConfigLayer({ privacy: { cookieConsent: {} } }), /cookieConsent was removed/);
  for (const field of ['provider', 'storage', 'retentionDays', 'categories', 'integrations', 'gatedScripts', 'copy']) {
    const expected = field === 'gatedScripts' ? /privacy\.gatedScripts.*not allowed/ : new RegExp(`privacy\\.${field} was removed`);
    assert.throws(() => validateConfigLayer({ privacy: { [field]: {} } }), expected);
  }
});

test('consent markup is absent without integrations and only lists configured purposes', () => {
  const tools = { escapeHtml: value => String(value), safeUrl: value => value, translate: (_key, fallback) => fallback };
  const empty = renderPrivacyConsent({ runtimeEnabled: false, enabled: false, scriptSrc: '', decisionRetentionDays: 365, policyHref: '/en/privacy/', title: 'Privacy choices', description: 'Choose', bannerLabel: 'Purposes', settingsLabel: 'Settings', acceptLabel: 'Accept all', rejectLabel: 'Essential only', saveLabel: 'Save', closeLabel: 'Close', policyLabel: 'Privacy', categories: [], integrations: [] }, tools);
  assert.equal(empty.markup, '');
  assert.equal(empty.triggerMarkup, '');

  const rendered = renderPrivacyConsent({ runtimeEnabled: true, enabled: true, scriptSrc: '/assets/cookie.js', decisionRetentionDays: 365, policyHref: '/en/privacy/', title: 'Privacy choices', description: 'Choose', bannerLabel: 'Purposes', settingsLabel: 'Settings', acceptLabel: 'Accept all', rejectLabel: 'Essential only', saveLabel: 'Save', closeLabel: 'Close', policyLabel: 'Privacy', categories: [{ purpose: 'measurement', label: 'Measurement', description: 'Only analytics', providers: ['Google Analytics'] }], integrations: [{ id: 'google-analytics', runtime: 'google-analytics', purpose: 'measurement', consent: 'required', load: 'consent', enabled: true, measurementId: 'G-AAA' }] }, tools);
  assert.match(rendered.markup, /data-cookie-ui="true"/);
  assert.match(rendered.markup, /Measurement/);
  assert.doesNotMatch(rendered.markup, /data-cookie-storage|data-cookie-retention-days|gatedScripts|retentionSession/);

  const direct = renderPrivacyConsent({ runtimeEnabled: true, enabled: false, scriptSrc: '/assets/cookie.js', decisionRetentionDays: 365, policyHref: '/en/privacy/', title: 'Privacy choices', description: 'Choose', bannerLabel: 'Purposes', settingsLabel: 'Settings', acceptLabel: 'Accept all', rejectLabel: 'Essential only', saveLabel: 'Save', closeLabel: 'Close', policyLabel: 'Privacy', categories: [], integrations: [{ id: 'turnstile', runtime: 'turnstile', purpose: 'fraud-prevention', consent: 'none', load: 'on-demand', enabled: true, siteKey: 'x' }] }, tools);
  assert.match(direct.markup, /data-cookie-ui="false"/);
  assert.doesNotMatch(direct.markup, /cookie-banner|cookie-dialog/);
});

test('on-demand social adapters provide a safe purpose-scoped placeholder', () => {
  assert.equal(integrationAdapters['x-for-websites'].placeholder, true);
  const tools = { escapeHtml: value => String(value), safeUrl: value => value, translate: (_key, fallback) => fallback };
  const rendered = renderPrivacyConsent({
    runtimeEnabled: true,
    enabled: true,
    scriptSrc: '/assets/cookie.js',
    decisionRetentionDays: 365,
    policyHref: '/en/privacy/',
    title: 'Privacy choices',
    description: 'Choose',
    bannerLabel: 'Purposes',
    settingsLabel: 'Settings',
    acceptLabel: 'Accept all',
    rejectLabel: 'Essential only',
    saveLabel: 'Save',
    closeLabel: 'Close',
    policyLabel: 'Privacy',
    socialPlaceholderTitle: 'Social content is paused',
    socialPlaceholderDescription: 'Allow social content to load this embed.',
    socialPlaceholderAllowLabel: 'Allow social content',
    categories: [{ purpose: 'social-embedding', label: 'Social content', description: 'Configured embeds', providers: ['X for Websites'] }],
    integrations: [{ id: 'x-for-websites', runtime: 'x-for-websites', purpose: 'social-embedding', consent: 'required', load: 'on-demand', enabled: true, placeholder: true }]
  }, tools);
  assert.match(rendered.markup, /data-cookie-social-placeholder-title="Social content is paused"/);
  assert.match(rendered.markup, /data-cookie-social-placeholder-allow="Allow social content"/);
});
