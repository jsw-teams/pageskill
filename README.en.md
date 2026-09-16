# Pageskill: write in Markdown, configure in YAML

[简体中文](README.md) · [Chinese changelog](CHANGELOG.zh-CN.md) · [Changelog](CHANGELOG.md)

Pageskill 1.0.0 beta (`1.0.0-beta.0`) is a Markdown-first static content system. Site authors maintain Markdown, `config.yml`, and an optional `site/theme.yml`; reusable presentation and behavior come from Components. Databases, caches, AI, private secrets, and writes belong to a separately deployed API service, not Core or browser bundles.

## Minimal configuration

```yaml
siteUrl: https://example.com
defaultLocale: en
activeLocales: [en]
siteName: Example

theme:
  name: default
  config: ./site/theme.yml

navigation:
  links:
    - key: home
      href: /:locale/
    - label: GitHub
      href: https://github.com/example/example
      target: _blank

footer:
  links:
    - key: privacy
      href: /:locale/privacy/
```

When configuration grows, put genuinely site-owned settings in ordered `config/*.yml` layers with `extends`. See [`config.example.yml`](config.example.yml) for the complete reference.

## Start using Pageskill

```powershell
git clone https://github.com/jsw-teams/pageskill.git
Set-Location pageskill
npm install
npx page g
npx page c
npx page s
```

The public CLI has exactly three commands:

- `page g [--profile]`: quickly validate and generate `dist/public` plus Agent readiness output. It does not start a browser or run page-level accessibility checks.
- `page c`: start a real browser for the complete axe, keyboard, dynamic-state, responsive-viewport, and zoom accessibility audit, writing private reports and screenshots under `.pageskill/`.
- `page s [port]` or `page s --port <port>`: watch source, regenerate, and run the static preview.

`page g` and `page s` always operate on static files in `dist/public`; `page c` additionally requires a browser. Pageskill does not generate `_worker.js`, host configuration, or Wrangler files. Dynamic Components select a named `apis` entry from configuration; its URL may use a third-party origin and its auth may be `bearer` or `x-api-key`. A configured token is necessarily public browser data, so use only a restricted, revocable client token. Route private credentials through a separately deployed proxy.

## The Component contract

> Component owns behavior and presentation; Content owns content.

Components own how content renders, lays out, interacts, and responds to state. Markdown, Frontmatter, Config, and Runtime Data own what is displayed. A Component must not hard-code site titles, long prose, document IDs, categories, locale URLs, brand data, or demo records in TypeScript.

Markdown can call a Component with a short directive:

```markdown
:::hero{tone="brand"}
# This heading belongs to Markdown content

The body and action copy belong to the content layer too.
:::
```

Components accept `children`, named slots, structured props, and runtime data. Prefer composition and data over page-specific variants. The default Theme must work for a completely different site without changing Theme TypeScript.

There are only two Component source concepts: Built-in Component and External Component. Capabilities are expressed as `render`, `client`, `server`, `storage`, `cache`, `ai`, and `integration`. The public Theme model is `ComponentDefinition`, Render Context, Content Context, and Client Runtime. Server capabilities use a separate API contract; there is no Plugin, Pattern, Layout, Module, or Runtime Adapter extension surface.

Each browser Component declares one ES module and root selector in `ComponentDefinition.client`. The same Client Runtime supplies DOM lifecycle and generated-asset access; a Component that needs an external service adds only a named API id such as `api: 'comments'`. `config.apis.comments` supplies its absolute URL and optional client authorization. Core emits one bootstrap for mounting, lifecycle, configured-origin/path validation, authorization headers, and JSON requests. The retired mode switch, `resources.scripts`, global registry, and script self-scanning model have been deleted. Databases, caches, models, private secrets, and writes stay in the external API service. Third-party browser providers remain trusted adapters selected by `integrations`, with consent and localized privacy-policy revision enforced separately.

`messages.yml` contains only short Component UI copy such as buttons, status text, ARIA labels, and control prompts. Home-page prose, feature descriptions, tutorials, legal text, and demo data stay in `content/`.

## Content and runtime boundaries

```text
config.yml / config/*.yml     site-owned structured settings, links, routes, collections, integrations
site/theme.yml                schema-bounded Component overrides for this site
content/pages/                stable pages
content/posts/                ordinary articles, tutorials, and blogs
content/updates/              an independent release-note collection
themes/<name>/components/     reusable Component implementation
backend/                      an independently deployed, Bearer-protected reference API
```

Ordinary posts use `kind: post` and a required `date`; optional `updated` means the last substantive edit. Release notes use `kind: release` and never `category: update`. `category` is ordinary post taxonomy; a missing category is `uncategorized`. Posts, Releases, Category, and Uncategorized archives are explicit queries and routes.

Locale variants of one document share a stable `contentKey`, such as `posts:markdown`. Comments use `contentKey` and `sourceLocale`; the reader's `viewerLocale` only controls presentation, so every locale page sees the same comment set. Comments are an optional External Component, and Comment Translation is a separate optional capability using L1 Function Cache, persistent translation cache, and single-flight. If AI is unavailable, comments still work and translation controls stay disabled.

## Discovery and quality reports

The generator derives sitemap, RSS, search indexes, Markdown mirrors, `llms.txt`, Agent Discovery, Agent Skills, and API Catalog from real implementations. `enabled: true` does not create OAuth, MCP, WebMCP, DNS-AID, D1, or AI services; DNS-AID only derives, checks, and reports recommendations.

Agent instructions follow the source-controlled [Skill developer specification](docs/skill-development.md). Generated Skill files are outputs, not editing surfaces.

Accessibility is a development tool, not site content. Reports are private:

```text
.pageskill/reports/accessibility/index.html
.pageskill/reports/accessibility/report.pdf
.pageskill/reports/accessibility/report.json
.pageskill/reports/accessibility/summary.json
.pageskill/reports/accessibility/screenshots/
```

`page c` covers source contracts, final HTML, a real browser/axe run, and keyboard, dynamic-state, responsive viewport, and zoom checks. Its audit sandbox never contacts configured upstream APIs, external databases, model providers, or private tokens; API services have separate contract tests. From the current build data, `page c` automatically creates a readable tagged PDF with focused local Search, mobile TOC, code-copy, named-API, and Provider privacy detail images, while retaining every original capture in the HTML report and screenshots directory. Screenshots include 320×800, 375×812, 768×1024, 1280×800, and 1440×900.

Do not edit generated `dist/`, `.pageskill/`, or `src/runtime/` by hand. The source of truth is `config.yml`, `config/`, `site/theme.yml`, `content/`, `themes/`, and `backend/`. Pageskill is MIT licensed; see [LICENSE](LICENSE).
