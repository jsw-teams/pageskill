---
kind: page
toc: false
title: About Pageskill
description: Pageskill is a tool for building a site from articles and settings.
---

# About Pageskill

Pageskill turns Markdown articles, site settings, and theme styles into a publishable website. Ordinary authors can write content without hand-writing HTML for every article.

## Reuse first, extend when needed

Themes provide reusable Components, styles, and content contracts. Start with the capabilities you have; when a capability is truly missing, implement one Component so later content can reuse it. Individuals can edit a theme directly or ask an Agent to help with a clear target.

Foundation component options and localized copy belong in the site instance file selected by `theme.config`, normally `site/theme.yml`; language activation and fallback belong in `config.yml` or its extends files. The `themes/<name>/` directory is reusable implementation code, not a site instance configuration directory. The renderer generates Agent discovery metadata and Markdown mirrors from those sources, so generated files are outputs to inspect rather than files to maintain.

## Remember three commands

| Command | Does |
| --- | --- |
| `page g` | Validates and generates public files. |
| `page c` | Runs the complete browser and axe accessibility audit and writes private reports. |
| `page s` | Starts a persistent preview; press `Ctrl+C` to stop it. |

The current home page is under `content/pages/home/`; tutorials, blogs, and product articles are under `content/posts/`, while release notes live in the independent `content/updates/` collection. Updates therefore have their own archive at `/en/updates/` and never depend on a post category filter. The privacy policy has the fixed route `/:locale/privacy/`. Start with [Start your site in ten minutes](/en/posts/start/).
