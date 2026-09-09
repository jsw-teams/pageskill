---
title: Change the style, or ask an Agent
description: Edit the modular theme directly, reuse components, and make one shared change for every page.
date: 2026-09-07
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

## 3. Reuse or add one capability

Use an existing Block in Markdown before adding code. If a component is missing, put its `index.ts`, optional `style.css`, and `messages.yml` in `themes/default/components/<id>/`, then add its module to `components/index.ts`. Keep the shared assembly in `index.ts`; put shared helpers in `components/shared/` and do not copy markup into each article.

```powershell
npm run compile-theme
npm run g
npm run s
```

## Expected result

The color or component change appears consistently on every page that uses the active theme. The local preview keeps running until you press `Ctrl+C`.

## Common trap

Changing only `config.yml` changes which theme is selected; it does not create a new visual resource. Keep implementation, CSS, scripts, and messages with their module, and never edit generated `dist/` files.

## Next step

Read [Develop a reusable plugin](/en/posts/plugins/) when the capability needs shared browser behavior or consent-aware loading.
