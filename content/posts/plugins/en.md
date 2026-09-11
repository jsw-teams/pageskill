---
title: Develop a reusable plugin
description: Add one self-contained theme plugin, register it once, and reuse it on every page.
date: 2026-09-08
category: tutorial
---

# Develop a reusable plugin

A theme plugin owns reusable browser behavior, styles, and messages. Register it once; posts stay Markdown and do not copy HTML.

## 1. Create one module directory

```text
themes/default/plugins/reading-tip/
  index.ts
  script.js
  style.css
  messages.yml
```

The directory owns its resources. `themes/default/index.ts` is the assembly entry, and `theme.yml` holds this theme's plugin instance options.

## 2. Configure a declared plugin first

Before changing code, inspect the plugin's schema and use its safe options in `theme.yml`. Foundation plugins expose their switch, limits, consent metadata, shell slots, and localized copy as instance data:

```yaml
plugins:
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

Language activation is not a plugin option; keep `activeLocales` and `i18n.fallbackLocale` in `config.yml`. A new locale can be 50% translated: missing UI keys use the fallback, while an existing Markdown file remains exactly as authored.

## 3. Export the plugin definition

Create `index.ts` with the real `ThemePluginDefinition`:

```ts
import type { ThemePluginDefinition } from '../../../../src/theme-api.ts';

export const plugin: ThemePluginDefinition = {
  implementation: 'plugins/reading-tip/index.ts',
  resources: {
    // The module owns the resources that the compiler fingerprints.
    styles: ['plugins/reading-tip/style.css'],
    scripts: ['plugins/reading-tip/script.js']
  },
  i18n: 'plugins/reading-tip/messages.yml',
  defaults: { enabled: true },
  schema: { enabled: { type: 'boolean' } }
};
```

Register it once in `themes/default/plugins/index.ts`:

```ts
import { plugin as readingTip } from './reading-tip/index.ts';

export const plugins = { search, toc, privacyConsent: cookies, language, readingTip };
```

## 4. Add the smallest working resources

`script.js`:

```js
// Use DOM APIs so the plugin does not become an HTML injection surface.
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

## 5. Keep the instance switch in theme.yml

```yaml
# themes/default/theme.yml
plugins:
  readingTip:
    # Turn the registered capability on or off without editing its renderer.
    enabled: true
```

Run the checks in the cloned site:

```powershell
npm run compile-theme
npm run g
npm run s
```

## Expected result

The generated pages load the plugin's script and style, and the main content shows the marker. Set `plugins.readingTip.enabled` to `false` in `theme.yml` and generate again to remove it; new articles need no extra HTML.

Generation collects the module's resources and messages into the public theme assets. Server-side nested ESM stays inside the build/runtime boundary, and unchanged public assets keep their content-hash URL and cache identity.

## 6. Use the Cookie selector as a reference

The [Cookie selector tutorial](/en/posts/cookies/) is the concrete reference implementation in this theme. It adds a schema, localized messages, consent-aware browser behavior, and safe rendering to the same module shape. Use its structure when a plugin needs more than one resource.

Nav and footer links are a shell concern, so configure them through `plugins.chrome` in `themes/default/theme.yml`. Do not append arbitrary links to `.site-header` or `.site-footer` from a plugin script. The chrome plugin accepts only structured labels and safe URLs; page-level behavior such as this reading tip can still mount inside `main`.

If a plugin exposes WebMCP tools to a browser Agent, first follow [Configure conditional Agent capabilities](/en/posts/agent-discovery/) to register real `document.modelContext` tools in the plugin script, then enable the discovery declaration in `config.yml` separately; that switch does not load the script for you.

## 7. Remove a plugin cleanly

When a capability is no longer needed, remove its import from the theme assembly, its definition and resource references, its `theme.yml` instance, and any Markdown directives or shell references. Generate again and inspect the catalog; do not delete only the generated asset or leave a second implementation for old consumers.

## Common trap

Keep resource paths relative to the theme root. Do not edit `dist/`, put code in `config.yml`, or import the plugin from each article.

## Next step

Read [Put the site online](/en/posts/deploy/) and run the deployment dry-run before a real publish.
