# Pageskill Agent Guide

Use the repository source and its generated discovery output as the contract. Keep this file about safe work habits, content ownership, and the supported workflow.

## Boundaries

- `config.yml` owns site metadata, locales, navigation, collections, routes, schemas, privacy policy/controller data, images, and deployment settings. The selected theme is `theme.name`; plugin instance options and switches belong in `themes/<name>/theme.yml`. Neither file is a CSS, HTML, browser-script, or `unsafeHtml` injection surface.
- `content/pages/<id>/<locale>.md` owns stable pages such as the home page, About, and the privacy policy. These pages do not need `date`; the pages collection supplies the default page pattern. Tutorials, blogs, product records, and version updates belong in `content/posts/<id>/<locale>.md`; every post requires a valid `date`, and a version update uses the Frontmatter attribute `category: update`. The configured updates view filters those posts without creating a second content collection. `content/assets/` owns user assets.
- `themes/<name>/theme.yml`, the thin root `index.ts` entry, and each module directory own reusable Patterns, Blocks, shell markup, visual behavior, localized UI copy, icons, search, and Cookie presentation. The entry assembles `components/index.ts`, `layouts/index.ts`, and `plugins/index.ts`; site shell code lives under `layouts/site/`, shared helpers under `components/shared/`, article relations under their article component, and each module carries its own `index.ts`, CSS, JS, and `messages.yml`. Plugin definitions in code retain `schema`, `implementation`, `resources`, localized messages, and `defaults`; `theme.yml` supplies only whitelisted plugin options and optional locale-keyed `copy` overrides. Do not add a theme name or language selector to `theme.yml`.
- `backend/handler.ts` is the source for dynamic business logic, secrets, writes, and webhooks.
- `src/` owns the compiler, CLI, libraries, Fetch router, and theme contract. Never hand-edit `src/runtime/`, `.pagekiln/`, or `dist/`; they are generated.

## The supported author workflow

The public CLI has three daily commands:

- `pageskill g` automatically validates source content and generates the public snapshot in `dist/public`.
- `pageskill s` keeps a local preview running, watches nested theme TypeScript modules and backend changes, and rebuilds a fresh private runtime before reloading. Press `Ctrl+C` to stop it; another terminal can continue editing and run `pageskill g` again.
- `pageskill d` publishes the targets declared in `config.yml`.

For the source repository, clone the repository, run `npm install`, then use `npm run g` to compile the runtime, theme, and backend before generating the site in place. Continue editing that cloned site; do not create a second site directory or an initialization flow.

Do not teach or reintroduce retired command entry points. The beginner path should link to the dated tutorials under `content/posts/`, and version history should link to the filtered updates view; use only `g`, `s`, and `d`.

## Discovery and reuse

The source of truth is `config.yml`, `content/`, and `themes/`. After generation, advanced authors and Agent integrations may read `dist/.pagekiln/catalog.json`, `dist/.well-known/agent.json`, or the other renderer-produced discovery resources. Internal integrations may call `getCatalog` and `inspect` to query source-backed capabilities. Keep that discovery layer out of the beginner steps unless it directly solves an author’s request.

Discovery is renderer-owned. Do not hand-edit `.well-known/agent.json`, `.well-known/ai-catalog.json`, `.well-known/api-catalog`, the Agent Skills files, `robots.txt`, or Markdown mirrors. The compiler derives these files and the shared Fetch Router derives the RFC 8288 `Link` header from the configured public outputs. When `outputs.markdownMirrors` is enabled, `Accept: text/markdown` negotiates a generated `.md` mirror and adds `Vary: Accept`; machine-readable endpoints keep their own media types. `robots.contentSignals` is the source for the generated `Content-Signal` directive. API, OAuth/OIDC, MCP, WebMCP, and DNS-AID metadata are conditional: enable them only when the corresponding service or external DNS records really exist. The renderer cannot publish DNS or invent an authentication/MCP endpoint.

Reuse existing Patterns, Blocks, schemas, plugins, and resources before adding code. A person can reuse the theme directly without an Agent. When a capability is missing, implement one theme extension with a clear schema and resource declaration so later articles can reuse it; do not hand-write per-article HTML.

## Config-first plugins and styles

Foundation plugin behavior is code-owned and configuration is instance data. For `chrome`, `search`, `toc`, and `privacyConsent`, first inspect the plugin schema and then change the supported switch, limits, provider instance, category metadata, or `copy.<locale>` in `themes/<name>/theme.yml`; do not edit the renderer just to change a label. Site language activation and i18n fallback remain in `config.yml`. Cookie provider capabilities and their official script contracts are registered in code, while the theme supplies an array of canonical provider names, public measurement IDs/tokens/site keys, categories, and enablement. These provider names are adapter names, not invented account IDs. Unknown provider fields are inert until a registered module consumes them; secrets and verification stay in `backend/handler.ts`.

For a style change, edit the owning existing stylesheet and keep its resource declaration. To add a style, create it beside the owning layout, component, Block, or plugin and register it through that module and the theme assembly. To remove a style, delete its imports/resource references and then generate; never leave an orphan reference or patch generated CSS. Run `npm run compile-theme`, `npm run g -- --profile`, and inspect the affected route. All non-obvious source logic and new examples should include a short code comment.

## Content and localization

Keep `zh-sg`, `zh-tw`, and `en` pages and articles semantically synchronized. Use the same id for page translations and the same post id and `date` for article translations, set `category: update` consistently on release-note translations, link tutorial steps through `/:locale/posts/<id>/`, and keep UI copy beside its owning module in that module's `messages.yml`. `config.yml` owns `activeLocales`, `defaultLocale`, and `i18n.fallbackLocale`; a new locale may be partially translated because missing UI keys merge from the fallback locale and missing content documents use the configured content fallback. An existing Markdown file is shown exactly as authored, so its untranslated paragraphs are not silently mixed with fallback paragraphs. Verify language links, `lang`, `hreflang`, fallback behavior, and both page and article routes after content changes.

Use Markdown, Frontmatter, and short Block attributes for content. A Frontmatter `date` is required for every post, including tutorials and ordinary blog writing; stable pages such as About and privacy do not need it. Keep code examples minimal and runnable. Do not preserve retired guide or development page copies as redirect shadows when the content tree intentionally removes them.

## Security and runtime separation

Escape text and attributes, use `safeUrl` for links, and keep untrusted content out of `unsafeHtml`. Search, form, and URL values are data: insert them with text APIs or equivalent safe DOM APIs, never `innerHTML` or `eval`. Configuration is data, not a code entry point.

Static page bodies are generated ahead of time. The public snapshot lives in `dist/public`; `backend/handler.ts` stays private and serves same-origin APIs at runtime. Register any route with the existing `router.get(...)`, `router.post(...)`, or `router.all(...)` methods: runtime matching returns a `Response` when a route handles the request or `null` when no route matches, so generation does not require a per-route `dynamicRoutes` list in `config.yml`. With a backend, generated Worker/Pages/VPS entrypoints run the router first for every pathname and configure Worker assets with `run_worker_first = true`; unknown paths then fall through to public assets, while an unmatched `/api` request remains a 404. API errors and authorization responses stay API responses and do not fall back to static output. Build and generation keep nested server-side ESM inside the private build/runtime boundary; each public CSS/JS resource is content-fingerprinted independently, so unchanged assets retain their URL and cache identity. Do not import backend code during generation to discover routes or read secrets. New dynamic endpoints validate input and implement their own identity, authorization, CSRF, and failure handling.

Reuse the existing `privacyConsent` plugin. Optional categories default to false, and trusted `gatedScripts` are declared by the theme plugin defaults/schema and may be configured in `themes/<name>/theme.yml`; site config stores policy/controller data and stable policy routes. The built-in integrations use the real provider fields: GA4 `measurementId`, Google Ads `tagId`, Cloudflare Web Analytics `token`, Baidu `siteSignature`, CAPTCHA `siteKey`, and the X for Websites widget without an account ID. Not every integration creates a cookie; describe the provider's actual storage/request behavior in the reviewed policy. Protocol checking does not prove that a third-party script is safe. Withdrawing consent prevents later loads but cannot undo work a script already performed.

## Change and release discipline

Change content in Markdown, visual behavior in the theme, site settings in `config.yml`, and dynamic behavior in `backend/handler.ts`. Remove overlapping dead files when a replacement is complete; do not keep duplicate mechanisms for hypothetical consumers. Preserve `.pagekiln/` and `_pagekiln` compatibility and the existing Cookie consent storage key.

Keep the SemVer in `package.json` and `package-lock.json` synchronized with `CHANGELOG.md`, `CHANGELOG.zh-CN.md`, and a dated localized update under `content/posts/` with `category: update` when a release changes. Release notes describe user-visible features and security behavior; if a capability is removed, explain why, give the compatible replacement, and state any safe alternative instead of presenting a site-specific configuration dump. The current release is 3.0.2; do not create a separate 4.0 note for this content reorganization. Keep migration steps and the actual compile, generate/profile, local-preview, and deployment dry-run commands in the release update without claiming results that have not been observed.

## Verification

For a source or content change, use the smallest relevant checks and report actual results:

```text
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm run g
npm run g -- --profile
npm run s
npm run d -- --dry-run
git diff --check
```

`npm run s` is a persistent process, so stop it after interactive verification. Use `npm run d -- --dry-run` for routine deployment verification; run `npm run d` only when the user has asked for publishing and the configured target is ready. Do not invent build, deployment, accessibility, or browser results.
