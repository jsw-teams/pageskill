---
title: Configure Cookie consent safely
description: Keep optional categories off until consent and load only administrator-reviewed HTTP(S) scripts.
pattern: docs
---

# Configure Cookie consent safely

Pageskill's `privacyConsent` theme plugin presents a localized Cookie selector. Essential consent storage remains available, optional categories start off, and a gated script is inserted only after the visitor chooses its category. The existing preference key is `pagekiln-consent`; keep it when changing the theme so current choices remain compatible.

## Enable the two sides of the feature

The site config enables the feature, while the active theme plugin supplies the browser code and presentation. In the site root, keep both switches on:

```yaml
plugins:
  privacyConsent:
    enabled: true
privacy:
  cookieConsent:
    enabled: true
    storage: cookie
    retentionDays: 365
```

The default theme already declares its trusted `privacyConsent` plugin script. A copied theme must keep that plugin declaration and its reviewed browser module. The neutral starter does not include a complete Cookie plugin; use the repository's default theme or copy a theme whose catalog shows `privacyConsent`.

## Define categories in the site config

Add optional categories with `default: false` in the site root `config.yml`:

```yaml
privacy:
  cookieConsent:
    categories:
      - id: essential
        required: true
        default: true
      - id: analytics
        required: false
        default: false
```

## Register one gated script in the active theme

Edit `themes/<active>/theme.yml`, separately from the `privacy.cookieConsent` block above. Add the script under the trusted theme plugin and merge this fragment into the existing mapping:

```yaml
plugins:
  privacyConsent:
    enabled: true
    script: scripts/cookie-consent.js
    gatedScripts:
      - source: https://analytics.example.test/script.js
        category: analytics
```

Only use an HTTP(S) source that the administrator or theme author has reviewed. The protocol check blocks `javascript:` and `data:` injection, but it does not prove that a third-party script is safe. Do not concatenate a query, form, or URL value into `gatedScripts`, and do not let a visitor choose the `src`.

## Verify before and after consent

Run the source checks and build:

```bash
pageskill check
pageskill build
```

The expected HTML contains a data template for the gated script, while the optional external script is not loaded before consent. Open the built site with `pageskill s`, clear an old `pagekiln-consent` choice, and use the browser Network panel:

1. Before making a choice, no request to `analytics.example.test` should appear.
2. Select the `analytics` category and save. The browser may then request the configured HTTP(S) script.
3. Reject optional categories or withdraw the choice. Future gated loads follow the new state, but withdrawal cannot undo third-party JavaScript that already ran or data that was already sent. A custom script must listen for `pagekiln:consent` and implement its own cleanup or require a reload; do not promise that every provider stops immediately.

The framework presents the selector and gates the configured source; an HTTP(S) check only validates the protocol and does not make a script trustworthy. The site owner remains responsible for the provider's privacy notice, data processing, retention, and legal basis.

## Common errors

- **The banner is missing:** check both `plugins.privacyConsent.enabled` and `privacy.cookieConsent.enabled`, then confirm the theme plugin is enabled.
- **The script never loads after consent:** make sure the category id in `gatedScripts` exactly matches an optional category and inspect the browser Network panel.
- **A `javascript:` or `data:` URL was ignored:** use a reviewed `http://` or `https://` source; protocol validation is intentionally conservative.
- **A visitor can change the source:** remove that input path. The `src` must come from trusted site or theme configuration.
- **Withdrawal is expected to undo a script:** listen for `pagekiln:consent` in custom code and define cleanup or a reload path; already executed code and sent data cannot be recalled.
- **Existing consent disappeared after a redesign:** keep the `pagekiln-consent` key and its compatible value shape.

## Expected result and next step

Optional scripts now wait for an affirmative category choice, and the trusted source is separated from visitor data. Continue with [Customize rendering](/en/guide/customize/) to review a theme extension, or return to the [Guide](/en/guide/).

[Back to the Guide](/en/guide/) · [Next: Customize rendering](/en/guide/customize/)
