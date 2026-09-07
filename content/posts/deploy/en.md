---
title: Put the site online
description: Configure one deployment target, publish the public snapshot, and keep same-origin APIs separate from private code.
date: 2026-09-07
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

## 2. Generate the public files

```powershell
pageskill g
```

Inspect `dist/public` and check that the home page, articles, assets, and sitemap are present. A site with APIs also needs its server runtime alongside the same service.

## 3. Publish

```powershell
pageskill d
```

Pageskill runs the targets under `deployment.targets`. After publishing, open the home page and one article at the target domain, then call one of your same-origin API paths to check the server boundary.

## Expected result

The host receives `dist/public` and the public URL opens generated pages. Private Worker or server files and secrets stay out of the static snapshot.

## Common trap

With `targets: []`, or a mismatched remote or branch, there is no deployment target to run. Check `config.yml`, and do not use the whole project root as the static site root.

## Next step

Read [Privacy policy](/en/privacy/) to explain Cookies, data collection, and contact details to visitors.
