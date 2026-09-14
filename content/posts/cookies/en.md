---
kind: post
title: Configure integrations and privacy consent
description: Add only the real third-party services a site uses; trusted adapters provide validation, privacy purpose, and safe loading behavior.
date: 2026-09-07
category: tutorial
---

# Configure integrations and privacy consent

Integrations are site capabilities, not theme appearance options. Put them in the root `config.yml` (or one of its `extends` files), and let the active theme's trusted Provider Adapter supply the provider's schema, privacy purpose, consent requirement, and loader.

A site with no configured integration has no consent banner. The consent UI appears only when an active adapter says that its resource waits for a visitor choice. This keeps a plain static site from asking about a third-party service it does not use.

## 1. Configure only services this site uses

The smallest real example is:

```yaml
# config.yml
integrations:
  google-analytics:
    measurementId: G-XXXXXXXXXX
```

There is no `purpose`, `enabled: true`, provider catalog, category list, script URL, or HTML in this file. The presence of the provider node enables it by default. If a site needs to keep a public identifier while pausing the adapter, it may set `enabled: false`.

A site with more than one service lists each one by its registered adapter ID:

```yaml
integrations:
  google-analytics:
    measurementId: G-XXXXXXXXXX
  cloudflare-web-analytics:
    token: public-beacon-token
  turnstile:
    siteKey: 0x4AAAA...
```

Only public identifiers belong here. A CAPTCHA secret, signing key, or server-side verification token belongs in the deployment environment and is read by `backend/handler.ts`; it must not be placed in YAML.

## 2. Let the adapter own the contract

The default theme registers its providers in `themes/default/components/consent/integrations.ts`. Each adapter owns:

| Adapter metadata | Meaning |
| --- | --- |
| `schema` | Required public fields and identifier validation. |
| `privacy.purpose` | Stable machine purpose such as `measurement` or `advertising`. |
| `privacy.consent` | Whether the adapter waits for an optional consent choice. |
| `privacy.load` | Whether it loads immediately, after consent, or on demand. |
| runtime/resource | The trusted implementation and official provider URL. |

For example, Google Analytics is a `measurement` adapter whose tag waits for measurement consent. X for Websites is a `social-embedding` adapter that loads on demand when an embed marker is present. CAPTCHA adapters can also be on demand; the exact adapter policy is a technical loading contract, not a legal conclusion.

The site cannot change these facts by writing a different `purpose` or script URL. An unknown provider ID, unsupported field, malformed identifier, arbitrary `secret`, or executable field fails validation before generation.

## 3. Consent is derived from active integrations

Pageskill groups the active adapters by their registered purpose. If the site configures only Google Analytics, the dialog contains only the measurement purpose. Advertising, fraud prevention, and social embedding do not appear until a configured adapter actually needs them. `essential` is internal site operation and is never a required category to repeat in YAML.

The default behavior is:

- no active integration that needs consent: no banner and no consent dialog;
- a consent-required integration: show the localized consent UI and keep that resource unloaded until the purpose is selected;
- an on-demand integration: load only when its page feature requests it and its adapter policy permits it;
- `enabled: false`: do not load that adapter or list it as active.

Sites that need a different browser decision lifetime can use the narrowly scoped policy override:

```yaml
privacy:
  consent:
    decisionRetentionDays: 180
```

This controls how long the browser remembers the visitor's choice. It does not control how long Google, Cloudflare, or another provider keeps data. Provider retention belongs in the provider's own notice and the site's reviewed privacy policy.

If a site sets `privacy.consent.enabled: false` while configuring an adapter that requires consent, generation fails clearly. Pageskill never treats a disabled dialog as permission to load the provider without consent.

## 4. Understand the browser state

The browser stores the decision, not the provider configuration:

```json
{
  "version": 1,
  "purposes": {
    "measurement": false
  },
  "updatedAt": "2026-09-12T00:00:00.000Z"
}
```

Provider IDs, measurement IDs, site keys, and tokens are not copied into this state. When a site later adds a new purpose, that purpose starts as unselected; an old “accept all” decision does not silently authorize a future category. Accept all means all optional purposes declared by the current page and current configuration.

## 5. Keep policy and UI copy in the right layer

Write the reviewed policy as `content/pages/privacy/<locale>.md`. Generated privacy information can identify the configured providers and their adapter purposes, but it is not legal advice or a substitute for that page. The consent labels and purpose descriptions belong to the theme/component `messages.yml`, which supplies `zh-sg`, `zh-tw`, `en`, and the normal locale fallback chain. A site does not need a private `copy` object just to use the consent UI.

Do not add a third-party URL, inline script, `onclick`, HTML, or a secret to site configuration. Provider resources are fixed by trusted code, and browser withdrawal prevents later loads without pretending that it can undo a request already made.

## 6. Verify before enabling a provider

```powershell
npm run compile-runtime
npm run compile-theme
npm run compile-backend
page g --profile
page s
```

In a fresh browser session, confirm that a site without `integrations` has no banner. For a test site with a real adapter value, confirm that its resource is absent before consent, appears only for the selected purpose, and stops loading after optional purposes are withdrawn. Check the localized dialog in all active locales and inspect the generated catalog: it lists the code-owned provider registry separately from the site's configured, non-secret provider summaries.

For CAPTCHA, keep token verification on the server. For a social embed, use the adapter's safe placeholder or on-demand behavior instead of adding a hand-written script. Read [the privacy policy](/en/privacy/) before enabling a production integration.

## Expected result

The site author expresses an intent such as “use Google Analytics” with one public identifier. Pageskill knows how that provider is validated, which purpose it belongs to, when it may load, and how to present the choice without turning YAML into a programming language.

## Next step

Read [Develop a reusable component](/en/posts/components/) when the capability you need is not already registered by the theme.
