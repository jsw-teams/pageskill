---
title: Put the site online
description: Generate a safe public snapshot and hand it to the hosting workflow that owns publication.
date: 2026-09-07
category: tutorial
---

# Put the site online

Pageskill generates a site; your hosting provider or Git integration publishes it. The public snapshot is `dist/public`. Backend code, private runtime files, and secrets stay outside that static directory.

## 1. Generate and preview locally

Run the two public Pageskill commands:

```powershell
npm run g
npm run s
```

The generate step validates content and runs the accessibility audit. The preview lets you inspect the same output locally before handing it to a host.

## 2. Configure the host for static output

For a Git-based static host such as Cloudflare Pages or GitHub Pages, configure the host to build from the repository:

```text
Build command: npm run g
Build output directory: dist/public
```

The host runs Pageskill during its build and uploads only `dist/public`. Do not use the private `dist` root: it can also contain `_pageskill/`, `server/`, `.pageskill/`, worker files, and other generated deployment material.

## 3. Keep deployment data canonical

If a host needs a generated Worker, Pages function, or hosting configuration, declare its canonical target and static directory in `config.yml` so `npm run g` can produce the right artifacts:

```yaml
deployment:
  targets:
    - cloudflare-pages
  staticDirectory: public
  backend: true
```

The target selects generated artifacts; it does not grant the site configuration permission to store provider tokens. Put credentials in the host’s secret store or environment. A static Git integration cannot package `backend/handler.ts` as a same-package Worker by itself, so use the provider’s supported Worker/Functions workflow when the site needs runtime APIs.

## 4. Inspect the generated result

After `npm run g`, confirm that `dist/public` contains the home page, localized routes, assets, feeds, sitemap, `robots.txt`, and the generated discovery files. Pageskill also creates private runtime material beside the public snapshot when the configured target needs it; never copy that material into the public directory.

The renderer owns Agent Discovery, Agent Skills, API Catalog, Markdown mirrors, and `llms.txt`. If you configure OAuth, MCP, WebMCP, or DNS-AID, first implement the real service, browser module, or DNS records described in [Configure conditional Agent capabilities](/en/posts/agent-discovery/); generated metadata cannot create those services.

## 5. Verify after publication

Use the host’s own deployment logs and preview environment to confirm the build passed. Then open the localized home page, one ordinary post, the update example, and the privacy page at the public domain. If backend behavior is enabled, call your documented same-origin API and verify its authorization and error responses remain API responses rather than static HTML.

## Common traps

The public directory is `dist/public`, not the project root and not the private `dist` root. Do not place access tokens, SSH keys, or backend secrets in YAML, Markdown, or generated public files. If the host cannot run `npm run g`, build in CI and upload the resulting `dist/public` artifact through that host’s documented mechanism.

## Next step

Read [Privacy policy](/en/privacy/) to explain Cookies, data collection, and contact details to visitors.
