# Pageskill Agent Guide

Use the repository source and its generated discovery output as the contract. Keep this file about safe work habits, content ownership, and the supported workflow.

## Boundaries

- `config.yml` owns site metadata, locales, navigation, collections, routes, schemas, privacy, search, images, and deployment settings. It stores data and switches; it is not a CSS, HTML, browser-script, or `unsafeHtml` injection surface.
- `content/pages/<id>/<locale>.md` owns stable pages such as the home page, About, and the privacy policy. These pages do not need `date`; the pages collection supplies the default page pattern. Tutorials, blogs, product records, and release notes belong in `content/posts/<id>/<locale>.md`; every post has a required `date`, while its collection supplies the default article pattern. `content/assets/` owns user assets.
- `themes/<name>/theme.yml`, `i18n.yml`, theme modules, styles, and theme resources own reusable Patterns, Blocks, shell markup, visual behavior, localized UI copy, icons, search, and Cookie presentation. Keep declarations aligned with the exported theme capability.
- `backend/handler.ts` is the source for dynamic business logic, secrets, writes, and webhooks.
- `src/` owns the compiler, CLI, libraries, Fetch router, and theme contract. Never hand-edit `src/runtime/`, `.pagekiln/`, or `dist/`; they are generated.

## The supported author workflow

The public CLI has three daily commands:

- `pageskill g` automatically validates source content and generates the public snapshot in `dist/public`.
- `pageskill s` keeps a local preview running. Press `Ctrl+C` to stop it; another terminal can continue editing and run `pageskill g` again.
- `pageskill d` publishes the targets declared in `config.yml`.

For the source repository, `npm run g` compiles the runtime, theme, and backend before generating the repository site; run `npm link` once to expose `pageskill` to a copied site. A new site starts by copying `starter`, not by asking the CLI to initialize a project. Keep the source repository and the site directory conceptually separate.

Do not teach or reintroduce retired command entry points. The beginner path should link to the dated articles under `content/posts/` and use only `g`, `s`, and `d`.

## Discovery and reuse

The source of truth is `config.yml`, `content/`, and `themes/`. After generation, advanced authors and Agent integrations may read `dist/.pagekiln/catalog.json` or `dist/.well-known/agent.json`. Internal integrations may call `getCatalog` and `inspect` to query source-backed capabilities. Keep that discovery layer out of the beginner steps unless it directly solves an author’s request.

Reuse existing Patterns, Blocks, schemas, plugins, and resources before adding code. A person can reuse the theme directly without an Agent. When a capability is missing, implement one theme extension with a clear schema and resource declaration so later articles can reuse it; do not hand-write per-article HTML.

## Content and localization

Keep `zh-sg`, `zh-tw`, and `en` pages and articles semantically synchronized. Use the same id for page translations and the same post id and `date` for article translations, link tutorial steps through `/:locale/posts/<id>/`, and keep UI copy in the theme `i18n.yml`. Verify language links, `lang`, `hreflang`, fallback behavior, and both page and article routes after content changes.

Use Markdown, Frontmatter, and short Block attributes for content. A Frontmatter `date` is required for every post, including tutorials and ordinary blog writing; stable pages such as About and privacy do not need it. Keep code examples minimal and runnable. Do not preserve retired guide or development page copies as redirect shadows when the content tree intentionally removes them.

## Security and runtime separation

Escape text and attributes, use `safeUrl` for links, and keep untrusted content out of `unsafeHtml`. Search, form, and URL values are data: insert them with text APIs or equivalent safe DOM APIs, never `innerHTML` or `eval`. Configuration is data, not a code entry point.

Static page bodies are generated ahead of time. The public snapshot lives in `dist/public`; `backend/handler.ts` stays private and serves same-origin APIs at runtime. Do not import backend code during generation to discover routes or read secrets. New dynamic endpoints validate input and implement their own identity, authorization, CSRF, and failure handling.

Reuse the existing `privacyConsent` plugin. Optional categories default to false, and trusted `gatedScripts` belong only in `theme.yml`. Protocol checking does not prove that a third-party script is safe. Withdrawing consent prevents later loads but cannot undo work a script already performed.

## Change and release discipline

Change content in Markdown, visual behavior in the theme, site settings in `config.yml`, and dynamic behavior in `backend/handler.ts`. Remove overlapping dead files when a replacement is complete; do not keep duplicate mechanisms for hypothetical consumers. Preserve `.pagekiln/` and `_pagekiln` compatibility and the existing Cookie consent storage key.

Keep the SemVer in `package.json` and `package-lock.json` synchronized with `CHANGELOG.md`, `CHANGELOG.zh-CN.md`, and a dated localized post when a release changes. The current release remains 3.0.0; do not create a separate 4.0 note for this content reorganization. Keep migration steps and planned verification commands in the release post without claiming results that have not been observed.

## Verification

For a source or content change, use the smallest relevant checks and report actual results:

```text
npm run g
npm test
pageskill g
pageskill s
pageskill d --dry-run
git diff --check
```

`pageskill s` is a persistent process, so stop it after interactive verification. Use `pageskill d --dry-run` for routine deployment verification; run `pageskill d` only when the user has asked for publishing and the configured target is ready. Do not invent build, deployment, accessibility, or browser results.
