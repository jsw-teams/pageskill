---
title: "Practical comparison: install, preview, deploy, and extend"
description: Compare the official working paths of Pageskill, Astro, Eleventy, Hugo, VitePress, and Docusaurus.
pattern: docs
---

# Practical comparison: install, preview, deploy, and extend

This comparison is about the commands and files a developer must operate. It does not turn one benchmark run into a universal ranking. The linked commands are from each project's official documentation; Pageskill commands are the current CLI in this repository.

Pageskill is reuse-first: people can use built-in Patterns, Blocks, and schemas directly, while an Agent is an optional discovery helper. Page authors do not hand-write HTML for each page; a theme extension is implemented once only when the catalog shows a real capability gap.

## The shortest working path

| Tool | Install / start | Local preview | Production build | Extension entry |
| --- | --- | --- | --- | --- |
| Pageskill | `npm install`; `npm link`; `pageskill init` | `pageskill s` | `pageskill g` → public snapshot in `dist/public` | `themes/<name>/theme.ts`, `theme.yml`, `style.css`, plugin switches |
| Astro | `npm create astro@latest` | `npm run dev` | `npm run build` → `dist/` | `.astro` pages, components, integrations |
| Eleventy | `npm install @11ty/eleventy`; `npx @11ty/eleventy --serve` | `npx @11ty/eleventy --serve` | `npx @11ty/eleventy` → `_site/` | templates, shortcodes, Data Cascade |
| Hugo | install the Hugo binary; `hugo new site` | `hugo server` | `hugo` → `public/` | `layouts/`, shortcodes, modules, resources |
| VitePress | `npx vitepress init` | `npm run docs:dev` | `npm run docs:build` → `.vitepress/dist/` | Vue theme, Vue components in Markdown |
| Docusaurus | `npm init docusaurus@latest my-website classic` | `npm run start` | `npm run build` → `build/` | React theme, plugins, MDX |

The output boundary is a deployment fact, not a cosmetic detail: the public snapshot is under `dist/public`, while target-specific server or Worker files remain private. Pageskill reads deployment destinations from `config.yml`. Static generation is the default rendering method: ordinary content is pre-generated, and interactive features call same-origin APIs when needed. One Worker/Fetch service can serve the generated pages and same-origin APIs; `/api/*` is handled by the Worker first by default, and other dynamic paths belong in `deployment.dynamicRoutes`. Do not expose build output containing private code as a CDN, Caddy, Nginx, or GitHub Pages root. Keep `server/`, `_pagekiln/`, `.pagekiln/`, Worker files, and `*.toml` private, and read secrets only at runtime.

## Pageskill task recipes

### Install a new site

```bash
npm install
npm run compile-runtime
npm run compile-theme
npm run compile-backend
npm link
pageskill init
pageskill check
```

The starter is a real source directory. Its `config.yml`, `content/`, and `themes/` show the contract that the CLI copies.

### Preview and edit

```bash
pageskill s
pageskill s --port=4174
```

The preview server watches `config.yml`, `content/`, and `themes/`. An affected Markdown, CSS, or theme edit rebuilds and reloads the browser while the process stays alive after a diagnostic error.

### Deploy

```yaml
deployment:
  targets: [cloudflare-pages, github-pages, vps]
  cloudflare:
    apiTokenEnv: CLOUDFLARE_API_TOKEN
    pages:
      project: example-site
      branch: production
  github:
    remote: origin
    branch: gh-pages
    tokenEnv: GITHUB_TOKEN
  vps:
    host: vps.example.com
    user: deploy
    port: 22
    remotePath: /var/www/example-site
    identityFile: ~/.ssh/id_ed25519
```

```bash
pageskill d --dry-run
pageskill d
```

The supported connectors are `cloudflare-pages`, `cloudflare-workers`, `github-pages`, `vps`, and the optional `openai-sites` handoff. Tokens stay in environment variables. VPS authentication uses the local SSH agent or an existing private key; the public key must already be authorized on the server. GitHub Pages publishes the `dist/public` snapshot only and does not run APIs, while a dynamic VPS backend belongs in a private server directory. Workers use `assets.directory: public`, with `.assetsignore` as an additional exclusion layer; Cloudflare Pages uses target-specific deployment staging so public static uploads contain only public resources. A Worker/Fetch deployment can serve generated pages together with same-origin dynamic APIs; `/api/*` is handled by the Worker first by default, and other dynamic paths belong in `deployment.dynamicRoutes`.

### Develop a Block

```text
content/pages/guide/en.md       current explanation
themes/default/theme.ts         Block renderer and schema
themes/default/theme.yml        Block/resource registration
themes/default/style.css        one visual owner
```

Implement the Block through `defineTheme`, register it in `theme.yml`, use it with a Markdown directive, and verify it with:

```bash
npm run compile-theme
pageskill catalog
pageskill inspect block:hero
pageskill check
pageskill g
```

The full example and security boundary are in the [development guide](/en/development/).

## What each tool makes you maintain

### Pageskill

Content identity is explicit: `content/pages/<id>/<locale>.md` is current site content, and `content/posts/<id>/<locale>.md` is a dated Product Note with a required `date`. `docs` is a Pattern inside `pages`, not a parallel collection. `config.yml` owns site settings and deployment destinations; the copied theme owns Patterns, Blocks, CSS, browser ESM, and plugin presentation.

### Astro

Astro's [official install guide](https://docs.astro.build/en/install-and-setup/) starts with `npm create astro@latest`. Its [development and build guide](https://docs.astro.build/en/develop-and-build/) uses `npm run dev` and `npm run build`; `.astro` pages, components, integrations, and content collections form the extension surface. Choose this path when component and integration code is the primary authoring model.

### Eleventy

Eleventy's [official site](https://www.11ty.dev/) demonstrates Markdown, templates, `npx @11ty/eleventy --serve`, and `_site/`. Its [Data Cascade](https://www.11ty.dev/docs/data-cascade/) and [Collections](https://www.11ty.dev/docs/collections/) are the main organization surfaces. Choose this path when multiple template languages and data composition are central.

### Hugo

Hugo's [quick start](https://gohugo.io/getting-started/quick-start/) uses `hugo new site`, `hugo server`, and `hugo`; its output is `public/`. [Content organization](https://gohugo.io/content-management/organization/) and [shortcodes](https://gohugo.io/content-management/shortcodes/) place structure in the content tree and layouts. Choose this path when sections, taxonomies, templates, and a native binary are the priority.

### VitePress

VitePress's [getting started guide](https://vitepress.dev/guide/getting-started) uses `npx vitepress init`, `npm run docs:dev`, and `npm run docs:build`. Its [Vue-in-Markdown guide](https://vitepress.dev/guide/using-vue.html) makes Vue components and client behavior part of document authoring. Choose this path when the documentation site is a Vue application.

### Docusaurus

Docusaurus's [installation guide](https://docusaurus.io/docs/installation) uses a React-based starter, `npm run start`, and `npm run build`; its [i18n guide](https://docusaurus.io/docs/i18n/introduction) covers locale directories and theme/plugin translations. Choose this path when docs sidebars, versions, MDX, and React plugins are required.

## Choose by the next concrete task

- Need a Markdown-first product site with explicit current pages, dated Product Notes, locales, search, archive, sitemap, and static deployment: use Pageskill and start with the Guide.
- Need `.astro` components or an integration ecosystem: follow Astro's official starter.
- Need template-language choice and Data Cascade: follow Eleventy's starter.
- Need sections, taxonomies, shortcodes, and a native binary: follow Hugo's quick start.
- Need Vue components inside a documentation site: follow VitePress.
- Need React/MDX docs with sidebars, versions, and plugin translations: follow Docusaurus.

The decision should follow the next file you need to write. For Pageskill, that file is `content/pages/` for current usage, `content/posts/` for a dated change, or `themes/<name>/theme.ts` for a new Block.
