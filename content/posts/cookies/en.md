---
title: "How we build a plugin"
description: Use the Cookie selector as a reference for behavior contracts, safe rendering, theme configuration, and partial translations.
date: 2026-09-07
category: tutorial
---

# How we build a plugin

The Cookie selector is our reference implementation for a reusable plugin. It combines a visitor-facing interface, browser state, optional scripts, localized messages, and a policy link without putting HTML in every post.

We use the Cookie selector as the reference implementation and borrow a useful transparency pattern from [cookie-policy generators](https://www.toolszone.net/zh/tools/cookie-policy-generator): show categories, providers, retention, and consent requirements together so a visitor can review them. We borrow the presentation idea only; the selector is still a consent control, not legal advice or a policy generator. Keep the reviewed policy page in Markdown.

## 1. Start with a behavior contract

Before writing the module, define the states it must support:

- essential functionality is available immediately;
- optional categories are off by default;
- an affirmative choice is required before an optional script loads;
- visitors can reopen the selector and save “essential only”;
- withdrawal prevents later loads but cannot undo work a script already performed.

This contract keeps the plugin reusable. Posts describe the capability; they do not copy its markup or browser logic.

## 2. Keep the module self-contained

The default theme keeps the implementation under one directory:

```text
themes/default/plugins/cookies/
  index.ts
  script.js
  style.css
  messages.yml
```

`index.ts` defines the capability and its resources. `script.js` owns consent storage and loading decisions. `style.css` owns the selector appearance. `messages.yml` owns the user-facing translations.

## 3. Register the capability in code

The plugin definition is code-owned. It registers the capability, resources, localized messages, defaults, fixed provider adapters, and the shape of the instance data; it does not contain this site's account values or enablement choices. A shortened version of the real definition looks like this:

```ts
import type { ThemePluginDefinition } from '../../../../src/theme-api.ts';

export const plugin: ThemePluginDefinition = {
  implementation: 'plugins/cookies/index.ts',
  resources: {
    // Code registers resource ownership; the site instance stays in theme.yml.
    styles: ['plugins/cookies/style.css'],
    scripts: ['plugins/cookies/script.js']
  },
  i18n: 'plugins/cookies/messages.yml',
  defaults: {
    enabled: true,
    categories: [
      { id: 'essential', required: true, default: true },
      { id: 'analytics', required: false, default: false },
      { id: 'security', required: false, default: false },
      { id: 'social', required: false, default: false }
    ],
    integrations: [
      { provider: 'google-analytics', enabled: false, measurementId: '', category: 'analytics' },
      { provider: 'google-ads', enabled: false, tagId: '', category: 'advertising' }
    ],
    gatedScripts: []
  },
  schema: {
    // The schema describes data; it never accepts executable provider code.
    enabled: { type: 'boolean' },
    categories: { type: 'array' },
    integrations: {
      type: 'array',
      items: {
        type: 'object',
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
    gatedScripts: { type: 'array' }
  }
};
```

Register it once in `themes/default/plugins/index.ts`:

```ts
import { plugin as chrome } from './chrome/index.ts';
import { plugin as cookies } from './cookies/index.ts';
import { plugin as language } from './language/index.ts';
import { plugin as search } from './search/index.ts';
import { plugin as toc } from './toc/index.ts';

export const plugins = { chrome, search, toc, privacyConsent: cookies, language };
```

The real schema describes an array of provider instances. Built-in provider values are `google-analytics`, `google-ads`, `cloudflare-web-analytics`, `baidu-tongji`, `recaptcha`, `hcaptcha`, `turnstile`, and `x-for-websites`. These are code-owned adapter names, not IDs invented for a site. Unknown entries and extra fields remain inert until a theme module registers their behavior; configuration is never executable code.

## 4. Use real provider identifiers in theme data

The active theme configures the plugin instance. Keep optional categories disabled until they are intentionally wired to a reviewed service:

```yaml
# themes/default/theme.yml
plugins:
  privacyConsent:
    enabled: true
    provider: Pageskill
    storage: cookie
    retentionDays: 365
    categories:
      - id: essential
        required: true
        default: true
        retentionDays: 365
      - id: analytics
        required: false
        default: false
        retentionDays: 0
      - id: security
        required: false
        default: false
        retentionDays: 0
      - id: social
        required: false
        default: false
        retentionDays: 0
    integrations:
      - provider: google-analytics
        enabled: false
        measurementId: '' # GA4 value such as G-XXXXXXXXXX
        category: analytics
      - provider: google-ads
        enabled: false
        tagId: '' # Google tag value such as AW-XXXXXXXXXX or GT-XXXXXXXX
        category: advertising
      - provider: cloudflare-web-analytics
        enabled: false
        token: '' # token from the Cloudflare beacon snippet
        category: analytics
      - provider: baidu-tongji
        enabled: false
        siteSignature: '' # the value after hm.baidu.com/hm.js?
        category: analytics
      - provider: recaptcha
        enabled: false
        siteKey: ''
        category: security
      - provider: hcaptcha
        enabled: false
        siteKey: ''
        category: security
      - provider: turnstile
        enabled: false
        siteKey: ''
        category: security
      - provider: x-for-websites
        enabled: false
        category: social
    gatedScripts: []
```

The fields follow the provider's actual web contract: [Google Analytics measurement IDs](https://support.google.com/analytics/answer/12270356) use `G-...`; a Google Ads `tagId` is a Google tag identifier such as `AW-...` or `GT-...`, not a made-up `conversionId`. The plugin uses Google's basic consent-mode flow: it blocks the tag before a choice, then sends the documented `analytics_storage`, `ad_storage`, `ad_user_data`, and `ad_personalization` states. It initializes the consent-aware Google tag; it does not invent a conversion event or label. [Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/get-started/) supplies the public beacon `token`, while [Baidu Tongji](https://tongji.baidu.com/web/help/article?id=219) supplies the `siteSignature` used after `hm.js?`. If Cloudflare proxy or Pages automatic Web Analytics injection is enabled, disable that separate injection or it will bypass this chooser. The category is a site policy choice, not a provider identifier.

Set `enabled: true` only after reviewing the provider's terms, privacy notice, retention, and CSP. The CAPTCHA adapters use the official scripts and markers for [reCAPTCHA](https://developers.google.com/recaptcha/docs/display), [hCaptcha](https://docs.hcaptcha.com/), and [Turnstile](https://developers.cloudflare.com/turnstile/get-started/). Their `siteKey` is public; secret keys and server-side token verification stay in `backend/handler.ts` or another private service. X has no account ID in this adapter: [X for Websites](https://help.x.com/en/using-x/embed-x-feed) is loaded on demand from its official widget resource only when an X marker exists.

Not every integration is literally a cookie. Cloudflare Web Analytics is designed around a beacon token, Turnstile performs a challenge, and X may receive request or cookie information when its widget runs. Keep the category and retention explanation aligned with the provider's current notice instead of claiming that every optional provider creates the same cookie.

The X integration is on-demand: after consent, `platform.x.com/widgets.js` loads only when the page contains an X/Twitter embed marker. The selector does not load social embeds before consent. Other provider-specific fields can remain in the theme configuration for a future registered integration, but they do not cause a network request by themselves.

The stable policy route and controller data remain site data:

```yaml
# config.yml
privacy:
  cookieConsent:
    policyRoute: /:locale/privacy/
```

Put the reviewed policy at `content/pages/privacy/<locale>.md`. Do not put HTML, JavaScript, CSS, provider code, or a hidden script URL in YAML or Markdown. `config.yml` is read during generation and is not copied into `dist/public`; the generated backend has no route that writes it. Configuration is data; the plugin module owns executable behavior.

## 5. Render with safe boundaries

`renderCookieConsent` builds a fixed dialog and banner from the validated context. Dynamic values follow two separate rules:

```ts
// Text and URLs use separate safe render paths.
const label = context.escapeHtml(category.label);
const href = context.safeUrl(privacy.policyHref);
```

Labels and metadata are escaped as text. Policy and gated-script URLs pass through `safeUrl`; unsafe protocols are rejected. Built-in provider URLs are fixed in the registered browser implementation, while canonical provider names and public tokens/keys are treated as data. The browser script creates elements with DOM APIs and only loads optional resources after consent. There is no `innerHTML`, `eval`, arbitrary attribute, or configuration-provided markup in the plugin surface.

Provider and retention fields are deliberately visible in the selector. They help visitors understand what a category represents, while the legal policy remains a human-reviewed page rather than silently generated legal text.

## 6. Put nav and footer insertions in the theme config

Shell insertion points are also structured theme options. Primary navigation links still belong to `config.yml`; this feature adds safe theme-controlled links before or after the standard links:

```yaml
# themes/default/theme.yml
plugins:
  chrome:
    enabled: true
    navigation:
      enabled: true
      before: []
      after:
        - label: Plugin tutorial
          labels:
            zh-sg: 插件教程
            zh-tw: 外掛教學
          href: /:locale/posts/cookies/
    footer:
      enabled: true
      before: []
      after: []
```

Only `label`, optional localized `labels`, and `href` are accepted. The compiler resolves `:locale`, limits the number and length of links, rejects unsafe or traversal URLs, and the shell escapes the final label. Raw HTML, scripts, styles, selectors, and arbitrary attributes have no configuration field.

## 7. Add translations without blocking a release

Site languages stay in `config.yml`, not in plugin settings:

```yaml
activeLocales:
  - zh-sg
  - zh-tw
  - en
i18n:
  fallbackLocale: en
  contentFallback: true
```

Keep Cookie UI messages beside the plugin in `messages.yml`. If a new locale is only 50% translated, missing UI keys merge from `en`; a missing whole content document uses the configured content fallback. An existing Markdown document remains exactly as authored, so its untranslated paragraphs are not silently machine-translated or mixed with fallback paragraphs.

## 8. Verify the consent states

```powershell
npm run compile-theme
npm run g
npm run s
```

In a fresh browser session, verify that no optional script loads before a choice. Accept each configured category separately and verify only its reviewed provider loads: Google Analytics, Google Ads, Cloudflare Web Analytics, CAPTCHA, or an X embed when its marker exists. For CAPTCHA, verify the token on the server; for X, verify an embed is present before the widget request. Reopen Cookie settings, save “essential only,” and verify later loads stop. Also check the policy link, keyboard focus, language links, and the nav/footer insertion in each active locale.

## Expected result

The Cookie selector is one reusable theme plugin with localized UI, explicit category metadata, extensible provider configuration, safe consent-aware loading, and a reviewed policy link. Posts remain Markdown, and a theme can add small shell links without gaining an HTML or script injection surface.

## Common traps

Do not enable analytics, ads, CAPTCHA, or social embeds by default; do not treat an unknown third-party URL as trusted; and do not assume withdrawal can undo an earlier script. Extra integration data is allowed for extensibility, but it is inert until a code module consumes it. Do not put provider secrets in `theme.yml`, add a `language` setting to the plugin, or duplicate the selector in individual posts. If a translation is incomplete, let the configured fallback fill missing keys and finish the content deliberately.

## Next step

Read [Develop a reusable plugin](/en/posts/plugins/) to build a smaller capability from the same module pattern.
