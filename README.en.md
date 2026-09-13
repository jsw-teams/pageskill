# Pageskill: write in Markdown, configure in YAML

[简体中文](README.md) · [Chinese changelog](CHANGELOG.zh-CN.md) · [Changelog](CHANGELOG.md)

Pageskill 3.1.0 is a static-first website generator. It compiles Markdown content, YAML site data, and reusable theme code into a publishable site. Ordinary authors maintain content and configuration without hand-writing HTML for every post.

## Minimal configuration

```yaml
siteUrl: https://example.com
defaultLocale: en
activeLocales:
  - en
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

When configuration grows, split genuinely related content, discovery, or deployment settings into `config/*.yml` and list them in order:

```yaml
extends:
  - ./config/content.yml
  - ./config/discovery.yml
```

Objects merge recursively; arrays are replaced as a whole; later scalar values win. See [`config.example.yml`](config.example.yml) for a complete site example and [`themes/default/theme.example.yml`](themes/default/theme.example.yml) for the full plugin reference.

## Start in ten minutes

```powershell
git clone https://github.com/jsw-teams/pageskill.git
Set-Location pageskill
npm install
npm run g
npm run s
```

`g` validates and generates, `s` starts a local preview, and `d` publishes the targets declared in `deployment.targets`. Before publishing, inspect the action with:

```powershell
npm run d -- --dry-run
```

Read the complete [Start your site in ten minutes](content/posts/start/en.md) guide.

## The files an ordinary site maintains

- `content/pages/<id>/<locale>.md`: stable pages such as Home, About, and the privacy policy.
- `content/posts/<id>/<locale>.md`: tutorials, blogs, product notes, and release notes. Every post needs an ISO `date`; optional `update` is its last-modified time and never replaces publication date. Word count and reading time are calculated automatically.
- `config.yml` and `config/*.yml`: site identity, locales, navigation, footer, content, discovery, and deployment settings. Navigation and footer use the same safe internal/external link schema; external `_blank` links receive `noopener noreferrer` automatically.
- `site/theme.yml`: small site-specific plugin overrides, such as a search result limit. Plugin code owns defaults and schemas.

`themes/<name>/` contains reusable theme implementation, resources, plugins, and reference examples. It is not a site instance configuration directory. Edit theme code or `backend/handler.ts` only when adding a reusable Pattern, Block, Plugin, browser capability, or dynamic API.

Third-party services belong in root `integrations`, not in theme configuration. List only the providers this site actually uses; the Provider Adapter supplies its schema, purpose, consent requirement, and safe loading behavior:

```yaml
integrations:
  google-analytics:
    measurementId: G-XXXXXXXXXX
```

A provider node is enabled by default and its public identifier is validated; secrets come only from the deployment environment or backend. A site with no consent-required integration has no consent UI. See [Configure integrations and privacy consent](content/posts/cookies/en.md) for the complete contract.

## Content and discovery

The default theme provides multilingual content, TOC, search, Cookie consent, archives, RSS, sitemap, PWA, derived images, and responsive article layouts. The renderer also generates Agent Discovery, Agent Skills, API Catalog, Markdown mirrors, and `llms.txt` from real configuration and outputs. It does not claim OAuth, MCP, WebMCP, or DNS-AID capabilities without a real implementation.

The online example explains configuration, the content model, theme plugins, discovery, and deployment under `content/posts/`; start with [Configuration](content/posts/site-settings/en.md). The README is the quick-start surface; the online docs carry the full configuration and implementation boundaries.

Do not edit generated `dist/`, `.pageskill/`, or `src/runtime/` files by hand. The source of truth is `config.yml`, `config/*.yml`, `site/theme.yml`, `content/`, `themes/`, and `backend/`.

Pageskill is MIT licensed; see [LICENSE](LICENSE).
