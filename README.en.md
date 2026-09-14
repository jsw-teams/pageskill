# Pageskill: write in Markdown, configure in YAML

[简体中文](README.md) · [Chinese changelog](CHANGELOG.zh-CN.md) · [Changelog](CHANGELOG.md)

Pageskill 4.0.0 is a Markdown-first content system. Site authors maintain Markdown, `config.yml`, and an optional `site/theme.yml`; reusable presentation and behavior come from Components. Server Functions, storage, cache, and AI are optional capabilities supplied by a Runtime Adapter.

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
- `page s [port]` or `page s --port <port>`: watch source and preview the site. Without a Runtime Adapter it uses the Core static preview; a configured adapter may add its local runtime.

`page g` and `page s` work without a backend, database, cache, AI provider, or Runtime Adapter; `page c` additionally requires a browser available in the current environment. Cloudflare Pages + Functions + D1 + Workers AI is the official reference Runtime Adapter, not a Pageskill Core dependency.

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

There are only two Component source concepts: Built-in Component and External Component. Capabilities are expressed as `render`, `client`, `server`, `storage`, `cache`, `ai`, and `integration`. The public developer model is `ComponentDefinition`, Render Context, Content Context, Client Runtime, Server Function, Providers, and Runtime Adapter—not parallel Plugin, Pattern, Layout, or Module extension APIs.

`messages.yml` contains only short Component UI copy such as buttons, status text, ARIA labels, and control prompts. Home-page prose, feature descriptions, tutorials, legal text, and demo data stay in `content/`.

## Content and runtime boundaries

```text
config.yml / config/*.yml     site-owned structured settings, links, routes, collections, integrations
site/theme.yml                schema-bounded Component overrides for this site
content/pages/                stable pages
content/posts/                ordinary articles, tutorials, and blogs
content/updates/              an independent release-note collection
themes/<name>/components/     reusable Component implementation
backend/                      the reference Runtime Adapter's private functions
```

Ordinary posts use `kind: post` and a required `date`; optional `updated` means the last substantive edit. Release notes use `kind: release` and never `category: update`. `category` is ordinary post taxonomy; a missing category is `uncategorized`. Posts, Releases, Category, and Uncategorized archives are explicit queries and routes.

Locale variants of one document share a stable `contentKey`, such as `posts:markdown`. Comments use `contentKey` and `sourceLocale`; the reader's `viewerLocale` only controls presentation, so every locale page sees the same comment set. Comments are an optional External Component, and Comment Translation is a separate optional capability using L1 Function Cache, persistent translation cache, and single-flight. If AI is unavailable, comments still work and translation controls stay disabled.

## Discovery and quality reports

The generator derives sitemap, RSS, search indexes, Markdown mirrors, `llms.txt`, Agent Discovery, Agent Skills, and API Catalog from real implementations. `enabled: true` does not create OAuth, MCP, WebMCP, DNS-AID, D1, or AI services; DNS-AID only derives, checks, and reports recommendations.

Accessibility is a development tool, not site content. Reports are private:

```text
.pageskill/reports/accessibility/index.html
.pageskill/reports/accessibility/report.pdf
.pageskill/reports/accessibility/report.json
.pageskill/reports/accessibility/summary.json
.pageskill/reports/accessibility/screenshots/
```

`page c` covers source contracts, final HTML, a real browser/axe run, and keyboard, dynamic-state, responsive viewport, and zoom checks. It creates an annotated PDF problem report while retaining an HTML view and JSON data. Screenshots include 320×800, 375×812, 768×1024, 1280×800, and 1440×900. Automation does not replace manual assistive-technology review. Production builds use `page g`; keep the full browser audit in browser-capable CI or a pre-release check so a hosting build does not wait for a browser download or startup.

Do not edit generated `dist/`, `.pageskill/`, `src/runtime/`, or `wrangler.toml` by hand. The source of truth is `config.yml`, `config/`, `site/theme.yml`, `content/`, `themes/`, and `backend/`. Pageskill is MIT licensed; see [LICENSE](LICENSE).
