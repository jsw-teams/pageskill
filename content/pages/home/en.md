---
kind: page
title: 'Pageskill: build a content site from Markdown'
description: Build a clear, multilingual content site with Markdown, YAML, and reusable Components.
component: home
toc: false
---

:::hero{tone="brand" align="left" media="/assets/hero-telescope.png" mediaAlt="A small telescope representing clear site discovery" mediaWidth="300" mediaHeight="300"}
*Pageskill · Static by design*

# Publish a thoughtful website from content, not framework glue

Write Markdown, keep site decisions in YAML, and let portable Components handle presentation. Search stays local; databases, models, secrets, and writes remain behind named external APIs.

[Start building](/en/posts/start/) [View source](https://github.com/jsw-teams/pageskill)
:::

Pageskill separates the work people edit every day from the infrastructure they should not have to carry in a static site. The result is easier to review, easier to move, and honest about every enabled capability.

## Clear boundaries, without extra modes

:::feature-grid{columns="3"}
### Content stays readable
Pages, tutorials, release notes, navigation, and policy text live in Markdown or configuration instead of being buried in Theme TypeScript.

### Components stay portable
A Component owns its layout, interaction, accessibility, and short UI messages. It does not hard-code this demo's prose, routes, or records.

### Services stay external
Named API entries connect optional data or AI services by configured URL. Private credentials remain in the separately deployed service, never in generated JavaScript.
:::

## A guided path through the real project

Every guide below points to the same files and contracts used to build this site.

:::learning-path
### [Start](/en/posts/start/)
Install the project, run the generator, and edit the stable home page under `content/pages/`.

### [Write Markdown](/en/posts/markdown/)
Use headings, lists, links, tables, and short Component directives without turning the page into a configuration language.

### [Configure the site](/en/posts/site-settings/)
Set identity, locales, routes, navigation, privacy data, and named APIs in reviewed YAML.

### [Build a Component](/en/posts/components/)
Add reusable presentation or behavior through the single `ComponentDefinition` extension contract.

### [Connect discovery](/en/posts/agent-discovery/)
Generate factual Agent metadata and keep conditional capabilities tied to real implementations.

### [Develop an Agent Skill](/en/posts/skill-development/)
Describe the site's actual content, configuration, Components, and external service boundaries for agents.
:::

## Three commands, three clear responsibilities

| Command | Responsibility |
| --- | --- |
| `page g` | Validate and generate the static site in `dist/public`. |
| `page c` | Run the full browser accessibility audit and keep its reports private. |
| `page s` | Watch, rebuild, and preview the same static output during development. |

:::cta{href="/en/updates/1.0.0-beta.0/" label="Read the 1.0.0 beta notes"}
## One current contract

The 1.0.0 beta removes historical runtime modes and extension aliases. It documents one Component model, one governed Client Runtime, and one external API boundary.
:::
