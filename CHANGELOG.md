# Changelog

[简体中文](CHANGELOG.zh-CN.md) · [中文 README](README.md) · [English README](README.en.md)

Version labels follow `package.json`, this changelog, and the dated localized update. This file records repository changes; an entry does not claim npm publication or deployment.

## 3.0.2 — 2026-09-10

Pageskill 3.0.2 separates version history from tutorial content and tightens the responsive reading layout.

### Changed

- Added an `updates` view backed by the `posts` collection at `content/posts/<version>/<locale>.md` with `category: update`. It has independent localized index/detail routes, archive, feed, search entries, language links, navigation, and a home-page section; tutorials remain in the same source collection without the update category.
- Added explicit post taxonomy from Markdown Frontmatter: `category: tutorial` marks tutorials, `category: update` marks release notes, and a missing category defaults to `uncategorized`; pages are not used to infer a post's category.
- Extended the existing collection-driven archive/feed and post-list mechanisms instead of introducing a second content collection or page pattern. Update relations stay within the filtered view, and generated archive pages now expose a visible heading, description, and localized links.
- Added locale fallback for partially translated UI and content: missing interface keys merge from the fallback language, while a missing article document can use fallback content without falsely advertising it as a translated page.
- Made the language chooser follow active locales and fallback behavior consistently. Cookie choices now expose provider and retention metadata per category, borrowing a policy generator's transparency while keeping the reviewed legal policy as authored content.
- Fixed the language chooser's recommendation layout with a reserved label line and equal card heights. Article headers now align with the reading column and keep title, description, date, and author compact before the cover; mobile tables of contents start collapsed.
- Constrained archive thumbnails to a stable 16:9 frame with `height: 100%`, `width: 100%`, and `object-fit: cover`, so source `height` attributes cannot create tall blank rows. Post cards and article covers use stable frames and preserve the full source artwork with `object-fit: contain`.
- Added structured theme-level `plugins.chrome` slots for links before or after the standard navigation and footer tools. Locale substitution, size limits, traversal/protocol checks, and label escaping keep shell customization inside a safe link-only boundary; raw HTML, scripts, CSS, selectors, and arbitrary attributes are not accepted.
- Extended the Cookie plugin as a code-registered capability with theme-owned provider instances. The consent-aware adapters use a canonical array and the providers' real web fields: GA4 `measurementId` (`G-...`), Google Ads `tagId` (`AW-...`/`GT-...`), Cloudflare Web Analytics `token`, Baidu `siteSignature`, CAPTCHA `siteKey`, and the account-ID-free X for Websites widget. Extra integration fields remain extensible but inert until a registered module consumes them. Optional provider resources stay disabled until affirmative consent, and `config.yml` is neither emitted to `dist/public` nor writable through the runtime.
- Made Agent discovery renderer-owned: the compiler derives `.well-known/agent.json`, ARD, the conditional RFC 9727 API catalog, the Agent Skills index, `robots.txt`, and `llms.txt` from configuration and actual outputs. The shared Fetch Router emits RFC 8288 `Link`, negotiates `Accept: text/markdown` mirrors with `Vary: Accept`, and carries `Content-Signal` from the robots policy. The generated Skill walks the code-owned capability registry and configured sections instead of maintaining a second hand-written field map.
- Made routine plugin and style work config-first. `search`, `toc`, `privacyConsent`, and `chrome` expose schema-bounded instance options and partial `copy.<locale>` maps in `theme.yml`; adding, editing, and removing a style now follows the owning module's resource registration rather than generated output edits.

### Compatibility

- Move older release-note files from `content/updates/<version>/` to `content/posts/<version>/`, keep the locale/date/author/cover fields, and add `category: update` to every translation. Existing public `/:locale/updates/<version>/` links remain the update-view links; ordinary posts continue to use `/:locale/posts/<id>/`. Add `category: tutorial` when a post is a tutorial and omit it when the default `uncategorized` label is wanted.
- A new locale can be activated before it is fully translated. Add its UI and content files as they become ready; missing UI keys use the fallback language, a missing whole document uses fallback content, and an existing partially translated Markdown file remains exactly as authored rather than being silently machine-translated.
- If an older theme contains a language enable/disable switch, remove that redundant setting; the visitor language chooser remains available from the active locale list and fallback behavior.
- Run `npm run g -- --profile`, inspect the post and update archives/feeds, then run `npm run d -- --dry-run` before publishing.
- Do not copy generated discovery files into the source tree. Configure API entries, optional ARD queries, or conditional OAuth/MCP metadata in `config.yml`, then regenerate so files, media types, and response headers stay aligned.
- Migrate the old object-shaped `privacyConsent.integrations` to the array shown in the Cookie tutorial. The compiler accepts the old provider keys during this transition and maps `conversionId` to the Google Ads `tagId` slot and `siteId` to Baidu `siteSignature`; new configuration should use the canonical provider names and real values. A Google Ads conversion event still needs its own reviewed event implementation; the consent adapter only initializes the Google tag.

### Removed and replacements

- The separate `content/updates` source collection is no longer used. It was replaced because release notes and ordinary posts need one date-ordered source without duplicate content mechanisms; use `content/posts` with `category: update`. The public updates index, routes, feeds, search entries, and language links were not removed.
- No Cookie consent or language-choice visitor feature was removed. Provider/retention fields are explanatory metadata, while the reviewed localized privacy page remains the legal policy source. The canonical integration shape replaces ambiguous provider object keys; the old shape is accepted during migration and has a documented replacement.
- Existing Cookie storage and `gatedScripts` behavior remains compatible. Move provider instances to `themes/<name>/theme.yml`; keep secrets and CAPTCHA verification server-side. A configured integration with an unsupported or incomplete provider field is ignored until its code module is registered; no provider is enabled by default.
- No discovery endpoint was removed. Hand-maintained snapshots are replaced by renderer output; OAuth/OIDC, MCP, WebMCP, and DNS-AID remain opt-in and have no effect until their real service or external DNS/DNSSEC contract is implemented.

### Verification

- `npm run g -- --profile` passed; runtime, theme, and backend compilation passed and the build reported 48 source documents.
- The local preview returned `text/markdown` for an explicit Markdown request, `application/linkset+json` for `/.well-known/api-catalog`, generated `Link`/`Content-Signal` headers, and 404 responses without private configuration text for `/config.yml` and `/assets/config.yml`.
- The 56-file internal `href`/`src` check found no missing references. The posts Feed contains 10 items and the updates Feed contains 3, with the two collections isolated; the old post routes for 3.0.0 and 3.0.1 are absent.
- Desktop (1280px) and mobile (390px) checks passed: language cards are 136px and share a title baseline, archive covers are 144x81, article title/date/author alignment is compact, mobile TOC starts collapsed and expands on click, and there is no horizontal overflow. The root language page matched Traditional Chinese browser preference and localized its brand and privacy links to `zh-tw`.
- `git diff --check` passed. `npm run d -- --dry-run` exited 1 because `deployment.targets` is not configured; no deployment or npm publication was performed.

## 3.0.1 — 2026-09-09

Pageskill 3.0.1 is a patch release on the 3.0 line. It folds the current compiler, content, and publishing corrections into one documented release without changing existing article publication dates.

### Changed

- Hardened the incremental workflow: backend and nested theme generations use isolated private runtimes, public CSS/JS resources keep independent content hashes, and the persistent preview's SSE reload path remains valid after source changes.
- Kept runtime routing source-backed: generated Worker/Pages/VPS entrypoints run the Fetch Router first, unmatched `/api` requests stay 404, and static output remains under `dist/public` while private deployment files stay outside that public snapshot.
- Made post ordering use valid ISO publication dates, newest first, with deterministic ID order for same-day articles. Existing dates remain unchanged; an invalid post date now fails validation instead of silently sorting as a current article.
- Added optional post `author` and `cover` Frontmatter through the collection schema, document/cache mapping, article page, post list, and archive. Authors fall back to the localized site author; covers accept safe local asset paths or HTTPS URLs, carry alt/dimensions/loading metadata, and disappear cleanly when omitted.
- Refreshed the three-language content path and publishing guidance. Git integration builds with `npm run g` and publishes only `dist/public`; a same-package backend uses `npm run d` so the private runtime is staged separately. The retired `npm run build` alias and whole-`dist` publishing are not part of the contract.

### Compatibility

- Existing posts do not need new fields: keep their valid ISO `date`, leave `author` absent when the site-author fallback is sufficient, and add `cover` only for a safe local asset or HTTPS image.
- Replace `npm run build` with `npm run g`; use `npm run s` for a persistent preview and `npm run d -- --dry-run` before a real publish. Static hosting receives `dist/public`; backend-capable publishing uses `npm run d` to stage private files correctly.
- Keep existing post IDs, dates, and `/:locale/posts/<id>/` links. If a cover path is unsafe, replace it with a path under `content/assets/`, an HTTPS URL, or omit the cover.

### Removed and replacements

- The `npm run build` alias was removed to avoid two names for the same generation step; use `npm run g`.
- Publishing the whole `dist/` directory is not supported because it may contain private runtime files; use `dist/public` for static output or `npm run d` for a backend-aware package.
- No article metadata capability was removed. Articles without `author` or `cover` continue to render through the fallback and no-cover behavior.

### Verification

- Observed locally for this release: `npm run compile-runtime`, `npm run compile-theme`, and `npm run g` (including the backend compile), generating 42 documents; targeted checks confirmed newest-first and same-day ordering, stable title/summary/date/author separation, cover rendering and fallback, localized labels, no duplicate post title, and rejection of an unsafe cover URL.
- No npm publication or Cloudflare deployment is claimed here. The deleted legacy `test/` tree remains deleted. `npm run d -- --dry-run` was also run and correctly refused because this checkout has no deployment target; add a ready target and rerun it before `npm run d`.

## 3.0.0 — 2026-09-07

Pageskill 3.0.0 keeps the 3.0 version line and makes the first site easier to start.

### Changed

- Reduced the public daily CLI workflow to `pageskill g`, `pageskill s`, and `pageskill d`. `g` validates and generates, `s` keeps a preview running, and `d` publishes configured targets. A new site starts by cloning this repository, running `npm install` and `npm run g`, then editing the clone in place.
- Reorganized the current content tree. Stable pages keep the three-language home, About, and privacy policy. Tutorials, ordinary blog writing, and product records now live under `content/posts/<id>/<locale>.md`, keep the required `date`, and use locale post routes. Retired long guide and development page copies and the older prompt note were removed from the current tree without redirect shadows; their history remains in Git and this changelog.
- Rewrote the localized beginner path around short posts for starting, site settings, Markdown, the first article, Cookie choices, theme customization, search, the table of contents, plugin development, deployment, and this 3.0 note. The privacy policy is a stable page; each tutorial post gives steps, a smallest useful example, an expected result, a common trap, and a next link.
- Refreshed the home learning path with six reusable bear illustrations and links to the first six steps. The visual change is content and theme work; no benchmark or performance claim is implied.
- Kept the existing static/public boundary: `dist/public` is the public snapshot, `backend/handler.ts` holds dynamic logic and runtime secrets, and same-origin APIs run at the service boundary. Backend paths use the existing `router.get(...)`, `router.post(...)`, and `router.all(...)` methods; runtime matching returns a `Response` or `null`, so generation does not need a per-route route list. Generated Worker/Pages/VPS entrypoints run the Router first for every pathname and set `run_worker_first = true`; unknown paths fall through to public assets, while unmatched `/api` paths remain 404. API errors and authorization responses do not fall back to static output. Build/generation keeps nested server-side ESM inside the private boundary, and persistent `pageskill s` rebuilds nested theme TypeScript in a fresh private runtime; each public CSS/JS resource has an independent content hash, so unchanged assets retain their URLs and cache identity.
- Kept the existing Cookie plugin. Optional categories default to false, trusted gated scripts require affirmative consent, and withdrawing consent cannot undo a script action that already happened. The policy entry remains the stable localized privacy page `/:locale/privacy/`.
- Fixed the Cookie prompt and footer layout. The language chooser prefers a visitor's manual choice before falling back to browser language, while locale URLs stay unchanged.
- Simplified the theme contract: the theme entry assembles exported capabilities, `layouts/site/` owns the shell, shared helpers live in `components/shared/`, article relations live with the article layout/component, and plugin directories carry their own styles, scripts, and localized messages. A person or Agent can reuse one extension across pages without copying HTML.
- Added practical localized articles for local search, article tables of contents, and developing one reusable plugin. They describe the source paths and commands that are present in the current theme contract.
- Advanced authors can read generated `dist/.pagekiln/catalog.json` and `dist/.well-known/agent.json`, or use internal `getCatalog`/`inspect` integrations; these discovery details stay out of the beginner path.

### Migration

1. Clone the repository, run `npm install`, then run `npm run g`; keep editing the cloned site in place.
2. Keep stable pages under `content/pages/<id>/<locale>.md` without a date. Put tutorials, blog notes, product records, and release notes under `content/posts/<id>/<locale>.md` with the required ISO date and one id across locales.
3. If a release note is still under `content/updates/<version>/`, move it to `content/posts/<version>/` and add `category: update`; keep public update links and use post routes for ordinary articles.
4. Keep the Cookie policy at `/:locale/privacy/`, replace example contact and service details with real reviewed content, and keep the existing consent storage key.
5. If an older workflow uses `npm run build`, replace it with `npm run g`; use `npm run s` for preview and `npm run d -- --dry-run` before publishing.

### Removed and replacements

- The old `npm run build` entry point was removed; `npm run g` is the compatible replacement.
- Retired long guide/development page copies and the old prompt note are not kept as redirect shadows. They were replaced by short localized tutorial posts because duplicate sources could drift; use those posts or Git history instead.
- A generated per-route `dynamicRoutes` list is not an authoring requirement; use the existing Router methods. Backend routing and same-origin API behavior remain available.
- Cookie consent and language selection remain supported; use the localized privacy page and the chooser's manual-selection/browser-language fallback.

### Verification workflow

Routine checks use a dry run for deployment; the real publish command is reserved for a ready target:

```text
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm run g
npm run g -- --profile
npm run s
npm run d -- --dry-run
```

Run `pageskill d` only when the site is ready for the actual publish.

## History

### Earlier 3.0 foundation

- Renamed the public product from Pagekiln to Pageskill across package metadata, the CLI, site identity, theme copy, documentation, and repository links. The old public name and environment variable were migrated to Pageskill equivalents.
- Added source-backed reusable Patterns, Blocks, schemas, plugins, contexts, resource dependencies, static localized output, same-origin Fetch handling, and a private backend boundary.
- Added conservative stylesheet planning, browser-safe local search, optional Cookie script gating, generated catalogs, build profiles, and deployment adapters around `dist/` output.

### 2.0 — archived summary

No reliable original publication date is recorded here.

- Established the Pagekiln TypeScript/Node 22+ static-first compiler: YAML 1.2 Frontmatter and CommonMark/GFM Markdown compose with theme-owned Patterns, Blocks, and collection schemas.
- Added localized collections, route generation, translation fallback, feeds, archives, sitemaps, 404 output, local search, and source-backed discovery files.
- Established the theme contract for page and post shells, localized UI, optional browser behavior, icons, Cookie consent, and accessible navigation.
- Added incremental build context and dependency tracking, cached image variants, fingerprinted assets, build profiles, checks, and deployment adapters around generated output.
