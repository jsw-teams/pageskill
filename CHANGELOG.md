# Changelog

[English](CHANGELOG.md) · [简体中文](CHANGELOG.zh-CN.md) · [中文 README](README.md) · [English README](README.en.md)

Version labels follow the package metadata, this changelog, and the dated Product Note for the same change. This file records repository changes; an entry does not claim npm publication or deployment.

## 3.0.0 — 2026-09-07

Pageskill 3.0.0 closes the archived 2.0 chapter and starts a reuse-first product line.

### Changed

- Renamed the public product from Pagekiln to Pageskill across package metadata, the CLI, site identity, theme copy, documentation, and repository links. The old `pagekiln` CLI entry was removed. Migrate commands to `pageskill` and replace `PAGEKILN_SITE_ROOT` with `PAGESKILL_SITE_ROOT`. If an existing `deployment.openaiSites.staticDirectory` is `dist`, migrate it to `deployment.staticDirectory: public`; the new setting is optional, and safe custom directory values from the old OpenAI Sites setting remain a fallback.
- Made discovery and reuse the authoring path: `pageskill catalog` and `pageskill inspect` expose source-backed Patterns, Blocks, schemas, plugins, contexts, and resource dependencies. Authors continue to compose pages with Markdown, Frontmatter, and `config.yml`; a theme extension is a shared capability rather than per-page HTML.
- Kept generated pages static while allowing one same-origin Worker/Fetch runtime to handle `/api/*` and configured dynamic routes. The unified build places public pages and assets in `dist/public` and keeps `server/`, `_pagekiln/`, `.pagekiln/`, worker files, and deployment manifests private. `backend/handler.ts` remains the source for dynamic business logic and runtime secrets; this boundary does not provide application identity, authorization, or CSRF controls automatically.
- Added conservative theme stylesheet planning. A Pattern or Block stylesheet may be inlined only when its original UTF-8 source is at most 2,048 bytes, the page's combined inline CSS stays within 4,096 bytes, and the source has no unsafe relative-resource or style-element hazards. The main theme bundle remains fingerprinted and external.
- Tightened browser boundaries for local search and optional Cookie scripts. Search result values are built with DOM text APIs and result URLs are protocol-checked; configured optional scripts are accepted only for HTTP(S) sources and load after their consent category is selected. The existing `pagekiln-consent` storage key remains compatible. These checks narrow input handling; site owners still control provider configuration and backend authorization.
- Added six localized guide steps—start, site settings, Markdown, first content, Cookie consent, and theme customization—and a reusable `learning-path` Block with six independent bear PNG illustrations under `content/assets/learning/`.
- Preserved existing content, localized routes, theme Patterns and Blocks, generated catalog/build-profile paths, and internal `_pagekiln`/`.pagekiln` names while the public product and CLI names change. Future major, minor, and patch entries keep the package, changelog, and dated content version labels aligned.

## History

### 2.0 — archived summary

No reliable original publication date is recorded here.

- Established the Pagekiln TypeScript/Node 22+ static-first compiler: YAML 1.2 Frontmatter and CommonMark/GFM Markdown compose with theme-owned Patterns, Blocks, and collection schemas.
- Added localized collections, route generation, translation fallback, feeds, archives, sitemaps, 404 output, local search, and source-backed `.pagekiln/catalog.json` and `.well-known/agent.json` discovery.
- Established a theme contract for page and post shells, visual language, localized UI, optional browser behavior, icons, Cookie consent, and accessible navigation. `backend/handler.ts` remained the home for dynamic business logic and secrets.
- Added incremental BuildContext and dependency tracking, cached image variants, fingerprinted CSS/ESM assets, build profiles, checks, and deployment adapters around generated `dist/` output.
