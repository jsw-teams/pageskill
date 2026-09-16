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

The host runs Pageskill during its build and uploads only `dist/public`. Pageskill produces no worker or server bundle.

## 3. Connect an external API safely

Pageskill is always static. Give each external service a named root `apis` entry, then set that id as the Component's optional `client.api`:

```yaml
apis:
  comments:
    url: https://api.example.com/v1/comments
    token: public-client-token
    auth: bearer
```

```ts
client: { module: 'components/comments/script.js', selector: '[data-comments]', api: 'comments' }
```

The API id distinguishes comments from search, billing, or another service. The Client Runtime permits relative calls only inside that configured origin and base path, then adds either a Bearer or `x-api-key` header. Third-party URLs must allow the site's origin through CORS. Because static JavaScript receives `token`, it is public: use only a restricted, revocable client token. For private credentials, point `url` at a separately deployed proxy, omit `token`, and keep the upstream URL and secret in that proxy's environment. Database and model credentials always remain in the API environment.

## 4. Inspect the generated result

After `page g`, confirm that `dist/public` contains the home page, localized routes, assets, feeds, sitemap, `robots.txt`, and the generated discovery files. It may contain configured public API URLs and client tokens; it must not contain private credentials, database configuration, worker code, or accessibility reports.

The renderer owns Agent Discovery, Agent Skills, API Catalog, Markdown mirrors, and `llms.txt`. If you configure OAuth, MCP, WebMCP, or DNS-AID, first implement the real service, browser module, or DNS records described in [Configure conditional Agent capabilities](/en/posts/agent-discovery/); generated metadata cannot create those services.

## 5. Verify after publication

Use the host’s own deployment logs and preview environment to confirm the build passed. Then open the localized home page, one ordinary post, the update example, and the privacy page at the public domain. For every configured API id, verify CORS, authorization, path scoping, and JSON error responses at its configured URL.

## Common traps

The public directory is `dist/public`, not the project root and not the private `dist` root. Do not mistake a configured client token for a secret; anyone can read it. Never place private access tokens, SSH keys, or backend secrets in YAML, Markdown, or generated public files. If the host cannot run `page g`, build in CI and upload the resulting `dist/public` artifact through that host’s documented mechanism.

## Next step

Read [Privacy policy](/en/privacy/) to explain Cookies, data collection, and contact details to visitors.
