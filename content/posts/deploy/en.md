---
kind: post
title: Put the site online
description: Generate a safe public snapshot and hand it to the hosting workflow that owns publication.
date: 2026-09-07
category: tutorial
---

# Put the site online

Pageskill generates a site; your hosting provider or Git integration publishes it. The public snapshot is `dist/public`. Backend code, private runtime files, and secrets stay outside that static directory.

## 1. Generate and preview locally

Run the three public Pageskill commands:

```powershell
page g
page c
page s
```

The generate step validates content and creates the public snapshot. Run `page c` in a browser-capable environment for the complete accessibility audit. The preview lets you inspect the same output locally before handing it to a host.

## 2. Configure the host for static output

For a Git-based static host such as Cloudflare Pages or GitHub Pages, configure the host to build from the repository:

```text
Build command: page g
Build output directory: dist/public
```

The host runs Pageskill during its build and uploads only `dist/public`. Do not use the private `dist` root: it can also contain `_pageskill/`, `server/`, `.pageskill/`, worker files, and other generated deployment material.

## 3. Choose an optional runtime adapter

A static site omits `runtime` entirely. If the site needs the official Cloudflare reference runtime, select it explicitly:

```yaml
runtime:
  adapter: cloudflare-pages
  backend: true
```

`runtime.adapter` selects a real adapter; it does not grant the site configuration permission to store provider tokens. Put credentials and bindings in the host’s secret store or environment. Cloudflare Pages + Functions + D1 + Workers AI is one reference implementation, not a Pageskill Core dependency. A different platform needs its own Runtime Adapter that implements the same web-standard Server Function, Storage, Cache, and AI contracts.

## 4. Inspect the generated result

After `page g`, confirm that `dist/public` contains the home page, localized routes, assets, feeds, sitemap, `robots.txt`, and the generated discovery files. A configured reference runtime may also create private runtime material beside the public snapshot; never copy that material into the public directory.

The renderer owns Agent Discovery, Agent Skills, API Catalog, Markdown mirrors, and `llms.txt`. If you configure OAuth, MCP, WebMCP, or DNS-AID, first implement the real service, browser module, or DNS records described in [Configure conditional Agent capabilities](/en/posts/agent-discovery/); generated metadata cannot create those services.

## 5. Verify after publication

Use the host’s own deployment logs and preview environment to confirm the build passed. Then open the localized home page, one ordinary post, the update example, and the privacy page at the public domain. If backend behavior is enabled, call your documented same-origin API and verify its authorization and error responses remain API responses rather than static HTML.

## Common traps

The public directory is `dist/public`, not the project root and not the private `dist` root. Do not place access tokens, SSH keys, or backend secrets in YAML, Markdown, or generated public files. If the host cannot run `page g`, build in CI and upload the resulting `dist/public` artifact through that host’s documented mechanism.

## Next step

Read [Privacy policy](/en/privacy/) to explain Cookies, data collection, and contact details to visitors.
