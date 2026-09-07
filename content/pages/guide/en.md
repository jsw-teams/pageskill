---
title: Install, preview, build, and deploy Pageskill
description: The practical path from a new Pageskill site to a checked, previewed, and deployable website.
pattern: docs
---

# Install, preview, build, and deploy Pageskill

This is the current operating guide. Agents and page authors reuse existing capabilities before deciding to extend a theme. `pages` describes how the site works now; `posts` records dated product changes. If the compiler or theme behavior changes, update this page and the other current pages. Read the [development guide](/en/development/) when the task is to add a Block or change the theme.

## Learning path

:::learning-path
### Start here
Install Pageskill, create a neutral site, and run the first check.
[Open Start here](/en/guide/start/)

### Configure the site
Set the site name, locales, navigation, collection schemas, and theme.
[Open Site settings](/en/guide/site-settings/)

### Learn Markdown
Write frontmatter, headings, lists, tables, links, and reusable directives.
[Open Markdown basics](/en/guide/markdown/)

### Publish first content
Create a page and a dated Product Note, then check, preview, and build them.
[Open First content](/en/guide/first-content/)

### Configure Cookie consent
Keep optional categories off until consent and load only trusted HTTP(S) scripts.
[Open Cookie consent](/en/guide/cookies/)

### Customize rendering
Reuse Patterns and Blocks first, then copy a theme for a reusable extension.
[Open Customize](/en/guide/customize/)
:::

## 1. Install

Pageskill requires Node.js `>=22.12.0` and npm. In a checkout of this repository:

```bash
git clone https://github.com/jsw-teams/pageskill.git
cd pageskill
npm install
```

Compile the runtime, theme, and backend once before using the source checkout:

```bash
npm run compile-runtime
npm run compile-theme
npm run compile-backend
```

To create a neutral site in another directory, link the local CLI and copy the real `starter/` template:

```bash
npm link
mkdir my-site
cd my-site
pageskill init
```

`pageskill init` does not create a second template hidden in the CLI. It copies `starter/`, including `config.yml`, content, and theme resources.

## 2. Discover and reuse capabilities first

Inspect the capability catalog before writing a page:

```bash
pageskill catalog
pageskill inspect pattern:landing
pageskill inspect block:hero
pageskill inspect collection:pages
```

Choose an existing Pattern, Block, and collection schema from the results, then fill in Markdown, Frontmatter, and `config.yml` data. This minimal page uses the `landing` Pattern and `hero` Block provided by both the repository and the starter; page authors write content and attributes without hand-writing HTML for each page:

```markdown
---
title: Product entry
description: Explain the purpose of this entry page.
pattern: landing
---

:::hero{tone="brand" align="left"}
# Let Agents reuse the existing structure

Write the page content in Markdown.
:::
```

Then run `pageskill check` and `pageskill g --profile`. Only when catalog/inspect shows no suitable capability should you copy the theme and implement one reusable Pattern or Block; see the [development guide](/en/development/) for that extension path.

## 3. Write the first content

The source tree has two collections:

```text
content/
├─ pages/<id>/<locale>.md       current site information
├─ posts/<id>/<locale>.md       dated Product Notes
└─ assets/                      images and other site assets
```

Write a current page in `content/pages/`. Home, About, Guide, Reference, and directory pages belong there when they answer what the site does now. `docs` is a Pattern inside `pages`, not a third collection.

```markdown
---
title: Local search
description: How the current build indexes content and marks result locations.
pattern: docs
---

# Local search

Pageskill currently creates a locale-specific static index and labels each result by the matching title, section, content, or path.
```

The complete default theme in this repository includes the `docs` Pattern; the minimal starter copied by `pageskill init` includes only `landing`, `document`, and `blog` among its built-in Patterns. In a starter site, begin with `document`, or copy a theme that provides `docs`, and confirm the capability with `pageskill catalog` before using the example above.

Write a Product Note in `content/posts/<id>/<locale>.md` only when recording one dated decision, implementation, release, incident, deployment, or measurement. The `date` field is required.

```markdown
---
title: Search results gained hit locations
description: Record the 2026-08-10 change that added visible hit-location labels.
date: 2026-08-10
pattern: blog
---

# Search results gained hit locations

This note records what changed on that date and why. The current search instructions remain in the Guide.
```

When current behavior changes, update the existing page. Keep an old Product Note as history and add a new note for a new dated change. This keeps `pages` as current state and `posts` as chronological history.

## 4. Check the source

Run the check before previewing or deploying:

```bash
pageskill check
```

The check validates YAML frontmatter, required schema fields, collection routes, translation groups, Pattern and Block names, directive attributes, and route collisions. A missing Product Note `date` fails the check; a current page does not need a date.

Use source discovery when you need to know what the active theme actually provides:

```bash
pageskill catalog
pageskill inspect collection:pages
pageskill inspect collection:posts
pageskill inspect block:hero
```

`catalog` reads the source-backed capability surface without requiring a complete site build. `inspect` returns structured facts for a content id or an explicit namespace.

## 5. Preview locally

Start the incremental preview server:

```bash
pageskill s
```

Open [http://127.0.0.1:4173/](http://127.0.0.1:4173/). Use another port when the default is occupied:

```bash
pageskill s --port=4174
```

The server builds once, watches `config.yml`, `content/`, and `themes/`, and reloads the browser after an affected output is rebuilt. A Markdown, frontmatter, CSS, or theme change is therefore visible in the preview without restarting the process. A diagnostic build error is printed while the preview process remains available for the next fix.

From the repository checkout, the equivalent npm aliases are `npm run s` and `npm run s -- --port=4174`.

## 6. Build `dist/`

Generate the build output:

```bash
pageskill g
pageskill g --profile
```

The short command is the same operation as `pageskill build`. It writes `dist/`, including HTML, one-line fingerprinted CSS, browser ESM assets, feeds, sitemap, search data, `llms.txt`, the custom 404 page, and target-specific deployment files. The build profile is stored at `dist/.pagekiln/build-profile.json`.

The source checkout can use `npm run g -- --profile`. Do not edit `dist/` by hand; edit the source and generate it again.

## 7. Deploy from `config.yml`

Deployment is configured in the site file, not by passing provider credentials on the command line. Select one target or several:

```yaml
deployment:
  targets: [cloudflare-pages, vps]
  cloudflare:
    apiTokenEnv: CLOUDFLARE_API_TOKEN
    pages:
      project: example-site
      branch: production
  vps:
    host: vps.example.com
    user: deploy
    port: 22
    remotePath: /var/www/example-site
    identityFile: ~/.ssh/id_ed25519
    publicKeyFile: ~/.ssh/id_ed25519.pub
```

The supported targets are `cloudflare-pages`, `cloudflare-workers`, `github-pages`, `vps`, and the optional `openai-sites` connector handoff. Credentials stay in environment variables, a local SSH agent, or the SSH key files; do not put tokens or private key contents in `config.yml`.

Inspect the resolved actions before uploading:

```bash
pageskill d --dry-run
```

Upload selected targets after the dry run:

```bash
pageskill d
```

`pageskill d` builds first. Cloudflare Pages publishes the target-staged output with Wrangler; Cloudflare Workers uses the generated standard module Worker; GitHub Pages pushes the public snapshot to the configured remote branch and does not run APIs; VPS copies the target deployment output with SCP to the configured path. A VPS host must already have SSH access, the destination directory, and the public key in `authorized_keys` when key authentication is used.

Static generation is the default rendering method, not a product limitation: ordinary content is pre-generated, while interactive features call same-origin APIs when needed. The same Worker/Fetch service serves generated pages and `/api/*`; declare other dynamic paths under `deployment.dynamicRoutes`. Deployment targets keep public resources separate from private server code. Do not publish build output containing private code as a public static root; keep `server/`, `_pagekiln/`, `.pagekiln/`, Worker files, and `*.toml` private, and read secrets only at runtime. GitHub Pages pushes the public snapshot only and does not run APIs; Workers and a dynamic VPS use their target server boundary. Cloudflare Workers place the default public resources in `dist/public` through `assets.directory: public`; `.assetsignore` is an additional exclusion layer, while Cloudflare Pages uses target-specific staging to keep private paths out of public assets. See [Secondary development](/en/development/) for advanced deployment compatibility settings and boundaries. OpenAI Sites is not the default binding for this project and may be unavailable from some regions; test the final domain from the regions that matter.

## 8. Change the theme or add a Block

Copy a theme into `themes/<name>/` and implement a Block in `theme.ts`. Register it in `theme.yml`; keep shared theme CSS in `style.css` and put Block-specific CSS in the declared `blocks/<id>.css` file. Then run `catalog`, `inspect`, `check`, `build`, and `serve`. The complete example is in [Secondary development](/en/development/).

Do not add a second CSS file, browser script, or compatibility wrapper to preserve a superseded implementation. When a redesign replaces an old rule or handler, delete the duplicate and verify the generated output.

## 9. Before publishing

```bash
npm test
pageskill check
pageskill g --profile
pageskill inspect collection:posts
pageskill d --dry-run
```

Check the three language links, the custom 404 route, `feed.xml`, `sitemap.xml`, `llms.txt`, optional Cookie scripts, keyboard focus, narrow-screen tables, and the generated deployment files. Product Notes must appear in date-descending archive/feed output; current pages must not be forced to carry a date.
