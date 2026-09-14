# Pageskill Agent Guide

Use the repository source and the generated discovery output as the contract. Keep this file about safe work habits, content ownership, the supported author workflow, and the quality checks that protect generated sites.

## Boundaries

- `config.yml` and its explicitly listed `config/*.yml` layers own site identity, locales, navigation, footer links, collections, routes, schemas, privacy controller data, root integrations, images, and deployment settings. `extends` is project-relative, ordered, and data-only.
- `theme.name` selects reusable theme code. `theme.config` points to the site-owned instance file, normally `site/theme.yml`; if it is omitted, the instance override is `{}` and plugin code defaults apply. `themes/<name>/` contains implementation, resources, plugins, and reference examples, not site instance settings.
- `site/theme.yml` contains only schema-bounded theme/plugin presentation overrides. It is not a second site configuration file and is never a CSS, HTML, browser-script, or `unsafeHtml` injection surface.
- `integrations` contains only providers actually used by the site. A registered Provider Adapter owns its schema, public identifier validation, privacy purpose, consent/load policy, and trusted resource implementation. Site YAML must not contain provider purpose declarations, arbitrary scripts, secrets, HTML, or provider data-retention claims.
- `content/pages/<id>/<locale>.md` owns stable pages such as Home, About, and the privacy policy. `content/posts/<id>/<locale>.md` owns tutorials, blogs, product records, and release updates; every post requires a valid `date`, and `update` is an optional last-modified timestamp. The configured updates view filters posts with `category: update` and is not a second source collection.
- `content/assets/` owns user assets. Keep the three active locales semantically aligned, use meaningful image alt text, descriptive link text, and accessible Markdown.
- `themes/<name>/` owns reusable Patterns, Blocks, layouts, shell markup, visual behavior, localized UI copy, icons, search, consent presentation, and browser plugins. The theme entry assembles components, layouts, and plugins; each module keeps its own implementation, resources, styles, scripts, and messages.
- `backend/handler.ts` is the source for dynamic business logic, secrets, writes, webhooks, identity, authorization, and API failure handling.
- `src/` owns the compiler, public two-command CLI, libraries, accessibility audit, Fetch Router, and theme contract. Never hand-edit generated `src/runtime/`, `.pageskill/`, or `dist/` output.

## Supported author workflow

The public CLI has exactly two daily commands:

- `pageskill g` validates source contracts, builds the site and deployment artifacts, runs the generated-HTML/browser accessibility audit, and writes the public snapshot to `dist/public`.
- `pageskill s` rebuilds, watches source dependencies, serves a local preview, and reports accessibility findings after each rebuild without terminating the preview for an in-progress error.

Pageskill does not publish to hosting-provider APIs. A host or Git integration receives `dist/public`; when backend or hosting artifacts are configured, `pageskill g` generates the corresponding private runtime and provider files while keeping them outside the public snapshot.

For the source repository, run `npm install` and `npm run g`, then continue editing this checkout. `npm test` includes the generated-site/browser accessibility pass before the unit and integration tests. Use `npm run g -- --profile` when build timings are needed. Stop a persistent `npm run s` process with `Ctrl+C` after interactive verification.

## Configuration and discovery

The source of truth is `config.yml`, its `extends` files, `site/theme.yml` when selected, `content/`, `themes/`, and `backend/`. After generation, advanced authors and Agent integrations may read `dist/.pageskill/catalog.json`, `dist/.well-known/agent.json`, and other renderer-produced resources. Internal integrations may call `getCatalog`, `inspect`, `createContext`, `refreshContext`, `build`, and `check`; these TypeScript APIs are not extra public CLI commands.

Discovery is renderer-owned. Do not hand-edit `.well-known/agent.json`, `.well-known/ai-catalog.json`, `.well-known/api-catalog`, Agent Skills files, `robots.txt`, Markdown mirrors, or `llms.txt`. The compiler derives these outputs from real configuration and generated capabilities. Conditional OAuth, MCP, WebMCP, and DNS-AID metadata is opt-in and describes only a separately implemented service, browser module, or DNS deployment; a configuration flag never creates one.

## Accessibility and secure rendering

The default theme targets WCAG 2.2 AA. Accessibility checks run in four layers: Markdown/theme source contracts, final HTML structure, a real browser with computed styles and axe-core, and keyboard/dynamic/viewport interaction checks. Automated checks are evidence, not a guarantee of complete conformance; keep manual review in the release report.

When changing content, layouts, theme CSS, browser plugins, or interactive UI:

- preserve visible focus indicators and keyboard operation;
- use native buttons, links, labels, landmarks, dialogs, and table semantics;
- never use color as the only state signal;
- never add `user-select: none`, selection interception, positive `tabindex`, arbitrary HTML/script configuration, or an overlay that blocks text selection;
- keep external `_blank` links protected by `rel="noopener noreferrer"` and use the shared safe URL resolver;
- run `npm test`, `npm run g`, and inspect the affected route at narrow and enlarged widths.

Configuration is data, not code. Escape text and attributes, use `safeUrl` for links, and keep untrusted content out of `unsafeHtml`. Static pages are generated ahead of time; backend routes stay private and are registered through the existing Fetch Router methods. Do not import backend code during generation to discover routes or read secrets.

## Content and localization

Keep `zh-sg`, `zh-tw`, and `en` pages and articles semantically synchronized. Use the same id for translations, the same post `date`, and `category: update` consistently for release-note translations. UI messages belong beside their owning module in `messages.yml`; locale fallback is `current locale`, language family, configured fallback locale, then English/code fallback. Content fallback may supply a missing whole document, but an existing Markdown file is shown exactly as authored.

Use Markdown, Frontmatter, and short Block attributes for content. Do not put private machine paths, temporary localhost URLs, or test-only broken documents in the public `content/` tree. Put invalid frontmatter and accessibility fixtures under `tests/fixtures/`.

## Changes and verification

Prefer existing Patterns, Blocks, schemas, plugins, Provider Adapters, and resources. Change site data in `config.yml` or an extends layer, theme instance behavior in `site/theme.yml`, visual behavior in its owning theme module, and dynamic behavior in `backend/handler.ts`. Keep defaults and schemas code-owned and avoid duplicate mechanisms.

For source or content changes, use the smallest relevant checks and report actual results:

```text
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm test
npm run g -- --profile
npm run s
git diff --check
```

Generated output is disposable and should be regenerated, not patched. Before handing off, inspect `git diff`, search for stale documentation or duplicate configuration surfaces, confirm the generated report contains no source paths in public files, and state any manual or browser checks that were not possible.
