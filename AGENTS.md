# Pageskill Agent Guide

Use the repository source and generated discovery output as the contract. The current prerelease is 1.0.0-beta.0. It unifies the public authoring and Theme extension model around Components while keeping runtime services outside the static Core.

## Product model

```text
Pageskill Core
  Content · Configuration · Theme · Components · static generation
  accessibility quality system · Agent Discovery / Readiness
  governed Client Runtime
  optional external APIs
```

Ordinary authors work with Markdown, configuration, Components, `page g`, `page c`, and `page s`. Storage, cache, AI, secrets, and writes are external API capabilities and never enter the static builder or browser bundle.

## Boundaries

- `config.yml` and its ordered `extends` layers own site identity, locales, navigation, footer links, collections, routes, schemas, privacy policy data, root `integrations`, named browser `apis`, assets, and discovery policy. `runtime` and `deployment` are removed.
- `theme.name` selects reusable Theme code. `theme.config` points to the site-owned instance file, normally `site/theme.yml`; when omitted, the instance object is `{}` and Component defaults apply. Never read or create a site instance file inside `themes/<name>/`.
- `site/theme.yml` contains only schema-bounded `components` overrides. It is not a CSS, HTML, browser-script, `unsafeHtml`, content, or secret surface.
- `themes/<name>/components/` contains trusted Built-in or External Component implementations, resources, schemas, defaults, messages, and Provider Adapters. `ComponentDefinition`/`defineComponent` is the only public Theme extension concept. Do not reintroduce Plugin, Pattern, Layout, Module, or a second registration model.
- A Component owns behavior and presentation. Content owns content: reader-facing titles, descriptions, body copy, links, articles, categories, examples, and brand data come from Markdown, Frontmatter, Config, or Runtime Data. Component defaults may contain behavior and structure defaults, never site prose or demo records.
- `backend/handler.ts` is a separately deployed reference API service protected by `PAGESKILL_API_TOKEN`. It is not a Pageskill Core dependency.
- `migrations/` contains auditable D1 migrations. Never create production tables during a request.
- `src/` owns the Core compiler, `page` CLI, libraries, accessibility audit, Fetch Router, runtime contracts, and Theme contract. Never hand-edit generated `src/runtime/`, `.pageskill/`, or `dist/`. Pageskill does not generate or consume a host CLI configuration file.

## Supported workflow

The only public CLI commands are:

- `page g [--profile]`: quickly validate and generate `dist/public` plus Agent readiness output. It must not start a browser or run the page-level accessibility audit.
- `page c`: run the complete four-layer accessibility audit in a real browser, including axe, keyboard/dynamic checks, responsive viewports, and private reports/screenshots.
- `page s [port]` or `page s --port <port>`: watch source dependencies, rebuild, serve the generated static site, and provide development feedback.

Pageskill Core is unconditionally static. `page g` and `page s` operate only on `dist/public`; `page c` additionally requires a browser binary. Core never generates `_worker.js`, host configuration, proxy rules, databases, or Wrangler files. Every browser Component uses the same Client Runtime contract. A Component without `client.api` may work with the DOM and generated same-site assets through `runtime.assetJson`; adding a named `client.api` exposes only that root `apis.<id>` service through `runtime.apiJson`. Third-party origins are allowed and requests cannot escape the configured origin/path. Any configured token is public because it is emitted to browser JavaScript; private credentials require a separately deployed proxy and secret store. Provider Adapters selected under `integrations` are the separate consent/privacy mechanism, not a Client Runtime mode.

Package scripts `npm run g`, `npm run c`, and `npm run s` are repository conveniences that compile source before invoking the same `page` CLI; they are not additional public command names.

## Content model

- `content/pages/<id>/<locale>.md` owns stable pages such as Home, About, and Privacy. They do not participate in dated archives.
- `content/posts/<id>/<locale>.md` owns ordinary blog posts, tutorials, and articles. Every post requires an ISO `date`; optional `updated` is the last substantive edit, never a replacement for publication date. `kind: post` is the collection kind. `category` and `tags` are post taxonomy; missing category is `uncategorized`.
- `content/updates/<id>/<locale>.md` owns release notes and project updates as a real collection. These documents use `kind: release`; they do not use `category: update`.
- Collection configuration owns explicit queries and archive/feed routes. The default site exposes Posts Archive, Release Archive, Category Archive, and Uncategorized Archive separately.
- All locale variants of a document share `contentKey` such as `posts:markdown` or `updates:1.0.0-beta.0`. Locale is not part of the identity used by the Comments Component.
- Keep `zh-sg`, `zh-tw`, and `en` pages semantically synchronized. Fallback may supply a missing whole document; it must not merge paragraphs into an existing Markdown file.

Markdown is the primary authoring surface. Use short directives as content-authored Component calls, not as a second code registration system. Prefer readable Markdown over a large Frontmatter page DSL.

## Component contract

There are only two source concepts: Built-in Component and External Component. Capabilities describe what one Component needs: `render`, `client`, `server`, `storage`, `cache`, `ai`, and `integration`.

The public developer model is:

```text
ComponentDefinition
Render Context
Content Context / content.query()
Client Runtime
External API Handler
StorageProvider · CacheProvider · AIProvider
API gateway
```

Component APIs accept `children`, named `slots`, structured props, and runtime data. Prefer composition and data over page-specific variants. A Component must be portable to a differently branded site without editing its TypeScript implementation.

Content queries come through the Core context, for example `context.content.query({ collection, kind, category, locale, limit, orderBy })`. Components must not read content directories, guess routes, hard-code document IDs, hard-code locale paths, or own site URLs. Use `context.url` and content identity resolvers.

`messages.yml` contains only Component UI copy: buttons, controls, short labels, status text, ARIA labels, and Component-owned prompts. It is not a CMS for home-page prose, feature descriptions, tutorials, legal text, or demo data.

## Runtime, Comments, and translation

Core defines a platform-neutral external `ApiContext`, `ApiHandler`, `StorageProvider`, `CacheProvider`, and `AIProvider` contract using Web-standard requests and responses. `CacheProvider` supports `get`, `set` with TTL, `delete`, and wildcard invalidation.

Comments are an External Component reference implementation, not Core behavior. Comment records use `contentKey` and `sourceLocale`; the current reader uses `viewerLocale`. Locale pages therefore see the same comment set. Comment bodies are plain text, bounded, escaped on output, and never accompanied by stored IP, User-Agent, or fingerprint.

Comment Translation is a separate optional External Component capability. Without an AI provider, comments remain usable and translation controls stay disabled. Translation must check L1 Function Cache, then persistent cache keyed by `commentId`, `sourceHash`, and `targetLocale`, then use single-flight before AI. Twenty concurrent requests for one identity must produce one AI call; a changed source hash must produce a new call.

The reference API may use D1 and Workers AI, but it is independently deployed and authenticated. Pageskill does not manage host bindings, tokens, proxy rules, or database migrations. Do not make Core imports depend on Cloudflare, Vercel, AWS, Supabase, or another host.

## Accessibility and secure rendering

Accessibility is a four-layer development audit invoked by `page c`: source contracts, final HTML, a real browser/axe run, and keyboard/dynamic/viewport checks. Reports stay private at `.pageskill/reports/accessibility/` with an annotated `report.pdf`, `index.html`, `report.json`, `summary.json`, and screenshots; never copy reports or a disclaimer into `dist/public`. `page g` intentionally does not invoke this browser audit.

The screenshot matrix includes 320×800, 375×812, 768×1024, 1280×800, and 1440×900. Every generated HTML route gets a baseline screenshot; representative, warning, and error routes get the full matrix. The PDF also includes focused Component details for local Search, mobile TOC, code copy, named API configuration, and Provider privacy revision. Completed diagnostics may receive temporary annotated crops labelled with issue number, severity, and rule ID; annotations are removed after capture and never affect the audit DOM.

Escape text and attributes, use the shared safe URL resolver, and keep untrusted content out of `unsafeHtml`. External `_blank` links must carry `rel="noopener noreferrer"`. Do not add arbitrary HTML/script/style configuration, `eval`, `innerHTML` for user data, positive `tabindex`, or selection-blocking CSS.

## Discovery and generated files

Discovery is renderer-owned. Do not hand-edit `.well-known/agent.json`, API Catalog, Agent Skills, robots, RSS, sitemap, search indexes, Markdown mirrors, `llms.txt`, or generated catalog files. Discovery must describe real configured and implemented behavior; `enabled: true` alone does not create OAuth, MCP, WebMCP, DNS-AID, D1, or AI services.

DNS-AID is External Readiness: derive, check, and report recommendations from `siteUrl` and real capabilities; never modify a DNS provider automatically. Accessibility and Agent reports belong under `.pageskill/`, not under `content/` or `dist/public/`.

## Verification and release

Run the smallest relevant checks, then report actual results:

```text
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm test
npx page g --profile
npx page c
npx page s
git diff --check
```

Stop the persistent preview with `Ctrl+C`. This prerelease is 1.0.0-beta.0 and intentionally carries no historical compatibility surface. Do not add compatibility shims or legacy CLI aliases; use the current Component, Content, Config, Client Runtime, and external API contracts.
