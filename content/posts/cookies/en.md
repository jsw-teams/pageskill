---
title: "Cookie choices: ask before loading"
description: Enable the Cookie plugin, keep optional categories off, and check withdrawal behavior.
date: 2026-09-07
---

# Cookie choices: ask before loading

Cookie consent is a visitor choice. Pageskill can keep optional services off until a visitor agrees, then stop later loads when that choice is withdrawn.

## 1. Enable the existing plugin

Keep the plugin option in `themes/default/theme.yml` and the stable policy route in `config.yml`:

```yaml
# themes/default/theme.yml
plugins:
  privacyConsent:
    enabled: true

# config.yml
privacy:
  cookieConsent:
    policyRoute: /:locale/privacy/
```

Put the policy page under `content/pages/privacy/` in every active locale.

The default implementation is the `themes/default/plugins/cookies/` module; its `index.ts`, CSS, script, and messages stay together.

## 2. Keep optional categories off

In `themes/default/theme.yml`, use `essential` for required storage and set optional categories to `default: false`:

```yaml
plugins:
  privacyConsent:
    categories:
      - id: essential
        required: true
        default: true
      - id: analytics
        required: false
        default: false
      - id: advertising
        required: false
        default: false
```

Site integrations belong in `config.yml` as data. Do not put a provider ID in an article or turn an optional category on by default.

The chooser shows each category's provider and retention explicitly, borrowing the useful transparency of a policy generator. It remains a visitor-consent control; keep the reviewed legal policy as `content/pages/privacy/<locale>.md` rather than generating legal text silently.

## 3. Register a trusted script

A script that should load only after consent belongs in the trusted theme plugin, not site config. Add it to the existing `plugin` export in `themes/default/plugins/cookies/index.ts`:

```ts
// Add this property to the existing plugin export.
defaults: {
  gatedScripts: [{ src: 'plugins/cookies/analytics.js', category: 'analytics' }]
}
```

Keep `gatedScripts` in this theme-owned `defaults` object. Keep policy/controller data in `config.yml`, and keep plugin options in `theme.yml`.

Create the reviewed file at `themes/default/plugins/cookies/analytics.js`. A relative `src` is resolved from the theme root and emitted under `/assets/theme/default/` with a fingerprint.

The category must be optional. Review the source and purpose before adding it; the consent check does not make an unknown third-party script safe.

## 4. Check all three states

```powershell
npm run g
npm run s
```

In a fresh browser session, confirm that no optional script loads before a choice. Accept analytics and confirm its script loads. Open Cookie settings again, save “essential only”, and confirm later loads stop.

## Expected result

Required features work immediately. Optional categories start disabled, load only after an affirmative choice, and the footer opens both the policy page and Cookie settings.

## Common trap

Withdrawal prevents future loads but cannot undo work a script already performed. Do not hide a script URL in Markdown, use a required category for analytics, or duplicate the plugin in every article.

## Next step

Read [Let visitors search pages and articles](/en/posts/search/) when the consent flow is stable.
