---
title: Change the style, or ask an Agent
description: Copy a theme once, tune its color and spacing, and make new structure reusable.
date: 2026-09-07
---

# Change the style, or ask an Agent

Styles set color, type, and spacing. A theme can also provide reusable article structures. Edit these files yourself, or give an Agent a target, a scope, and the page that should succeed.

## 1. Copy a theme

From the site root, copy the default theme and give the copy a name:

```powershell
Copy-Item -Recurse themes\default themes\journal
```

Edit `themes/journal/theme.yml` and change `name` to `journal`. Select it in `config.yml`:

```yaml
theme:
  name: journal
```

## 2. Change one color first

Open `themes/journal/style.css` and change an existing CSS variable:

```css
:root {
  --color-brand: #8b4f2f;
  --color-paper: #fffaf1;
}
```

Keep the theme's existing structure and resource declarations. Generate once to see the change before tuning more.

## 3. Make new structure once

When the existing Blocks are not enough, implement one reusable Block in the theme module and register it in `theme.yml`. Articles keep writing Markdown and short attributes instead of copying HTML into every file.

```powershell
pageskill g
pageskill s
```

## Expected result

The copied theme affects every article that selects it. After generation, the new color or Block appears consistently on each target page.

## Common trap

Changing only the style name in `config.yml` does not change the visual output. The name, theme directory, and `theme.yml` must agree. Do not edit generated `dist/` files.

## Next step

Read [Put the site online](/en/posts/deploy/) to keep the public directory and same-origin API boundary clear.
