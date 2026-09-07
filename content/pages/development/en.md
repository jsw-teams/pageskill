---
title: Develop a Block and theme extension
description: A practical theme-first workflow for adding a Block, registering resources, testing it, and deploying the result.
pattern: docs
---

# Develop a Block and theme extension

Pageskill secondary development starts in a copied theme. The compiler owns Markdown, schemas, routes, dependencies, assets, and output; the theme owns Patterns, Blocks, layout, CSS, browser ESM, icons, and privacy presentation. This page describes the current extension path.

Reuse comes first: Agents and page authors use `catalog` and `inspect` to find existing Patterns, Blocks, and schemas, then compose pages with Markdown, Frontmatter, and configuration instead of hand-writing HTML for each page. Built-in capabilities are also directly reusable by a human without Agent-driven development. Only when discovery shows a real gap does an extension author write the theme code below once for reuse across pages.

## Development standards

### Performance and speed

Static HTML is the default delivery, and ordinary pages do not need hydration. Declare browser and other resources only when a feature needs them; preserve incremental dependency tracking and content fingerprint caching. After changing the build or resources, measure reproducibly with `pageskill g --profile` or `npm run bench -- 100` before describing cost or speed; do not invent performance promises without a measurement. The default CSS optimization attempts to inline only small Pattern/Block dependencies: each original UTF-8 file is at most 2,048 bytes and each page's inlined CSS text, including separator bytes, is at most 4,096 bytes. It merges only adjacent inlineable dependencies and deduplicates them in main stylesheet → Pattern → Block order. The main theme stylesheet and global/preset bundles remain external cached resources. Files containing `url()`, `src()`, `image()`, `image-set()`, `@import`, `@charset`, `@namespace`, a backslash, `<`, or a UTF-8 BOM stay external conservatively, without URL rewriting. External CSS is compressed, while inline CSS keeps its original source text. Fingerprinted CSS assets are still emitted and CSS changes invalidate their cache; this does not claim that all CSS should be smaller or always inline.

### Page security

Escape text and attributes, use `safeUrl` for links, and keep untrusted Markdown, Frontmatter, or configuration values out of `unsafeHtml`. Search, form, and URL values are data: insert them with `textContent` or another safe DOM API, never `innerHTML`, and never `eval`. Theme TypeScript and browser JavaScript are trusted application code, not a sandbox for untrusted input. `config.yml` is a non-code configuration entry point. Backend code must validate every input and implement authentication, authorization, and CSRF protection for protected operations as business logic; secrets are read at runtime only by `backend/handler.ts`. The framework and Fetch router do not provide these guarantees automatically. Static page bodies are generated at build time and should not depend on an API to render or fill them.

| Trust boundary | Treat as | Required handling |
| --- | --- | --- |
| Visitor query, form, and URL input | Untrusted data | Create text nodes or pass only validated values to same-origin APIs. |
| Author Markdown, Frontmatter, and `config.yml` | Data, never executable code | Escape output, use `safeUrl` and schemas, and keep it out of code sinks. |
| Theme TypeScript and browser ESM | Trusted extension code requiring review | Review it as application code; it is not a sandbox. |
| `backend/handler.ts` runtime requests | Untrusted requests and secrets | Validate input; add authentication, permission checks, CSRF protection, and failure handling for protected operations; read secrets from runtime environment only. |

Verify the boundary with hostile query, form, and URL payloads and with a static page plus API request on the same service. Record the observed escaping, authorization, and failure behavior instead of claiming complete security.

The site administrator controls `config.yml`; never merge visitor query, form, or URL values into it. If `plugins.privacyConsent.gatedScripts` is configured in the active theme, its HTTP(S) sources are an administrator or theme-author trust decision: protocol validation blocks `javascript:` and `data:` injection, but it does not prove a third-party script is safe, and visitors cannot choose its `src`.

The same Worker/service handles `/api/*` first by default and calls `backend/handler.ts`; declare other dynamic paths in `deployment.dynamicRoutes`. Do not import the backend during the build to discover routes or read secrets.

### i18n

Keep the `zh-sg`, `zh-tw`, and `en` pages semantically synchronized. Put theme UI copy in `themes/<name>/i18n.yml`. After changes, check HTML `lang`, `hreflang`, language links, and fallback behavior, and do not mix languages within one localized page.

### Frontend, backend, and static/dynamic separation

`content/`, `config.yml`, `themes/`, and generated output have separate roles; APIs, secrets, writes, and webhooks belong only in `backend/handler.ts`. Static generation is the default rendering method: ordinary content is pre-generated, while interactive features call same-origin APIs. The public snapshot lives under `dist/public`; one Worker/Fetch service can serve those pages and same-origin APIs while keeping server code private. The same Worker/service handles `/api/*` first by default; declare other dynamic paths in `deployment.dynamicRoutes`, and never import backend during the build to discover routes or read secrets. Publish only the public snapshot to GitHub Pages or a CDN; Fetch deployments can keep the API from the same package. Workers use `assets.directory: public`, with `.assetsignore` as an additional exclusion layer. Keep `server/`, `_pagekiln/`, `.pagekiln/`, Worker files, and `*.toml` private. Load backend code only in the server or Worker runtime and never write runtime secrets to build output. Cloudflare Pages uses target-specific deployment staging so public static uploads contain only public resources. Give new dynamic behavior independent failure handling.

### Compatibility and migration

Preserve existing content, configuration, and theme contracts. Prefer new capabilities to be optional and keep existing behavior unchanged; when a breaking change is necessary, provide migration notes and verify compatibility, avoiding duplicate mechanisms that must be maintained indefinitely.

The only current CLI entry point is `pageskill`; the old terminal/CLI entry has been removed. This rename covers the source repository and CLI contract and makes no claim about npm publication. To use the current source, clone the [Pageskill source repository](https://github.com/jsw-teams/pageskill), compile runtime, theme, and backend, then run `npm link`. The rename does not require rewriting content, `config.yml`, or themes; `.pagekiln/` cache, catalog, and build-profile paths, the internal `_pagekiln` output path, and the old Cookie consent storage key remain compatible. Use `PAGESKILL_SITE_ROOT` for the site root.

For every future major, minor, or patch release, keep the SemVer in `package.json` and `package-lock.json` synchronized, add the change to `CHANGELOG.md`, and add a dated localized Product Note under `content/posts/<id>/{en,zh-sg,zh-tw}.md` with migration steps and verification. Do not backfill a release note for 1.0.

## 1. Copy the theme boundary

Start in a new theme directory so the original theme remains a working reference:

```text
themes/<name>/
├─ theme.yml
├─ theme.ts
├─ style.css
├─ i18n.yml
├─ blocks/                    reusable Block styles
└─ scripts/                 optional native browser ESM
```

`theme.yml` points to `theme.ts`, `style.css`, and i18n resources, and registers exported Pattern/Block names, resource mappings, and plugin resources. Pattern/Block definitions and their `schema` live in `theme.ts`; collection data schemas live under `content.collections.<name>.schema` in the root `config.yml`. Keep plugin names below the theme-level `plugins` switch. Theme i18n belongs in `themes/<name>/i18n.yml`, not in the root site config.

After copying the theme, select it in the site-root `config.yml`:

```yaml
theme:
  name: nebula
```

The TypeScript example below is intentionally a minimal `document` + `notice` demonstration. When copying an existing theme, keep all of its other Patterns and Blocks, especially `landing`, `docs`, and `blog`, so existing pages continue to render.

## 2. Add a Block in `theme.ts`

The following code belongs to an extension author: write it only when catalog/inspect cannot find a suitable reusable Block. Ordinary page authors continue composing Markdown, Frontmatter, and configuration without writing per-page HTML. Use the small theme API and keep the Block schema scalar and explicit:

```ts
import { defineTheme } from '../../src/theme-api.ts';

export default defineTheme({
  name: 'nebula',
  patterns: {
    document: { name: 'document', contexts: ['page'], render: content => content }
  },
  blocks: {
    notice: {
      name: 'notice',
      schema: { tone: 'string' },
      render: (node, context) => {
        const tone = context.escapeHtml(node.attrs.tone || 'info');
        return `<aside class="notice notice--${tone}">${context.renderNodes(node.children)}</aside>`;
      }
    }
  }
});
```

`context.renderNodes` renders Markdown children. Use `context.escapeHtml` for text and attributes and `context.safeUrl` for links. Do not pass unreviewed Markdown, frontmatter, or config values through `unsafeHtml`.

Register the same Block in `theme.yml`:

```yaml
name: nebula
module: theme.ts
style: style.css
blockStyles: { notice: ['blocks/notice.css'] }
blocks:
  - notice
patterns:
  - document
plugins:
  privacyConsent:
    enabled: true
```

The `schema` in `theme.ts` and the capability name/resource registration in `theme.yml` form one contract. Keep them synchronized and verify the actual `theme.ts` exports against the `catalog` result; do not hide an unfinished Block behind a compiler conditional.

## 3. Use the Block in Markdown

Add a directive to a page under `content/pages/`:

```markdown
:::notice{tone="info"}
The current instructions are in the Guide.
:::
```

The directive attribute is short and scalar. Headings, paragraphs, lists, tables, code, and links remain ordinary Markdown. If the Block describes a current behavior, use a page; if it records a dated implementation decision, use a Product Note with a required `date`.

## 4. Put visual behavior in one stylesheet

Put the Block rule in its own reusable dependency, `blocks/notice.css`, and declare it with `blockStyles` in `theme.yml`:

```css
.notice{border-inline-start:3px solid var(--accent);padding:1rem 1.2rem;background:var(--panel);color:var(--ink)}
```

The compiler compresses external CSS to one line and fingerprints the filename. A declared small adjacent dependency such as `blocks/notice.css` may be inlined per page; each original UTF-8 file must be at most 2,048 bytes, and the total inlined CSS per page, including separator bytes, must be at most 4,096 bytes. Only adjacent inlineable dependencies are merged and deduplicated in main stylesheet → Pattern → Block order. The main theme stylesheet and global/preset bundles stay external. Files containing `url()`, `src()`, `image()`, `image-set()`, `@import`, `@charset`, `@namespace`, a backslash, `<`, or a UTF-8 BOM remain external conservatively. Inline CSS keeps the original source text. For a strict no-inline CSP, set this at the top level of `theme.yml`:

```yaml
inlineStyles: false
```

This disables only the CSS optimization and does not promise that the whole site satisfies CSP. Keep responsive behavior, focus states, table adaptation, icon sizing, and reduced-motion behavior in this stylesheet or declared theme resources. Delete overlapping old rules and dead compatibility files when the new rule replaces them; do not rely on cascade order to keep two designs alive.

The default theme uses the Lucide icon package through the theme module. Reuse the declared icon library instead of adding a second icon font or an inline SVG collection for the same controls.

## 5. Discover and test the extension

Run the commands in this order:

```bash
npm run compile-theme
npm run catalog
pageskill inspect block:notice
pageskill check
pageskill g --profile
pageskill s
```

`catalog` confirms the active theme's Patterns, Blocks, plugins, schema names, and resource dependencies. `inspect block:notice` answers one capability question as structured output. `check` catches unknown Blocks, invalid attributes, route collisions, and missing required fields with a source position. `g` confirms the Block renders to static output; `s` confirms the browser preview reloads after a theme or Markdown edit.

## 6. Add optional browser behavior

Put native ESM in `themes/<name>/scripts/` and declare it under the appropriate plugin. Give every optional plugin an explicit switch:

```yaml
plugins:
  privacyConsent:
    enabled: true
  search:
    enabled: true
```

Optional analytics or advertising scripts remain inert until the visitor grants the matching Cookie category. Essential consent storage is enabled by the privacy contract; the footer opens the same settings dialog that the visitor can reopen later. Browser code should be loaded once, with one owner per event handler. Delete a superseded script instead of leaving two handlers to compete.

## 7. Keep site settings and runtime code separate

`config.yml` contains site metadata, locales, collections, routes, schemas, privacy settings, and deployment destinations. It does not contain CSS paths, arbitrary HTML, or browser-script bodies. `backend/handler.ts` is the source location for dynamic requests, secrets, writes, and webhooks; use the shared Fetch router and compile the backend before deployment.

The default public snapshot is under `dist/public`; the same package can keep private server/Worker code for one Worker/Fetch service that serves generated pages and same-origin APIs. `/api/*` is handled by the Worker first by default; declare other dynamic paths in `deployment.dynamicRoutes`, and never import backend during the build to discover routes or read secrets. Publish only `dist/public` to GitHub Pages or a CDN; those targets do not run APIs. Workers use `assets.directory: public`, with `.assetsignore` as an additional exclusion layer. Cloudflare Pages uses target-specific deployment staging. Keep `server/`, `_pagekiln/`, `.pagekiln/`, Worker files, and `*.toml` private, and never write runtime secrets to build output.

Advanced compatibility only: `deployment.enabled: false` can skip worker, server, and backend artifacts when a static-only target deliberately rebuilds the site. It is not required by the main product path and does not provide dynamic APIs or application authentication.

For configured dynamic deployment targets:

```yaml
deployment:
  targets: [cloudflare-pages]
  cloudflare:
    apiTokenEnv: CLOUDFLARE_API_TOKEN
    pages:
      project: example-site
      branch: production
```

```bash
pageskill d --dry-run
pageskill d
```

Use `targets: [cloudflare-pages, github-pages, vps]` when one release must publish to several destinations. Configure each provider's project, remote, branch, SSH host, user, port, remote path, and key path in `config.yml`; keep secret values in environment variables or the local SSH setup.

## 8. Measure a change

The optional fixture measures 100 temporary pages and reports JSON lines for cold, no-change, edit, add, delete, theme, and settings changes:

```bash
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm run bench -- 100
```

`maxRssMiB` is the Node process peak resident memory, not the output directory size. The fixture is removed after the run and is not a product performance promise.

## 9. Final extension checklist

```text
[ ] theme.ts exports the Block through defineTheme
[ ] theme.yml registers the Block and its resources
[ ] style.css owns the responsive and focus states
[ ] duplicate CSS, JS, and compatibility layers are deleted
[ ] plugin switches are explicit
[ ] i18n stays in themes/<name>/i18n.yml
[ ] pageskill catalog and inspect describe the Block
[ ] pageskill check, build, test, and preview pass
[ ] generated dist/ is reviewed and not edited manually
```
