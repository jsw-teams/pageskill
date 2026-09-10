# Changelog

[简体中文](CHANGELOG.zh-CN.md) · [中文 README](README.md) · [English README](README.en.md)

Version labels follow `package.json`, this changelog, and the dated localized update. This file records repository changes; an entry does not claim npm publication or deployment.

## 3.0.2 — 2026-09-10

Pageskill 3.0.2 separates version history from tutorial content and tightens the responsive reading layout.

### Changed

- Added an `updates` view backed by the `posts` collection at `content/posts/<version>/<locale>.md` with `category: update`. It has independent localized index/detail routes, archive, feed, search entries, language links, navigation, and a home-page section; tutorials remain in the same source collection without the update category.
- Extended the existing collection-driven archive/feed and post-list mechanisms instead of introducing a second content collection or page pattern. Update relations stay within the filtered view, and generated archive pages now expose a visible heading, description, and localized links.
- Set the published site URL to `https://pageskill.openjsu.com` and the localized site author to `toewpq`; a post without an explicit `author` inherits that value, including when the incremental document cache is warm. The root `i18n` settings now own fallback locale and missing-content behavior, while partially translated theme UI merges missing keys from the fallback locale without advertising fallback pages as translated.
- Kept language capability resources in the theme code but removed language options from `theme.yml`. Cookie choices now expose provider and retention metadata per category, borrowing a policy generator's transparency while keeping the reviewed legal policy as authored content.
- Fixed the language chooser's recommendation layout with a reserved label line and equal card heights. Article headers now align with the reading column and keep title, description, date, and author compact before the cover; mobile tables of contents start collapsed.
- Constrained archive thumbnails to a stable 16:9 frame with `height: 100%`, `width: 100%`, and `object-fit: cover`, so source `height` attributes cannot create tall blank rows. Article covers use a stable 1200:630 frame without stretching.

### Verification

- `npm run g -- --profile` passed; runtime, theme, and backend compilation passed and the build reported 48 source documents.
- The 56-file internal `href`/`src` check found no missing references. The posts Feed contains 10 items and the updates Feed contains 3, with the two collections isolated; the old post routes for 3.0.0 and 3.0.1 are absent.
- Desktop (1280px) and mobile (390px) checks passed: language cards are 136px and share a title baseline, archive covers are 144x81, article title/date/author alignment is compact, mobile TOC starts collapsed and expands on click, and there is no horizontal overflow. The root language page matched Traditional Chinese browser preference and localized its brand and privacy links to `zh-tw`.
- `git diff --check` passed. `npm run d -- --dry-run` exited 1 because `deployment.targets` is not configured; no deployment or npm publication was performed.

## 3.0.1 — 2026-09-09

Pageskill 3.0.1 is a patch release on the 3.0 line. It folds the current compiler, content, and publishing corrections into one documented release without changing existing article publication dates.

### Changed

- Kept site metadata, navigation, collection schemas, privacy/controller data, images, and deployment settings in `config.yml`; the theme entry and module-owned UI/resources remain in `themes/default/`, while plugin instance options stay in `theme.yml`.
- Hardened the incremental workflow: backend and nested theme generations use isolated private runtimes, public CSS/JS resources keep independent content hashes, and the persistent preview's SSE reload path remains valid after source changes.
- Kept runtime routing source-backed: generated Worker/Pages/VPS entrypoints run the Fetch Router first, unmatched `/api` requests stay 404, and static output remains under `dist/public` while private deployment files stay outside that public snapshot.
- Made post ordering use valid ISO publication dates, newest first, with deterministic ID order for same-day articles. Existing dates remain unchanged; an invalid post date now fails validation instead of silently sorting as a current article.
- Added optional post `author` and `cover` Frontmatter through the collection schema, document/cache mapping, article page, post list, and archive. Authors fall back to the localized site author; covers accept safe local asset paths or HTTPS URLs, carry alt/dimensions/loading metadata, and disappear cleanly when omitted.
- Refreshed the three-language content path and Cloudflare Pages guidance. Git integration builds with `npm run g` and publishes only `dist/public`; a same-package backend uses the configured CLI target and `npm run d` staging path. The retired `npm run build` alias and whole-`dist` publishing are not part of the contract.

### Verification

- Observed locally for this release: `npm run compile-runtime`, `npm run compile-theme`, and `npm run g` (including the backend compile), generating 42 documents; targeted checks confirmed newest-first and same-day ordering, stable title/summary/date/author separation, cover rendering and fallback, localized labels, no duplicate post title, and rejection of an unsafe cover URL.
- No npm publication or Cloudflare deployment is claimed here. The deleted legacy `test/` tree remains deleted. `npm run d -- --dry-run` was also run and correctly refused with `Set deployment.targets in config.yml` because this checkout has no deployment target; configure one and rerun it before `npm run d`.

## 3.0.0 — 2026-09-07

Pageskill 3.0.0 keeps the 3.0 version line and makes the first site easier to start.

### Changed

- Reduced the public daily CLI workflow to `pageskill g`, `pageskill s`, and `pageskill d`. `g` validates and generates, `s` keeps a preview running, and `d` publishes configured targets. A new site starts by cloning this repository, running `npm install` and `npm run g`, then editing the clone in place.
- Reorganized the current content tree. Stable pages keep the three-language home, About, and privacy policy. Tutorials, ordinary blog writing, and product records now live under `content/posts/<id>/<locale>.md`, keep the required `date`, and use locale post routes. Retired long guide and development page copies and the older prompt note were removed from the current tree without redirect shadows; their history remains in Git and this changelog.
- Rewrote the localized beginner path around short posts for starting, site settings, Markdown, the first article, Cookie choices, theme customization, search, the table of contents, plugin development, deployment, and this 3.0 note. The privacy policy is a stable page; each tutorial post gives steps, a smallest useful example, an expected result, a common trap, and a next link.
- Refreshed the home learning path with six reusable bear illustrations and links to the first six steps. The visual change is content and theme work; no benchmark or performance claim is implied.
- Kept the existing static/public boundary: `dist/public` is the public snapshot, `backend/handler.ts` holds dynamic logic and runtime secrets, and same-origin APIs run at the service boundary. Backend paths use the existing `router.get(...)`, `router.post(...)`, and `router.all(...)` methods; runtime matching returns a `Response` or `null`, so generation does not need a per-route `dynamicRoutes` list in `config.yml`. Generated Worker/Pages/VPS entrypoints run the Router first for every pathname and set `run_worker_first = true`; unknown paths fall through to public assets, while unmatched `/api` paths remain 404. API errors and authorization responses do not fall back to static output. Build/generation keeps nested server-side ESM inside the private boundary, and persistent `pageskill s` rebuilds nested theme TypeScript in a fresh private runtime; each public CSS/JS resource has an independent content hash, so unchanged assets retain their URLs and cache identity. `config.yml` remains a data and settings entry point.
- Kept the existing Cookie plugin. Optional categories default to false, and trusted `gatedScripts` are declared by the plugin's code-owned `defaults` and schema in `themes/<name>/plugins/cookies/index.ts`; theme instance options live in `themes/<name>/theme.yml`, while site config keeps policy/controller data. Withdrawing consent cannot undo a script action that already happened. The policy entry is the stable page route `/:locale/privacy/`.
- Fixed the Cookie prompt and footer layout. The language chooser prefers a visitor's manual choice before falling back to browser language, while locale URLs stay unchanged.
- Simplified the theme contract: `themes/<name>/index.ts` assembles exported capabilities, `layouts/site/` owns the shell, shared helpers live in `components/shared/`, article relations live with the article layout/component, plugin directories carry their own styles, scripts, and `messages.yml`, and `theme.yml` keeps schema-validated plugin instance data and switches. A person or Agent can reuse one extension across pages without copying HTML.
- Added practical localized articles for local search, article tables of contents, and developing one reusable plugin. They describe the source paths and commands that are present in the current theme contract.
- Advanced authors can read generated `dist/.pagekiln/catalog.json` and `dist/.well-known/agent.json`, or use internal `getCatalog`/`inspect` integrations; these discovery details stay out of the beginner path.

### Migration

1. Clone the repository, run `npm install`, then run `npm run g`; keep editing the cloned site in place.
2. Keep stable pages under `content/pages/<id>/<locale>.md` without a date. Put tutorials, blog notes, product records, and release notes under `content/posts/<id>/<locale>.md` with the required ISO date and one id across locales.
3. Update the Cookie policy setting to `/:locale/privacy/` and replace the example contact and service details with real values.
4. For source checks, run the compile commands, `npm run g -- --profile`, and `npm run s`; use `npm run d -- --dry-run` for deployment verification and run `npm run d` only when the configured target is ready.

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
