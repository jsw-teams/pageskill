---
title: "Cookie choices: ask before loading"
description: Reuse the existing Cookie plugin so optional services start disabled and run only after consent.
date: 2026-09-07
---

# Cookie choices: ask before loading

Cookie consent is a visitor choice. Pageskill already provides the `privacyConsent` plugin; optional categories start disabled and load their services only after a visitor agrees.

## 1. Keep the provided plugin

Keep the plugin and policy entry in the site `config.yml`:

```yaml
plugins:
  privacyConsent:
    enabled: true
privacy:
  cookieConsent:
    enabled: true
    policyRoute: /:locale/privacy/
```

Put the policy page under `content/pages/privacy/` and prepare all three languages. Essential features can run; analytics and advertising should keep `default: false`.

## 2. Register trusted scripts only in the theme

When an optional script is truly needed, put its source and category in `gatedScripts` in the theme `theme.yml`, where the site maintainer can review it:

```yaml
plugins:
  privacyConsent:
    enabled: true
    gatedScripts:
      - src: https://analytics.example/script.js
        category: analytics
```

The script source is trusted configuration, not visitor input. Withdrawal stops later loads, but it cannot undo an action a script already performed.

## 3. Generate and check the prompt

```powershell
pageskill g
pageskill s
```

View the site with no choice, with an optional category accepted, and after withdrawal. Check that the policy and language links work.

## Expected result

Optional scripts do not run on the first visit. They load only after an explicit choice, and the footer still opens the policy and Cookie settings.

## Common trap

Do not put a script URL in article text or make an optional category accepted by default. The trusted `theme.yml` list and the plugin switch must agree.

## Next step

Read [Change the style, or ask an Agent](/en/posts/customize/) to make one reusable theme change.
