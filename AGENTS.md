# Pageskill Agent Guide

Use the repository source and its generated discovery output as the contract. Keep this file about safe work habits, content ownership, and the supported workflow.

## Boundaries

- `config.yml` and its `extends` files own site identity, locales, navigation, footer links, collections, routes, schemas, privacy/controller data, images, and deployment settings. `theme.name` selects a theme and `theme.config` points to the site-owned instance file. Neither surface accepts CSS, HTML, browser scripts, or unsafe HTML.
- `site/theme.yml` owns only schema-validated overrides for the selected theme's plugins. `themes/<name>/` owns reusable Patterns, Blocks, shell markup, styles, browser modules, localized messages, schemas, resources, and code defaults; it is not a site instance configuration directory.
- `content/pages/<id>/<locale>.md` owns stable pages such as Home, About, and the privacy policy. `content/posts/<id>/<locale>.md` owns tutorials, blogs, product records, and release notes. Every post requires `date`; `update` is an optional last-modified timestamp. `category: update` marks a release note for the updates view and is unrelated to the `update` timestamp.
- `backend/handler.ts` owns dynamic business logic, secrets, writes, and webhooks.
- `src/` owns the compiler, CLI, libraries, Fetch Router, and theme contract. Never hand-edit `src/runtime/`, `.pageskill/`, or `dist/`; they are generated.

## Supported author workflow

The public CLI has three daily commands:

- `pageskill g` validates source content and generates the public snapshot in `dist/public`.
- `pageskill s` keeps a local preview running, watches nested theme TypeScript modules, backend changes, content, and all loaded config files, and rebuilds a fresh private runtime before reloading. Press `Ctrl+C` to stop it.
- `pageskill d` publishes the canonical targets declared in `deployment.targets`.

For the source repository, run `npm install`, then `npm run g` to compile the runtime, theme, and backend before generating the site in place. Continue editing the same checkout; do not create a second site directory or an initialization flow.

## Discovery and reuse

The source of truth is `config.yml`, `config/*.yml`, `site/theme.yml`, `content/`, `themes/`, and `backend/`. The compiler derives `/.well-known/agent.json`, API Catalog, Agent Skills, `robots.txt`, Markdown mirrors, `llms.txt`, and other public discovery resources. Do not hand-edit generated output. Internal integrations may call `getCatalog`, `inspect`, `createContext`, `refreshContext`, `build`, and `check`.

Conditional Agent capabilities are implementation contracts, not switches that create services:

- Authentication metadata requires a protected resource in `backend/handler.ts` or a real external server, with verified issuer, audience, expiry, and scopes.
- MCP requires a real transport and a tool list matching `agentDiscovery.mcp.tools`.
- WebMCP requires a registered theme browser module that calls `document.modelContext.registerTool()` with explicit schemas.
- DNS-AID requires the advertised service, authoritative DNS records, and verified DNSSEC.

Keep these declarations opt-in. The renderer must never claim an external service, browser capability, DNS record, or DNSSEC signature that is not actually deployed.

Reuse existing Patterns, Blocks, schemas, plugins, and resources before adding code. When a capability is missing, implement one reusable theme extension with a clear schema and resource declaration; do not write per-article HTML.

## Configuration-first plugins

Foundation plugin behavior is code-owned. `chrome`, `search`, `toc`, `privacyConsent`, `language`, and `postMeta` keep defaults, schemas, resources, and localized messages in their implementation. Change supported UI switches, limits, insertion slots, or an explicitly documented plugin copy override in `site/theme.yml`; do not use that file for provider accounts or privacy categories. Ordinary navigation and footer links belong in `config.yml` or an extends file and use the shared safe link schema.

Third-party capabilities use the root `integrations` map. A trusted theme/plugin adapter registers its provider ID, schema, privacy purpose, consent requirement, load policy, resource implementation, and localized label; the site supplies only the public identifier fields for providers it actually uses. A configured node is enabled unless it says `enabled: false`. Purposes and categories are derived from active adapters, so a site with no consent-required integration has no consent banner. Optional purposes default to false, new purposes reconcile as unselected, and withdrawing consent prevents later loads but cannot undo work already performed. Provider secrets and verification stay in `backend/handler.ts` or the deployment environment.

## Content and localization

Keep `zh-sg`, `zh-tw`, and `en` pages and posts semantically synchronized. Use one ID for translations, keep the same publication `date`, and link tutorials through `/:locale/posts/<id>/`. Missing UI keys use the locale and fallback message chain; an existing Markdown file remains exactly as authored and is not silently mixed with fallback paragraphs.

Use Markdown, Frontmatter, and short Block attributes for content. Keep code examples runnable. Use `update: YYYY-MM-DD` or a valid ISO datetime only; invalid dates and an update earlier than `date` must fail during build/check.

## Security and runtime separation

Escape text and attributes, use `safeUrl` for links, and keep untrusted content out of `unsafeHtml`. Configuration is data, not a code entry point. Reject dangerous URL schemes, traversal, control characters, protocol-relative URLs, and arbitrary HTML/script/style fields.

Static page bodies are generated ahead of time. `dist/public` is public; backend code and private runtime files remain behind the runtime boundary. Register dynamic routes with `router.get(...)`, `router.post(...)`, or `router.all(...)`; generation does not need a duplicate route allowlist. Unknown paths fall through to public assets, and unmatched `/api` remains a 404.

For style changes, edit the owning existing stylesheet and keep its resource declaration. New styles belong beside their layout, component, Block, or plugin and must be registered through that module. Run `npm run compile-theme` and generate before reviewing the affected route.

## Verification

For source or content changes, use the smallest relevant checks and report actual results:

```text
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm run g
npm run g -- --profile
npm run d -- --dry-run
git diff --check
```

Never claim deployment, browser, accessibility, or visual results that were not observed.
