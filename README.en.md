# Pageskill

Pageskill 3.0.0 is a reuse-first website compiler: people can use built-in capabilities directly, Agents are optional, and page authors do not hand-write HTML for every page. It is built with TypeScript/Node 22+; YAML 1.2 Frontmatter, CommonMark/GFM Markdown, Patterns, Blocks, and Schema Data compile into inspectable website output. Ordinary content is pre-generated, interactive features call same-origin APIs when needed, and the public snapshot lives under `dist/public`.

The current version is 3.0.0; see the [CHANGELOG](CHANGELOG.md) for version changes.

## Quick Start

```bash
npm install
npm run g -- --profile
npm run check
npm run s
```

Use `npm run g`, `npm run check`, and `npm run s` from a source checkout. After compiling the source and running `npm link`, use `pageskill g`, `pageskill check`, and `pageskill s` from a site directory. Open `http://127.0.0.1:4173/` to choose a site version. The picker keeps each language name in its own language: `简体中文`, `繁體中文`, and `English`. `g --profile` reports discover, load, validate, parse, route, render, assets, and write timings. A static build does not start an HTTP or Fetch lifecycle for each page; `src/runtime/` contains precompiled JavaScript.

### Reuse before extension

Agents and page authors should start with `pageskill catalog` and `pageskill inspect` to see the available Patterns, Blocks, schemas, and resource dependencies, then compose a page with Markdown, Frontmatter, and configuration. Built-in capabilities can be reused directly by a human without an Agent, and authors do not need to hand-write HTML for each page. Copy a theme and implement one reusable extension only when discovery shows that a needed capability is missing.

```bash
pageskill catalog
pageskill inspect pattern:landing
pageskill inspect block:hero
pageskill check
pageskill g --profile
```

## Start Writing

### Content paths

`pages` stores the site's current effective content in `content/pages/<id>/<locale>.md`; home, About, Guide, Reference, and directory pages belong there. Update the relevant page when Pageskill behavior changes. `docs` is a document-presentation Pattern inside `pages`, not a third collection. `posts` stores dated records of completed product decisions, implementations, releases, incidents, deployments, or measured results in `content/posts/<id>/<locale>.md`; every Product Note requires `date` and enters the date-ordered archive and Feed. Write current usage in `pages` and historical records in `posts`. Put assets in `content/assets/`. The default site provides `zh-sg`, `zh-tw`, and `en`; the final locale segment defines translation groups, routes, and hreflang.

```markdown
---
title: Search results gained hit locations
description: Record the 2026-08-10 product change that added visible hit-location labels.
pattern: blog
date: 2026-08-10
cover: /assets/product-note-cover.webp
---

# Search results gained hit locations

This note records one completed change. Current search usage belongs in the Guide under `content/pages/`; text before `<more>` becomes the archive excerpt.

<more>

The full note remains ordinary Markdown.
```

### Markdown model

The body supports GFM tables, task lists, strikethrough, blockquotes, fenced code, and autolinks. Block Directive attributes stay short and scalar; headings, lists, tables, and explanations stay in Markdown:

```markdown
:::feature-grid{columns="3"}
### Pages
`pages` stores current home, guide, reference, and directory content. Update the relevant page when behavior changes.

### Product notes
`posts` stores dated decisions, implementations, releases, and incidents that already happened; it is not the current usage manual.

### Themes
Themes own Patterns, Blocks, visual language, and optional browser behavior.
:::
```

Unknown Blocks, invalid attributes, missing schema fields, and route collisions report the source file, line, column, and a repair suggestion. Raw HTML is escaped by default; only reviewed trusted values may use `unsafeHtml`. MDX, JSX, virtual DOM, and HTML-comment Slots are outside the compiler path.

### Built-in outputs

The default site emits static HTML, a custom 404 page, a feed (an RSS/Atom-style update subscription file), `sitemap.xml` (a search-engine site map), a local search index, `llms.txt` (a concise site entry point for Agents), `.pagekiln/catalog.json` (theme capabilities and content contexts), and `.well-known/agent.json`. Search results label the matching title, description, heading, body, or path instead of returning an unexplained title-only hit. `pageskill catalog` builds its capability view directly from config, content, and theme source; it does not render the site or require an existing `dist/`.

## Secondary Development

### Project structure

```text
config.yml                 site information, locales, routes, collections, plugin switches
starter/                   minimal buildable project copied by `pageskill init`
content/                   Markdown content and user-owned assets
themes/default/            theme.yml, i18n.yml, theme.ts, style.css, plugin scripts, Pattern/Block resources
src/compiler.ts            BuildContext, parsing, schemas, graph, cache, static output
src/theme-api.ts           Pattern, Block, and Shell theme contract
src/lib/                   Markdown, SafeHtml, URL, and small core helpers
src/fetch-router.ts        shared Web Standard Fetch router
backend/handler.ts         only source for dynamic business logic and secrets
test/                      unit, integration, and output-contract tests
scripts/benchmark.mjs      temporary scale fixture, never production dist
```

`src/runtime/`, `.pagekiln/`, and `dist/` are generated and must not be hand-edited. The root `src/` tree no longer preserves empty layers from the previous engine; check the theme and existing Blocks before adding a new content capability.

### Commands

| Command | Purpose |
| --- | --- |
| `pageskill init` | Create a neutral project without a production domain, token, or identity |
| `pageskill g --profile` | Generate the static site and write a machine-readable build profile |
| `pageskill s [port]` | Keep one BuildContext alive for incremental preview |
| `pageskill d --dry-run` | Preview the deployment action from `config.yml` without uploading |
| `pageskill d` | Deploy the targets in `config.yml`; the public snapshot is under `dist/public` |
| `pageskill check` | Validate Markdown, schemas, Blocks, routes, and outputs |
| `pageskill catalog` | Inspect source-backed Patterns, Blocks, schemas, plugins, and dependencies without a full build |
| `pageskill inspect <query>` | Inspect content or the `page:`, `block:`, `pattern:`, `collection:`, and `plugin:` namespaces as structured JSON |

`pageskill inspect <id>` still queries content by id; explicit namespaces avoid ambiguity when content and capabilities share names. A missing object returns a non-zero exit code and stable `INSPECT_NOT_FOUND` JSON error.

### Theme-first extension

Start secondary development in `themes/<name>/` only after `catalog` and `inspect` show that a needed capability is missing. Copy the default theme, add a Pattern or Block and define its schema in `theme.ts`, register its capability name and resources in `theme.yml`, keep shared styles in `style.css` and Block-specific CSS in resources declared by `blockStyles`, and keep optional capabilities under nested `plugins.<name>` entries with an `enabled: true|false` switch. Collection data schemas belong under `content.collections.<name>.schema` in the root `config.yml`. Put localized UI messages in the separate `i18n.yml`. The page shell, mobile breakpoints, expandable outline, hit-location search labels, no-motion default, and Cookie selector are theme concerns. Extension authors should implement one reusable capability; ordinary pages do not hydrate or need per-page HTML.

Pattern → Block → Schema Data is the intended composition. Collections, locale fallback, feeds, site maps, search, image caching, incremental dependency graphs, and deployment output remain compiler capabilities so each page does not need a private template.

The default CSS optimization attempts to inline only small Pattern/Block dependencies: each original UTF-8 file is at most 2,048 bytes, per-page inlined CSS including separator bytes is at most 4,096 bytes, and only adjacent inlineable dependencies are merged and deduplicated in main stylesheet → Pattern → Block order. The main theme stylesheet and global/preset bundles remain external cached assets; files containing `url()`, `src()`, `image()`, `image-set()`, `@import`, `@charset`, `@namespace`, a backslash, `<`, or a UTF-8 BOM stay external conservatively. External CSS is compressed, while inline CSS keeps its original source text. Fingerprinted CSS assets are still emitted, and strict inline-CSP deployments can set top-level `inlineStyles: false` in `theme.yml`; this disables only the CSS optimization and does not promise a site-wide CSP.

### Rename compatibility

The current CLI entry point is `pageskill`; the old terminal/CLI entry has been removed. This rename covers the source repository and CLI contract and makes no claim about npm publication. To use the current source, clone the [Pageskill source repository](https://github.com/jsw-teams/pageskill), compile runtime, theme, and backend, then run `npm link`; `.pagekiln/` cache, catalog, and build-profile paths, the internal `_pagekiln` output path, and the old Cookie consent storage key remain compatible. Use `PAGESKILL_SITE_ROOT` for the site root.

### Configuration boundaries

`config.yml` manages site information, locales, navigation, collections, routes, schemas, image variants, search, privacy, and deployment settings. It is not a CSS, HTML, browser-script, or `unsafeHtml` injection surface. Visual behavior belongs in the theme; dynamic behavior belongs in `backend/handler.ts`. The raw `config.yml`, `content/`, and `themes/` files are the source of truth; `.pagekiln/catalog.json` and `.well-known/agent.json` are generated discovery; `AGENTS.md` is operational guidance only.

Search, form, and URL values are data: insert them with `textContent` or another safe DOM API, never `innerHTML`, and never `eval`. Theme TypeScript and browser JavaScript are trusted application code, not a sandbox for untrusted input. Backend code must validate every input and implement authentication, authorization, and CSRF protection for protected operations as business logic; the Fetch router does not replace those controls. Static page bodies are generated at build time and should not depend on an API to render or fill them; static generation is the default rendering method, not a product limitation. The main deployment can use one Worker/Fetch service for generated pages and same-origin dynamic APIs, with interactive features calling same-origin APIs when needed.
The site administrator controls `config.yml`; never merge visitor query, form, or URL values into it. If `plugins.privacyConsent.gatedScripts` is configured in the active theme, its HTTP(S) sources are an administrator or theme-author trust decision: protocol validation blocks `javascript:` and `data:` injection, but it does not prove a third-party script is safe, and visitors cannot choose its `src`.

The same Worker/service handles `/api/*` first by default and calls `backend/handler.ts`; declare other dynamic paths in `deployment.dynamicRoutes`. Do not import the backend during the build to discover routes or read secrets.

The default theme keeps shared styles in `style.css` and Block-specific rules in resources declared by `blockStyles`. External CSS assets build as one compressed line, while inline CSS keeps its original source text; CSS/native ESM filenames receive content fingerprints without query-string cache keys. OG and product-note covers are produced from configured image variants, with default source images when a page has no asset.

### Privacy and accessibility

The `privacyConsent` theme plugin declares the Cookie selector, and its `enabled` switch can be combined with the site-level `config.yml` switch. Essential categories remain available; optional categories start disabled, and optional scripts are not inserted before consent. Human visitors open one localized settings control from the footer, while Agents read a separate machine-readable disclosure; the two audiences do not share an entry point. Output includes a skip link, semantic headings, keyboard focus, ARIA state, hreflang, and a site map. On mobile, tables become labeled vertical rows and the outline expands with the page instead of relying on a native horizontal scroller.

Optional services are configured under `privacy.cookieConsent.integrations` in `config.yml`, without adding script paths there. Built-in providers are `googleAnalytics` (`measurementId`), `googleAds` (`conversionId`), `cloudflareWebAnalytics` (`token`), and `baiduTongji` (`siteId`). Each provider loads only after its category is selected; Google receives Consent Mode updates, Baidu's official async code is preserved, and Cloudflare Web Analytics remains an optional data transmission even though its beacon does not use cookies.

```yaml
privacy:
  cookieConsent:
    integrations:
      googleAnalytics: { enabled: true, measurementId: G-XXXXXXXXXX, category: analytics }
      googleAds: { enabled: true, conversionId: AW-XXXXXXXXXX, category: advertising }
      cloudflareWebAnalytics: { enabled: true, token: YOUR_CLOUDFLARE_TOKEN, category: analytics }
      baiduTongji: { enabled: true, siteId: YOUR_BAIDU_SITE_ID, category: analytics }
```

### Deployments and dependencies

The public site snapshot lives under `dist/public`; do not point a CDN, Caddy, Nginx, or GitHub Pages at a complete build output that contains private code. Pageskill's main deployment isolates public resources from private server code and uses one Worker/Fetch service for pre-generated pages and same-origin dynamic APIs; load `backend/handler.ts` only in the server or Worker runtime and never write runtime secrets to build output. The same Worker/service handles `/api/*` first by default and calls the backend; declare other dynamic paths in `deployment.dynamicRoutes`. GitHub Pages publishes only the `dist/public` snapshot and does not run APIs; a dynamic VPS backend belongs in a private server directory. Keep `server/`, `_pagekiln/`, `.pagekiln/`, Worker files, and `*.toml` private. Workers use `assets.directory: public`, with `.assetsignore` as an additional exclusion layer; Cloudflare Pages uses target-specific deployment staging so public static uploads contain only public resources. Put one or more deployment targets and their destinations in the site-root `config.yml`; targets run in list order:

Use a target-specific server/worker boundary for dynamic logic, with the same service serving pages and same-origin APIs:

```yaml
deployment:
  targets: [vps, cloudflare-pages]
  cloudflare:
    accountId: CF_ACCOUNT_ID
    apiTokenEnv: CLOUDFLARE_API_TOKEN
    pages:
      project: site-name
      branch: production
    workers:
      name: site-worker
      compatibilityDate: '2026-08-10'
  github:
    remote: origin
    branch: gh-pages
    tokenEnv: GITHUB_TOKEN
  vps:
    host: vps.example.com
    user: deploy
    port: 22
    remotePath: /var/www/site
    identityFile: ~/.ssh/id_ed25519
    publicKeyFile: ~/.ssh/id_ed25519.pub
```

Then run `pageskill d`; `pageskill d --dry-run` inspects every selected action. Cloudflare Pages needs a project name and optional branch; Workers needs a Worker name and compatibility date. When `cloudflare.apiTokenEnv` is set, the script reads the Cloudflare API token only from that environment variable; omit it or set it to `null` to let Wrangler use its local login. GitHub needs an existing remote name and target branch; when `github.tokenEnv` is set, an HTTPS remote receives authorization through the child process environment rather than command-line arguments, while an SSH remote continues to use the local SSH agent/config. VPS needs a host, user, SSH port, and an existing remote directory; `identityFile` is the private key and `publicKeyFile` is optional to assert that the companion public-key file exists. The public key must already be in the server's `authorized_keys`; Pageskill never uploads keys. Credentials remain in the runtime environment or local key files. OpenAI Sites remains an optional adapter, but this project has removed its Sites binding and will not publish there by default.

The credential boundary follows [GitHub's HTTPS token guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens), [Wrangler's Cloudflare authentication guidance](https://developers.cloudflare.com/workers/wrangler/commands/general/), and [OpenSSH scp's `-i` identity-file option](https://man.openbsd.org/scp.1). A successful deployment only means that the hosting platform accepted and published the output; it does not guarantee access from every region. DNS, ISP routing, enterprise network policy, platform regional availability, and custom-domain state can still make a site unreachable in some locations. Test from target regions and keep Cloudflare, GitHub Pages, or VPS as alternative delivery paths when broad reachability matters.

Production dependencies have narrow roles: `markdown-it` and `markdown-it-task-lists` parse GFM, `yaml` parses YAML 1.2, `sharp` creates image variants, and `lucide` supplies mature open-source SVG icon nodes. Traversal, watch, hashing, routing, feeds, site maps, search serialization, atomic writes, and tests use Node/Web Standards rather than convenience packages.

### Verification and limits

```bash
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm test
pageskill g --profile
pageskill check
npm run catalog
npm run inspect -- home
npm run bench -- 100
npm run bench:compare -- --sizes=100 --scenario=cold --tools=pageskill,astro,eleventy,hugo
```

The scale fixture is created in the system temporary directory and removed after the run. The documented default is 100 entries; `--locales=3` adds the three locales, `--images` exercises the image cache, and `--quick` measures cold and no-change builds. Each JSON line records the machine, phases, scenarios, output counts, and image counters. `maxRssMiB` is peak resident memory of the Node process (RSS, KiB divided by 1,024), not `dist/` size or the memory of one page. Temporary build JSON is not committed or exposed as a product claim.

The comparison page uses only capabilities confirmed by official tool documentation and separates tool execution time from Pageskill’s additional delivery contract. See `content/pages/about/`, `content/pages/guide/`, and `content/pages/development/` for the current implementation, reproduction details, and explicit limits.

Preserve the MIT license, `NOTICE`, existing user assets, and the optional `Pageskill by JSW Teams` attribution policy. `branding.showAttribution` controls only the footer credit; it does not change license obligations.
