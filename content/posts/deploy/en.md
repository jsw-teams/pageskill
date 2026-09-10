---
title: Put the site online
description: Configure one deployment target, publish the public snapshot, and keep same-origin APIs separate from private code.
date: 2026-09-07
category: tutorial
---

# Put the site online

First make sure the site opens locally. Pageskill puts the public snapshot in `dist/public`; `backend/handler.ts` and runtime secrets stay on the server while dynamic requests use same-origin APIs.

## 1. Configure a deployment target

In the site root `config.yml`, enter the target you actually use. This example publishes through an existing Git remote:

```yaml
deployment:
  targets:
    - github
  github:
    remote: origin
    branch: gh-pages
```

Keep tokens or SSH keys in the local environment and key files. Do not put them in `config.yml`, articles, or the public directory.

## 2. Configure Cloudflare Pages Git integration (static-only)

If Cloudflare Pages builds this repository from Git, use these console values at the repository root:

```text
Build command: npm run g
Build output directory: dist/public
```

`npm run build` is not a Pageskill command and should not be added as a compatibility alias. `dist/public` is the public snapshot: it contains generated pages, assets, feeds, and the sitemap. Do not set the output directory to `dist`; the private build root can also contain `_pagekiln/`, `server/`, `.pagekiln/`, `_worker.js`, and other deployment files. Publishing the whole `dist/` directory can expose backend code or private runtime files.

This Git integration path is static-only. It does not automatically package `backend/handler.ts` as a same-package Pages Worker. If the site has no runtime API, set `deployment.backend: false` when appropriate; the output directory must still be `dist/public`.

## 3. Generate the public files

```powershell
npm run g
```

Inspect `dist/public` and check that the home page, articles, assets, and sitemap are present. A site with APIs also needs its server runtime alongside the same service.

The renderer also creates Agent discovery from `config.yml` and the outputs it actually wrote: `/.well-known/agent.json`, `/.well-known/ai-catalog.json`, the conditional API catalog, the Agent Skills index, `robots.txt`, and `llms.txt`. Do not add these files by hand. Pages with Markdown mirrors negotiate `Accept: text/markdown`; OAuth/OIDC, MCP, WebMCP, and DNS-AID remain disabled until the real service or external DNS/DNSSEC setup exists.

## 4. Preview the publishing plan

Run the safe check first:

```powershell
npm run d -- --dry-run
```

Review the resolved target and source path. This command does not upload anything.

## 5. Publish when ready

```powershell
npm run d
```

Run `npm run d` only when the target is ready. Pageskill runs the targets under `deployment.targets`. After publishing, open the home page and one article at the target domain, then call one of your same-origin API paths to check the server boundary.

For a Pages project that must include the backend in the same deployment, do not point Git integration at `dist`. Configure the CLI target and let `npm run d` create the package:

```yaml
deployment:
  targets:
    - cloudflare-pages
  backend: true
  cloudflare:
    apiTokenEnv: CLOUDFLARE_API_TOKEN
    pages:
      project: your-pages-project
```

Keep `CLOUDFLARE_API_TOKEN` in the deployment environment, then run `npm run d -- --dry-run` and, when the result is correct, `npm run d`. The CLI builds `dist`, copies only the public tree into a temporary `.pagekiln/pages-upload-*` directory, and adds the generated `_worker.js` plus its private `_pagekiln` runtime there. That staged directory is the Pages upload source, so the backend and public assets are integrated without publishing the private `dist/` root. The existing Git integration cannot perform this extra staging step automatically; changing the console output directory to `dist` is not a safe workaround.

## Expected result

The static Git integration receives `dist/public` and opens generated pages. The CLI Pages target receives the filtered Worker package described above; private Worker or server files and secrets stay out of the public snapshot.

## Common trap

With `targets: []`, or a mismatched remote or branch, there is no deployment target to run. Check `config.yml`, and do not use the whole project root as the static site root.

## Next step

Read [Privacy policy](/en/privacy/) to explain Cookies, data collection, and contact details to visitors.
