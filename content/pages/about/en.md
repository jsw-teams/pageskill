---
title: About Pageskill
description: Pageskill is a tool for building a site from articles and settings.
---

# About Pageskill

Pageskill turns Markdown articles, site settings, and theme styles into a publishable website. Ordinary authors can write content without hand-writing HTML for every article.

## Reuse first, extend when needed

Themes provide reusable article structures, styles, and Blocks. Start with the capabilities you have; when a structure is truly missing, implement one theme extension so later articles can reuse it. Individuals can edit a theme directly or ask an Agent to help with a clear target.

## Remember three commands

| Command | Does |
| --- | --- |
| `npm run g` | Validates and generates public files. |
| `npm run s` | Starts a persistent preview; press `Ctrl+C` to stop it. |
| `npm run d` | Publishes the configured target. |

The current home page is under `content/pages/home/`; tutorials, blogs, product articles, and version updates are under `content/posts/`. Add `category: update` to a version note to include it in the [update archive](/en/updates/) without mixing it into the normal post list. The privacy policy has the fixed route `/:locale/privacy/`. Start with [Start your site in ten minutes](/en/posts/start/).
