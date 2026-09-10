# Pageskill: write tutorials, build a site

[简体中文](README.md) · [中文 changelog](CHANGELOG.zh-CN.md) · [Changelog](CHANGELOG.md)

Pageskill 3.0.2 turns Markdown content, site settings, and theme styles into a publishable website. Write the content first, then let the theme provide structure and visual behavior; ordinary sites do not need hand-written HTML for every post.

## Start in ten minutes

The cloned source repository is the site you edit and publish. Install its dependencies and generate it first:

```powershell
git clone https://github.com/jsw-teams/pageskill.git
Set-Location pageskill
npm install
npm run g
```

`npm run g` compiles the runtime, theme, and backend before validating and generating the current site. Continue editing this directory:

```powershell
npm run s
```

`npm run s` keeps a preview running, watches nested theme TypeScript modules and backend changes, and builds an isolated private runtime before reloading; press `Ctrl+C` to stop it, or edit in another terminal and run `npm run g` again. When the site is ready, configure a target in `config.yml` and run a dry run first:

```powershell
npm run d -- --dry-run
```

Run `npm run d` only after the target is ready. Read the complete [Start your site in ten minutes](content/posts/start/en.md) article.

## Learning path

Read these short articles in order:

- [Change the name and navigation](content/posts/site-settings/en.md)
- [Markdown: write like a note](content/posts/markdown/en.md)
- [Publish your first tutorial](content/posts/first-post/en.md)
- [How we build a plugin](content/posts/cookies/en.md)
- [Change the style, or ask an Agent](content/posts/customize/en.md)
- [Let visitors search pages and posts](content/posts/search/en.md)
- [Add a table of contents to long posts](content/posts/toc/en.md)
- [Develop a reusable plugin](content/posts/plugins/en.md)
- [Put the site online](content/posts/deploy/en.md)
- [About Pageskill](content/pages/about/en.md)
- [Privacy policy](content/pages/privacy/en.md)
- [3.0.2 update: clearer archives and responsive reading](content/posts/3.0.2/en.md)
- [3.0.1 update: article metadata and safer publishing](content/posts/3.0.1/en.md)
- [3.0 update: a simpler entry](content/posts/3.0.0/en.md)

The Simplified Chinese and Traditional Chinese versions sit beside each English tutorial or release note.

## Where content and source code live

- `content/pages/<id>/<locale>.md` stores stable pages such as the home page, About, and the privacy policy. These pages do not need `date`; the pages collection supplies the default page pattern. All dated tutorials, blogs, product records, and version updates live in `content/posts/<id>/<locale>.md`; `category: tutorial` marks a tutorial, an omitted category defaults to `uncategorized`, and `category: update` marks a version update that appears in the separate `/:locale/updates/<id>/` view. Every post requires a valid ISO `date`. Optional `author` and `cover` fields control the author and cover. The current site's localized author is `toewpq`; a missing author falls back to it. Local covers live under `content/assets/` and use `assets/<path>` or `/assets/<path>` in Frontmatter.
- `config.yml` stores site names, languages, i18n fallback, navigation, routes, privacy/controller data, images, and deployment targets; `theme.name` selects the theme. It is not a browser-script or HTML injection surface. Plugin instance options and switches belong together in `themes/<name>/theme.yml`; language lists and fallback are site configuration, not plugin settings.
- `themes/<name>/` owns styles, article structures, and reusable Blocks. The root `index.ts` only assembles `components/index.ts`, `layouts/index.ts`, and `plugins/index.ts`; the site shell lives in `layouts/site/`, shared helpers in `components/shared/`, article relations beside their article component, components in `components/<id>/`, and plugins in `plugins/<id>/`, with each module carrying its `index.ts` plus the CSS, JS, and `messages.yml` it needs. Plugin definitions keep their code-owned `schema`, `implementation`, `resources`, localized messages, and `defaults`; `theme.yml` supplies only schema-whitelisted plugin options and no longer selects the theme name. People can reuse the theme directly, and Agents can extend it under the same contract; articles never need copied HTML.
- `backend/handler.ts` owns dynamic business logic, writes, webhooks, and runtime secrets. Register any path with the existing `router.get(...)`, `router.post(...)`, or `router.all(...)` methods; runtime matching returns a `Response` or `null` when nothing matches, so generation does not need a per-route `dynamicRoutes` list in `config.yml`. When a backend is present, generated Worker/Pages/VPS entrypoints run the Router first for every pathname and set `run_worker_first = true`; unknown paths then fall through to public assets, while an unmatched `/api` stays 404. API errors and authorization responses remain API responses and do not fall back to static pages. The public static snapshot is `dist/public`; build/generation keeps nested server-side ESM inside the private boundary, and each public CSS/JS resource gets its own content hash so unchanged assets keep their URL and cache identity.
- The Cookie selector reuses the provided plugin. Optional categories start disabled, and the chooser shows each category's provider and retention explicitly. Code in `themes/<name>/plugins/cookies/index.ts` registers the capability, resources, official provider contracts, and schema; `themes/<name>/theme.yml` owns provider instances. Built-in configuration uses `google-analytics`/`measurementId`, `google-ads`/`tagId`, `cloudflare-web-analytics`/`token`, `baidu-tongji`/`siteSignature`, CAPTCHA `/siteKey`, and the account-ID-free `x-for-websites` widget. These are code-owned adapter names; values come from each provider's dashboard or snippet rather than a Pageskill-invented ID. Optional resources load only after consent; public site keys/tokens remain data, while secrets and server-side verification stay in the private backend. Not every provider creates a cookie. `config.yml` is not emitted to `dist/public` and has no runtime write route. This borrows a policy generator's transparent fields without pretending that a visitor chooser generates legal policy. The policy remains an authored page under `content/pages/privacy/`, and withdrawal cannot undo an action a script already performed. The Cookie tutorial explains how to build the module.
- Foundation plugins are configured first through `themes/<name>/theme.yml`: `search`, `toc`, `privacyConsent`, and `chrome` expose schema-bounded switches, limits, categories, provider instances, shell insertion links, and `copy.<locale>` overrides. Code registers capabilities, resources, defaults, and rendering; language activation and fallback remain site settings in `config.yml`, not plugin settings. A locale can be 50% translated: missing plugin UI keys inherit the fallback, while an existing Markdown file stays exactly as authored instead of mixing fallback paragraphs into it.
- When changing styles, start with the existing CSS owned by the layout, component, Block, or plugin. To add a style, create it beside that module and register the resource through the module and theme assembly; to remove one, remove its imports, resource entries, and references before generating again. The workflow covers adding, editing, and deleting styles; generated CSS is never the edit target.

## Agent discovery

The renderer generates Agent files from configuration and actual outputs; never hand-edit generated `dist/` content. Public outputs include `/.well-known/agent.json`, `/.well-known/ai-catalog.json`, conditional `/.well-known/api-catalog`, `/.well-known/agent-skills/index.json`, `robots.txt`, and `llms.txt`. When Markdown mirrors are enabled, pages negotiate `Accept: text/markdown`, and the shared Fetch Router adds the RFC 8288 `Link` and `Vary: Accept` headers. The generated Skill walks the code-registered capability fields and configured sections instead of keeping a second field map. `robots.contentSignals` produces `Content-Signal`. OAuth/OIDC, MCP, WebMCP, and DNS-AID are conditional and should be configured only when the real service or external DNS/DNSSEC records are ready; the renderer does not invent endpoints or publish DNS records.

Advanced authors can read `dist/.pagekiln/catalog.json` or `dist/.well-known/agent.json` after generation to discover reusable capabilities; internal integrations can use the exported `getCatalog` and `inspect`. Beginners can start with tutorials, content, and settings.

`src/runtime/`, `.pagekiln/`, and `dist/` are generated outputs; do not edit them by hand. The source of truth is `config.yml`, `content/`, and `themes/`. Pageskill is MIT licensed; see [LICENSE](LICENSE).
