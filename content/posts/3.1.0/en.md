---
title: '3.1.0: one configuration model for site authors'
description: 'Move site intent into layered YAML, keep provider capability in trusted adapters, and give posts honest metadata.'
date: 2026-09-13
category: update
---

# 3.1.0: one configuration model for site authors

Pageskill 3.1.0 keeps Markdown, multilingual content, Patterns, Blocks, themes, plugins, search, archives, feeds, discovery, backends, and deployment targets. It changes where ordinary site intent lives so a site author can work mainly with Markdown and YAML.

## What changed

- `config.yml` can extend genuinely related project-local files under `config/`. Objects merge recursively, arrays replace as a whole, and scalars from later layers win. The loader checks root containment, symlinks, cycles, depth, and hashes every effective file.
- `theme.config` explicitly selects a site instance file such as `site/theme.yml`. The reusable `themes/<name>/` directory now contains implementation, resources, plugins, and reference examples, not a second site configuration path.
- Navigation and footer use one safe Link Schema. Internal links can use `/:locale/`, external HTTP(S) links are allowed, current-page state is limited to internal routes, and `_blank` links receive `noopener noreferrer`.
- Root `integrations` describes only providers the site actually uses. A trusted Provider Adapter owns its schema, public identifier validation, privacy purpose, consent requirement, load policy, and resource implementation. Consent categories are derived from configured adapters; a site without a consent-required integration has no banner.
- Posts calculate Markdown metrics and reading time, accept a strict `update` timestamp, show a localized update notice, use `update` for sitemap `lastmod`, retain `date` for RSS publication, and include the field in search and incremental cache data.
- The compiler facade remains available through `createContext`, `refreshContext`, `build`, `check`, `inspect`, `getCatalog`, and `siteDiscoveryOptions`; deployment configuration is normalized once for the compiler, CLI, and deploy command.

## Breaking configuration cleanup

This release intentionally removes historical configuration surfaces instead of maintaining two competing authoring models:

- `themes/<name>/theme.yml` is no longer discovered. Move site overrides to `site/theme.yml` and set `theme.config: ./site/theme.yml`; omitting it means an empty override object and code defaults.
- `branding` and its attribution fields are removed. Add a normal footer link or theme content when a site chooses to mention a project.
- Deprecated deployment aliases and `deployment.openaiSites.staticDirectory` are removed. Use the canonical `deployment.targets` and `deployment.staticDirectory` fields.
- The old navigation shapes and the previous privacy-consent provider/category/script configuration are removed. Use `navigation.links`, `footer.links`, and root `integrations` instead.
- Historical internal `.pagekiln` and `_pagekiln` paths and the old browser consent namespace are replaced with `.pageskill`, `_pageskill`, and `pageskill-consent`.

The short migration is:

```yaml
# old site instance location: themes/default/theme.yml
# new config.yml
theme:
  name: default
  config: ./site/theme.yml
```

## Verify a release

```powershell
npm install
npm test
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm run g
npm run g -- --profile
npm run d -- --dry-run
```

The dry run still requires a real `deployment.targets` entry. Keep provider secrets in environment variables, inspect generated discovery from the source-backed output, and publish only `dist/public` for a static target.

Read [Configuration](/en/posts/site-settings/), [Configure integrations and privacy consent](/en/posts/cookies/), and [the post metadata example](/en/posts/post-meta-demo/) for the author workflow.
