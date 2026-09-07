# Pageskill Agent Guide

Use the repository's source files and generated discovery output as the contract. Keep this file about safe work habits and boundaries; do not copy the complete project reference into it.

## Boundaries

- `config.yml` owns site metadata, locales, navigation, collections, routes, schemas, privacy, search, images, and deployment settings. It is not a CSS, HTML, browser-script, or `unsafeHtml` injection surface.
- `content/pages/<id>/<locale>.md` owns current effective site content; `docs` is a Pattern within this collection, not another collection. `content/posts/<id>/<locale>.md` owns dated Product Notes and requires `date`; `content/assets/` owns user assets.
- `themes/<name>/theme.yml`, `i18n.yml`, `theme.ts`, `style.css`, and theme resources own Patterns, Blocks, shell markup, visual behavior, localized UI copy, icons, search, and Cookie presentation. `theme.yml` registers exported capability names and resources; Pattern/Block definitions and their schemas live in `theme.ts`. Optional plugins live under `plugins.<name>` and support `enabled: true|false`.
- `backend/handler.ts` is the only source for dynamic business logic, secrets, writes, and webhooks.
- `src/` owns the compiler, CLI, libraries, Fetch router, and theme contract. Never hand-edit `src/runtime/`, `.pagekiln/`, or `dist/`; they are generated.

## Product and development standards

- Reuse first: run `pageskill catalog` and `pageskill inspect` to discover the available Pattern, Block, schema, plugin, and resource dependencies. Human authors can reuse the built-in capabilities without Agent participation; authors should assemble pages with Markdown, Frontmatter, and `config.yml` without hand-writing per-page HTML. Add a theme extension only when discovery shows a missing capability, and implement that capability once for reuse.
- Performance and speed: static HTML is the default and ordinary pages do not require hydration. Declare browser and other resources only when a feature needs them; preserve incremental dependency tracking and fingerprinted asset caching. The default CSS optimization may inline only small Pattern/Block stylesheet dependencies: each original UTF-8 file must be at most 2,048 bytes and each page's inlined CSS text, including separator bytes, at most 4,096 bytes. Merge only adjacent inlineable dependencies, deduplicated in main stylesheet → Pattern → Block order; `theme.style` and global/preset bundles remain external cached assets. Files containing `url()`, `src()`, `image()`, `image-set()`, `@import`, `@charset`, `@namespace`, backslashes, `<`, or a UTF-8 BOM stay external conservatively. External CSS is compressed; inline CSS keeps its original source text. Top-level `theme.yml` `inlineStyles: false` disables only this CSS optimization; it does not promise a site-wide CSP policy. All fingerprinted CSS assets are still emitted, and CSS changes invalidate their cache. When a change affects build or resources, reproduce it with `--profile` or the benchmark fixture before describing its cost or speed; do not invent performance promises.
- Page security: escape text and attributes, use `safeUrl` for links, and keep untrusted content out of `unsafeHtml`. Search, form, and URL values are data: insert them with `textContent` or other safe DOM APIs, never `innerHTML`, and never `eval`. Theme TypeScript and browser JavaScript are trusted application code, not a sandbox for untrusted input. Keep configuration as a non-code entry point. New dynamic endpoints must validate input; protected operations must implement identity, authorization, and CSRF controls as business logic; secrets are read only at runtime in `backend/handler.ts`. The framework and Fetch router do not provide those guarantees automatically.
- Internationalization: keep the `zh-sg`, `zh-tw`, and `en` pages semantically synchronized. Put UI copy in the theme `i18n.yml`; verify `lang`, `hreflang`, language links, and fallback behavior, and do not mix languages within a localized page.
- Frontend and backend separation: content, `config.yml`, themes, and generated output have distinct roles; `backend/handler.ts` owns APIs, secrets, writes, and webhooks. Static generation is the default rendering method: ordinary content is pre-generated, while interactive features call same-origin APIs. The public snapshot lives under `dist/public`; one Worker/Fetch service can serve those pages and same-origin APIs while keeping server code private. The same Worker/service handles `/api/*` first by default; declare other dynamic paths in `deployment.dynamicRoutes`, and never import backend during the build to discover routes or read secrets. Publish only the public snapshot to GitHub Pages or a CDN; Fetch deployments can keep the API from the same package. Workers use `assets.directory: public`, with `.assetsignore` as an additional exclusion layer. Keep `server/`, `_pagekiln/`, `.pagekiln/`, Worker files, and `*.toml` private, load backend code only in the server/worker runtime, and never write runtime secrets to build output. Static page bodies should not depend on dynamic requests to render. Give new dynamic behavior its own failure handling.
- Compatibility and migration: preserve existing content, configuration, and theme contracts. Prefer new capabilities to be optional and keep existing behavior unchanged; when a breaking change is necessary, document migration steps and verify compatibility. The current CLI entry point is `pageskill`; use `PAGESKILL_SITE_ROOT` for the site root. Keep `.pagekiln/` cache/catalog/build-profile paths, `_pagekiln` internal output, and the existing Cookie consent storage key compatible even though the old terminal/CLI entry is removed. Avoid maintaining duplicate mechanisms indefinitely.
- Release versioning: for every future major, minor, or patch release, keep the SemVer in `package.json` and `package-lock.json` synchronized, add the change to `CHANGELOG.md`, and add a dated localized Product Note under `content/posts/<id>/{en,zh-sg,zh-tw}.md` with migration steps and verification. Do not backfill a release note for 1.0.

## Discover before changing

Run `pageskill catalog` for the active source-backed capability catalog. Use `pageskill inspect home` for content and explicit queries for local facts:

```text
pageskill inspect page:<id>
pageskill inspect block:<id>
pageskill inspect pattern:<id>
pageskill inspect collection:<id>
pageskill inspect plugin:<id>
```

`config.yml`, `content/`, and `themes/` are the source of truth. `.pagekiln/catalog.json` and `.well-known/agent.json` are generated discovery; `AGENTS.md` is operational guidance, not a capability registry.

## Change and verify

Change content in Markdown, visual behavior in a copied theme, site settings in `config.yml`, and dynamic behavior in `backend/handler.ts`. If a CSS or browser ESM redesign replaces an implementation, delete overlapping dead files and handlers; do not preserve them for hypothetical agents or rely on cascade order.

Keep `theme.yml` declarations aligned with the actual `theme.ts`/`theme.js` export. Keep localized UI messages in `i18n.yml`, not in `config.yml`. Do not perform a broad compiler refactor for a local feature; a future candidate is splitting `src/compiler.ts` by pipeline responsibility.

Verify proportionally, normally with:

```bash
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm test
npm run build -- --profile
npm run check
npm run catalog
npm run inspect -- home
```

Use `npm run bench -- 100` only for the temporary scale/resource and preview-live-update measurement. Run `git diff --check` when Git metadata is available. Never publish, push, deploy, or open a PR unless the user explicitly asks for that action.
