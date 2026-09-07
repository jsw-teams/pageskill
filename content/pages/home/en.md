---
title: Reuse structure to build a publishable site
description: Discover Patterns, Blocks, and schemas first, then compose pages with Markdown, Frontmatter, and configuration; add a theme extension once only when a capability is missing.
pattern: landing
---

:::hero{tone="brand" align="left"}
*PAGESKILL REUSABLE CONTENT COMPILER*

# Discover once. Reuse on every page.

People can reuse built-in Patterns, Blocks, and schemas directly without an Agent; Agents can also start with `pageskill catalog` and `pageskill inspect` to see capabilities and resource dependencies, then compose pages with Markdown, Frontmatter, and `config.yml`. Agents and page authors do not hand-write HTML for each page; when discovery shows a missing capability, implement one reusable theme extension.

[Start with the reuse workflow](/en/guide/) [See the extension boundary](/en/development/)
:::

:::compiler-board
### Discover capabilities
Read the theme's Patterns, Blocks, schemas, plugins, and resource dependencies through catalog and inspect before writing a page.

### Compose content
Choose a Pattern and Blocks, fill in Markdown, Frontmatter, and configuration data, and let the compiler produce localized static pages. The same structure can serve many pages.

### Extend only the gap
When discovery shows no reusable capability, copy the theme and implement one Pattern or Block. Return to catalog, inspect, check, and build after the extension.
:::

:::feature-grid{columns="3"}
### No per-page HTML
Authors write Markdown, Frontmatter, and configuration. Patterns define frames, Blocks provide reusable sections, and schema data holds structured input.

### Static delivery
The compiler emits localized HTML, assets, search data, and deployment files. Ordinary pages do not need hydration; declare browser behavior only when a feature needs it.

### Current and historical content
`content/pages/` stores current effective content, while `content/posts/` stores completed changes with a required date. `docs` remains a presentation Pattern inside `pages`.
:::

## From discovery to publishing

| Step | Action | Result |
| --- | --- | --- |
| Discover | Run `pageskill catalog`, then query `pageskill inspect pattern:<id>`, `block:<id>`, or `collection:<id>` | Confirm reusable Patterns, Blocks, and schemas |
| Compose | Choose the structure and fill in Markdown, Frontmatter, and `config.yml` | Get page source without per-page HTML |
| Verify | Run `pageskill check` and `pageskill g --profile` | Check schemas, routes, translations, and static output |
| Extend | Only when a capability is missing, implement it once in a copied theme and rerun catalog/inspect | Make the new capability reusable |

## Keep the content boundary clear

| Need | File entry | Result |
| --- | --- | --- |
| Explain how Pageskill works now | `content/pages/<id>/<locale>.md` | Current page in the locale route |
| Record why a change happened on a date | `content/posts/<id>/<locale>.md` | Dated Product Note, archive, Feed, and search entry |
| Present a current page as documentation | `content/pages/<id>/<locale>.md` with `pattern: docs` | A docs-shaped `pages` page, not a new collection |
| Change structure or visual language | `themes/default/theme.ts`, `theme.yml`, `style.css` | Theme-owned Patterns, Blocks, and styles |
| Change site metadata or capability switches | `config.yml` | Site metadata, locales, routes, and feature settings |

## What is already reusable

Markdown tables, excerpt boundaries, locale fallback, note covers, a sitemap, an RSS Feed, local search, 404, OG images, and deployment files are built-in outputs. When a site needs a new visual, read the theme catalog before adding code.

:::post-list{limit="3"}
:::

:::cta{href="/en/guide/"}
## Start with the structure your visitor needs now

Start with catalog/inspect, choose a Pattern, Block, and schema, and fill in Markdown under `content/pages/`. Put a dated explanation of a completed change in `content/posts/`, run the check and build, and let the theme decide how the content should look.
:::
