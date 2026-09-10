---
title: Change the style, or ask an Agent
description: Edit the modular theme directly, reuse components, and make one shared change for every page.
date: 2026-09-07
category: tutorial
---

# Change the style, or ask an Agent

Styles set color, type, and spacing. The theme is modular: the thin entry assembles layouts, components, plugins, and the shell. Edit it yourself, or give an Agent a target, a scope, and the page that should succeed.

## 1. Select the theme

The site chooses a theme in `config.yml`:

```yaml
theme:
  name: default
```

The active theme keeps plugin options in `themes/default/theme.yml` and uses the thin `themes/default/index.ts` assembly entry. `theme.yml` does not select the theme name.

## 2. Change one shared style

Shared shell CSS lives in `themes/default/layouts/site/style.css`. Change an existing variable there:

```css
:root {
  --green: #6b3d2e;
  --gold: #d99a32;
}
```

A component-specific change belongs beside that component, such as `themes/default/components/learning-path/style.css`. A plugin's style belongs in its own `themes/default/plugins/<id>/style.css`.

## 3. Add, change, or remove a style

Keep each style beside the capability that owns it:

- Change an existing rule in `themes/default/layouts/site/style.css`, or in the stylesheet beside the component, Block, or plugin that renders the markup.
- Add a new stylesheet under that module, list it in the module's `resources.styles`, and keep the module imported by the theme assembly. For a new component, also add its export to `themes/default/components/index.ts`.
- Remove a style by deleting its import/resource entry and every reference to its class or asset. Search the source tree before generating so an unused file is not silently kept.

For example, a component-owned resource remains explicit and carries a comment when the choice is not obvious:

```ts
export const modules = [
  {
    id: 'reading-tip',
    kind: 'component',
    resources: {
      // Keep the style next to the component so the compiler can track it.
      styles: ['components/reading-tip/style.css']
    }
  }
];
```

Run `npm run compile-theme` and `npm run g -- --profile` after each add, edit, or removal. Inspect the route that uses the capability and confirm the generated resource list changes with the source.

## 4. Reuse or add one capability

Use an existing Block in Markdown before adding code. If a component is missing, put its `index.ts`, optional `style.css`, and `messages.yml` in `themes/default/components/<id>/`, then add its module to `components/index.ts`. Keep the shared assembly in `index.ts`; put shared helpers in `components/shared/` and do not copy markup into each article.

```powershell
npm run compile-theme
npm run g
npm run s
```

## 5. Add safe shell links from theme.yml

Primary navigation remains site data in `config.yml`. If a theme needs an extra link before or after the standard navigation or footer tools, use the structured `plugins.chrome` option:

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

Only `label`, localized `labels`, and `href` are accepted. Link counts and lengths are bounded, `:locale` is resolved by the compiler, unsafe protocols and traversal paths are rejected, and labels are escaped. Raw HTML, scripts, styles, selectors, and arbitrary attributes are not supported.

## Expected result

The color or component change appears consistently on every page that uses the active theme. The local preview keeps running until you press `Ctrl+C`.

## Common trap

Changing only `config.yml` changes which theme is selected; it does not create a new visual resource. Keep implementation, CSS, scripts, and messages with their module, and never edit generated `dist/` files.

## Next step

Read [Develop a reusable plugin](/en/posts/plugins/) when the capability needs shared browser behavior or consent-aware loading.
