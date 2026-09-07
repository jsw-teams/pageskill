# Changelog

[简体中文](CHANGELOG.zh-CN.md) · [中文 README](README.md) · [English README](README.en.md)

Version labels follow `package.json`, this changelog, and the dated localized release post. This file records repository changes; an entry does not claim npm publication or deployment.

## 3.0.0 — 2026-09-07

Pageskill 3.0.0 keeps the 3.0 version line and makes the first site easier to start.

### Changed

- Reduced the public daily CLI workflow to `pageskill g`, `pageskill s`, and `pageskill d`. `g` validates and generates, `s` keeps a preview running, and `d` publishes configured targets. The source repository uses `npm run g` to compile and generate, followed by `npm link`; a new site is copied from `starter`.
- Reorganized the current content tree. Stable pages keep the three-language home, About, and privacy policy. Tutorials, ordinary blog writing, and product records now live under `content/posts/<id>/<locale>.md`, keep the required `date`, and use locale post routes. Retired long guide and development page copies and the older prompt note were removed from the current tree without redirect shadows; their history remains in Git and this changelog.
- Rewrote the localized beginner path around eight short posts: start, site settings, Markdown, first article, Cookie choices, theme customization, deployment, and this 3.0 note. The privacy policy is a stable page; each tutorial post gives steps, a smallest useful example, an expected result, a common trap, and a next link.
- Refreshed the home learning path with six reusable bear illustrations and links to the first six steps. The visual change is content and theme work; no benchmark or performance claim is implied.
- Kept the existing static/public boundary: `dist/public` is the public snapshot, `backend/handler.ts` holds dynamic logic and runtime secrets, and same-origin APIs run at the service boundary. `config.yml` remains a data and settings entry point.
- Kept the existing Cookie plugin. Optional categories default to false, trusted `gatedScripts` belong in `theme.yml`, and withdrawing consent cannot undo a script action that already happened. The policy entry is the stable page route `/:locale/privacy/`.
- Fixed the Cookie prompt and footer layout. The language chooser prefers a visitor's manual choice before falling back to browser language, while locale URLs stay unchanged.
- Advanced authors can read generated `dist/.pagekiln/catalog.json` and `dist/.well-known/agent.json`, or use internal `getCatalog`/`inspect` integrations; these discovery details stay out of the beginner path.

### Migration

1. Keep the source repository and site as separate directories. Run `npm run g` and `npm link` in the source repository, then copy `starter` for a new site.
2. Move tutorials and blog notes to `content/posts/<id>/` with `en.md`, `zh-sg.md`, and `zh-tw.md` where translations are offered. Add the required ISO date and keep one id across locales.
3. Update the Cookie policy setting to `/:locale/privacy/` and replace the example contact and service details with real values.
4. From the site directory, run `pageskill g`, keep `pageskill s` for local preview, and run `pageskill d` only after configuring a deployment target.

### Verification workflow

Routine checks use a dry run for deployment; the real publish command is reserved for a ready target:

```text
npm run g
npm test
pageskill g
pageskill s
pageskill d --dry-run
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
