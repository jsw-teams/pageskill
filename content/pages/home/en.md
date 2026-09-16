---
kind: page
title: 'Pageskill: build a content site from Markdown'
description: Build a clear, multilingual content site with Markdown, YAML, and reusable themes.
component: page
---

:::hero{tone="brand" align="left"}
*Pageskill · Build with Markdown*

# Build content sites from Markdown and YAML

Pageskill turns Markdown content and a small amount of YAML site data into a multilingual website. Reusable Components own presentation and behavior; database, model, and write capabilities stay in named external APIs.

[Get started](/en/posts/start/) [GitHub](https://github.com/jsw-teams/pageskill)
:::

The ordinary author workflow is simple: write Markdown, edit `config.yml` and `site/theme.yml` when needed, then generate the site. Add theme or backend code only when the site needs a genuinely new capability.

## What Pageskill brings together

| Content | Theme | Multilingual | Discovery | Deployment |
| --- | --- | --- | --- | --- |
| Markdown pages and posts | Reusable Components | `zh-sg`, `zh-tw`, `en` | Local search, feeds, Agent metadata | Static output plus optional external APIs |

The tutorials below show the real source files behind this preview.

:::learning-path
### [Start](/en/posts/start/)
Clone the source repository, run `npm install` and `page g`, then edit your first home page in place.

### [Site settings](/en/posts/site-settings/)
Change the site name, languages, and navigation; settings hold data, not code.

### [Markdown](/en/posts/markdown/)
Write with headings, paragraphs, lists, and fenced code, starting with one small page.

### [First tutorial](/en/posts/first-post/)
Add a dated post under `content/posts/`, choose an optional taxonomy category, generate the site, and open it from the post list.

### [How we build a component](/en/posts/components/)
Learn how one reusable component owns its resources, safe rendering, and localized messages; the Cookie selector is the advanced reference.

### [Develop an Agent Skill](/en/posts/skill-development/)
Write a generated, factual Skill contract that points to real Components, content, configuration, and external services.

### [Change the style](/en/posts/customize/)
Reuse the theme capabilities you have; when a new structure is needed, implement it once for later pages.
:::

When you need real authentication, MCP, WebMCP, or DNS-AID, read [Configure conditional Agent capabilities](/en/posts/agent-discovery/) and implement each piece in its backend, theme component, or external DNS boundary.

## Remember three commands

| Command | Does |
| --- | --- |
| `page g` | Validates and generates public static files in `dist/public`. |
| `page c` | Runs the complete browser and axe accessibility audit and writes private reports. |
| `page s` | Starts a persistent preview; press `Ctrl+C` to stop it, or keep editing in another terminal. |

:::post-list{limit="6"}
:::

:::post-list{collection="updates" limit="3"}
:::

:::cta{href="/en/posts/start/" label="Start reading"}
## Start with one tutorial

Begin with [Start in ten minutes](/en/posts/start/), then follow site settings, Markdown, and your first post. Each tutorial includes a smallest useful example, the expected result, one common trap, and a next step.
:::
