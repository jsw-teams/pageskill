---
title: 'Pageskill: build a content site from Markdown'
description: Build a clear, multilingual content site with Markdown, YAML, and reusable themes.
pattern: landing
---

:::hero{tone="brand" align="left"}
*Pageskill · Build with Markdown*

# Build content sites from Markdown and YAML

Pageskill turns Markdown content and a small amount of YAML site data into a multilingual website. Reusable themes handle layout and plugins, while dynamic APIs stay behind a clear same-origin boundary.

[Get started](/en/posts/start/) [GitHub](https://github.com/jsw-teams/pageskill)
:::

The ordinary author workflow is simple: write Markdown, edit `config.yml` and `site/theme.yml` when needed, then generate the site. Add theme or backend code only when the site needs a genuinely new capability.

## What Pageskill brings together

| Content | Theme | Multilingual | Discovery | Deployment |
| --- | --- | --- | --- | --- |
| Markdown pages and posts | Patterns, Blocks, plugins | `zh-sg`, `zh-tw`, `en` | Search, feeds, Agent metadata | Static output and same-origin APIs |

The tutorials below show the real source files behind this preview.

:::learning-path
### [Start](/en/posts/start/)
Clone the source repository, run `npm install` and `npm run g`, then edit your first home page in place.

### [Site settings](/en/posts/site-settings/)
Change the site name, languages, and navigation; settings hold data, not code.

### [Markdown](/en/posts/markdown/)
Write with headings, paragraphs, lists, and fenced code, starting with one small page.

### [First tutorial](/en/posts/first-post/)
Add a dated post under `content/posts/`, choose its Frontmatter category, generate the site, and open it from the post list.

### [How we build a plugin](/en/posts/plugins/)
Learn how one reusable plugin owns its resources, safe rendering, and localized messages; the Cookie selector is the advanced reference.

### [Change the style](/en/posts/customize/)
Reuse the theme capabilities you have; when a new structure is needed, implement it once for later pages.
:::

When you need real authentication, MCP, WebMCP, or DNS-AID, read [Configure conditional Agent capabilities](/en/posts/agent-discovery/) and implement each piece in its backend, theme plugin, or external DNS boundary.

## Remember three commands

| Command | Does |
| --- | --- |
| `npm run g` | Validates and generates public static files in `dist/public`. |
| `npm run s` | Starts a persistent preview; press `Ctrl+C` to stop it, or keep editing in another terminal. |
| `npm run d` | Publishes to the targets configured in `config.yml`. |

:::post-list{limit="6"}
:::

:::post-list{collection="updates" limit="3"}
:::

:::cta{href="/en/posts/start/"}
## Start with one tutorial

Begin with [Start in ten minutes](/en/posts/start/), then follow site settings, Markdown, and your first post. Each tutorial includes a smallest useful example, the expected result, one common trap, and a next step.
:::
