---
kind: post
title: Develop a reusable component
description: Add one self-contained theme component, register it once, and reuse it on every page.
date: 2026-09-08
category: tutorial
---

# Develop a reusable component

A theme component owns reusable browser behavior, styles, and messages. Register it once; posts stay Markdown and do not copy HTML.

## 1. Create one module directory

```text
themes/default/components/reading-tip/
  index.ts
  script.js
  style.css
  messages.yml
```

The directory owns its resources. `themes/default/index.ts` is the assembly entry, and the file selected by `theme.config`, normally `site/theme.yml`, holds this site's component instance overrides.

## 2. Configure a declared component first

Before changing code, inspect the component's schema and use its safe presentation options in `site/theme.yml`. Foundation components expose their switch, limits, shell slots, and optional localized copy as instance data. Third-party integrations are different: configure only real provider identifiers under root `integrations`; the adapter owns purpose and consent metadata:

```yaml
components:
  search:
    enabled: true
    maxResults: 8
    # A partial locale map inherits missing keys from messages.yml.
    copy:
      zh-sg:
        placeholder: Search this theme
  toc:
    enabled: true
    maxDepth: 4
```

Language activation is not a component option; keep `activeLocales` and `i18n.fallbackLocale` in `config.yml` or its extends files. A new locale can be 50% translated: missing UI keys use the fallback, while an existing Markdown file remains exactly as authored.

## 3. Export the component definition

Create `index.ts` with the public `ComponentDefinition`:

```ts
import type { ComponentDefinition } from '../../../../src/theme-api.ts';

export const component: ComponentDefinition = {
  id: 'reading-tip',
  capabilities: ['render', 'client'],
  implementation: 'components/reading-tip/index.ts',
  resources: {
    // The module owns the resources that the compiler fingerprints.
    styles: ['components/reading-tip/style.css'],
    scripts: ['components/reading-tip/script.js']
  },
  i18n: 'components/reading-tip/messages.yml',
  defaults: { enabled: true },
  schema: { enabled: { type: 'boolean' } }
};
```

Register it once in the theme's `components` array:

```ts
import { component as shell } from './shell/chrome.ts';
import { component as privacyConsent } from './consent/index.ts';
import { component as readingTip } from './reading-tip/index.ts';

export const components = [shell, search, toc, postMeta, privacyConsent, language, readingTip];
```

## 4. Add the smallest working resources

`script.js`:

```js
// Use DOM APIs so the component does not become an HTML injection surface.
const marker = document.createElement('small');
marker.className = 'reading-tip';
marker.textContent = 'Reading tip enabled';
document.querySelector('main')?.prepend(marker);
```

`style.css`:

```css
/* Keep the component rule beside the component resource. */
.reading-tip { margin-inline-start: .5rem; }
```

`messages.yml`:

```yaml
messages:
  en:
    readingTip:
      # Add labels here; keep executable behavior in index.ts/script.js.
      label: Reading tip
```

## 5. Keep the instance switch in site/theme.yml

```yaml
# site/theme.yml
components:
  readingTip:
    # Turn the registered capability on or off without editing its renderer.
    enabled: true
```

Run the checks in the cloned site:

```powershell
npm run compile-theme
page g
page s
```

## Expected result

The generated pages load the component's script and style, and the main content shows the marker. Set `components.readingTip.enabled` to `false` in `site/theme.yml` and generate again to remove it; new articles need no extra HTML.

Generation collects the module's resources and messages into the public theme assets. Server-side nested ESM stays inside the build/runtime boundary, and unchanged public assets keep their content-hash URL and cache identity.

## 6. Use the Cookie selector as a reference

The [Cookie selector tutorial](/en/posts/cookies/) is the concrete reference implementation in this theme. It adds a schema, localized messages, consent-aware browser behavior, and safe rendering to the same module shape. Use its structure when a component needs more than one resource.

Ordinary navigation and footer links are site data in `config.yml` or its extends files; configure theme-owned insertion slots through `components.shell` in `site/theme.yml`. Do not append arbitrary links to `.site-header` or `.site-footer` from a component script. The shell Component accepts only structured labels and safe URLs; page-level behavior such as this reading tip can still mount inside `main`.

If a component exposes WebMCP tools to a browser Agent, first follow [Configure conditional Agent capabilities](/en/posts/agent-discovery/) to register real `document.modelContext` tools in the component script, then enable the discovery declaration in `config.yml` separately; that switch does not load the script for you.

## 7. Remove a component cleanly

When a capability is no longer needed, remove its import from the theme assembly, its definition and resource references, its `site/theme.yml` override, and any Markdown directives or shell references. Generate again and inspect the catalog; do not delete only the generated asset or leave a second implementation for old consumers.

## Common trap

Keep resource paths relative to the theme root. Do not edit `dist/`, put code in `config.yml`, or import the component from each article.

## Next step

Read [Put the site online](/en/posts/deploy/) to learn how a host publishes the generated `dist/public` snapshot.
