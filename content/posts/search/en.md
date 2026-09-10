---
title: Let visitors search pages and posts
description: Turn on the built-in local search and check the generated index in each language.
date: 2026-09-08
category: tutorial
---

# Let visitors search pages and posts

Pageskill search is generated from your pages and dated posts. The browser reads the current locale index; a search box does not require a custom API.

## 1. Turn on the search settings

Set the plugin options in `themes/default/theme.yml`:

```yaml
plugins:
  search:
    enabled: true
    maxResults: 8
    shardSize: 500
```

`maxResults` limits the visible list. `shardSize` controls how the generated index is split; leave it at the default until the site is large.

The active theme's search module lives in `themes/default/plugins/search/`; its `index.ts`, script, style, and messages stay together. You only change the module when the default search behavior needs a theme change.

## 2. Generate and try a query

```powershell
npm run g
npm run s
```

Open the preview in the same language as a post, type a complete word, and select a result. Search includes stable pages and dated posts from that locale.

## Expected result

The search field returns matching titles, headings, summaries, and body text. A result keeps its locale route, and the generated index is refreshed after `npm run g`.

## Common trap

Changing a Markdown file does not change an already generated preview until you run `npm run g` or let the local preview rebuild it. Do not edit a generated search JSON file under `dist/`; change the source content or the search options in `themes/default/theme.yml` instead.

## Next step

Read [Add a table of contents to long posts](/en/posts/toc/) to make a long result easier to scan.
